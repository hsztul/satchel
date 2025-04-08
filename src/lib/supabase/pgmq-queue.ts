import { createClient } from '@supabase/supabase-js';
import { QueueItem } from './queue';

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

// Create the queue if it doesn't exist
const initializeQueue = async () => {
  try {
    // Check if queue exists
    const { data: queueExists, error: checkError } = await supabase.rpc(
      'pgmq_public.queue_exists',
      { queue_name: QUEUE_NAME }
    );

    if (checkError) {
      console.error('Error checking if queue exists:', checkError);
      throw checkError;
    }

    // If queue doesn't exist, create it
    if (!queueExists) {
      const { data, error } = await supabase.rpc(
        'pgmq_public.create',
        { queue_name: QUEUE_NAME }
      );

      if (error) {
        console.error('Error creating queue:', error);
        throw error;
      }

      console.log(`Queue ${QUEUE_NAME} created successfully`);
    } else {
      console.log(`Queue ${QUEUE_NAME} already exists`);
    }
  } catch (error) {
    console.error('Error initializing queue:', error);
    throw error;
  }
};

// Initialize the queue
initializeQueue().catch(console.error);

export const pgmqApi = {
  /**
   * Add a message to the queue
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
      
      // Send message to queue
      const { data, error } = await supabase.rpc(
        'pgmq_public.send',
        { 
          queue_name: QUEUE_NAME, 
          message: JSON.stringify(message),
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
   * Get the next pending message from the queue
   */
  async getNextPendingItem(): Promise<QueueItem | null> {
    try {
      // Pop a message from the queue
      const { data, error } = await supabase.rpc(
        'pgmq_public.pop',
        { queue_name: QUEUE_NAME }
      );

      if (error) {
        console.error('Error getting next pending queue item:', error);
        throw error;
      }

      // If no message is available, return null
      if (!data) {
        return null;
      }

      // Parse the message payload
      const message = JSON.parse(data.message);
      
      // Create a QueueItem object to return
      const queueItem: QueueItem = {
        id: data.message_id,
        entryId: message.entryId,
        agentName: message.agentName,
        status: 'processing', // When we pop a message, it's being processed
        attempts: message.attempts + 1,
        createdAt: message.createdAt,
        updatedAt: new Date().toISOString()
      };
      
      return queueItem;
    } catch (error) {
      console.error('Error getting next pending queue item:', error);
      return null;
    }
  },

  /**
   * Complete processing of a message (archive it)
   */
  async completeItem(messageId: string, result?: Record<string, any>): Promise<void> {
    try {
      // Archive the message
      const { error } = await supabase.rpc(
        'pgmq_public.archive',
        { queue_name: QUEUE_NAME, message_id: messageId }
      );

      if (error) {
        console.error(`Error completing queue item ${messageId}:`, error);
        throw error;
      }

      console.log(`Successfully completed queue item ${messageId}`);
    } catch (error) {
      console.error(`Error completing queue item ${messageId}:`, error);
      throw error;
    }
  },

  /**
   * Mark a message as failed
   */
  async failItem(messageId: string, errorMessage: string): Promise<void> {
    try {
      // Delete the message (we could archive it instead if we want to keep a record)
      const { error } = await supabase.rpc(
        'pgmq_public.delete',
        { queue_name: QUEUE_NAME, message_id: messageId }
      );

      if (error) {
        console.error(`Error marking queue item ${messageId} as failed:`, error);
        throw error;
      }

      console.log(`Marked queue item ${messageId} as failed: ${errorMessage}`);
    } catch (error) {
      console.error(`Error marking queue item ${messageId} as failed:`, error);
      throw error;
    }
  },

  /**
   * Get all messages in the queue (for debugging)
   */
  async getAllQueueItems(): Promise<QueueItem[]> {
    try {
      // Read messages from the queue without removing them
      const { data, error } = await supabase.rpc(
        'pgmq_public.read',
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
      const queueItems: QueueItem[] = data.map(item => {
        const message = JSON.parse(item.message);
        return {
          id: item.message_id,
          entryId: message.entryId,
          agentName: message.agentName,
          status: message.status || 'pending',
          attempts: message.attempts || 0,
          createdAt: message.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      });
      
      return queueItems;
    } catch (error) {
      console.error('Error getting all queue items:', error);
      return [];
    }
  },

  /**
   * Get all messages for a specific entry
   */
  async getQueueItemsForEntry(entryId: string): Promise<QueueItem[]> {
    try {
      // Get all messages and filter by entryId
      const allItems = await this.getAllQueueItems();
      return allItems.filter(item => item.entryId === entryId);
    } catch (error) {
      console.error(`Error getting queue items for entry ${entryId}:`, error);
      return [];
    }
  }
};
