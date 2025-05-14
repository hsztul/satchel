"use client";
import { useEffect, useState } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { nord } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MoreVertical, RefreshCcw, Trash } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { use as usePromise } from "react";
import NoteEntryView from "./NoteEntryView";
import ArticleEntryView from "./ArticleEntryView";
import CompanyEntryView from "./CompanyEntryView";

const components: Components = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  code({ inline, className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || "");
    const codeString = Array.isArray(children)
      ? children.join("")
      : typeof children === "string"
      ? children
      : "";
    return !inline && match ? (
      <SyntaxHighlighter
        style={nord}
        language={match[1]}
        PreTag="div"
        {...props}
      >
        {codeString.replace(/\n$/, "")}
      </SyntaxHighlighter>
    ) : (
      <code className={className} {...props}>
        {codeString}
      </code>
    );
  },
};

function cleanMarkdown(md: string): string {
  // Remove leading/trailing triple backticks and optional language hint
  return md.replace(/^```[a-zA-Z0-9]*\n?/, '').replace(/```\s*$/, '').trim();
}

import NoteComments from "./NoteComments";

export default function EntryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = usePromise(params);
  const entryId = resolvedParams?.id || "";

  interface EntryType {
    id: string;
    title: string;
    entry_type: string;
    status: string;
    created_at: string;
    updated_at: string;
    summary?: string;
    cleaned_content?: string;
    metadata?: Record<string, unknown>;
    source_url?: string;
    llm_analysis?: {
      perplexity_research?: {
        full_perplexity_responses?: string;
        citations?: string[];
      };
      keyTakeaways?: string[];
      primaryConcepts?: string[];
    };
    [key: string]: unknown;
  }

  const [entry, setEntry] = useState<EntryType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [perplexityHtml, setPerplexityHtml] = useState<string>("");

  useEffect(() => {
    if (!entryId) return;
    setLoading(true);
    // Initial fetch
    const fetchEntry = async () => {
      try {
        const res = await fetch(`/api/entries/${entryId}`);
        const data = await res.json();
        if (data.error) setError(data.error);
        else setEntry(data);
      } catch {
        setError("Failed to load entry");
      } finally {
        setLoading(false);
      }
    };
    void fetchEntry();
  }, [entryId]);

  // Separate effect for polling
  useEffect(() => {
    if (!entryId || !entry) return;
    const processingStatuses = [
      "pending",
      "scraping_website",
      "processing_scraped_content",
      "researching_external",
      "processing_summarized",
      "processing_embeddings"
    ];
    const shouldPoll = processingStatuses.includes(entry.status);
    if (!shouldPoll) return;
    let pollInterval: NodeJS.Timeout | null = null;
    pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/entries/${entryId}`);
        const data = await res.json();
        if (!data.error) {
          if (data.status !== entry.status) {
            // Only update entry if status actually changed
            setEntry(data);
          }
          // Stop polling if status is no longer processing
          if (!processingStatuses.includes(data.status)) {
            if (pollInterval) clearInterval(pollInterval);
          }
        }
      } catch (err) {
        console.error('Error polling entry:', err);
      }
    }, 2000);
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [entryId, entry?.status]);

  useEffect(() => {
    if (!entry?.llm_analysis?.perplexity_research?.full_perplexity_responses) {
      setPerplexityHtml("");
      return;
    }
    // Remove any <think>...</think> tags that might be in the response
    let content = entry.llm_analysis.perplexity_research.full_perplexity_responses.replace(/<think>[\s\S]*?<\/think>/g, "");
    // Remove HTML entities
    content = content
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
    // Remove leading/trailing triple backticks and optional language hint
    content = cleanMarkdown(content);
    setPerplexityHtml(content);
  }, [entry?.llm_analysis?.perplexity_research?.full_perplexity_responses]);

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      {loading && <div className="text-center text-slate-500 py-8">Loading entry...</div>}
      {error && <div className="text-center text-red-500 py-8">{error}</div>}
      {!loading && !error && !entry && (
        <div className="text-center text-slate-500 py-8">Entry not found.</div>
      )}
      {!loading && !error && entry && (
        <Card className="p-6 relative">
          {["pending", "scraping_website", "processing_scraped_content", "researching_external", "processing_summarized", "processing_embeddings"].includes(entry.status) && (
            <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center z-10 rounded">
              <Spinner size={32} className="mb-2" />
              <span className="text-slate-500 text-sm font-medium">Processing…</span>
              <span className="text-xs text-slate-400 mt-1">{entry.status.replace(/_/g, ' ')}</span>
            </div>
          )}
          <div className="">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 w-full break-words mb-2 whitespace-pre-line">{entry.title || "Untitled"}</h2>
                {entry.source_url && (
                  <a
                    href={entry.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm truncate max-w-xs inline-block align-middle"
                    style={{ verticalAlign: 'middle' }}
                    title={entry.source_url}
                  >
                    {entry.source_url}
                  </a>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-8 w-8 p-0"
                  >
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600"
                    onClick={async () => {
                      if (!window.confirm('Delete this entry? This cannot be undone.')) return;
                      try {
                        const res = await fetch(`/api/entries/${entry.id}`, { method: 'DELETE' });
                        if (res.ok) {
                          toast.success('Entry deleted');
                          window.location.href = '/';
                        } else {
                          const data = await res.json();
                          toast.error(data.error || 'Failed to delete entry');
                        }
                      } catch {
                        toast.error('Failed to delete entry');
                      }
                    }}
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    <span>Delete</span>
                  </DropdownMenuItem>
                  {(entry.entry_type === 'article' || entry.entry_type === 'company') && (
                    <DropdownMenuItem
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/entries/${entry.id}/reprocess`, {
                            method: 'POST',
                          });
                          if (!res.ok) {
                            throw new Error('Failed to reprocess entry');
                          }
                          toast.success('Entry reprocessing started');
                          // Refresh the page after a short delay
                          setTimeout(() => window.location.reload(), 1000);
                        } catch (err) {
                          console.error('Error reprocessing entry:', err);
                          toast.error('Failed to reprocess entry');
                        }
                      }}
                    >
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      <span>Reprocess</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge variant="outline" className="text-xs capitalize">{entry.entry_type}</Badge>
              <Badge variant="secondary" className="text-xs capitalize flex items-center gap-1.5">
                {entry.status}
                {["pending", "scraping_website", "processing_scraped_content", "researching_external", "processing_summarized", "processing_embeddings"].includes(entry.status) && (
                  <Spinner size={12} />
                )}
              </Badge>
              {Array.isArray(entry.industries) && entry.industries.map((industry: string) => (
                <Badge key={industry} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                  {industry}
                </Badge>
              ))}
            </div>
          </div>
          <div className="text-xs text-slate-500">
            Created: {entry.created_at ? new Date(entry.created_at).toLocaleString() : 'N/A'} | Updated: {entry.updated_at ? new Date(entry.updated_at).toLocaleString() : 'N/A'}
          </div>
          {entry.summary && (
            <div className="mb-4">
              <h3 className="font-semibold mb-1">Summary</h3>
              <div className="prose prose-sm max-w-none bg-slate-50 rounded p-3 border text-slate-800">
                <ReactMarkdown>{typeof entry.summary === 'string' ? entry.summary : ''}</ReactMarkdown>
              </div>
            </div>
          )}
          {entry.llm_analysis && entry.llm_analysis.perplexity_research && entry.llm_analysis.perplexity_research.full_perplexity_responses && (
            <div className="mb-4">
              <h3 className="font-semibold mb-1">Perplexity Research</h3>
              <div className="prose prose-sm max-w-full bg-indigo-50 rounded p-3 border text-slate-800">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={components}
                >
                  {typeof perplexityHtml === 'string' ? perplexityHtml : ''}
                </ReactMarkdown>
              </div>
              {entry.llm_analysis && entry.llm_analysis.perplexity_research && Array.isArray(entry.llm_analysis.perplexity_research.citations) && entry.llm_analysis.perplexity_research.citations.length > 0 && (
                <div className="mt-3">
                  <div className="font-medium text-slate-700 mb-1">References</div>
                  <ol className="list-decimal list-inside space-y-1 text-xs text-slate-700">
                    {entry.llm_analysis.perplexity_research.citations.map((url: string, i: number) => (
                      <li key={i} id={`ref-${i+1}`}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline break-all"
                          title={url}
                        >
                          {url}
                        </a>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
          {entry.llm_analysis && (Array.isArray(entry.llm_analysis.keyTakeaways) || Array.isArray(entry.llm_analysis.primaryConcepts)) && (
            <div className="mb-4">
              <h3 className="font-semibold mb-1">Analysis</h3>
              {Array.isArray(entry.llm_analysis.keyTakeaways) && entry.llm_analysis.keyTakeaways.length > 0 && (
                <div className="mb-2">
                  <div className="font-medium text-slate-700 mb-1">Key Takeaways</div>
                  <ul className="list-disc list-inside space-y-1 text-sm text-slate-800">
                    {entry.llm_analysis.keyTakeaways.map((item: string, idx: number) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {Array.isArray(entry.llm_analysis.primaryConcepts) && entry.llm_analysis.primaryConcepts.length > 0 && (
                <div className="mb-2">
                  <div className="font-medium text-slate-700 mb-1">Primary Concepts</div>
                  <div className="flex flex-wrap gap-2">
                    {entry.llm_analysis.primaryConcepts.map((concept: string, idx: number) => (
                      <span key={idx} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full border border-blue-200">
                        {concept}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Entry type-specific content view */}
          {entry.cleaned_content && (
            entry.entry_type === 'note' ? (
              <NoteEntryView cleaned_content={entry.cleaned_content} />
            ) : entry.entry_type === 'company' ? (
              <CompanyEntryView cleaned_content={entry.cleaned_content} />
            ) : (
              <ArticleEntryView cleaned_content={entry.cleaned_content} />
            )
          )}
          {entry.metadata && (
            <details className="mb-4 group" tabIndex={0}>
              <summary className="font-semibold mb-1 cursor-pointer select-none focus:outline-none group-open:mb-2">
                Metadata <span className="ml-1 text-xs text-slate-500">(click to expand)</span>
              </summary>
              <pre className="bg-slate-50 rounded p-3 border text-xs overflow-x-auto text-slate-700 mt-2">
                {entry.metadata ? JSON.stringify(entry.metadata, null, 2) : ''}
              </pre>
            </details>
          )}
        </Card>
      )}
      <div className="max-w-2xl mx-auto mt-6">
        <h2 className="text-lg font-semibold mb-2">Comments</h2>
        <NoteComments entryId={entryId} />
      </div>
    </div>
  );
}
