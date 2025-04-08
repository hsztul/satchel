import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { Entry, EntryType } from "@/types";
import { entriesApi } from "@/lib/supabase/client";
import { QueueProcessorV2 } from "@/lib/agents/queue-processor-v2";

export async function POST(request: NextRequest) {
  // Verify authentication
  const { userId } = getAuth(request);
  // Temporarily allow unauthenticated requests for debugging
  // if (!userId) {
  //   return NextResponse.json(
  //     { error: "Unauthorized" },
  //     { status: 401 }
  //   );
  // }
  
  // Use a test user ID if not authenticated
  const effectiveUserId = userId || 'test-user-id';
  
  try {
    console.log('POST /api/entries - Request received');
    const body = await request.json();
    console.log('Request body:', body);
    const { type, url, text, title } = body;

    // Validate required fields
    if (!type) {
      return NextResponse.json(
        { error: "Entry type is required" },
        { status: 400 }
      );
    }

    // Validate URL for article and company types
    if ((type === "article" || type === "company") && !url) {
      return NextResponse.json(
        { error: `URL is required for ${type} entries` },
        { status: 400 }
      );
    }

    // Validate text for note type
    if (type === "note" && !text) {
      return NextResponse.json(
        { error: "Text is required for note entries" },
        { status: 400 }
      );
    }

    // Prepare initial metadata based on entry type
    const initialMetadata = {
      ...(type === "article" && { title: "Processing article..." }),
      ...(type === "company" && { 
        // Don't set a placeholder company name, let the agent determine it
      }),
      ...(type === "note" && { 
        title: title || "New Note", 
        text 
      }),
    };

    // Create a new entry using Supabase
    console.log('Creating entry with:', { effectiveUserId, type, url, initialMetadata });
    let newEntry;
    try {
      // Log the Supabase URL and key (without revealing the full key)
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKeyPrefix = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 5);
      console.log('Supabase config:', { 
        url: supabaseUrl, 
        keyPrefix: supabaseKeyPrefix ? `${supabaseKeyPrefix}...` : 'not set' 
      });
      
      newEntry = await entriesApi.createEntry(
        effectiveUserId,
        type as EntryType,
        url,
        initialMetadata
      );
      console.log('Entry created successfully:', newEntry);
      
      // Start background processing using our queue-based agent system
      // This will add the entry to the processing queue and start processing asynchronously
      QueueProcessorV2.processEntry(newEntry, effectiveUserId);
      return NextResponse.json({ entry: newEntry }, { status: 201 });
    } catch (createError) {
      console.error('Error in entriesApi.createEntry:', createError instanceof Error ? {
        message: createError.message,
        name: createError.name,
        stack: createError.stack
      } : createError);
      throw createError;
    }
  } catch (error) {
    console.error("Error creating entry:", error);
    // Log the detailed error for debugging
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    return NextResponse.json(
      { error: "Failed to create entry", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Helper function to manually trigger processing for an entry
// This can be useful for testing or reprocessing entries
async function triggerProcessing(entryId: string, userId: string) {
  try {
    const entry = await entriesApi.getEntry(entryId);
    return QueueProcessorV2.processEntry(entry, userId);
  } catch (error) {
    console.error(`Error triggering processing for entry ${entryId}:`, error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  // Verify authentication
  const { userId } = getAuth(request);
  // Temporarily allow unauthenticated requests for debugging
  // if (!userId) {
  //   return NextResponse.json(
  //     { error: "Unauthorized" },
  //     { status: 401 }
  //   );
  // }
  
  // Use a test user ID if not authenticated
  const effectiveUserId = userId || 'test-user-id';
  
  try {
    // Get entries from Supabase
    const entries = await entriesApi.getEntries();
    
    // Filter by the current user (the API should already do this, but just to be safe)
    const userEntries = entries.filter(entry => entry.userId === effectiveUserId);
    
    return NextResponse.json({ entries: userEntries });
  } catch (error) {
    console.error("Error fetching entries:", error);
    return NextResponse.json(
      { error: "Failed to fetch entries" },
      { status: 500 }
    );
  }
}
