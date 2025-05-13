import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { ARTICLE_SUMMARY_PROMPT, COMPANY_SUMMARY_PROMPT } from './prompts';

/**
 * Injects variables into a prompt template.
 * @param {string} template - The prompt template
 * @param {Record<string, string>} vars - Map of variable names to inject (e.g. { title, cleaned_content })
 */
export function injectPromptVars(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

/**
 * Calls the Vercel AI SDK to summarize an article using the specified prompt.
 * @param {string} prompt - The prompt to send to the LLM
 * @returns {Promise<string>} - The LLM's response
 */
// Zod schema for structured article summary
const ArticleSummarySchema = z.object({
  summary: z.string(),
  keyTakeaways: z.array(z.string()),
  primaryConcepts: z.array(z.string()),
});

export async function summarizeArticleWithLLM(prompt: string) {
  const result = await generateObject({
    model: openai("gpt-4o"),
    system: "You are an expert academic researcher and analyst.",
    prompt,
    schema: ArticleSummarySchema,
    maxTokens: 1024,
    temperature: 0.7,
  });
  return result.object;
}

/**
 * Main agent for article summarization. Loads prompt, injects content, calls LLM, returns summary.
 */
export async function summarizeArticle({ title, cleaned_content }: { title: string; cleaned_content: string }) {
  const prompt = injectPromptVars(ARTICLE_SUMMARY_PROMPT, { title, cleaned_content });
  return summarizeArticleWithLLM(prompt);
}

/**
 * Main agent for company summarization. Loads prompt, injects content, calls LLM, returns summary.
 */
export async function summarizeCompany({ title, cleaned_content }: { title: string; cleaned_content: string }) {
  const prompt = injectPromptVars(COMPANY_SUMMARY_PROMPT, { title, cleaned_content });
  return summarizeArticleWithLLM(prompt);
}
