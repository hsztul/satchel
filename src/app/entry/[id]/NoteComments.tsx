"use client";
import React, { useEffect, useState, useCallback } from "react";
import { Spinner } from "@/components/ui/spinner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

interface Note {
  id: string;
  cleaned_content: string;
  created_at: string;
  status: string;
  reference_entry_ids?: string[];
}

export default function NoteComments({ entryId }: { entryId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Fetch notes linked to this entry
  const refreshNotes = useCallback(() => {
    setLoading(true);
    fetch(`/api/entries?entryType=note&reference_entry_id=${entryId}`)
      .then(res => res.json())
      .then(res => setNotes(res.data || []))
      .catch(() => toast.error("Failed to load notes"))
      .finally(() => setLoading(false));
  }, [entryId]);

  useEffect(() => {
    if (!entryId) return;
    refreshNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryId]);

  // Polling: refresh notes if any are processing
  const pollingRef = React.useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    // If any note is not complete, start polling
    const anyProcessing = notes.some(note => note.status !== 'complete');
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (anyProcessing) {
      pollingRef.current = setInterval(() => {
        refreshNotes();
      }, 2000);
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [notes, refreshNotes]);

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      toast.error("Note cannot be empty");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/ingest-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryType: "note",
          note: newNote,
          reference_entry_ids: [entryId],
        }),
      });
      if (res.ok) {
        setNewNote("");
        refreshNotes();
        toast.success("Note added");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to add note");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this note? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/entries/${id}`, { method: "DELETE" });
      if (res.ok) {
        refreshNotes();
        toast.success("Note deleted");
      } else {
        toast.error("Failed to delete note");
      }
    } catch {
      toast.error("Failed to delete note");
    }
  };

  const handleEdit = (id: string, text: string) => {
    setEditingId(id);
    setEditingText(text);
  };

  const handleEditSubmit = async (id: string) => {
    if (!editingText.trim()) {
      toast.error("Note cannot be empty");
      return;
    }
    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/notes/${id}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: editingText }),
      });
      if (res.ok) {
        setEditingId(null);
        setEditingText("");
        refreshNotes();
        toast.success("Note updated");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update note");
      }
    } finally {
      setEditSubmitting(false);
    }
  };

  return (
    <div className="mt-10">
      <div className="mb-4">
        <textarea
          className="w-full border rounded p-2 text-sm focus:outline-none focus:ring focus:border-blue-300 min-h-[60px] resize-vertical"
          placeholder="Add a note..."
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          disabled={submitting}
        />
        <div className="flex justify-end mt-2">
          <Button onClick={handleAddNote} disabled={submitting || !newNote.trim()} size="sm">
            {submitting ? <Spinner size={16} /> : "Add Note"}
          </Button>
        </div>
      </div>
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-8"><Spinner size={24} /></div>
        ) : notes.length === 0 ? (
          <div className="text-slate-500 text-sm text-center">No notes yet.</div>
        ) : (
          notes
            .filter((note: Note) => Array.isArray(note.reference_entry_ids) && note.reference_entry_ids.includes(entryId))
            .map(note => (
              <Card key={note.id} className="p-4 flex flex-col gap-2 relative">
                <div className="flex items-center gap-2 justify-between">
                <span className="text-xs text-slate-500">{new Date(note.created_at).toLocaleString()}</span>
                <div className="flex gap-2">
                  {editingId === note.id ? (
                    <>
                      <Button size="icon" variant="ghost" onClick={() => handleEditSubmit(note.id)} disabled={editSubmitting}>
                        <Check size={16} />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditingId(null)} disabled={editSubmitting}>
                        <X size={16} />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(note.id, note.cleaned_content)}>
                        <Pencil size={16} />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(note.id)}>
                        <Trash size={16} />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {editingId === note.id ? (
                <textarea
                  className="w-full border rounded p-2 text-sm focus:outline-none focus:ring focus:border-blue-300 min-h-[60px] resize-vertical"
                  value={editingText}
                  onChange={e => setEditingText(e.target.value)}
                  disabled={editSubmitting}
                  autoFocus
                />
              ) : (
                <div className="text-slate-800 text-sm whitespace-pre-wrap">{note.cleaned_content}</div>
              )}
              {note.status !== "complete" && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10 rounded">
                  <Spinner size={18} />
                  <span className="ml-2 text-xs text-slate-500">Processing…</span>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
