"use client";
import { useState } from "react";
import { StreamingMarkdown } from "./StreamingMarkdown";

export function MarkdownStreamingDemo() {
  const [content, setContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const markdownText = `# Streaming Markdown Demo

This is a demonstration of **streaming markdown** rendering.

## Features

- **Bold text** and *italic text*
- Code blocks with \`inline code\`
- Lists:
  1. Ordered items
  2. Multiple items
  3. With proper formatting

- Unordered lists:
  - Bullet points
  - Nested content
  - Rich formatting

## Code Example

\`\`\`javascript
function streamMarkdown() {
  console.log("Streaming markdown is working!");
  return "success";
}
\`\`\`

> This is a blockquote with **bold** text
> and multiple lines for testing.

## Links and References

You can include [links](https://example.com) and references [1].

### Sources:
[1]: https://github.com/thetarnav/streaming-markdown (Streaming Markdown Library)
`;

  const startStreaming = () => {
    setContent("");
    setIsStreaming(true);
    
    let index = 0;
    const interval = setInterval(() => {
      if (index < markdownText.length) {
        setContent(markdownText.slice(0, index + 1));
        index++;
      } else {
        setIsStreaming(false);
        clearInterval(interval);
      }
    }, 20); // Stream character by character
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Streaming Markdown Test</h1>
        <button
          onClick={startStreaming}
          disabled={isStreaming}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isStreaming ? "Streaming..." : "Start Streaming Demo"}
        </button>
      </div>
      
      <div className="border rounded-lg p-4 bg-gray-50 min-h-[400px]">
        <h2 className="text-lg font-semibold mb-4">Rendered Output:</h2>
        <div className="bg-white rounded p-4 border">
          <StreamingMarkdown 
            content={content}
            isStreaming={isStreaming}
            className="text-gray-900"
          />
        </div>
      </div>
    </div>
  );
}
