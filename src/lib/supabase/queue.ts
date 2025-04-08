import { createClient } from '@supabase/supabase-js';

export interface QueueItem {
  id: string;
  entryId: string;
  agentName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  result?: Record<string, any>;
  error?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

// Initialize the Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if environment variables are set
if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase environment variables are not set correctly');
  throw new Error('Supabase environment variables are missing');
}

// Create Supabase client with proper configuration
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Queue name for processing entries
const QUEUE_NAME = 'entry_processing_queue';

export const queueApi = {
  /**
   * Add an item to the processing queue
   */
  async addToQueue(entryId: string, agentName: string): Promise<QueueItem> {
    try {
      console.log(`Adding queue item for entry ${entryId} with agent ${agentName}`);
      
      // Create message payload
      const message = {
        entryId,
        agentName,
        status: 'pending',
        attempts: 0,
        createdAt: new Date().toISOString(),
      };
      
      // Send message to queue using PGMQ via pgmq_public schema
      // Following the Supabase docs example: https://supabase.com/docs/guides/queues/quickstart
      const { data, error } = await supabase.schema('pgmq_public').rpc(
        'send',
        { 
          queue_name: QUEUE_NAME, 
          message, // Use 'message' parameter name with pgmq_public
          sleep_seconds: 0 // No delay
        }
      );

      if (error) {
        console.error(`Error adding item to queue for entry ${entryId}:`, error);
        throw error;
      }

      // The message_id is returned from the send function
      const messageId = data;
      
      console.log(`Successfully added queue item for entry ${entryId}, message ID: ${messageId}`);
      
      // Create a QueueItem object to return
      const queueItem: QueueItem = {
        id: messageId,
        entryId,
        agentName,
        status: 'pending',
        attempts: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      return queueItem;
    } catch (error) {
      console.error(`Failed to add queue item for entry ${entryId}:`, error);
      // Return a fallback item instead of throwing to prevent application crashes
      const fallbackItem: QueueItem = {
        id: `fallback-${Date.now()}`,
        entryId,
        agentName,
        status: 'pending',
        attempts: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      return fallbackItem;
    }
  },

  /**
   * Get all queue items for an entry
   */
  async getQueueItemsForEntry(entryId: string): Promise<QueueItem[]> {
    try {
      // Read messages from the queue without removing them
      // Using pgmq_public schema as per Supabase docs
      const { data, error } = await supabase.schema('pgmq_public').rpc(
        'read',
        { 
          queue_name: QUEUE_NAME,
          sleep_seconds: 0, // No visibility timeout
          n: 100 // Get up to 100 messages
        }
      );

      if (error) {
        console.error(`Error getting queue items for entry ${entryId}:`, error);
        throw error;
      }

      // If no messages are available, return empty array
      if (!data || !Array.isArray(data)) {
        return [];
      }

      // Filter and map the messages to QueueItem objects
      const queueItems: QueueItem[] = data
        .map(item => {
          try {
            // Handle both string and object message formats
            let message: any;
            if (typeof item.message === 'string') {
              message = JSON.parse(item.message);
            } else if (typeof item.message === 'object') {
              message = item.message;
            } else {
              console.error('Unexpected message format:', item.message);
              return null;
            }
            
            return {
              id: item.message_id,
              entryId: message.entryId,
              agentName: message.agentName,
              status: message.status || 'pending',
              attempts: message.attempts || 0,
              result: message.result,
              error: message.error,
              createdAt: message.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              completedAt: message.completedAt
            };
          } catch (e) {
            console.error('Error parsing message:', e, 'Message was:', item.message);
            return null;
          }
        })
        .filter(item => item !== null && item.entryId === entryId) as QueueItem[];
      
      return queueItems;
    } catch (error) {
      console.error(`Error getting queue items for entry ${entryId}:`, error);
      return [];
    }
  },

  /**
   * Get the next pending queue item
   */
  async getNextPendingItem(): Promise<QueueItem | null> {
    console.log('🔍 Queue API: Getting next pending queue item');
    try {
      // Pop a message from the queue
      // Using pgmq_public schema as per Supabase docs
      console.log('🔍 Queue API: Calling pgmq_public.pop for queue', QUEUE_NAME);
      const { data, error } = await supabase.schema('pgmq_public').rpc(
        'pop',
        { queue_name: QUEUE_NAME }
      );

      if (error) {
        console.error('❌ Queue API: Error getting next pending queue item:', error);
        throw error;
      }

      // If no message is available, return null
      if (!data || !Array.isArray(data) || data.length === 0) {
        console.log('ℹ️ Queue API: No pending queue items found');
        return null;
      }

      console.log('✅ Queue API: Received data from pop:', JSON.stringify(data, null, 2));
      
      // The pop function returns an array with a single item
      const queueData = data[0];
      
      if (!queueData) {
        console.error('❌ Queue API: Queue data is empty');
        return null;
      }
      
      console.log('📦 Queue API: Queue data:', JSON.stringify(queueData, null, 2));
      
      // Parse the message payload - handle both string and object formats
      let message: any;
      try {
        console.log('📦 Queue API: Message type is:', typeof queueData.message);
        if (queueData.message === undefined) {
          console.error('❌ Queue API: Message is undefined');
          return null;
        } else if (typeof queueData.message === 'string') {
          console.log('🔍 Queue API: Parsing string message');
          message = JSON.parse(queueData.message);
        } else if (typeof queueData.message === 'object') {
          console.log('🔍 Queue API: Using object message directly');
          message = queueData.message;
        } else {
          console.error('❌ Queue API: Unexpected message format:', typeof queueData.message, queueData.message);
          return null;
        }
        console.log('✅ Queue API: Successfully parsed message:', JSON.stringify(message, null, 2));
      } catch (e) {
        console.error('❌ Queue API: Error parsing message:', e, 'Message was:', queueData.message);
        return null;
      }
      
      // Create a QueueItem object to return
      const queueItem: QueueItem = {
        id: queueData.msg_id.toString(), // Use msg_id from the queue data
        entryId: message.entryId,
        agentName: message.agentName,
        status: 'processing', // When we pop a message, it's being processed
        attempts: (message.attempts || 0) + 1, // Handle case where attempts is undefined
        result: message.result,
        error: message.error,
        createdAt: message.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: message.completedAt
      };
      
      return queueItem;
    } catch (error) {
      console.error('Error getting next pending queue item:', error);
      return null;
    }
  },

  /**
   * Update a queue item's status
   */
  async updateQueueItemStatus(
    id: string, 
    status: 'pending' | 'processing' | 'completed' | 'failed',
    result?: Record<string, any>,
    error?: string
  ): Promise<QueueItem> {
    console.log(`📝 Queue API: Updating queue item ${id} status to ${status}`);
    try {
      // Convert string ID to number if it's a numeric string
      const messageId = parseInt(id, 10);
      
      if (isNaN(messageId)) {
        console.error(`❌ Queue API: Invalid message ID: ${id}`);
        throw new Error(`Invalid message ID: ${id}`);
      }
      
      console.log(`📝 Queue API: Using message ID ${messageId} (converted from ${id})`);
      
      if (status === 'completed') {
        // Archive the message
        // Using pgmq_public schema as per Supabase docs
        console.log(`📝 Queue API: Archiving message ${messageId} in queue ${QUEUE_NAME}`);
        const { error: archiveError } = await supabase.schema('pgmq_public').rpc(
          'archive',
          { queue_name: QUEUE_NAME, message_id: messageId }
        );

        if (archiveError) {
          console.error(`❌ Queue API: Error archiving queue item ${id}:`, archiveError);
          throw archiveError;
        }
        
        console.log(`✅ Queue API: Successfully completed and archived queue item ${id}`);
      } else if (status === 'failed') {
        // Delete the message (we could archive it instead if we want to keep a record)
        // Using pgmq_public schema as per Supabase docs
        console.log(`📝 Queue API: Deleting failed message ${messageId} from queue ${QUEUE_NAME}`);
        const { error: deleteError } = await supabase.schema('pgmq_public').rpc(
          'delete',
          { queue_name: QUEUE_NAME, message_id: messageId }
        );

        if (deleteError) {
          console.error(`❌ Queue API: Error deleting failed queue item ${id}:`, deleteError);
          throw deleteError;
        }
        
        console.log(`✅ Queue API: Marked queue item ${id} as failed and deleted it`);
      }
      
      // Since we've either archived or deleted the message, we can't return the updated item
      // Instead, we'll return a constructed QueueItem with the updated status
      return {
        id,
        entryId: '', // We don't have this information anymore
        agentName: '', // We don't have this information anymore
        status,
        attempts: 0,
        result,
        error,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: status === 'completed' || status === 'failed' ? new Date().toISOString() : undefined
      };
    } catch (error) {
      console.error(`Error updating queue item ${id}:`, error);
      throw error;
    }
  },

  /**
   * Get all queue items (for debugging)
   */
  async getAllQueueItems(): Promise<QueueItem[]> {
    try {
      // Read messages from the queue without removing them
      // Using pgmq_public schema as per Supabase docs
      const { data, error } = await supabase.schema('pgmq_public').rpc(
        'read',
        { 
          queue_name: QUEUE_NAME,
          sleep_seconds: 0, // No visibility timeout
          n: 100 // Get up to 100 messages
        }
      );

      if (error) {
        console.error('Error getting all queue items:', error);
        throw error;
      }

      // If no messages are available, return empty array
      if (!data || !Array.isArray(data)) {
        return [];
      }

      // Map the messages to QueueItem objects
      const queueItems: QueueItem[] = data
        .map(item => {
          try {
            // Handle both string and object message formats
            let message: any;
            if (typeof item.message === 'string') {
              message = JSON.parse(item.message);
            } else if (typeof item.message === 'object') {
              message = item.message;
            } else {
              console.error('Unexpected message format:', item.message);
              return null;
            }
            
            return {
              id: item.message_id,
              entryId: message.entryId,
              agentName: message.agentName,
              status: message.status || 'pending',
              attempts: message.attempts || 0,
              result: message.result,
              error: message.error,
              createdAt: message.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              completedAt: message.completedAt
            };
          } catch (e) {
            console.error('Error parsing message:', e, 'Message was:', item.message);
            return null;
          }
        })
        .filter(item => item !== null) as QueueItem[];
      
      return queueItems;
    } catch (error) {
      console.error('Error getting all queue items:', error);
      return [];
    }
  }
};
