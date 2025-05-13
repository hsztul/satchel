"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function EntryInputForm({ onSuccess }: { onSuccess?: () => void }) {
  const [entryType, setEntryType] = useState("article");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ingest-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryType, url }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to submit entry");
      } else {
        toast.success(data.message || "Entry submitted!");
        setUrl("");
        onSuccess?.();
      }
    } catch (err) {
      toast.error("Failed to submit entry");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="flex flex-col md:flex-row items-center gap-4 mb-6" onSubmit={handleSubmit}>
      <Select value={entryType} onValueChange={setEntryType}>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Entry Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="article">Article</SelectItem>
          <SelectItem value="company">Company</SelectItem>
        </SelectContent>
      </Select>
      <Input
        className="flex-1"
        type="url"
        placeholder="Paste article or company URL..."
        value={url}
        onChange={e => setUrl(e.target.value)}
        required
      />
      <Button type="submit" disabled={loading || !url} className="w-28">
        {loading ? "Submitting..." : "Add Entry"}
      </Button>
    </form>
  );
}
