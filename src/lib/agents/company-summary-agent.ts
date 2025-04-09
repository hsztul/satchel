import { AgentContext, Agent, CompanySummaryAgentResult } from "./types";
import { perplexity } from "@ai-sdk/perplexity";
import { generateText } from "ai";
import { z } from "zod";

// Define Zod schema for company summary
const companySummarySchema = z.object({
  name: z.string().describe("The full legal name of the company"),
  description: z.string().describe("A detailed description of what the company does"),
  industry: z.string().describe("The primary industry the company operates in"),
  founded: z.string().nullable().describe("The year the company was founded, null if not available"),
  headquarters: z.string().nullable().describe("The city and country of the company's headquarters"),
  keyProducts: z.array(z.string()).describe("List of the company's main products or services"),
  competitors: z.array(z.string()).describe("List of main competitors in the industry"),
  marketPosition: z.string().describe("Brief description of the company's market position"),
  marketStrategy: z.string().describe("Description of the company's market strategy"),
  coreTechnology: z.string().describe("Description of the company's core technology and technical capabilities"),
  competitiveEdge: z.string().describe("Description of the company's competitive advantages"),
  fundingHistory: z.string().describe("Overview of the company's funding rounds and investments"),
  leadership: z.string().describe("Information about key executives and management team"),
  revenueRange: z.string().nullable().describe("Approximate annual revenue range, e.g. '$1B-$5B', null if not available"),
  employeeCount: z.string().nullable().describe("Approximate number of employees, e.g. '5,000-10,000', null if not available"),
  sources: z.array(z.string()).optional()
});

type CompanySummarySchema = z.infer<typeof companySummarySchema>;

/**
 * Company Summary Agent
 * 
 * This agent generates a comprehensive summary of a company
 * using Perplexity's sonar-pro model via the Vercel AI SDK.
 */
export class CompanySummaryAgent implements Agent {
  constructor() {
    // Perplexity client is initialized via the Vercel AI SDK
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      console.warn("PERPLEXITY_API_KEY is not set. Company summary generation will be limited.");
    }
  }

  async process(context: AgentContext): Promise<CompanySummaryAgentResult> {
    try {
      const { entry } = context;
      
      // Get company URL from entry.url and name from metadata
      const companyUrl = entry.url;
      const companyName = entry.metadata.companyName !== "Processing company..." ? 
        entry.metadata.companyName : 
        undefined;

      if (!companyUrl && !companyName) {
        return {
          success: false,
          error: "Neither company URL nor name provided for analysis"
        };
      }

      // Update processing state to indicate we're generating summary
      await this.updateProcessingState(entry.id, 70);
      
      console.log("💥💥 Name and URL", { companyName, companyUrl });
      
      // Generate summary using Perplexity
      const summaryResult = await this.generateSummary(companyName, companyUrl);
      
      // Update processing state to indicate summary generation is complete
      await this.updateProcessingState(entry.id, 90);

      // Extract information from the summary result
      const { 
        name, 
        description, 
        industry, 
        founded, 
        headquarters, 
        keyProducts, 
        competitors,
        marketPosition,
        marketStrategy,
        coreTechnology,
        competitiveEdge,
        fundingHistory,
        leadership,
        revenueRange,
        employeeCount,
        sources 
      } = summaryResult;

      // Update the entry with the final metadata
      await this.updateProcessingState(entry.id, 100, {
        name,
        description,
        industry,
        founded,
        headquarters,
        keyProducts,
        competitors,
        marketPosition,
        marketStrategy,
        coreTechnology,
        competitiveEdge,
        fundingHistory,
        leadership,
        revenueRange,
        employeeCount,
        sources
      });

      return {
        success: true,
        data: summaryResult
      };
    } catch (error) {
      console.error("Error in CompanySummaryAgent:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async generateSummary(companyName?: string, companyUrl?: string): Promise<CompanySummarySchema & { sources?: string[] }> {
    try {
      // Construct the research prompt based on available information
      let researchPrompt = "Research and provide comprehensive information about";
      if (companyName && companyUrl) {
        researchPrompt += ` ${companyName} (${companyUrl}).`;
      } else if (companyUrl) {
        researchPrompt += ` the company found at this URL: ${companyUrl}.`;
      } else {
        researchPrompt += ` ${companyName}.`;
      }

      console.log("💥💥 Research Prompt", researchPrompt);

      // Use Vercel AI SDK's generateText with Perplexity
      const { text, sources } = await generateText({
        model: perplexity('sonar-pro'),
        prompt: `${researchPrompt}

Focus on gathering accurate, up-to-date information about:
1. Company name and detailed description
2. Industry and market position
3. Market strategy and competitive edge
4. Core technology and technical capabilities
5. Key products or services
6. Major competitors
7. Leadership team and management
8. Funding history and financial information
9. Company facts (founding year, headquarters, revenue, employees)

If a company URL is provided, ASSUME ITS NOT A TYPO, 
IMPORTANT: Pay close attention to the company's website URL and use it as a primary source for information.
Use other sources to verify the information you find on the company's website.

Return ONLY a raw JSON object without any markdown formatting, code blocks, or additional text. The response should be a valid JSON object with this exact structure:
{
  "name": "company full legal name",
  "description": "A few sentences or paragraphs description",
  "industry": "primary industry",
  "founded": "founding year or null",
  "headquarters": "city and country or null",
  "keyProducts": ["product1", "product2"],
  "competitors": ["competitor1", "competitor2"],
  "marketPosition": "market position description",
  "marketStrategy": "market strategy description",
  "coreTechnology": "core technology description",
  "competitiveEdge": "competitive edge description",
  "fundingHistory": "funding history description",
  "leadership": "leadership description",
  "revenueRange": "revenue range or null",
  "employeeCount": "employee count or null"
}

Ensure all information is factual and current. If specific data points are not available or uncertain, use null for those fields.`,
        temperature: 0.1, // Lower temperature for more factual responses
        providerOptions: {
          perplexity: {
            return_images: false // We don't need images for this analysis
          }
        }
      });

      // Log sources for reference
      if (sources && sources.length > 0) {
        console.log('Information sources:', sources);
      }

      // Clean and parse the text response as JSON
      let cleanedText = '';
      try {
        // Clean the response by removing any markdown formatting or extra text
        cleanedText = text
          .replace(/```json\s*/g, '') // Remove ```json
          .replace(/```\s*$/g, '')    // Remove closing ```
          .trim();                    // Remove any extra whitespace

        // Try to find a JSON object in the cleaned text
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.error("No JSON object found in response");
          console.error("Raw response:", text);
          throw new Error("No valid JSON object found in response");
        }

        const parsedJson = JSON.parse(jsonMatch[0]);
        console.log("Parsed JSON:", parsedJson);

        // Validate the parsed result against our schema
        try {
          const validatedResult = companySummarySchema.parse(parsedJson);
          // Map sources to their URLs and return with the validated result
          return {
            ...validatedResult,
            sources: sources?.map(source => source.url) || []
          };
        } catch (validationError) {
          console.error("Schema validation error:", validationError);
          console.error("Parsed JSON that failed validation:", parsedJson);
          if (validationError instanceof z.ZodError) {
            throw new Error(`Failed to validate company summary: ${validationError.errors.map(e => e.message).join(", ")}`);
          }
          throw new Error("Failed to validate company summary: Invalid data structure");
        }
      } catch (parseError) {
        console.error("Error parsing or validating response:", parseError);
        console.error("Raw response:", text);
        console.error("Cleaned response:", cleanedText);
        throw new Error(`Failed to parse company summary response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }
      
    } catch (error) {
      console.error("Error generating company summary:", error);
      
      // If Perplexity fails, return a placeholder for testing
      if (!process.env.PERPLEXITY_API_KEY) {
        console.warn("Using mock summary due to missing API key");
        return {
          name: companyName || "Unknown Company",
          description: "This is a placeholder description used when the Perplexity API key is not configured.",
          industry: "Technology",
          founded: null,
          headquarters: null,
          keyProducts: ["Product 1", "Product 2", "Product 3"],
          competitors: ["Competitor 1", "Competitor 2"],
          marketPosition: "Market position information not available",
          marketStrategy: "Market strategy information not available",
          coreTechnology: "Core technology information not available",
          competitiveEdge: "Competitive edge information not available",
          fundingHistory: "Funding history information not available",
          leadership: "Leadership information not available",
          revenueRange: null,
          employeeCount: null,
          sources: []
        };
      }
      
      throw error;
    }
  }

  private async updateProcessingState(
    entryId: string, 
    progress: number, 
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      // Import dynamically to avoid circular dependencies
      const { entriesApi } = await import("@/lib/supabase/client");
      
      if (progress === 100) {
        // Mark as completed when progress is 100%
        await entriesApi.updateProcessingState(entryId, "completed", progress, metadata);
      } else {
        await entriesApi.updateProcessingState(entryId, "processing", progress, metadata);
      }
    } catch (error) {
      console.error("Error updating processing state:", error);
    }
  }
}
