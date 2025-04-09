import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { queueApi } from '@/lib/supabase/queue';
import { entriesApi } from '@/lib/supabase/client';

// GET /api/queue - Get all queue items for the current user
export async function GET(request: NextRequest) {
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
    console.log(`Fetching queue items for user ${userId}`);
    
    // Get all entries for the user
    const entries = await entriesApi.getEntries();
    console.log(`Found ${entries.length} entries for user ${userId}`);
    
    // Extract entry IDs
    const entryIds = entries.map(entry => entry.id);
    
    // Get queue items for all user entries
    const queueItems = [];
    
    for (const entryId of entryIds) {
      try {
        console.log(`Fetching queue items for entry ${entryId}`);
        const items = await queueApi.getQueueItemsForEntry(entryId);
        console.log(`Found ${items.length} queue items for entry ${entryId}`);
        queueItems.push(...items);
      } catch (error) {
        console.error(`Error getting queue items for entry ${entryId}:`, error);
        // Continue with other entries even if one fails
      }
    }
    
    // Sort by created date (newest first)
    queueItems.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    console.log(`Returning ${queueItems.length} queue items total`);
    return NextResponse.json({ items: queueItems });
  } catch (error) {
    console.error('Error fetching queue items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch queue items', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
