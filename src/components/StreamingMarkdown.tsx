/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useRef, useEffect, useState } from "react";
import * as smd from "streaming-markdown";

interface StreamingMarkdownProps {
  content: string;
  isStreaming?: boolean;
  className?: string;
}

export function StreamingMarkdown({ content, isStreaming = false, className = "" }: StreamingMarkdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const parserRef = useRef<any>(null);
  const lastContentRef = useRef("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    try {
      // Initialize parser only once
      if (!parserRef.current) {
        // Clear the container
        containerRef.current.innerHTML = "";
        
        // Create renderer and parser
        const renderer = smd.default_renderer(containerRef.current);
        parserRef.current = smd.parser(renderer);
        lastContentRef.current = "";
        setError(null);
      }

      // Get the new content to append
      const newContent = content.slice(lastContentRef.current.length);
      
      if (newContent) {
        // Write the new content to the parser
        smd.parser_write(parserRef.current, newContent);
        lastContentRef.current = content;
      }

      // If streaming is complete, end the parser
      if (!isStreaming && lastContentRef.current === content && parserRef.current) {
        smd.parser_end(parserRef.current);
      }
    } catch (err) {
      console.error("Streaming markdown error:", err);
      setError("Failed to render markdown");
      
      // Fallback to simple text rendering
      if (containerRef.current) {
        containerRef.current.innerHTML = `<div class="whitespace-pre-wrap">${content}</div>`;
      }
    }

    // Reset parser when content changes completely (new message)
    return () => {
      if (!isStreaming && parserRef.current) {
        try {
          smd.parser_end(parserRef.current);
        } catch {
          // Parser might already be ended
        }
        parserRef.current = null;
        lastContentRef.current = "";
      }
    };
  }, [content, isStreaming]);

  // Reset parser when component unmounts or content completely changes
  useEffect(() => {
    return () => {
      if (parserRef.current) {
        try {
          smd.parser_end(parserRef.current);
        } catch {
          // Parser might already be ended
        }
      }
    };
  }, []);

  // If there's an error, show error message
  if (error) {
    return (
      <div className={`text-red-600 text-sm ${className}`}>
        {error}
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className={`prose prose-sm max-w-none ${className}`}
      style={{
        // Override some default prose styles for better chat appearance
        lineHeight: '1.6',
        fontSize: '14px'
      }}
    />
  );
}
