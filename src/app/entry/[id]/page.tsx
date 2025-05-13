"use client";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Optional: Add syntax highlighting
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { nord } from "react-syntax-highlighter/dist/cjs/styles/prism";

function cleanMarkdown(md: string): string {
  // Remove leading/trailing triple backticks and optional language hint
  return md.replace(/^```[a-zA-Z0-9]*\n?/, '').replace(/```\s*$/, '').trim();
}


import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash } from "lucide-react";
import { toast } from "sonner";

import { use as usePromise } from "react";

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
    fetch(`/api/entries/${entryId}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setEntry(data);
      })
      .catch(() => setError("Failed to load entry"))
      .finally(() => setLoading(false));
  }, [entryId]);

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
        <Card className="p-6">
          <div className="mb-2">
            <h2 className="text-2xl font-bold text-slate-800 w-full break-words mb-1">{entry.title || "Untitled"}</h2>
            {entry.source_url && (
              <div className="mb-2">
                <a
                  href={entry.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline break-all inline-flex items-center gap-1"
                  title={entry.source_url}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-1 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 010 5.656m-3.656-3.656a4 4 0 015.656 0m-7.778 7.778a4 4 0 010-5.656m3.656 3.656a4 4 0 01-5.656 0m7.778-7.778a4 4 0 010 5.656m-3.656-3.656a4 4 0 015.656 0" /></svg>
                  {entry.source_url}
                </a>
              </div>
            )}
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="capitalize">{entry.entry_type}</Badge>
              <Badge variant="secondary" className="capitalize">{entry.status}</Badge>
              <button
                type="button"
                aria-label="Delete entry"
                className="ml-auto p-1 rounded hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors"
                title="Delete entry"
                onClick={async () => {
                  if (!window.confirm("Delete this entry? This cannot be undone.")) return;
                  try {
                    const res = await fetch(`/api/entries/${entryId}`, { method: "DELETE" });
                    if (res.status === 204) {
                      toast.success("Entry deleted");
                      window.location.href = "/";
                    } else {
                      const data = await res.json();
                      toast.error(data.error || "Failed to delete entry");
                    }
                  } catch {
                    toast.error("Failed to delete entry");
                  }
                }}
              >
                <Trash size={20} strokeWidth={2} />
              </button>
            </div>
          </div>
          <div className="text-xs text-slate-500 mb-4">
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
                  components={{
                    code({ inline, className, children, ...props }: {
                      inline?: boolean;
                      className?: string;
                      children?: React.ReactNode;
                      [key: string]: unknown;
                    }) {
                      const match = /language-(\w+)/.exec(className || '');
                      // Defensive: children could be string | string[] | undefined
                      const codeString = Array.isArray(children)
                        ? children.join('')
                        : typeof children === 'string'
                        ? children
                        : '';
                      return !inline && match ? (
                        <SyntaxHighlighter
                          style={nord}
                          language={match[1]}
                          PreTag="div"
                          {...props}
                        >
                          {codeString.replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className} {...props}>
                          {codeString}
                        </code>
                      );
                    }
                  }}
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
          {entry.cleaned_content && (
            <details className="mb-4 group" tabIndex={0}>
              <summary className="font-semibold mb-1 cursor-pointer select-none focus:outline-none group-open:mb-2">
                Source Content <span className="ml-1 text-xs text-slate-500">(click to expand)</span>
              </summary>
              <pre className="bg-slate-50 rounded p-3 border text-xs overflow-x-auto text-slate-700 mt-2">
                {typeof entry.cleaned_content === 'string' ? entry.cleaned_content : ''}
              </pre>
            </details>
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
          <div className="text-xs text-slate-500 mt-6">
            Entry ID: <span className="font-mono text-blue-700">{entry.id}</span>
          </div>
        </Card>
      )}
    </div>
  );
}
