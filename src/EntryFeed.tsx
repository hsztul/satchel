"use client";
import React from "react";

// Placeholder for future props: entries, filters, etc.
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";

interface Entry {
  id: string;
  title: string;
  entry_type: string;
  status: string;
  created_at: string;
  summary?: string;
}

export default function EntryFeed() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entryType, setEntryType] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<string>("desc");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [pollingActive, setPollingActive] = useState(true);
  const pollingToastId = React.useRef<string | number | null>(null);

  // Track in-flight requests to avoid overlap
  const fetchingRef = React.useRef(false);

  // Fetch entries (single fetch)
  const fetchEntries = (opts?: { userInitiated?: boolean }) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    if (opts?.userInitiated) setLoading(true);
    const params = new URLSearchParams({
      ...(entryType ? { entryType } : {}),
      ...(status ? { status } : {}),
      sortBy,
      sortOrder,
      ...(searchTerm ? { searchTerm } : {}),
      page: "1",
      pageSize: "10",
    });
    fetch(`/api/entries?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setEntries(data.data || []);
        setError(null);
      })
      .catch(() => {
        setError("Failed to load entries");
      })
      .finally(() => {
        if (opts?.userInitiated) setLoading(false);
        fetchingRef.current = false;
      });
  };

  // Fetch on mount and whenever filters change
  useEffect(() => {
    fetchEntries({ userInitiated: true });
    // eslint-disable-next-line
  }, [entryType, status, sortBy, sortOrder, searchTerm]);

  // Polling effect
  // Polling interval ref
  const pollingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (pollingActive) {
      pollingIntervalRef.current = setInterval(() => {
        fetchEntries(); // polling, not user-initiated
      }, 4000);
    }
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [pollingActive, entryType, status, sortBy, sortOrder, searchTerm]);

  // Progress Toast & Polling Control
  React.useEffect(() => {
    // Check for any entry in progress
    // Only consider true in-progress states for polling
    const inProgress = entries.some(e => [
      "pending",
      "scraping_website",
      "processing_scraped_content",
      "researching_external",
      "processing_summarized"
    ].includes(e.status));
    const allComplete = entries.length > 0 && entries.every(e => e.status === "complete");

    // Stop polling only if all are complete
    setPollingActive(!allComplete && inProgress);

    if (inProgress) {
      // Show/update toast
      const progressEntry = entries.find(e => [
        "pending",
        "scraping_website",
        "processing_scraped_content",
        "researching_external",
        "processing_summarized"
      ].includes(e.status));
      let progressMsg = "Processing entry...";
      if (progressEntry) {
        if (progressEntry.status === "pending") progressMsg = `Queued: ${progressEntry.title || progressEntry.id}`;
        else if (progressEntry.status === "scraping_website") progressMsg = `Scraping: ${progressEntry.title || progressEntry.id}`;
        else if (progressEntry.status === "processing_scraped_content") progressMsg = `Summarizing: ${progressEntry.title || progressEntry.id}`;
        else if (progressEntry.status === "researching_external") progressMsg = `Researching (Perplexity): ${progressEntry.title || progressEntry.id}`;
        else if (progressEntry.status === "processing_summarized") progressMsg = `Finalizing: ${progressEntry.title || progressEntry.id}`;
      }
      if (pollingToastId.current) {
        toast.loading(progressMsg, { id: pollingToastId.current, duration: 4000 });
      } else {
        pollingToastId.current = toast.loading(progressMsg, { duration: 4000 });
      }
    } else {
      // Hide toast
      if (pollingToastId.current) {
        toast.dismiss(pollingToastId.current);
        pollingToastId.current = null;
      }
    }
  }, [entries]);

  return (
    <div>
      {/* Filter/sort/search controls */}
      <div className="mb-4">
        <Input
          className="w-full mb-2"
          type="search"
          placeholder="Search title..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <details className="group">
          <summary className="cursor-pointer select-none px-2 py-1 text-sm text-slate-700 bg-slate-50 rounded hover:bg-slate-100 border font-medium focus:outline-none">
            Filters & Sort <span className="ml-1 text-xs text-slate-500">(click to expand)</span>
          </summary>
          <div className="pt-3 flex flex-wrap gap-2 items-center">
            <Select value={entryType} onValueChange={v => setEntryType(v === "all" ? undefined : v)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="article">Article</SelectItem>
                <SelectItem value="company">Company</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={v => setStatus(v === "all" ? undefined : v)}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="scraping_website">Scraping</SelectItem>
                <SelectItem value="processing_scraped_content">Processing</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Created</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="w-24">
                <SelectValue placeholder="Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Desc</SelectItem>
                <SelectItem value="asc">Asc</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </details>
      </div>
      {/* Loading/Error/Empty States */}
      {loading && <div className="text-center text-slate-500 py-8">Loading entries...</div>}
      {error && <div className="text-center text-red-500 py-8">{error}</div>}
      {!loading && !error && !entries.length && (
        <div className="text-slate-500 text-center py-12 border rounded bg-white">
          No entries found.
        </div>
      )}
      {/* Entry List */}
      {!loading && !error && entries.map((entry) => (
        <Link key={entry.id} href={`/entry/${entry.id}`} className="block mb-6">
          <Card className="p-4 flex flex-col gap-1 hover:shadow-md transition cursor-pointer">
            <div className="flex items-center gap-2">
                <span className="font-semibold text-lg text-slate-800">{entry.title || "Untitled"}</span>
                <Badge variant="outline" className="ml-2 text-xs capitalize">{entry.entry_type}</Badge>
                <Badge variant="secondary" className="ml-2 text-xs capitalize">{entry.status}</Badge>
                <button
                  type="button"
                  aria-label="Delete entry"
                  className="ml-auto p-1 rounded hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors"
                  title="Delete entry"
                  onClick={async (e) => {
                    e.preventDefault();
                    if (!window.confirm("Delete this entry? This cannot be undone.")) return;
                    try {
                      const res = await fetch(`/api/entries/${entry.id}`, { method: "DELETE" });
                      if (res.status === 204) {
                        toast.success("Entry deleted");
                        setEntries((prev) => prev.filter((en) => en.id !== entry.id));
                      } else {
                        const data = await res.json();
                        toast.error(data.error || "Failed to delete entry");
                      }
                    } catch {
                      toast.error("Failed to delete entry");
                    }
                  }}
                >
                  <Trash size={18} strokeWidth={2} />
                </button>
              </div>
              {entry.summary && (
                <div className="prose prose-xs max-w-none bg-slate-50 rounded p-2 border text-slate-800 my-1">
                  {entry.summary}
                </div>
              )}
              <div className="text-xs text-slate-500 mt-1">{new Date(entry.created_at).toLocaleString()}</div>
            </Card>
        </Link>
      ))}
    </div>
  );
}
