import { AgentContext, Agent, ArticleSummaryAgentResult } from "./types";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

// Define Zod schema for article summary without minLength constraints
const articleSummarySchema = z.object({
  title: z.string().describe("The title of the article"),
  summary: z.string().describe("A concise 3-5 sentence summary of the article"),
  keyPoints: z.array(z.string()).describe("3-5 key bullet points from the article"),
  author: z.string().nullable().describe("The author's name if available, null if not"),
  publishedDate: z.string().nullable().describe("The publication date in YYYY-MM-DD format if available, null if not")
});

type ArticleSummarySchema = z.infer<typeof articleSummarySchema>;

/**
 * Article Summary Agent
 * 
 * This agent generates a summary and key points for an article
 * using OpenAI via the Vercel AI SDK's Responses API.
 */
export class ArticleSummaryAgent implements Agent {
  constructor() {
    // OpenAI client is initialized via the Vercel AI SDK
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn("OPENAI_API_KEY is not set. Summary generation will be limited.");
    }
  }

  async process(context: AgentContext): Promise<ArticleSummaryAgentResult> {
    try {
      const { entry } = context;
      
      // Ensure we have content to summarize
      const content = entry.metadata.content;
      if (!content) {
        return {
          success: false,
          error: "No content provided for article summarization"
        };
      }

      // Update processing state to indicate we're generating summary
      await this.updateProcessingState(entry.id, 70);

      // Generate summary using OpenAI
      const summaryResult = await this.generateSummary(content);
      
      // Update processing state to indicate summary generation is complete
      await this.updateProcessingState(entry.id, 90);

      // Extract information from the summary result
      const { title, summary, keyPoints, author, publishedDate } = summaryResult;

      // Update the entry with the final metadata
      await this.updateProcessingState(entry.id, 100, {
        title,
        summary,
        keyPoints,
        author: author || undefined,
        publishedDate: publishedDate || undefined,
        content
      });

      return {
        success: true,
        title,
        summary,
        keyPoints,
        author: author || undefined,
        publishedDate: publishedDate || undefined,
        data: summaryResult
      };
    } catch (error) {
      console.error("Error in ArticleSummaryAgent:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async generateSummary(content: string): Promise<ArticleSummarySchema> {
    try {
      // Use Vercel AI SDK's generateObject with OpenAI
      const { object: result } = await generateObject({
        model: openai.responses('o3-mini'),
        schema: articleSummarySchema,
        prompt: `You are an expert article analyzer. Extract key information from this article in a structured format.

Article to analyze:
${content}

Generate a response that includes:
1. A clear title
2. A concise 3-5 sentence summary
3. 3-5 key bullet points
4. Author name (if available)
5. Published date (if available, in YYYY-MM-DD format)`,
        temperature: 0.2, // Lower temperature for more consistent results
        mode: 'json' // Explicitly set mode to json for structured output
      });
      
      return result;
    } catch (error) {
      console.error("Error generating summary:", error);
      
      // If OpenAI fails, return a placeholder for testing
      if (!process.env.OPENAI_API_KEY) {
        console.warn("Using mock summary due to missing API key");
        return {
          title: "Sample Article Title",
          summary: "This is a placeholder summary used when the OpenAI API key is not configured.",
          keyPoints: ["Key point 1", "Key point 2", "Key point 3"],
          author: null,
          publishedDate: null
        };
      }
      
      throw error;
    }
  }

  private async updateProcessingState(
    entryId: string, 
    progress: number, 
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // Import dynamically to avoid circular dependencies
      const { entriesApi } = await import("@/lib/supabase/client");
      
      if (progress === 100) {
        // Mark as completed when progress is 100%
        await entriesApi.updateProcessingState(entryId, "completed", progress, metadata);
      } else {
        await entriesApi.updateProcessingState(entryId, "in_process" as any, progress, metadata);
      }
    } catch (error) {
      console.error("Error updating processing state:", error);
    }
  }
}
