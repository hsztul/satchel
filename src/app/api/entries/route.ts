import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { NeonEntryService, EntryType } from "@/lib/services/neon-entry-service";
import { ensureDatabaseInitialized } from "@/lib/init-db";

// Initialize the service
const entryService = new NeonEntryService();

// Make sure database is initialized on first request
let isDbInitialized = false;

// Entry schema for validation (common fields)
const BaseEntrySchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// Article schema
const ArticleSchema = BaseEntrySchema.extend({
  type: z.literal("article"),
  url: z.string().url(),
  author: z.string().optional(),
  publishedAt: z.string().optional().transform(val => val ? new Date(val) : undefined),
  content: z.string().optional(),
  imageUrl: z.string().optional(),
});

// Company schema
const CompanySchema = BaseEntrySchema.extend({
  type: z.literal("company"),
  website: z.string().url().optional(),
  industry: z.string().optional(),
  founded: z.number().int().optional(),
  location: z.string().optional(),
  employeeCount: z.number().int().optional(),
  funding: z.number().optional(),
  fundingRound: z.string().optional(),
  companyStage: z.string().optional(),
  keyPeople: z.array(z.string()).optional(),
  competitors: z.array(z.string()).optional(),
  productOffering: z.string().optional(),
});

// Note schema
const NoteSchema = BaseEntrySchema.extend({
  type: z.literal("note"),
  content: z.string(),
  category: z.string().optional(),
});

// Union of all entry types
const EntrySchema = z.discriminatedUnion("type", [
  ArticleSchema,
  CompanySchema,
  NoteSchema,
]);

export async function GET(request: NextRequest) {
  try {
    // Initialize the database if needed
    if (!isDbInitialized) {
      await ensureDatabaseInitialized();
      isDbInitialized = true;
    }
    
    // Check authentication
    const authResult = await auth();
    const userId = authResult.userId;
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const typeParam = searchParams.get("type");
    
    try {
      // Map the type param to EntryType enum
      let type: EntryType | undefined;
      if (typeParam) {
        if (typeParam === "article") type = 'ARTICLE';
        else if (typeParam === "company") type = 'COMPANY';
        else if (typeParam === "note") type = 'NOTE';
        else {
          return NextResponse.json({ error: "Invalid entry type" }, { status: 400 });
        }
      }
      
      // Get entries using our service
      const entries = await entryService.getEntries(userId, type);
      
      return NextResponse.json({ entries });
    } catch (error) {
      console.error('Error fetching entries:', error);
      return NextResponse.json({ error: "Failed to fetch entries" }, { status: 500 });
    }
  } catch (error) {
    console.error('Error fetching entries:', error);
    return NextResponse.json({ error: "Failed to fetch entries" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Initialize the database if needed
    if (!isDbInitialized) {
      await ensureDatabaseInitialized();
      isDbInitialized = true;
    }
    
    // Check authentication
    const authResult = await auth();
    const userId = authResult.userId;
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    try {
      const body = await request.json();
      
      // Validate the request body against our schemas
      const validatedData = EntrySchema.parse(body);
      
      let result;
      
      // Create the appropriate entry type based on the validated data
      switch (validatedData.type) {
        case "article":
          result = await entryService.createArticle({
            ...validatedData,
            userId,
          });
          break;
        
        case "company":
          result = await entryService.createCompany({
            ...validatedData,
            userId,
          });
          break;
        
        case "note":
          result = await entryService.createNote({
            ...validatedData,
            userId,
          });
          break;
      }
      
      return NextResponse.json({ entry: result }, { status: 201 });
    } catch (error) {
      console.error('Error creating entry:', error);
      
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.errors }, { status: 400 });
      }
      
      return NextResponse.json({ error: "Failed to create entry" }, { status: 500 });
    }
  } catch (error) {
    console.error('Error creating entry:', error);
    return NextResponse.json({ error: "Failed to create entry" }, { status: 500 });
  }
}
