/**
 * Queue Processing Script
 * 
 * This script can be run manually to process the queue.
 * It's useful for testing and development.
 * 
 * Usage:
 * npx tsx scripts/process-queue.ts
 */

import { queueApi } from '../src/lib/supabase/queue';
import { entriesApi } from '../src/lib/supabase/client';
import { QueueProcessorV2 } from '../src/lib/agents/queue-processor-v2';

async function processQueue() {
  try {
    console.log('Starting queue processing...');
    
    // Get the next pending queue item
    const queueItem = await queueApi.getNextPendingItem();
    
    if (!queueItem) {
      console.log('No pending queue items to process');
      return;
    }
    
    console.log(`Processing queue item ${queueItem.id} for entry ${queueItem.entryId}`);
    
    // Get the entry
    const entry = await entriesApi.getEntry(queueItem.entryId);
    
    // Process the queue item
    await QueueProcessorV2.processNextQueueItem(entry.userId);
    
    console.log('Queue processing completed successfully');
  } catch (error) {
    console.error('Error processing queue:', error);
  }
}

// Run the script
processQueue().then(() => {
  console.log('Script execution completed');
  process.exit(0);
}).catch((error) => {
  console.error('Script execution failed:', error);
  process.exit(1);
});
