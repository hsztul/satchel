import { Entry } from "@/types";
import { AgentFactory } from "./agent-factory";
import { AgentContext, AgentResult } from "./types";
import { entriesApi } from "@/lib/supabase/client";

/**
 * Queue Processor
 * 
 * This class handles the processing of entries in the background.
 * It uses the agent system to process entries based on their type.
 */
export class QueueProcessor {
  /**
   * Process an entry through the agent system
   */
  static async processEntry(entry: Entry, userId: string): Promise<void> {
    try {
      console.log(`Processing entry ${entry.id} of type ${entry.type}`);
      
      // Create the agent context
      const context: AgentContext = {
        entry,
        userId
      };
      
      // Start with the entry agent
      let currentAgentName = "entry-agent";
      let result: AgentResult | null = null;
      
      // Process the entry through the agent chain
      while (currentAgentName) {
        console.log(`Running agent: ${currentAgentName} for entry ${entry.id}`);
        
        // Get the agent instance
        const agent = AgentFactory.getAgent(currentAgentName);
        
        // Process the entry with the current agent
        result = await agent.process(context);
        
        if (!result.success) {
          console.error(`Agent ${currentAgentName} failed:`, result.error);
          
          // Update the entry with the error
          await entriesApi.updateProcessingState(
            entry.id, 
            "completed", 
            100, 
            { 
              error: result.error,
              processingFailed: true
            }
          );
          
          return;
        }
        
        // Update the entry metadata with the agent result data
        if (result.data) {
          // Get the current entry to ensure we have the latest metadata
          const updatedEntry = await entriesApi.getEntry(entry.id);
          
          // Merge the existing metadata with the new data
          const updatedMetadata = {
            ...updatedEntry.metadata,
            ...result.data
          };
          
          // Update the entry with the merged metadata
          await entriesApi.updateEntry(entry.id, {
            metadata: updatedMetadata
          });
          
          // Update the context with the latest entry
          context.entry = {
            ...updatedEntry,
            metadata: updatedMetadata
          };
        }
        
        // Determine the next agent to run
        currentAgentName = (result as { nextAgent?: string }).nextAgent || "";
      }
      
      console.log(`Completed processing entry ${entry.id}`);
      
      // If we reached here and no agent marked the entry as completed,
      // mark it as completed now
      if (entry.processingState !== "completed") {
        await entriesApi.updateProcessingState(entry.id, "completed", 100);
      }
    } catch (error) {
      console.error(`Error processing entry ${entry.id}:`, error);
      
      // Update the entry with the error
      await entriesApi.updateProcessingState(
        entry.id, 
        "completed", 
        100, 
        { 
          error: error instanceof Error ? error.message : String(error),
          processingFailed: true
        }
      );
    }
  }
}
