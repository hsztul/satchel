"use client";

import { EntryForm } from "@/components/EntryForm";
import { Button } from "@/components/ui/button";
import { Entry } from "@/types";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Mock function to get entry - will be replaced with Supabase fetch
const getMockEntry = (id: string): Entry => {
  return {
    id,
    userId: "user-1",
    type: "article",
    url: "https://example.com/article",
    processingState: "completed",
    createdAt: new Date("2025-04-01").toISOString(),
    updatedAt: new Date("2025-04-01").toISOString(),
    metadata: {
      title: "The Future of AI",
      summary: "This article discusses the potential future developments in artificial intelligence and their implications for society. It covers topics such as generative AI, autonomous systems, and ethical considerations.",
      keyPoints: [
        "AI development is accelerating at an unprecedented rate",
        "Generative AI models are becoming increasingly sophisticated",
        "Ethical guidelines and regulations are struggling to keep pace",
        "The economic impact of AI will be transformative across industries"
      ],
      author: "Jane Smith",
      publishedDate: "2025-03-15"
    }
  };
};

export default function EditEntryPage() {
  const params = useParams();
  const router = useRouter();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In a real app, this would fetch from Supabase
    if (params.id) {
      const id = Array.isArray(params.id) ? params.id[0] : params.id;
      const fetchedEntry = getMockEntry(id);
      setEntry(fetchedEntry);
      setIsLoading(false);
    }
  }, [params.id]);

  const handleSubmit = async (formData: any) => {
    // In a real app, this would update the entry in Supabase
    console.log("Updating entry with data:", formData);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Redirect back to entry detail page
    router.push(`/entries/${params.id}`);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto"></div>
          <p className="mt-2">Loading entry...</p>
        </div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Entry not found</h2>
        <p className="text-slate-500 mb-6">The entry you're looking for doesn't exist or you don't have access to it.</p>
        <Link href="/entries">
          <Button className="bg-slate-900 hover:bg-slate-800">
            Back to Entries
          </Button>
        </Link>
      </div>
    );
  }

  // Prepare initial values for the form
  const initialValues = {
    type: entry.type,
    url: entry.url || "",
    text: entry.type === "note" ? entry.metadata.text || "" : "",
  };

  return (
    <div>
      <div className="mb-6">
        <Link 
          href={`/entries/${params.id}`} 
          className="text-sm text-slate-500 hover:text-slate-700 mb-2 inline-block"
        >
          ← Back to entry
        </Link>
        <h1 className="text-2xl font-bold">Edit Entry</h1>
      </div>

      <div className="max-w-2xl">
        <EntryForm 
          initialValues={initialValues} 
          onSubmit={handleSubmit} 
          isEditing={true}
        />
      </div>
    </div>
  );
}
