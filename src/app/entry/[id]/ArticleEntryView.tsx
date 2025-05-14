import React from "react";

export default function ArticleEntryView({ cleaned_content }: { cleaned_content: string }) {
  return (
    <details className="mb-4 group" tabIndex={0}>
      <summary className="font-semibold mb-1 cursor-pointer select-none focus:outline-none group-open:mb-2">
        Source Content <span className="ml-1 text-xs text-slate-500">(click to expand)</span>
      </summary>
      <pre className="bg-slate-50 rounded p-3 border text-xs overflow-x-auto text-slate-700 mt-2">
        {typeof cleaned_content === 'string' ? cleaned_content : ''}
      </pre>
    </details>
  );
}
