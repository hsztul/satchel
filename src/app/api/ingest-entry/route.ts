import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Type for request body
interface IngestEntryRequest {
  entryType: 'article' | 'company' | 'note';
  url?: string;
  note?: string;
  reference_entry_ids?: string[];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { entryType, url, note, reference_entry_ids } = body as IngestEntryRequest;

    // Validate request
    if (!entryType || !['article', 'company', 'note'].includes(entryType)) {
      return NextResponse.json({ error: 'Invalid entryType' }, { status: 400 });
    }

    if (entryType === 'note') {
      if (!note || typeof note !== 'string' || !note.trim()) {
        return NextResponse.json({ error: 'Note content is required' }, { status: 400 });
      }
      // Insert the note entry with initial status 'pending', no title yet
      const { data, error } = await supabase
        .from('entries')
        .insert([
          {
            entry_type: 'note',
            cleaned_content: note,
            status: 'pending',
            industries: [], // Ensure NOT NULL constraint is satisfied
            reference_entry_ids: Array.isArray(reference_entry_ids) ? reference_entry_ids : [],
          },
        ])
        .select('id');
      if (error || !data || !data[0]?.id) {
        return NextResponse.json({ error: 'Failed to insert note', details: error }, { status: 500 });
      }
      const entryId = data[0].id;

      // --- Begin async processing for notes ---
      (async () => {
        try {
          // 1. Generate title
          const { generateNoteTitle } = await import('@/lib/aiAgent');
          let autoTitle = '';
          try {
            autoTitle = await generateNoteTitle(note);
          } catch {
            autoTitle = note.length > 50 ? note.substring(0, 50) + '…' : note;
          }
          // 2. Set status to processing_embeddings and update title
          await supabase.from('entries').update({ status: 'processing_embeddings', title: autoTitle }).eq('id', entryId);
          // 3. Embed chunks
          const { embedChunksAndStore } = await import('@/lib/embeddingAgent');
          const embedResult = await embedChunksAndStore({ entryId, text: note });
          if (embedResult.success) {
            await supabase.from('entries').update({ status: 'complete' }).eq('id', entryId);
          } else {
            await supabase.from('entries').update({ status: 'error' }).eq('id', entryId);
          }
        } catch {
          await supabase.from('entries').update({ status: 'error' }).eq('id', entryId);
        }
      })();

      return NextResponse.json({
        entryId,
        status: 'pending',
        message: 'Note created. Processing will continue asynchronously.'
      }, { status: 202 });
    }

    // For article/company, require url
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required for articles/companies' }, { status: 400 });
    }

    // Check if entry already exists
    const { data: existing, error: existingError } = await supabase
      .from('entries')
      .select('id')
      .eq('source_url', url)
      .eq('entry_type', entryType)
      .limit(1);

    if (existingError) {
      return NextResponse.json({ error: 'Failed to check for existing entry', details: existingError.message }, { status: 500 });
    }
    let entryId: string;
    let isReprocessing = false;
    if (existing && existing.length > 0) {
      // Entry exists: update status to 'pending' and reprocess
      entryId = existing[0].id;
      isReprocessing = true;
      await supabase.from('entries').update({ status: 'pending' }).eq('id', entryId);
    } else {
      // Insert initial entry with status 'pending'
      const { data, error } = await supabase
        .from('entries')
        .insert([
          {
            entry_type: entryType,
            source_url: url,
            status: 'pending',
          },
        ])
        .select('id');
      if (error || !data || !data[0]?.id) {
        return NextResponse.json({ error: 'Failed to insert entry', details: error?.message }, { status: 500 });
      }
      entryId = data[0].id;
    }

    // Respond immediately
    // --- Begin async processing ---
    (async () => {
      if (entryType === 'company') {
        const { processCompanyEntry } = await import('@/lib/processCompanyEntry');
        await processCompanyEntry({ entryId, url });
        return;
      }
      if (entryType === 'article') {
        const { processArticleEntry } = await import('@/lib/processArticleEntry');
        await processArticleEntry({ entryId, url });
        return;
      }
    })();

    // Return the response immediately
    return NextResponse.json({
      entryId,
      status: 'pending',
      message: isReprocessing ? 'Reprocessing started.' : 'Entry ingestion started.'
    }, { status: 202 });
  } catch (err: unknown) {
    let details = 'Unknown error';
    if (err && typeof err === 'object' && 'message' in err && typeof (err as { message?: unknown }).message === 'string') {
      details = (err as { message: string }).message;
    } else {
      details = String(err);
    }
    return NextResponse.json({ error: 'Unexpected error', details }, { status: 500 });
  }
}
