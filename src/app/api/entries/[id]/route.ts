import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { entriesApi } from "@/lib/supabase/client";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Verify authentication
  const { userId } = getAuth(request);
  
  // Temporarily allow unauthenticated requests for debugging
  // if (!userId) {
  //   return NextResponse.json(
  //     { error: "Unauthorized" },
  //     { status: 401 }
  //   );
  // }
  
  try {
    const entryId = params.id;
    
    // Get the entry from Supabase
    const entry = await entriesApi.getEntry(entryId);
    
    if (!entry) {
      return NextResponse.json(
        { error: "Entry not found" },
        { status: 404 }
      );
    }
    
    // Check if the entry belongs to the current user
    if (entry.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }
    
    return NextResponse.json({ entry });
  } catch (error) {
    console.error("Error fetching entry:", error);
    return NextResponse.json(
      { error: "Failed to fetch entry" },
      { status: 500 }
    );
  }
}
