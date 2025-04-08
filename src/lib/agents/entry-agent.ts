import { AgentContext, Agent, EntryAgentResult } from "./types";

/**
 * Entry Agent
 * 
 * This agent determines the type of entry and routes it to the appropriate agent
 * for further processing.
 */
export class EntryAgent implements Agent {
  async process(context: AgentContext): Promise<EntryAgentResult> {
    try {
      const { entry } = context;
      
      // Determine the entry type and route to the appropriate agent
      switch (entry.type) {
        case "article":
          return {
            success: true,
            entryType: "article",
            nextAgent: "article-content-agent"
          };
        
        case "company":
          return {
            success: true,
            entryType: "company",
            nextAgent: "company-summary-agent"
          };
        
        case "note":
          // Notes don't need additional processing
          return {
            success: true,
            entryType: "note",
            data: {
              title: entry.metadata.title || "New Note",
              text: entry.metadata.text || ""
            }
          };
        
        default:
          return {
            success: false,
            error: `Unknown entry type: ${entry.type}`
          };
      }
    } catch (error) {
      console.error("Error in EntryAgent:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
