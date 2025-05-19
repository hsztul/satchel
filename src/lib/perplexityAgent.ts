import { perplexity } from "@ai-sdk/perplexity";
import { generateText } from "ai";
import { COMPANY_RESEARCH_PROMPT } from './prompts';
import { injectPromptVars } from './aiAgent';

export async function runPerplexityResearch({ title, cleaned_content }: { title: string; cleaned_content: string }) {
  try {
    console.log('[Perplexity] Starting research', {
      title,
      cleaned_content_length: cleaned_content?.length,
    });
    const prompt = injectPromptVars(COMPANY_RESEARCH_PROMPT, { title, cleaned_content });
    console.log('[Perplexity] Prompt (first 400 chars):', prompt.slice(0, 400));
    const result = await generateText({
      model: perplexity("sonar-pro"),
      prompt,
      temperature: 0.2,
    });
    console.log('[Perplexity] Result (first 400 chars):', result.text?.slice(0, 400));
    // Per Vercel AI SDK docs, Perplexity returns sources as an array of URLs
    return {
      text: result.text,
      citations: result.sources || [],
    };

  } catch (err) {
    console.error('[Perplexity] Error in runPerplexityResearch:', err);
    throw err;
  }
}
