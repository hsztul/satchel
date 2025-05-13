import { supabase } from '@/lib/supabase';

export async function processCompanyEntry({ entryId, url }: { entryId: string, url: string }) {
  let exaResult;
  try {
    await supabase.from('entries').update({ status: 'scraping_website' }).eq('id', entryId);
    const { getCompanySummaryFromExa } = await import('@/lib/exaAgent');
    exaResult = await getCompanySummaryFromExa(url);
    const companyTitle = (exaResult.title || '').trim();
    await supabase.from('entries').update({
      title: companyTitle,
      cleaned_content: exaResult.cleaned_content,
      url: exaResult.url,
      metadata: exaResult,
      status: 'processing_scraped_content',
    }).eq('id', entryId);
    // Save summary in llm_analysis.site_summary and also set summary field
    const { data: existingEntry } = await supabase.from('entries').select('llm_analysis').eq('id', entryId).single();
    const prevLlmAnalysis = existingEntry?.llm_analysis || {};
    const newLlmAnalysis = { ...prevLlmAnalysis, site_summary: { ...exaResult } };
    await supabase.from('entries').update({
      title: companyTitle,
      llm_analysis: newLlmAnalysis,
      summary: exaResult.summary,
      status: 'processing_summarized',
    }).eq('id', entryId);
    // --- Perplexity research step ---
    try {
      await supabase.from('entries').update({ status: 'researching_external' }).eq('id', entryId);
      const { runPerplexityResearch } = await import('@/lib/perplexityAgent');
      const perplexityResponse = await runPerplexityResearch({
        title: exaResult.title,
        cleaned_content: exaResult.cleaned_content,
      });
      const { data: existingEntry2 } = await supabase.from('entries').select('llm_analysis').eq('id', entryId).single();
      const prevLlmAnalysis2 = existingEntry2?.llm_analysis || {};
      const newLlmAnalysis2 = { ...prevLlmAnalysis2, perplexity_research: { full_perplexity_responses: perplexityResponse } };
      const { error: researchError } = await supabase.from('entries').update({
        llm_analysis: newLlmAnalysis2,
        status: 'processing_summarized',
      }).eq('id', entryId);
      if (researchError) {
        console.error('[IngestEntry] Error updating Perplexity research:', researchError);
        await supabase.from('entries').update({ status: 'failed' }).eq('id', entryId);
      }
    } catch (err) {
      console.error('[IngestEntry] Perplexity research error:', err);
      await supabase.from('entries').update({ status: 'failed' }).eq('id', entryId);
    }
  } catch (err) {
    console.error('[IngestEntry] Company Exa summarization error:', err);
    await supabase.from('entries').update({ status: 'failed' }).eq('id', entryId);
    return;
  }

  // --- Phase 7: Chunking, Embedding, and Finalization ---
  try {
    const { embedChunksAndStore } = await import('@/lib/embeddingAgent');
    // Fetch latest cleaned_content from DB (in case updated)
    const { data: entryData, error: fetchErr } = await supabase
      .from('entries')
      .select('cleaned_content,summary')
      .eq('id', entryId)
      .single();
    const textToEmbed = entryData?.cleaned_content || entryData?.summary;
    if (fetchErr || !textToEmbed) {
      console.error('[Company Embedding] Could not fetch cleaned_content or summary for embedding:', { entryId, fetchErr, entryData });
      throw new Error('Could not fetch cleaned_content or summary for embedding');
    }
    const embeddingResult = await embedChunksAndStore({ entryId, text: textToEmbed });
    if (!embeddingResult.success) {
      throw new Error(embeddingResult.error || 'Unknown embedding error');
    }
    await supabase.from('entries').update({ status: 'complete' }).eq('id', entryId);
  } catch (err) {
    console.error('[IngestEntry] Embedding error:', err);
    await supabase.from('entries').update({ status: 'failed' }).eq('id', entryId);
  }
}
