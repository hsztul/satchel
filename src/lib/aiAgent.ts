import fs from "fs/promises";
import path from "path";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

/**
 * Reads a prompt template from the prompts directory and injects variables.
 * @param {string} promptFile - Filename under /src/prompts (e.g. 'article-summary.txt')
 * @param {Record<string, string>} vars - Map of variable names to inject (e.g. { title, cleaned_content })
 */
export async function loadPrompt(promptFile: string, vars: Record<string, string>): Promise<string> {
  const promptPath = path.join(process.cwd(), "src", "prompts", promptFile);
  let template = await fs.readFile(promptPath, "utf8");
  for (const [key, value] of Object.entries(vars)) {
    template = template.replaceAll(`{{${key}}}`, value);
  }
  return template;
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
  const prompt = await loadPrompt("article-summary.txt", { title, cleaned_content });
  return summarizeArticleWithLLM(prompt);
}

/**
 * Main agent for company summarization. Loads prompt, injects content, calls LLM, returns summary.
 */
export async function summarizeCompany({ title, cleaned_content }: { title: string; cleaned_content: string }) {
  const prompt = await loadPrompt("company-summary.txt", { title, cleaned_content });
  return summarizeArticleWithLLM(prompt);
}
