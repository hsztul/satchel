import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST /api/notes/[id]/edit: Update note content, re-run title and embeddings
export async function POST(req: NextRequest) {
  try {
    const segments = req.url.split('/');
    const noteId = segments[segments.length - 2];
    const { note } = await req.json();
    if (!note || typeof note !== 'string' || !note.trim()) {
      return NextResponse.json({ error: 'Note content is required' }, { status: 400 });
    }
    // Set status to pending and clear title
    await supabase.from('entries').update({ status: 'pending', title: null }).eq('id', noteId);
    // Async: re-generate title, re-embed
    (async () => {
      try {
        const { generateNoteTitle } = await import('@/lib/aiAgent');
        let autoTitle = '';
        try {
          autoTitle = await generateNoteTitle(note);
        } catch {
          autoTitle = note.length > 50 ? note.substring(0, 50) + '…' : note;
        }
        await supabase.from('entries').update({ status: 'processing_embeddings', title: autoTitle, cleaned_content: note }).eq('id', noteId);
        const { embedChunksAndStore } = await import('@/lib/embeddingAgent');
        const embedResult = await embedChunksAndStore({ entryId: noteId, text: note });
        if (embedResult.success) {
          await supabase.from('entries').update({ status: 'complete' }).eq('id', noteId);
        } else {
          await supabase.from('entries').update({ status: 'error' }).eq('id', noteId);
        }
      } catch {
        await supabase.from('entries').update({ status: 'error' }).eq('id', noteId);
      }
    })();
    return NextResponse.json({ success: true });
  } catch (err) {
    let details = 'Unknown error';
    if (err && typeof err === 'object' && 'message' in err && typeof (err as { message?: unknown }).message === 'string') {
      details = (err as { message: string }).message;
    } else {
      details = String(err);
    }
    return NextResponse.json({ error: 'Unexpected error', details }, { status: 500 });
  }
}
