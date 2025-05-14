"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function EntryInputForm({ onSuccess }: { onSuccess?: () => void }) {
  const [entryType, setEntryType] = useState("article");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let payload;
      if (entryType === "note") {
        if (!note.trim()) {
          toast.error("Note content is required");
          setLoading(false);
          return;
        }
        payload = { entryType, note };
      } else {
        if (!url.trim()) {
          toast.error("URL is required");
          setLoading(false);
          return;
        }
        payload = { entryType, url };
      }
      const res = await fetch("/api/ingest-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to submit entry");
      } else {
        toast.success(data.message || "Entry submitted!");
        setUrl("");
        setNote("");
        onSuccess?.();
      }
    } catch {
      toast.error("Failed to submit entry");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="flex flex-col md:flex-row items-center gap-4 mb-6" onSubmit={handleSubmit}>
      <Select
        value={entryType}
        onValueChange={(val) => {
          setEntryType(val);
          setUrl("");
          setNote("");
        }}
      >
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Entry Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="article">Article</SelectItem>
          <SelectItem value="company">Company</SelectItem>
          <SelectItem value="note">Note</SelectItem>
        </SelectContent>
      </Select>
      {entryType === "note" ? (
        <textarea
          className="flex-1 min-h-[80px] rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          placeholder="Write your note here..."
          value={note}
          onChange={e => setNote(e.target.value)}
        />
      ) : (
        <Input
          className="flex-1"
          type="url"
          placeholder="Paste article or company URL..."
          value={url}
          onChange={e => setUrl(e.target.value)}
          required
        />
      )}
      <Button
        type="submit"
        disabled={loading || (entryType === "note" ? !note.trim() : !url.trim())}
        className="w-28"
      >
        {loading ? "Submitting..." : "Add Entry"}
      </Button>
    </form>
  );
}
