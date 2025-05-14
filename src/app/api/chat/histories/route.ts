import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET() {
  // List all chat histories (no user_id yet)
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase
    .from("chat_histories")
    .select("id, created_at, updated_at, title")
    .order("created_at", { ascending: false });
  if (error) return new Response(error.message, { status: 500 });
  return Response.json(data);
}

export async function POST(req: NextRequest) {
  // Create a new chat history
  const { title } = await req.json();
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase
    .from("chat_histories")
    .insert([{ title }])
    .select()
    .single();
  if (error) return new Response(error.message, { status: 500 });
  return Response.json(data);
}
