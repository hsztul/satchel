import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: NextRequest) {
  // Update chat session title
  const { id, title } = await req.json();
  if (!id || !title) {
    return new Response("Missing id or title", { status: 400 });
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase
    .from("chat_histories")
    .update({ title })
    .eq("id", id)
    .select()
    .single();
  if (error) return new Response(error.message, { status: 500 });
  return Response.json(data);
}
