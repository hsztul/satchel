import { NextRequest } from "next/server";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { createClient } from "@supabase/supabase-js";

// --- CONFIG ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const openaiApiKey = process.env.OPENAI_API_KEY!;

const SYSTEM_PROMPT = `You are \"Synapse,\" an AI co-founder and research assistant for the \"Satchel\" platform. You are knowledgeable, insightful, and slightly informal but always professional. You have access to a collection of processed articles and company research. When answering questions, ground your responses in the provided context. If the context doesn't contain the answer, say so. Be proactive in suggesting connections or implications for startup ideas if appropriate. Your goal is to help your human co-founders think creatively and strategically using the information within Satchel.

When you use information directly from the provided context, you MUST cite the source using its numerical identifier (e.g., 'as stated in [1]', or '...according to source [2].'). If multiple sources support a statement, you can cite them like [1, 2]. At the end of your response, list all numerical source IDs you cited with their titles and links.`;

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
  const { messages } = await req.json();
  const userMessage = messages[messages.length - 1]?.content;
  if (!userMessage) {
    return new Response("No user message", { status: 400 });
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
    system: SYSTEM_PROMPT,
    messages: [
      ...messages.slice(-8),
      { role: "system", content: `CONTEXT:\n${fullContext}` },
    ],
    maxTokens: 700,
    temperature: 0.6,
  });

  return result.toDataStreamResponse();
}
