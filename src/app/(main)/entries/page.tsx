import { Button } from "@/components/ui/button";
import Link from "next/link";
import { EntryList } from "@/components/EntryList";

// Function to fetch entries directly from Supabase
async function getEntries() {
  try {
    // Import the Supabase client
    const { entriesApi } = await import('@/lib/supabase/client');
    
    // Get entries directly from Supabase
    const entries = await entriesApi.getEntries();
    return entries;
  } catch (error) {
    console.error('Error fetching entries:', error);
    return [];
  }
}

export default async function EntriesPage() {
  // Fetch entries from the API
  const entries = await getEntries();
  
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Your Entries</h1>
      </div>

      {/* Use the client component for real-time updates */}
      <EntryList initialEntries={entries} />
    </div>
  );
}
