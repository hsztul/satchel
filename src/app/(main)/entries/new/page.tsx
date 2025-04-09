import { EntryForm } from "@/components/EntryForm";
import Link from "next/link";
import { EntryType } from "@/types";

export default async function NewEntryPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ type?: string }>
}) {
  // Await the searchParams
  const params = await searchParams;
  const entryType = params.type as EntryType | undefined;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link 
          href="/entries" 
          className="text-sm text-slate-500 hover:text-slate-700 mb-2 inline-block"
        >
          ← Back to entries
        </Link>
        <h1 className="text-2xl font-bold">Create New Entry</h1>
      </div>
      
      <EntryForm initialValues={{ type: entryType || 'article' }} />
    </div>
  );
}
