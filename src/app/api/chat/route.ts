import { NextRequest } from "next/server";
import { openai } from "@ai-sdk/openai";
import { streamText, tool } from "ai";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { SYNAPSE_SYSTEM_PROMPT } from "@/lib/prompts";
import { searchWebViaPerplexity } from "@/lib/perplexityChat";

// --- CONFIG ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const openaiApiKey = process.env.OPENAI_API_KEY!;


// --- EMBEDDING CONFIG ---
const EMBEDDING_MODEL = "text-embedding-ada-002";
const TOP_K = 8;

// Types for source map and chunks with sources
type SourceInfo = {
  id: number;
  title: string;
  url: string;
  entry_type: string;
};

type ChunkWithSource = {
  id: string;
  entry_id: string;
  chunk_text: string;
  title: string;
  source_url: string;
  entry_type: string;
  similarity: number;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // const chatId = req.headers.get('X-Chat-Id');
    const { messages } = body;
    
    if (!messages || !Array.isArray(messages)) {
      return new Response("Invalid messages array", { status: 400 });
    }
    
    if (messages.length === 0) {
      return new Response("Empty messages array", { status: 400 });
    }
    
    // Find the last user message (might not be the last message in multi-step conversations)
    let userMessage = '';
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user' && messages[i].content) {
        userMessage = messages[i].content;
        break;
      }
    }
    
    if (!userMessage) {
      return new Response("No user message found in conversation", { status: 400 });
    }

    // 1. Embed the latest user query
    const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        input: userMessage,
        model: EMBEDDING_MODEL,
      }),
    });
    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data?.[0]?.embedding;
    if (!queryEmbedding) {
      return new Response("Failed to get embedding", { status: 500 });
    }

    // 2. Semantic search in Supabase (pgvector) with sources
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    // Use the new RPC function that includes source information
    const { data: chunksWithSources, error } = await supabase.rpc("match_entry_chunks_with_sources", {
      query_embedding: queryEmbedding,
      match_count: TOP_K,
    });
  
    if (error) {
      console.error("Supabase search error:", error);
      return new Response("Vector search failed", { status: 500 });
    }

    // 3a. Create source map with unique identifiers
    const sourceMap: Record<string, SourceInfo> = {};
    const chunks = chunksWithSources as ChunkWithSource[] || [];
  
    // Group by entry_id and assign numerical IDs
    chunks.forEach((chunk) => {
      if (!sourceMap[chunk.entry_id]) {
        // Create app link to the entry detail page
        const appLink = `/entry/${chunk.entry_id}`;
      
        sourceMap[chunk.entry_id] = {
          id: Object.keys(sourceMap).length + 1, // Assign sequential ID starting from 1
          title: chunk.title || "Untitled",
          url: chunk.source_url || appLink,
          entry_type: chunk.entry_type
        };
      }
    });
  
    // 3b. Prepare context with source markers
    let contextText = "";
    const chunksBySource: Record<string, string[]> = {};
  
    // Group chunks by source
    chunks.forEach((chunk) => {
      const sourceId = chunk.entry_id;
      if (!chunksBySource[sourceId]) {
        chunksBySource[sourceId] = [];
      }
      chunksBySource[sourceId].push(chunk.chunk_text);
    });
  
    // Format context with source markers
    Object.entries(chunksBySource).forEach(([sourceId, sourceChunks]) => {
      const sourceInfo = sourceMap[sourceId];
      contextText += `\nContext from Source [${sourceInfo.id}]:\n---\n`;
      contextText += sourceChunks.join("\n---\n");
      contextText += "\n---\n";
    });
  
    // 3c. Prepare source reference list
    const sourceReferences = Object.values(sourceMap)
      .map(source => `[${source.id}]: ${source.title} (${source.url})`)
      .join("\n");
  
    // Add source map as part of the context
    const fullContext = `${contextText}\n\nSOURCE REFERENCES:\n${sourceReferences}`;
  
    // 4. Call ai-sdk's streamText for streaming completion with citation instructions
    const result = await streamText({
      model: openai("gpt-4o"),
      system: SYNAPSE_SYSTEM_PROMPT,
      messages: [
        ...messages.slice(-8),
        { role: "system", content: `CONTEXT:\n${fullContext}` },
      ],
      maxTokens: 700,
      temperature: 0.6,
      toolCallStreaming: true, // Enable tool call streaming for better UX
      tools: {
        search_web_perplexity: tool({
          description: "Searches the web via Perplexity for current/external information. Use this tool if the provided CONTEXT is insufficient or outdated. Returns a summary and a list of citations/URLs.",
          parameters: z.object({ query: z.string().describe("The web search query") }),
          async execute({ query }) {
            try {
              const result = await searchWebViaPerplexity(query);
              return {
                summary: result.text,
                citations: result.citations,
              };
            } catch (err) {
              return {
                summary: "[Perplexity web search failed. No results returned.]",
                citations: [],
                error: err instanceof Error ? err.message : "Unknown error"
              };
            }
          },
        })
      }
    });

    return result.toDataStreamResponse();
  } catch (err) {
    console.error('[DEBUG] Chat API error:', err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
