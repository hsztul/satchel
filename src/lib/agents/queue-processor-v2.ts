import { Entry, QueueItem } from "@/types";
import { AgentFactory } from "./agent-factory";
import { AgentContext, AgentResult } from "./types";
import { entriesApi } from "@/lib/supabase/client";
import { queueApi } from "@/lib/supabase/queue";

/**
 * Queue Processor V2
 * 
 * This class handles the processing of entries using a queue-based system.
 * It uses the agent system to process entries based on their type.
 */
export class QueueProcessorV2 {
  /**
   * Process an entry through the agent system
   */
  static async processEntry(entry: Entry, userId: string): Promise<void> {
    try {
      console.log(`Processing entry ${entry.id} for user ${userId}`);
      
      // Update the entry state to processing
      await entriesApi.updateProcessingState(entry.id, 'processing', 0);
      
      // Add the entry to the queue with the initial entry-agent
      console.log(`Adding entry ${entry.id} to queue with agent entry-agent`);
      const queueItem = await queueApi.addToQueue(entry.id, "entry-agent");
      console.log(`Successfully added entry ${entry.id} to queue, queue item ID: ${queueItem.id}`);
      
      // Trigger the worker to start processing
      try {
        // Always use an absolute URL for fetch to avoid issues in different contexts
        let workerUrl = '';
        
        // Check if we're in a browser environment
        if (typeof window !== 'undefined') {
          // We're in the browser, use the window.location to build the URL
          const baseUrl = `${window.location.protocol}//${window.location.host}`;
          workerUrl = `${baseUrl}/api/queue/worker`;
        } else {
          // We're in a server environment, we need to use a fully qualified URL
          // Since we don't have access to the host in server context, we'll use a relative URL with the origin
          const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          workerUrl = `${origin}/api/queue/worker`;
        }
        
        console.log(`Triggering worker at URL: ${workerUrl}`);
        
        const response = await fetch(workerUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ entryId: entry.id, userId }),
        });
        
        if (!response.ok) {
          console.warn(`Worker trigger returned non-OK status: ${response.status}`);
        } else {
          console.log(`Worker triggered successfully for entry ${entry.id}`);
        }
      } catch (workerError) {
        console.warn('Failed to trigger worker, but queue item was created:', workerError);
        // This is non-fatal, as the queue item was created successfully
      }
    } catch (error) {
      console.error(`Error adding entry ${entry.id} to processing queue:`, error);
      // Update the entry state to failed
      await entriesApi.updateProcessingState(entry.id, 'failed', 0);
      throw error;
    }
  }
  
  /**
   * Process the next item in the queue
   * This is called recursively to process all items in the queue
   */
  static async processNextQueueItem(userId: string): Promise<void> {
    console.log(`🔄 QueueProcessor: Starting to process next queue item for user ${userId}`);
    try {
      // Get the next pending queue item
      console.log(`🔍 QueueProcessor: Fetching next pending queue item`);
      const queueItem = await queueApi.getNextPendingItem();
      
      // If there are no pending items, we're done
      if (!queueItem) {
        console.log(`ℹ️ QueueProcessor: No pending queue items to process for user ${userId}`);
        return;
      }
      
      console.log(`✅ QueueProcessor: Found queue item ${queueItem.id} for entry ${queueItem.entryId || 'unknown'} with agent ${queueItem.agentName || 'unknown'}`);
      console.log(`📦 QueueProcessor: Queue item details:`, JSON.stringify(queueItem, null, 2));
      
      // Mark the queue item as processing
      console.log(`📝 QueueProcessor: Marking queue item ${queueItem.id} as processing`);
      await queueApi.updateQueueItemStatus(queueItem.id, "processing");
      
      // Get the entry
      console.log(`🔍 QueueProcessor: Fetching entry ${queueItem.entryId}`);
      const entry = await entriesApi.getEntry(queueItem.entryId);
      
      if (!entry) {
        console.error(`❌ QueueProcessor: Entry ${queueItem.entryId} not found`);
        await queueApi.updateQueueItemStatus(queueItem.id, "failed", undefined, `Entry ${queueItem.entryId} not found`);
        
        // Continue processing the next item
        console.log(`🔄 QueueProcessor: Moving to next queue item after entry not found`);
        return this.processNextQueueItem(userId);
      }
      
      // Log entry details without accessing content property
      console.log(`✅ QueueProcessor: Found entry ${entry.id} of type ${entry.type}`);
      console.log(`📦 QueueProcessor: Entry details:`, JSON.stringify(entry, null, 2));
      
      // Create the agent context
      const context: AgentContext = {
        entry,
        userId
      };
      
      // Check if we need to override the agent based on entry state
      let agentName = queueItem.agentName;
      
      // For article entries, ensure content is fetched before summary
      if (entry.type === 'article' && agentName === 'article-summary-agent') {
        // Check if content exists in metadata
        if (!entry.metadata?.content) {
          console.log(`⚠️ QueueProcessor: Entry ${entry.id} has no content. Overriding agent to article-content-agent`);
          agentName = 'article-content-agent';
        }
      }
      
      // Get the agent from the factory
      console.log(`🤖 QueueProcessor: Getting agent ${agentName}`);
      const agent = AgentFactory.getAgent(agentName);
      
      if (!agent) {
        console.error(`❌ QueueProcessor: Agent ${agentName} not found`);
        await queueApi.updateQueueItemStatus(queueItem.id, "failed", undefined, `Agent ${agentName} not found`);
        
        // Continue processing the next item
        console.log(`🔄 QueueProcessor: Moving to next queue item after agent not found`);
        return this.processNextQueueItem(userId);
      }
      
      // Process the entry with the agent
      console.log(`🔄 QueueProcessor: Processing entry ${entry.id} with agent ${agentName}`);
      const result = await agent.process(context);
      
      console.log(`✅ QueueProcessor: Agent processing complete, result:`, result);
      
      // Handle the result
      console.log(`🔄 QueueProcessor: Handling agent result for queue item ${queueItem.id}`);
      await this.handleAgentResult(queueItem, result, entry);
      
      // Process the next item in the queue
      console.log(`🔄 QueueProcessor: Moving to next queue item`);
      return this.processNextQueueItem(userId);
    } catch (error) {
      console.error(`❌ QueueProcessor: Error processing queue item:`, error);
      
      // Continue processing the next item
      console.log(`🔄 QueueProcessor: Retrying next queue item after error in 1 second`);
      setTimeout(() => {
        this.processNextQueueItem(userId);
      }, 1000);
    }
  }
  
  /**
   * Handle the result of an agent's processing
   */
  private static async handleAgentResult(
    queueItem: QueueItem, 
    result: AgentResult, 
    entry: Entry
  ): Promise<void> {
    try {
      if (!result.success) {
        console.error(`Agent ${queueItem.agentName} failed:`, result.error);
        
        // Mark the queue item as failed
        await queueApi.updateQueueItemStatus(queueItem.id, "failed", undefined, result.error);
        
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
      
      // Mark the queue item as completed
      await queueApi.updateQueueItemStatus(queueItem.id, "completed", result.data);
      
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
      }
      
      // Determine if there's a next agent to run
      const nextAgent = (result as unknown as { nextAgent: string }).nextAgent;
      
      if (nextAgent) {
        console.log(`Adding next agent ${nextAgent} to queue for entry ${entry.id}`);
        
        // Add the next agent to the queue
        await queueApi.addToQueue(entry.id, nextAgent);
      } else {
        console.log(`Processing completed for entry ${entry.id}`);
        
        // Mark the entry as completed if there's no next agent
        await entriesApi.updateProcessingState(entry.id, "completed", 100);
      }
    } catch (error) {
      console.error(`Error handling agent result for queue item ${queueItem.id}:`, error);
      
      // Mark the queue item as failed
      await queueApi.updateQueueItemStatus(queueItem.id, "failed", undefined, 
        error instanceof Error ? error.message : String(error)
      );
      
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
