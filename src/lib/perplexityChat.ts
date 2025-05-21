import { perplexity } from "@ai-sdk/perplexity";
import { generateText } from "ai";

/**
 * Search the web using Perplexity for the chat agent.
 * Returns a summary and an array of citations (URLs, titles if available).
 * @param query The search query string
 */
export async function searchWebViaPerplexity(query: string) {
  try {
    console.log("[Perplexity] Starting search", { query });
    const prompt = `You are an expert web researcher. Search the web for the following query and return a concise, up-to-date summary. Cite your sources with URLs and, if possible, titles. Structure your answer so that citations are clearly linked to statements.\n\nQuery: ${query}`;
    const result = await generateText({
      model: perplexity("sonar"),
      prompt,
      temperature: 0.3,
      maxTokens: 600,
    });
    // Per Vercel AI SDK docs, Perplexity returns sources as an array of URLs
    return {
      text: result.text,
      citations: result.sources || [],
    };
  } catch (err) {
    console.error("[Perplexity] Error in searchWebViaPerplexity:", err);
    throw err;
  }
}
