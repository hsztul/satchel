import { NextRequest, NextResponse } from "next/server";
import { queueApi } from "@/lib/supabase/queue";
import { entriesApi } from "@/lib/supabase/client";
import { QueueProcessorV2 } from "@/lib/agents/queue-processor-v2";

/**
 * Cron job to process the queue
 * 
 * This endpoint is designed to be called by a scheduler (like Vercel Cron)
 * to process pending queue items regularly.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify the request is authorized (optional - you can add a secret token check here)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.slice(7) !== cronSecret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get pending queue items
    const pendingItems = [];
    try {
      // Get up to 10 pending items
      for (let i = 0; i < 10; i++) {
        const item = await queueApi.getNextPendingItem();
        if (!item) break;
        pendingItems.push(item);
        
        // Mark as processing to avoid duplicate processing
        await queueApi.updateQueueItemStatus(item.id, "processing");
      }
    } catch (error) {
      console.error("Error fetching pending queue items:", error);
      throw error;
    }
      
    if (pendingItems.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: "No pending queue items to process" 
      });
    }
    
    // Process each queue item
    const processPromises = pendingItems.map(async (item) => {
      try {
        // Get the entry
        const entry = await entriesApi.getEntry(item.entryId);
        
        // Process the queue item
        await QueueProcessorV2.processNextQueueItem(entry.userId);
        
        return { id: item.id, status: "processing" };
      } catch (error) {
        console.error(`Error processing queue item ${item.id}:`, error);
        return { id: item.id, error: error instanceof Error ? error.message : String(error) };
      }
    });
    
    const results = await Promise.all(processPromises);
    
    return NextResponse.json({ 
      success: true, 
      processed: results.length,
      results
    });
  } catch (error) {
    console.error("Error in cron job:", error);
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
