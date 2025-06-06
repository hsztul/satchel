import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
import { supabase } from "@/lib/supabase";

// Approximate max tokens per chunk for OpenAI embeddings (e.g., 800 tokens ~ 3000 chars)
const CHUNK_SIZE = 3000; // characters, for simplicity
const CHUNK_OVERLAP = 400;

function chunkText(text: string, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    if (end === text.length) break;
    start += chunkSize - overlap;
  }
  return chunks;
}

export async function embedChunksAndStore({
  entryId,
  text,
}: {
  entryId: string;
  text: string;
}): Promise<{ success: boolean; error?: string }> {
  // Fetch entry's industries for context
  const { data: entry } = await supabase
    .from('entries')
    .select('industries')
    .eq('id', entryId)
    .single();
  
  const industries = entry?.industries || [];
  const chunks = chunkText(text);
  let chunkOrder = 0;
  for (const chunk of chunks) {
    try {
      // Add industry context to chunk if available
      const contextualizedChunk = industries.length > 0
        ? `Context: This content is related to the following industries: ${industries.join(', ')}\n\nContent: ${chunk}`
        : chunk;

      // Call OpenAI embedding API
      const embeddingResp = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: contextualizedChunk,
      });
      const embedding = embeddingResp.data[0].embedding;
      // Store in entry_chunks table
      const { error } = await supabase.from("entry_chunks").insert({
        entry_id: entryId,
        chunk_text: chunk,
        embedding,
        chunk_order: chunkOrder,
      });
      if (error) {
        return { success: false, error: error.message };
      }
      chunkOrder++;
    } catch (err: unknown) {
      let errorMsg = 'Unknown error';
      if (err && typeof err === 'object' && 'message' in err && typeof (err as { message?: unknown }).message === 'string') {
        errorMsg = (err as { message: string }).message;
      } else {
        errorMsg = String(err);
      }
      return { success: false, error: errorMsg };
    }
  }
  return { success: true };
}
