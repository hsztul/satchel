import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectionService } from "@/lib/services";
import { auth } from "@clerk/nextjs/server";

// Connection creation schema
const CreateConnectionSchema = z.object({
  fromEntryId: z.string(),
  toEntryId: z.string(),
  strength: z.number().min(1).max(10).optional().default(1),
  description: z.string().optional(),
  aiGenerated: z.boolean().optional().default(false),
});

// Get connections for an entry
export async function GET(request: NextRequest) {
  const authResult = await auth();
  const userId = authResult.userId;
  
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const entryId = searchParams.get("entryId");
  
  if (!entryId) {
    return NextResponse.json({ error: "Entry ID is required" }, { status: 400 });
  }
  
  try {
    const connections = await connectionService.getEntryConnections(entryId, userId);
    return NextResponse.json({ connections });
  } catch (error) {
    console.error('Error fetching connections:', error);
    return NextResponse.json({ error: "Failed to fetch connections" }, { status: 500 });
  }
}

// Create a connection between entries
export async function POST(request: NextRequest) {
  const authResult = await auth();
  const userId = authResult.userId;
  
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const body = await request.json();
    
    // Validate request body
    const validatedData = CreateConnectionSchema.parse(body);
    
    // Create the connection
    const connection = await connectionService.createConnection(
      validatedData.fromEntryId,
      validatedData.toEntryId,
      userId,
      {
        strength: validatedData.strength,
        description: validatedData.description,
        aiGenerated: validatedData.aiGenerated,
      }
    );
    
    if (!connection) {
      return NextResponse.json({ error: "Failed to create connection. One or both entries may not exist." }, { status: 404 });
    }
    
    return NextResponse.json({ connection }, { status: 201 });
  } catch (error) {
    console.error('Error creating connection:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    
    return NextResponse.json({ error: "Failed to create connection" }, { status: 500 });
  }
}

// Delete a connection between entries
export async function DELETE(request: NextRequest) {
  const authResult = await auth();
  const userId = authResult.userId;
  
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const fromEntryId = searchParams.get("fromEntryId");
  const toEntryId = searchParams.get("toEntryId");
  
  if (!fromEntryId || !toEntryId) {
    return NextResponse.json({ error: "Both fromEntryId and toEntryId are required" }, { status: 400 });
  }
  
  try {
    const success = await connectionService.deleteConnection(fromEntryId, toEntryId, userId);
    
    if (!success) {
      return NextResponse.json({ error: "Failed to delete connection. Connection may not exist." }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting connection:', error);
    return NextResponse.json({ error: "Failed to delete connection" }, { status: 500 });
  }
}
