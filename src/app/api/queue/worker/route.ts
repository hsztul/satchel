import { NextRequest, NextResponse } from "next/server";
import { QueueProcessorV2 } from "@/lib/agents/queue-processor-v2";
import { queueApi } from "@/lib/supabase/queue";
import { entriesApi } from "@/lib/supabase/client";

/**
 * Background worker API route
 * 
 * This route is used to process the next item in the queue.
 * It can be called by a scheduled job or manually triggered.
 */
export async function GET() {
  console.log('🔄 Worker GET: Starting to process next queue item');
  try {
    // Get the next pending queue item
    console.log('🔍 Worker GET: Fetching next pending queue item');
    const queueItem = await queueApi.getNextPendingItem();
    
    // If there are no pending items, return success
    if (!queueItem) {
      console.log('ℹ️ Worker GET: No pending queue items to process');
      return NextResponse.json({ 
        success: true, 
        message: "No pending queue items to process" 
      });
    }
    
    console.log(`✅ Worker GET: Found queue item ${queueItem.id} for entry ${queueItem.entryId}`);
    
    // Get the entry
    console.log(`🔍 Worker GET: Fetching entry ${queueItem.entryId}`);
    const entry = await entriesApi.getEntry(queueItem.entryId);
    
    if (!entry) {
      console.error(`❌ Worker GET: Entry ${queueItem.entryId} not found`);
      return NextResponse.json({ 
        success: false, 
        error: `Entry ${queueItem.entryId} not found` 
      }, { status: 404 });
    }
    
    // Get the user ID from the entry
    const userId = entry.userId;
    console.log(`👤 Worker GET: Processing for user ${userId}`);
    
    // Process the queue item
    console.log(`🔄 Worker GET: Processing queue item ${queueItem.id}`);
    await QueueProcessorV2.processNextQueueItem(userId);
    
    console.log(`✅ Worker GET: Successfully processed queue item ${queueItem.id}`);
    return NextResponse.json({ 
      success: true, 
      message: `Processed queue item ${queueItem.id} for entry ${queueItem.entryId}` 
    });
  } catch (error) {
    console.error("❌ Worker GET: Error processing queue item:", error);
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}

/**
 * POST handler for manually triggering processing for a specific entry
 * 
 * This handler processes an entry directly without adding it to the queue again.
 * It's used when the entry is already in the queue and we just want to process it.
 */
export async function POST(request: NextRequest) {
  console.log('🔄 Worker POST: Starting to process entry');
  try {
    const body = await request.json();
    console.log('📦 Worker POST: Received request body:', body);
    const { entryId, userId } = body;
    
    if (!entryId || !userId) {
      console.error('❌ Worker POST: Missing entryId or userId');
      return NextResponse.json({ 
        success: false, 
        error: "Missing entryId or userId" 
      }, { status: 400 });
    }
    
    // Get the entry
    console.log(`🔍 Worker POST: Fetching entry ${entryId}`);
    const entry = await entriesApi.getEntry(entryId);
    
    if (!entry) {
      console.error(`❌ Worker POST: Entry ${entryId} not found`);
      return NextResponse.json({ 
        success: false, 
        error: `Entry ${entryId} not found` 
      }, { status: 404 });
    }
    
    console.log(`✅ Worker POST: Found entry ${entryId} for user ${userId}`);
    
    // Instead of calling processEntry (which would create another queue item),
    // we'll process the next queue item directly
    console.log(`🔄 Worker POST: Processing next queue item for user ${userId}`);
    await QueueProcessorV2.processNextQueueItem(userId);
    
    console.log(`✅ Worker POST: Successfully processed queue item for entry ${entryId}`);
    return NextResponse.json({ 
      success: true, 
      message: `Processed queue item for entry ${entryId}` 
    });
  } catch (error) {
    console.error("❌ Worker POST: Error processing entry:", error);
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
