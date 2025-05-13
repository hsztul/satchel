import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { processArticleEntry } from '@/lib/processArticleEntry';
import { processCompanyEntry } from '@/lib/processCompanyEntry';

export async function POST(request: Request) {
  const segments = request.url.split('/');
  const entryId = segments[segments.length - 2]; // Get the ID from the URL

  try {
    // Get the entry
    const { data: entry, error } = await supabase
      .from('entries')
      .select('*')
      .eq('id', entryId)
      .single();

    if (error || !entry) {
      return NextResponse.json(
        { error: error?.message || 'Entry not found' },
        { status: 404 }
      );
    }

    // Reset entry status to pending
    const { error: updateError } = await supabase
      .from('entries')
      .update({ status: 'pending' })
      .eq('id', entryId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    // Start reprocessing based on entry type
    if (!entry.source_url) {
      return NextResponse.json(
        { error: 'Entry has no source URL' },
        { status: 400 }
      );
    }

    // Start reprocessing based on entry type
    if (entry.entry_type === 'article') {
      void processArticleEntry({ entryId, url: entry.source_url });
    } else if (entry.entry_type === 'company') {
      void processCompanyEntry({ entryId, url: entry.source_url });
    } else {
      return NextResponse.json(
        { error: 'Unsupported entry type for reprocessing' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[ReprocessEntry] Error:', err);
    return NextResponse.json(
      { error: 'Failed to reprocess entry' },
      { status: 500 }
    );
  }
}
