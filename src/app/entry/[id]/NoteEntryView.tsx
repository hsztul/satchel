import React from "react";

export default function NoteEntryView({ cleaned_content }: { cleaned_content: string }) {
  return (
    <div className="">
      <div className="whitespace-pre-line text-slate-800 text-base rounded bg-slate-50 border p-3">
        {cleaned_content}
      </div>
    </div>
  );
}
