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

import { Trash } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import NoteEntryCard from "./NoteEntryCard";

interface Entry {
  id: string;
  title: string;
  entry_type: string;
  status: string;
  created_at: string;
  summary?: string;
  industries?: string[];
  cleaned_content?: string; // Added for note entries
  reference_entry_ids?: string[];
}

interface Note {
  id: string;
  reference_entry_ids?: string[];
}


export default function EntryFeed() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [hasMore, setHasMore] = useState(true);
  const [entryType, setEntryType] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<string>("desc");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [allIndustries, setAllIndustries] = useState<string[]>([]);

  const [pollingActive, setPollingActive] = useState(true);
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const pollingToastId = React.useRef<string | number | null>(null);

  // Track in-flight requests to avoid overlap
  const fetchingRef = React.useRef(false);

  // Fetch entries (single fetch)
  const fetchEntries = React.useCallback((opts?: { userInitiated?: boolean, reset?: boolean, pageOverride?: number, pageSizeOverride?: number }) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    if (opts?.userInitiated && (opts?.reset || !opts)) setLoading(true);
    if (opts && !opts.reset && opts.userInitiated) setLoadingMore(true);
    const actualPage = opts?.pageOverride ?? page;
    const actualPageSize = opts?.pageSizeOverride ?? pageSize;
    const params = new URLSearchParams({
      ...(entryType ? { entryType } : {}),
      ...(status ? { status } : {}),
      ...(selectedIndustries.length > 0 ? { industry: selectedIndustries.join(',') } : {}),
      sortBy,
      sortOrder,
      ...(searchTerm ? { searchTerm } : {}),
      page: String(actualPage),
      pageSize: String(actualPageSize),
    });
    fetch(`/api/entries?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (opts && !opts.reset && actualPage > 1) {
          setEntries((prev) => [...prev, ...(data.data || [])]);
        } else {
          setEntries(data.data || []);
        }
        setHasMore(data.pagination && data.pagination.totalPages > actualPage);
        setError(null);
      })
      .catch(() => {
        setError("Failed to load entries");
      })
      .finally(() => {
        if (opts?.userInitiated && (opts?.reset || !opts)) setLoading(false);
        if (opts && !opts.reset && opts.userInitiated) setLoadingMore(false);
        fetchingRef.current = false;
      });
  }, [entryType, status, sortBy, sortOrder, searchTerm, selectedIndustries, page, pageSize]);

  // Fetch on mount and whenever filters change
  useEffect(() => {
    setPage(1);
    fetchEntries({ userInitiated: true, reset: true, pageOverride: 1 });
  }, [entryType, status, sortBy, sortOrder, searchTerm, selectedIndustries, pageSize, fetchEntries]);

  // Fetch all industries on mount
  useEffect(() => {
    fetch('/api/industries')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data.industries)) {
          setAllIndustries(data.industries);
        }
      })
      .catch(err => {
        console.error('Failed to fetch industries:', err);
      });
    // Fetch all notes for comment counts
    fetch('/api/entries?entryType=note&pageSize=1000')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data.data)) {
          setAllNotes(data.data);
        }
      })
      .catch(err => {
        console.error('Failed to fetch notes:', err);
      });
  }, []);

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
  }, [pollingActive, entryType, status, sortBy, sortOrder, searchTerm, selectedIndustries, fetchEntries]);

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
            {/* Page size buttons (replacing dropdown) */}
            <span className="text-xs text-slate-600 mr-1">Page size:</span>
            {[5, 10, 20, 50].map(size => (
              <button
                key={size}
                type="button"
                className={`px-2 py-1 rounded border text-xs font-medium mx-0.5 transition-colors focus:outline-none ${pageSize === size ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'}`}
                onClick={() => { setPageSize(size); setPage(1); }}
                aria-label={`Show ${size} entries per page`}
              >
                {size}
              </button>
            ))}
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
            <Select
              value={selectedIndustries.length === 0 ? "all" : selectedIndustries[0]}
              onValueChange={(value) => {
                if (value === "all") {
                  setSelectedIndustries([]);
                } else if (selectedIndustries.includes(value)) {
                  setSelectedIndustries(selectedIndustries.filter(i => i !== value));
                } else {
                  setSelectedIndustries([...selectedIndustries, value]);
                }
              }}
            >
              <SelectTrigger className="w-[280px]">
                <SelectValue>
                  {selectedIndustries.length === 0
                    ? "All industries"
                    : `${selectedIndustries.length} selected`}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedIndustries.length === 0}
                      className="h-4 w-4 rounded border-gray-300"
                      readOnly
                    />
                    All industries
                  </div>
                </SelectItem>
                {allIndustries.map((industry) => (
                  <SelectItem key={industry} value={industry}>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedIndustries.includes(industry)}
                        className="h-4 w-4 rounded border-gray-300"
                        readOnly
                      />
                      {industry}
                    </div>
                  </SelectItem>
                ))}
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
      {!loading && !error && Array.from(new Map(
        entries
          .filter(e => !(e.entry_type === 'note' && Array.isArray(e.reference_entry_ids) && e.reference_entry_ids.length > 0))
          .map(e => [e.id, e])
      ).values()).map((entry) => (
        <Link key={entry.id} href={`/entry/${entry.id}`} className="block mb-6">
          <Card className="p-4 hover:shadow-md transition cursor-pointer relative">

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-lg text-slate-800 truncate">{entry.title || "Untitled"}</span>
                {[
                  "pending",
                  "scraping_website",
                  "processing_scraped_content",
                  "researching_external",
                  "processing_summarized"
                ].includes(entry.status) && (
                  <Spinner size={18} />
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs capitalize">{entry.entry_type}</Badge>
                <Badge variant="secondary" className="text-xs capitalize">{entry.status}</Badge>
                {entry.industries?.slice(0, 3).map((industry) => (
                  <Badge key={industry} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                    {industry}
                  </Badge>
                ))}
                {entry.industries && entry.industries.length > 3 && (
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                    +{entry.industries.length - 3} more
                  </Badge>
                )}
              </div>
              {/* Show note text for notes, summary for others */}
              {entry.entry_type === 'note' && entry.cleaned_content && (
                <NoteEntryCard cleaned_content={entry.cleaned_content} />
              )}
              {entry.entry_type !== 'note' && entry.summary && (
                <p className="text-sm text-slate-600 mt-2">
                  {entry.summary}
                </p>
              )}
              <div className="flex items-center justify-between mt-1">
                <div className="text-xs text-slate-500">{new Date(entry.created_at).toLocaleString()}</div>
                <div className="flex items-center gap-2">
                  {(() => {
                    const commentCount = allNotes.filter(
                      (note: Note) => Array.isArray(note.reference_entry_ids) && note.reference_entry_ids.includes(entry.id)
                    ).length;
                    return commentCount > 0 ? (
                      <span className="bg-slate-200 text-slate-700 text-xs font-semibold rounded-full px-2 py-0.5 border border-slate-300 select-none">
                        💬 {commentCount}
                      </span>
                    ) : null;
                  })()}
                  <button
                    type="button"
                    aria-label="Delete entry"
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!window.confirm('Are you sure you want to delete this entry?')) {
                        return;
                      }
                      try {
                        const res = await fetch(`/api/entries/${entry.id}`, {
                          method: 'DELETE',
                        });
                        if (!res.ok) {
                          throw new Error('Failed to delete entry');
                        }
                        await fetchEntries({ userInitiated: true });
                      } catch (err) {
                        console.error('Error deleting entry:', err);
                      }
                    }}
                  >
                    <Trash size={18} strokeWidth={2} />
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </Link>
      ))}
      {/* Load More button */}
      {!loading && !error && hasMore && (
        <div className="flex justify-center my-6">
          <button
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-sm font-medium text-slate-700 flex items-center gap-2 disabled:opacity-60"
            onClick={() => {
              setPage(prev => prev + 1);
              fetchEntries({ userInitiated: true, pageOverride: page + 1 });
            }}
            disabled={loadingMore}
            aria-label="Load more entries"
          >
            {loadingMore ? <Spinner size={18} /> : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}
