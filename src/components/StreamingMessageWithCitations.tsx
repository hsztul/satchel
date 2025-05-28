"use client";
import { StreamingMarkdown } from "./StreamingMarkdown";

interface StreamingMessageWithCitationsProps {
  content: string;
  externalCitations?: { url: string; title?: string }[];
  isStreaming?: boolean;
}

// Types for citations
type Citation = {
  id: number;
  title: string;
  url: string;
  refCount: number;
};

// Utility to extract citations from markdown content
function extractCitations(text: string, externalCitations?: { url: string; title?: string }[]): Citation[] {
  const citationsMap: Record<number, Citation> = {};

  // If external citations are provided (e.g., from Perplexity), populate the map
  if (externalCitations && Array.isArray(externalCitations)) {
    externalCitations.forEach((c, i) => {
      const idx = i + 1;
      citationsMap[idx] = {
        id: idx,
        title: c.title || `Source ${idx}`,
        url: c.url,
        refCount: 0,
      };
    });
  }

  // Find citation list section at the end of the message
  const sourceListRegex = /\n*Sources?:?\n((?:\[\d+\]:.*(?:\n|$))+)/i;
  const sourceListMatch = text.match(sourceListRegex);
  
  // Extract the sources section if it exists
  if (sourceListMatch) {
    const sourcesText = sourceListMatch[1];
    
    // Parse sources
    const sourceRegex = /\[(\d+)\]:\s*(.*?)\s*(?:\((https?:\/\/[^\)]+)\))?(?:\n|$)/g;
    let sourceMatch;
    while ((sourceMatch = sourceRegex.exec(sourcesText)) !== null) {
      const id = parseInt(sourceMatch[1]);
      const title = sourceMatch[2];
      const url = sourceMatch[3] || `/entry/${id}`; // Default to local entry if URL not provided
      
      citationsMap[id] = {
        id,
        title,
        url,
        refCount: 0
      };
    }
  }

  // Find all citation references in format [n] or [n, m] to count usage
  const citationRegex = /\[(\d+(?:,\s*\d+)*)\]/g;
  let match;
  while ((match = citationRegex.exec(text)) !== null) {
    const citationIds = match[1].split(/,\s*/).map(id => parseInt(id.trim()));
    citationIds.forEach(id => {
      if (citationsMap[id]) {
        citationsMap[id].refCount++;
      }
    });
  }

  return Object.values(citationsMap).filter(c => c.refCount > 0 || externalCitations);
}

export function StreamingMessageWithCitations({ 
  content, 
  externalCitations, 
  isStreaming = false 
}: StreamingMessageWithCitationsProps) {
  const citations = extractCitations(content, externalCitations);
  
  return (
    <div>
      <StreamingMarkdown 
        content={content} 
        isStreaming={isStreaming}
        className="whitespace-pre-wrap"
      />
      
      {citations.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Sources:</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            {citations.map(citation => (
              <li key={citation.id}>
                <a 
                  href={citation.url} 
                  className="text-blue-600 hover:underline"
                  target={citation.url.startsWith('http') ? '_blank' : '_self'}
                  rel={citation.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                >
                  [{citation.id}] {citation.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
