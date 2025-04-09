import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { entriesApi } from '@/lib/supabase/client';
import { queueApi } from '@/lib/supabase/queue';

// POST /api/queue/process - Manually process an entry
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const userId = user.id;
    
    // Parse the request body
    const body = await request.json();
    const { entryId } = body;

    // Validate the request
    if (!entryId) {
      return NextResponse.json(
        { error: 'Entry ID is required' },
        { status: 400 }
      );
    }
    
    console.log(`Manual processing requested for entry ${entryId} by user ${userId}`);
    
    // Get the entry
    const entry = await entriesApi.getEntry(entryId);
    
    if (!entry) {
      return NextResponse.json(
        { error: `Entry ${entryId} not found` },
        { status: 404 }
      );
    }
    
    // Check if entry belongs to the user
    if (entry.userId !== userId) {
      return NextResponse.json(
        { error: "You don't have permission to process this entry" },
        { status: 403 }
      );
    }
    
    // Update the entry state to processing
    await entriesApi.updateProcessingState(entryId, 'processing', 0);
    
    // Add the entry to the queue with the entry-agent
    console.log(`Adding entry ${entryId} to queue with agent entry-agent`);
    const queueItem = await queueApi.addToQueue(entryId, "entry-agent");
    
    // Return success
    return NextResponse.json({
      success: true,
      message: `Entry ${entryId} added to processing queue`,
      queueItemId: queueItem.id
    });
  } catch (error) {
    console.error('Error processing entry:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process entry',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
