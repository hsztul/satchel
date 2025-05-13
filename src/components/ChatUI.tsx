"use client";
import { useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";

export default function ChatUI() {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    stop,
    reload,
    error,
  } = useChat({ api: "/api/chat" });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-[70vh] border rounded-lg shadow bg-white">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-gray-400 text-center pt-10">Start the conversation...</div>
        )}
        {messages.map((m, i) => (
          <div
            key={m.id || i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`rounded-xl px-4 py-2 max-w-[80%] whitespace-pre-line break-words shadow-sm font-mono text-sm ${
                m.role === "user"
                  ? "bg-blue-100 text-blue-900 self-end"
                  : "bg-gray-100 text-gray-700 self-start"
              }`}
            >
              {Array.isArray(m.parts)
                ? m.parts.map((part: any, idx: number) => {
                    if (part.type === 'text') return <span key={idx}>{part.text}</span>;
                    if (part.type === 'reasoning') return <pre key={idx} className="bg-yellow-50 text-yellow-900 rounded p-2 my-1">{part.details?.map((d: any) => d.type === 'text' ? d.text : '<redacted>').join(' ')}</pre>;
                    return null;
                  })
                : m.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      {(status === 'submitted' || status === 'streaming') && (
        <div className="flex items-center justify-center gap-3 py-2">
          {status === 'submitted' && (
            <span className="text-blue-500 animate-pulse">Thinking...</span>
          )}
          <button
            type="button"
            onClick={stop}
            className="bg-gray-200 text-gray-700 rounded px-3 py-1 text-xs hover:bg-gray-300"
            disabled={status !== 'streaming' && status !== 'submitted'}
          >
            Stop
          </button>
        </div>
      )}
      {error && (
        <div className="flex flex-col items-center py-2">
          <div className="text-red-600 mb-2">Something went wrong.</div>
          <button
            type="button"
            onClick={reload}
            className="bg-red-500 text-white rounded px-3 py-1 text-xs hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        className="flex items-center border-t p-2 gap-2"
        autoComplete="off"
      >
        <input
          type="text"
          className="flex-1 rounded-full border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          placeholder="Type your message..."
          value={input}
          onChange={handleInputChange}
          disabled={status !== 'ready'}
          required
        />
        <button
          type="submit"
          disabled={status !== 'ready' || !input.trim()}
          className="bg-blue-600 text-white rounded-full px-4 py-2 text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}

