import { supabase } from '@/lib/supabase';

export async function processArticleEntry({ entryId, url }: { entryId: string, url: string }) {
  await supabase.from('entries').update({ status: 'scraping_website' }).eq('id', entryId);
  const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
  if (!FIRECRAWL_API_KEY) {
    await supabase.from('entries').update({ status: 'failed' }).eq('id', entryId);
    return;
  }
  const { runFirecrawl } = await import('@/lib/firecrawl');
  const result = await runFirecrawl({ entryType: 'article', url });
  if (result.error) {
    console.error('[IngestEntry] Firecrawl returned error:', result.error);
    await supabase.from('entries').update({ status: 'failed' }).eq('id', entryId);
    return;
  }
  const { error: updateError } = await supabase.from('entries').update({
    title: result.title,
    cleaned_content: result.cleaned_content,
    metadata: result.metadata,
    status: 'processing_scraped_content',
  }).eq('id', entryId);
  if (updateError) {
    console.error('[IngestEntry] Supabase update error:', updateError);
  }
  // Article summarization
  if (result.cleaned_content && result.title) {
    try {
      const { summarizeArticle } = await import('@/lib/aiAgent');
      const summaryObj = await summarizeArticle({
        title: result.title,
        cleaned_content: result.cleaned_content,
      });
      const { summary, keyTakeaways, primaryConcepts, industries } = summaryObj;
      const { error: summaryError } = await supabase.from('entries').update({
        summary,
        llm_analysis: { keyTakeaways, primaryConcepts },
        industries,
        status: 'processing_summarized',
      }).eq('id', entryId);
      if (summaryError) {
        console.error('[IngestEntry] Error updating summary:', summaryError);
        await supabase.from('entries').update({ status: 'failed' }).eq('id', entryId);
      }
    } catch (err) {
      console.error('[IngestEntry] summarizeArticle error:', err);
      await supabase.from('entries').update({ status: 'failed' }).eq('id', entryId);
      return;
    }
  }

  // --- Phase 7: Chunking, Embedding, and Finalization ---
  try {
    const { embedChunksAndStore } = await import('@/lib/embeddingAgent');
    // Fetch latest cleaned_content from DB (in case updated)
    const { data: entryData, error: fetchErr } = await supabase.from('entries').select('cleaned_content').eq('id', entryId).single();
    if (fetchErr || !entryData?.cleaned_content) {
      throw new Error('Could not fetch cleaned_content for embedding');
    }
    const embeddingResult = await embedChunksAndStore({ entryId, text: entryData.cleaned_content });
    if (!embeddingResult.success) {
      throw new Error(embeddingResult.error || 'Unknown embedding error');
    }
    await supabase.from('entries').update({ status: 'complete' }).eq('id', entryId);
  } catch (err) {
    console.error('[IngestEntry] Embedding error:', err);
    await supabase.from('entries').update({ status: 'failed' }).eq('id', entryId);
  }
}
