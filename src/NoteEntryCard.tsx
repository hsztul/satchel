import React from "react";

export default function NoteEntryCard({ cleaned_content }: { cleaned_content: string }) {
  return (
    <div className="whitespace-pre-line text-slate-800 text-base rounded bg-slate-50 border p-3 mt-2">
      {cleaned_content}
    </div>
  );
}
