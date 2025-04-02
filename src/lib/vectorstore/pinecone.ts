import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "langchain/document";
import { PineconeStore } from "@langchain/community/vectorstores/pinecone";

// Initialize the Pinecone client
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || '',
});

// Create a helper function to initialize the vector store with a specific index
export async function initVectorStore() {
  const indexName = process.env.PINECONE_INDEX || 'satchel-entries';
  const index = pinecone.Index(indexName);
  
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: "text-embedding-3-small"
  });
  
  return await PineconeStore.fromExistingIndex(embeddings, { pineconeIndex: index });
}

// Function to add an entry to the vector store
export async function addEntryToVectorStore(entry: {
  id: string;
  type: string;
  metadata: {
    title: string;
    summary?: string;
    keyPoints?: string[];
    text?: string;
  };
}) {
  const vectorStore = await initVectorStore();
  
  // Create a text representation of the entry
  let content = `Type: ${entry.type}\nTitle: ${entry.metadata.title}\n`;
  
  if (entry.metadata.summary) {
    content += `Summary: ${entry.metadata.summary}\n`;
  }
  
  if (entry.metadata.keyPoints?.length) {
    content += `Key Points:\n${entry.metadata.keyPoints.map(point => `- ${point}`).join('\n')}\n`;
  }
  
  if (entry.metadata.text) {
    content += `Content: ${entry.metadata.text}\n`;
  }
  
  // Create a document
  const document = new Document({
    pageContent: content,
    metadata: {
      entryId: entry.id,
      type: entry.type,
      title: entry.metadata.title
    }
  });
  
  // Add to vector store
  await vectorStore.addDocuments([document]);
  
  return document;
}

// Function to query the vector store
export async function queryVectorStore(query: string, limit = 5) {
  const vectorStore = await initVectorStore();
  
  // Search for similar entries
  const results = await vectorStore.similaritySearch(query, limit);
  
  return results;
}
