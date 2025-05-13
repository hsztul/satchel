import { NextRequest } from "next/server";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { createClient } from "@supabase/supabase-js";

// --- CONFIG ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const openaiApiKey = process.env.OPENAI_API_KEY!;

const SYSTEM_PROMPT = `You are \"Synapse,\" an AI co-founder and research assistant for the \"Satchel\" platform. You are knowledgeable, insightful, and slightly informal but always professional. You have access to a collection of processed articles and company research. When answering questions, ground your responses in the provided context. If the context doesn't contain the answer, say so. Be proactive in suggesting connections or implications for startup ideas if appropriate. Your goal is to help your human co-founders think creatively and strategically using the information within Satchel.`;

// --- EMBEDDING CONFIG ---
const EMBEDDING_MODEL = "text-embedding-ada-002";
const TOP_K = 8;

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

  // 2. Semantic search in Supabase (pgvector)
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  // Assumes an RPC function 'match_entry_chunks' exists for vector search
  const { data: chunks, error } = await supabase.rpc("match_entry_chunks", {
    query_embedding: queryEmbedding,
    match_count: TOP_K,
  });
  if (error) {
    console.error("Supabase search error:", error);
    return new Response("Vector search failed", { status: 500 });
  }

  // 3. Prepare context
  const contextText = (chunks || [])
    .map((c: any) => c.chunk_text)
    .join("\n---\n");

  // 4. Call ai-sdk's streamText for streaming completion
  const result = await streamText({
    model: openai("gpt-4o"),
    system: SYSTEM_PROMPT,
    messages: [
      ...messages.slice(-8),
      { role: "system", content: `CONTEXT:\n${contextText}` },
    ],
    maxTokens: 700,
    temperature: 0.6,
  });

  return result.toDataStreamResponse();
}
