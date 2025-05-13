import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Type for request body
interface IngestEntryRequest {
  entryType: 'article' | 'company';
  url: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { entryType, url } = body as IngestEntryRequest;

    // Validate request
    if (!entryType || !['article', 'company'].includes(entryType) || !url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
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
