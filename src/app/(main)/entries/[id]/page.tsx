import { Entry } from "@/types";
import { notFound } from "next/navigation";
import { EntryClientPage } from "./client-page";

// Fetch entry data from API (server component)
async function getEntry(id: string): Promise<Entry | null> {
  try {
    const { entriesApi } = await import('@/lib/supabase/client');
    const entry = await entriesApi.getEntry(id);
    return entry;
  } catch (error) {
    console.error(`Error fetching entry ${id}:`, error);
    return null;
  }
}

// Server component wrapper - properly typed for Next.js 15
export default async function EntryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  
  const initialEntry = await getEntry(id);
  
  if (!initialEntry) {
    notFound();
  }
  
  return <EntryClientPage id={id} initialEntry={initialEntry} />;
}
