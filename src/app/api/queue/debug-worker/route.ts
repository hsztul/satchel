import { NextRequest, NextResponse } from "next/server";
import { QueueProcessorV2 } from "@/lib/agents/queue-processor-v2";
import { entriesApi } from "@/lib/supabase/client";

/**
 * Debug worker API route
 * 
 * This route is used to process queue items for debugging purposes.
 * It bypasses authentication for testing in the debug dashboard.
 */
export async function POST(request: NextRequest) {
  try {
    const { entryId } = await request.json();
    
    if (!entryId) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing entryId" 
      }, { status: 400 });
    }
    
    // Get the entry
    const entry = await entriesApi.getEntry(entryId);
    
    if (!entry) {
      return NextResponse.json({ 
        success: false, 
        error: "Entry not found" 
      }, { status: 404 });
    }
    
    // Use the entry's userId
    const userId = entry.userId;
    
    // Process the entry
    await QueueProcessorV2.processEntry(entry, userId);
    
    // Start processing the queue
    setTimeout(() => {
      QueueProcessorV2.processNextQueueItem(userId)
        .catch(error => console.error("Error processing queue:", error));
    }, 1000);
    
    return NextResponse.json({ 
      success: true, 
      message: `Added entry ${entryId} to processing queue and started processing` 
    });
  } catch (error) {
    console.error("Error processing entry:", error);
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
