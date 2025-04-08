import { AgentContext, Agent, ArticleContentAgentResult } from "./types";
import FirecrawlApp from "@mendable/firecrawl-js";

/**
 * Article Content Agent
 * 
 * This agent fetches the content of an article using the Firecrawl.dev API
 * and passes it to the article summary agent for further processing.
 */
export class ArticleContentAgent implements Agent {
  private firecrawlApp: FirecrawlApp;

  constructor() {
    // Initialize the Firecrawl app with API key
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      console.warn("FIRECRAWL_API_KEY is not set. Web crawling functionality will be limited.");
    }
    this.firecrawlApp = new FirecrawlApp({ apiKey: apiKey || "" });
  }

  async process(context: AgentContext): Promise<ArticleContentAgentResult> {
    try {
      const { entry } = context;
      
      // Ensure we have a URL to process
      if (!entry.url) {
        return {
          success: false,
          error: "No URL provided for article content extraction"
        };
      }

      // Update processing state to indicate we're fetching content
      await this.updateProcessingState(entry.id, 30);

      // Fetch article content using Firecrawl
      const { content, metadata } = await this.fetchArticleContent(entry.url);
      
      // Prepare metadata to save
      const entryMetadata: Record<string, any> = {
        content,
        title: metadata?.title || "Processing article...",
        source: entry.url,
        fetchedAt: new Date().toISOString()
      };
      
      // Add additional metadata if available
      if (metadata) {
        if (metadata.description) entryMetadata.description = metadata.description;
        if (metadata.author) entryMetadata.author = metadata.author;
        if (metadata.publishedDate) entryMetadata.publishedDate = metadata.publishedDate;
        if (metadata.language) entryMetadata.language = metadata.language;
      }
      
      // Update processing state and save content to metadata
      await this.updateProcessingState(entry.id, 50, entryMetadata);
      
      console.log(`✅ ArticleContentAgent: Saved content and metadata for entry ${entry.id}`);

      return {
        success: true,
        content,
        nextAgent: "article-summary-agent",
        data: entryMetadata
      };
    } catch (error) {
      console.error("Error in ArticleContentAgent:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async fetchArticleContent(url: string): Promise<{ content: string; metadata?: Record<string, any> }> {
    try {
      console.log(`🔍 ArticleContentAgent: Fetching content for URL: ${url}`);
      
      // Use Firecrawl to extract article content following their API docs
      const response = await this.firecrawlApp.scrapeUrl(url, {
        formats: ['markdown'],       // Request markdown format
        onlyMainContent: true,       // Get only the main content, not navigation/footers
        removeBase64Images: true,    // Remove base64 images to reduce payload size
        blockAds: true,              // Block ads for cleaner content
        timeout: 30000               // 30 second timeout
      });
      
      // Log response structure for debugging
      console.log(`📦 ArticleContentAgent: Received response type: ${typeof response}`);
      
      // Handle response according to Firecrawl API structure
      if (!response || typeof response !== 'object') {
        throw new Error(`Invalid response from Firecrawl: ${JSON.stringify(response)}`);
      }
      
      // Type assertion for response to help TypeScript
      const typedResponse = response as Record<string, any>;
      
      // Check if response has success flag
      if ('success' in typedResponse && !typedResponse.success) {
        throw new Error(`Firecrawl API error: ${typedResponse.error || 'Unknown error'}`);
      }
      
      // Extract markdown content based on Firecrawl API response structure
      let markdown: string | null = null;
      
      // Handle different response structures
      if ('data' in typedResponse && typedResponse.data) {
        // Standard API response structure
        const data = typedResponse.data as Record<string, any>;
        if ('markdown' in data && typeof data.markdown === 'string') {
          markdown = data.markdown;
          console.log(`✅ ArticleContentAgent: Successfully extracted markdown content`);
        }
      } else if ('markdown' in typedResponse && typeof typedResponse.markdown === 'string') {
        // SDK might return data object directly
        markdown = typedResponse.markdown;
        console.log(`✅ ArticleContentAgent: Successfully extracted markdown content from direct response`);
      }
      
      if (!markdown) {
        console.error('Response structure:', JSON.stringify(typedResponse, null, 2));
        throw new Error("No markdown content found in Firecrawl response");
      }
      
      // Extract metadata if available
      let metadata: Record<string, any> = {};
      if ('data' in typedResponse && typedResponse.data) {
        const data = typedResponse.data as Record<string, any>;
        if ('metadata' in data && data.metadata) {
          metadata = data.metadata as Record<string, any>;
          console.log(`📝 ArticleContentAgent: Extracted metadata: ${JSON.stringify(metadata)}`);
        }
      }
      
      // Return the markdown content and metadata
      return {
        content: markdown,
        metadata
      };
    } catch (error) {
      console.error("❌ Error fetching article content:", error);
      
      // If Firecrawl fails, return a placeholder for testing
      if (!process.env.FIRECRAWL_API_KEY) {
        console.warn("⚠️ Using mock article content due to missing API key");
        return {
          content: `Mock article content for ${url}. This is a placeholder used when the Firecrawl API key is not configured.`,
          metadata: {
            title: `Article from ${url}`,
            description: "This is a mock description for testing purposes.",
            language: "en"
          }
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
      await entriesApi.updateProcessingState(entryId, "inProcess", progress, metadata);
    } catch (error) {
      console.error("Error updating processing state:", error);
    }
  }
}
