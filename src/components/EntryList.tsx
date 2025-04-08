"use client";

import { useState, useEffect } from "react";
import { Entry } from "@/types";
import { EntryCard } from "./EntryCard";
import { createClient } from "@supabase/supabase-js";

interface EntryListProps {
  initialEntries: Entry[];
}

export function EntryList({ initialEntries }: EntryListProps) {
  const [entries, setEntries] = useState<Entry[]>(initialEntries);

  // Set up Supabase real-time subscription
  useEffect(() => {
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Subscribe to changes on the entries table
    const subscription = supabase
      .channel('public:entries')
      .on('postgres_changes', { 
        event: '*', // Listen for all events (insert, update, delete)
        schema: 'public',
        table: 'entries'
      }, async (payload) => {
        console.log('Real-time update received:', payload);
        
        // Fetch all entries when there's a change
        try {
          const { entriesApi } = await import('@/lib/supabase/client');
          const updatedEntries = await entriesApi.getEntries();
          setEntries(updatedEntries);
        } catch (error) {
          console.error('Error fetching updated entries:', error);
        }
      })
      .subscribe();

    // Clean up subscription when component unmounts
    return () => {
      supabase.channel('public:entries').unsubscribe();
    };
  }, []);

  return (
    <div>

      {entries.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-slate-50">
          <h3 className="text-lg font-medium mb-2">No entries yet</h3>
          <p className="text-slate-500 mb-4">Create your first entry to get started</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
