import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Important: Follow Next.js App Router pattern for dynamic route handlers
export async function GET(request: NextRequest) {
  // Extract ID from the URL path instead of using params
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const chat_history_id = pathParts[pathParts.length - 2]; // Get the ID from URL path
  
  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Query messages
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, sender, content, created_at")
    .eq("chat_history_id", chat_history_id)
    .order("created_at", { ascending: true });
    
  // Return response
  if (error) return new Response(error.message, { status: 500 });
  return Response.json(data);
}

export async function POST(request: NextRequest) {
  // Extract ID from the URL path instead of using params
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const chat_history_id = pathParts[pathParts.length - 2]; // Get the ID from URL path
  
  // Parse request body
  const body = await request.json();
  console.log("POST /messages body:", body);
  const sender = body.sender || "user";
  const content = body.content;
  
  // Defensive validation
  if (!sender || typeof content !== "string" || content.trim() === "") {
    return new Response("Missing or invalid sender or content", { status: 400 });
  }
  
  // Ensure content is always a string (should already be covered)
  // if (typeof content !== "string") {
  //   content = JSON.stringify(content);
  // }
  
  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Insert message
  const { data, error } = await supabase
    .from("chat_messages")
    .insert([{ chat_history_id, sender, content }])
    .select()
    .single();
    
  // Return response
  if (error) return new Response(error.message, { status: 500 });
  return Response.json(data);
}
