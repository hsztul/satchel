"use client";
import { useRef, useEffect, useState } from "react";
import { toast } from "sonner";
import { useChat } from "@ai-sdk/react";
import ChatHistorySidebar from "./ChatHistorySidebar";
import Link from "next/link";

// Utility: create a new chat session with a custom title
async function createChatSession(title: string = "New Chat") {
  const res = await fetch("/api/chat/histories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title })
  });
  const session = await res.json();
  return session;
}

// Utility: fetch all messages for a session
async function fetchMessages(sessionId: string) {
  const res = await fetch(`/api/chat/histories/${sessionId}/messages`);
  return await res.json();
}

// Utility: save a message to a session
async function saveMessage(sessionId: string, sender: string, content: string) {
  await fetch(`/api/chat/histories/${sessionId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sender, content })
  });
}


type ReasoningDetail = { type: 'text'; text: string } | { type: string; [key: string]: unknown };
type MessagePart = { type: 'text'; text: string } | { type: 'reasoning'; details: ReasoningDetail[] };

// Types for citations
type Citation = {
  id: number;
  title: string;
  url: string;
  refCount: number;
};

// Utility to parse citations from text and create links
function parseCitations(text: string): {
  parsedText: React.ReactNode[];
  citations: Citation[];
} {
  // Find all citation references in format [n] or [n, m]
  const citationRegex = /\[(\d+(?:,\s*\d+)*)\]/g;
  const parts: React.ReactNode[] = [];
  const citationsMap: Record<number, Citation> = {};
  
  // Split text by citations
  let lastIndex = 0;
  let match;
  
  // Find citation list section at the end of the message
  const sourceListRegex = /\n*Sources?:?\n((?:\[\d+\]:.*(?:\n|$))+)/i;
  const sourceListMatch = text.match(sourceListRegex);
  
  let contentText = text;
  let sourcesText = "";
  
  // Extract the sources section if it exists
  if (sourceListMatch) {
    contentText = text.substring(0, sourceListMatch.index);
    sourcesText = sourceListMatch[1];
    
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
  
  // Process inline citations
  while ((match = citationRegex.exec(contentText)) !== null) {
    // Add text before the citation
    if (match.index > lastIndex) {
      parts.push(contentText.substring(lastIndex, match.index));
    }
    
    // Process the citation
    const citationIds = match[1].split(/,\s*/).map(id => parseInt(id.trim()));
    
    // Create a citation link
    parts.push(
      <span key={match.index} className="inline-flex items-center gap-1">
        <span className="text-xs text-blue-600 font-medium">
          [
          {citationIds.map((id, idx) => {
            // Track citation usage
            if (citationsMap[id]) {
              citationsMap[id].refCount++;
            } else {
              // Create placeholder if citation not found in source list
              citationsMap[id] = { id, title: `Source ${id}`, url: `/entry/${id}`, refCount: 1 };
            }
            
            return (
              <span key={id}>
                {idx > 0 && ", "}
                <Link 
                  href={citationsMap[id].url} 
                  target="_blank"
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {id}
                </Link>
              </span>
            );
          })}
          ]
        </span>
      </span>
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < contentText.length) {
    parts.push(contentText.substring(lastIndex));
  }
  
  // Convert citations map to array
  const citations = Object.values(citationsMap).filter(c => c.refCount > 0);
  
  return { parsedText: parts, citations };
}

// Component to render message with citations
function MessageWithCitations({ content }: { content: string }) {
  const { parsedText, citations } = parseCitations(content);
  
  return (
    <div>
      <div className="whitespace-pre-line">
        {parsedText}
      </div>
      
      {citations.length > 0 && (
        <div className="mt-4 pt-2 border-t border-gray-200">
          <h4 className="text-xs font-semibold text-gray-500 mb-1">Sources:</h4>
          <ul className="text-xs space-y-1">
            {citations.map(citation => (
              <li key={citation.id} className="flex items-start">
                <span className="font-medium text-gray-700 mr-1">[{citation.id}]</span>
                <Link 
                  href={citation.url} 
                  target="_blank"
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {citation.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

import { Toaster } from "./ui/sonner";
import { ConfirmDialog } from "./ConfirmDialog";

export default function ChatUI() {
  // State for confirmation dialog
  const [confirmOpenIdx, setConfirmOpenIdx] = useState<number | null>(null);

  // Load the most recent chat session on mount
  useEffect(() => {
    (async () => {
      setLoading(true);
      const sessions = await fetchChatSessions();
      if (sessions && sessions.length > 0) {
        await loadChatMessages(sessions[0].id);
      } else {
        // If no sessions, create a new one and load it
        const session = await createChatSession("New Chat");
        await loadChatMessages(session.id);
      }
      setLoading(false);
    })();
  }, []);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Removed unused persistedMessages state to fix lint error.
  const [savingMessage, setSavingMessage] = useState(false);

  const {
    messages,
    input,
    handleInputChange,
    status,
    stop,
    reload,
    error,
    append,
    setMessages,
    setInput
  } = useChat({ api: "/api/chat" });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // State for storing all available chat sessions
  type ChatSession = { id: string; title: string; created_at: string };
const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  
  // Fetch all chat sessions
  const fetchChatSessions = async () => {
    try {
      const res = await fetch("/api/chat/histories");
      const sessions = await res.json();
      // Sort by created_at descending
      const sortedSessions = [...sessions].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setChatSessions(sortedSessions);
      return sortedSessions;
    } catch (error) {
      console.error("Failed to fetch chat sessions:", error);
      return [];
    }
  };

  // Load messages for a specific chat session
const loadChatMessages = async (chatId: string) => {
    // Prevent overlapping API calls
    if (isFetchingRef.current) return;
    
    try {
      isFetchingRef.current = true;
      setLoading(true);
      
      // Clear the current chat state
      setMessages([]);
      setActiveChatId(chatId);
      
      // Use cached messages if available
      let msgs: {id: string; sender: string; content: string; created_at?: string}[] = [];
      if (cachedMessagesMap[chatId]) {
        msgs = cachedMessagesMap[chatId];
        console.log('Using cached messages for', chatId);
      } else {
        // Fetch messages for this chat
        msgs = await fetchMessages(chatId);
        
        // Store in cache
        setCachedMessagesMap(prev => ({
          ...prev,
          [chatId]: msgs
        }));
      }
      
      // Convert to the format expected by useChat
      setMessages(
        msgs.map((m: { id: string; sender: string; content: string }) => ({
          id: m.id,
          role: m.sender as 'user' | 'assistant' | 'system' | 'data',
          content: m.content
        }))
      );
      setLoading(false);
    } catch (error) {
      console.error(`Failed to load messages for chat ${chatId}:`, error);
      setLoading(false);
    } finally {
      isFetchingRef.current = false;
    }
  };
  
  // Create a new chat session
  const handleCreateNewChat = async () => {
    try {
      const session = await createChatSession("New Chat");
      await loadChatMessages(session.id); // Load the new empty chat
      return session.id;
    } catch (error) {
      console.error("Failed to create new chat:", error);
      return null;
    }
  };

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Keep track of which message contents we've already saved to prevent duplicates
  const [savedContentHashes, setSavedContentHashes] = useState<Set<string>>(new Set());
  
  // Helper function to create a content hash - helps us identify duplicate messages
  const hashContent = (role: string, content: string): string => {
    return `${role}:${content.substring(0, 50)}`; // First 50 chars is enough for uniqueness
  };

  // Flag to prevent overlapping API calls
  const isFetchingRef = useRef(false);

  // Cache messages to reduce repeated fetches
  type Message = { id: string; sender: string; content: string; created_at?: string };
const [cachedMessagesMap, setCachedMessagesMap] = useState<Record<string, Message[]>>({});

  // Save completed assistant messages - avoiding excessive fetching
  useEffect(() => {
    // Only run if we have a session and are not already saving
    if (!activeChatId || savingMessage || status !== "ready" || messages.length === 0 || isFetchingRef.current) return;
    
    // Check if the last message is from the assistant and needs to be saved
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "assistant") {
      // Create a hash of this message to check if we've already saved it
      const contentHash = hashContent("assistant", lastMessage.content);
      
      // Only save if we haven't already saved this exact content
      if (!savedContentHashes.has(contentHash)) {
        // Save the complete message to the database
        (async () => {
          setSavingMessage(true);
          isFetchingRef.current = true;
          try {
            // Use cached messages if available, otherwise fetch
            let existingMessages = cachedMessagesMap[activeChatId] || [];
            
            // Check if we need to fetch from DB (only fetch once)
            if (!cachedMessagesMap[activeChatId]) {
              existingMessages = await fetchMessages(activeChatId);
              setCachedMessagesMap(prev => ({
                ...prev,
                [activeChatId]: existingMessages
              }));
            }

            const assistantMessages = existingMessages.filter(
              (m: Message) => m.sender === "assistant" && m.content === lastMessage.content
            );
            
            // Only save if this exact message doesn't exist in the database
            if (assistantMessages.length === 0) {
              await saveMessage(activeChatId, "assistant", lastMessage.content);
              // Mark this content as saved
              setSavedContentHashes(prev => new Set(prev).add(contentHash));

              // Update cached messages
              setCachedMessagesMap(prev => ({
                ...prev,
                [activeChatId]: [
                  ...prev[activeChatId] || [],
                  { id: String(Date.now()), sender: "assistant", content: lastMessage.content }
                ]
              }));

              // --- Update chat session title based on first assistant response ---
              // Only update if this is the first assistant message in the session
              if ((existingMessages as { sender: string }[]).filter((m) => m.sender === "assistant").length === 0) {
                // Extract a short title from the assistant's response (first 6 words)
                const words = lastMessage.content.split(" ").filter(Boolean);
                const title = words.slice(0, 6).join(" ") + (words.length > 6 ? "..." : "");
                try {
                  // Update the title in Supabase
                  await fetch("/api/chat/histories/update-title", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: activeChatId, title })
                  });
                  // Refresh chat sessions from backend to ensure UI is up-to-date
                  await fetchChatSessions();
                } catch {
                  console.error("Failed to update chat session title:");
                }
              }
            }
          } catch {
            console.error("Failed to save assistant message:");
          } finally {
            setSavingMessage(false);
            isFetchingRef.current = false;
          }
        })();
      }
    }
  }, [activeChatId, status, messages, savedContentHashes, cachedMessagesMap, savingMessage]);

  // Handle form submission
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!activeChatId || !input.trim() || status !== "ready") return;

    const userMessage = input.trim();
    const userContentHash = hashContent("user", userMessage);
    
    // First save the user message to the database (if not already saved)
    if (!savedContentHashes.has(userContentHash)) {
      try {
        // Check if this exact message already exists in the database
        const existingMessages = await fetchMessages(activeChatId);
        const duplicateUserMessages = (existingMessages as { sender: string; content: string }[]).filter(
          (m) => m.sender === "user" && m.content === userMessage
        );
        
        // Only save if this exact message doesn't exist in the database
        if (duplicateUserMessages.length === 0) {
          await saveMessage(activeChatId, "user", userMessage);
          // Mark this content as saved
          setSavedContentHashes(prev => new Set(prev).add(userContentHash));
        }
      } catch {
        console.error("Failed to save user message:");
      }
    }

    // Clear input immediately
    setInput(""); 
    
    // Then send it to the AI using the Vercel AI SDK
    // This will automatically handle the streaming response
    append({ role: "user", content: userMessage });
  }

  return (
    <div className="fixed inset-x-0 top-16 bottom-0 flex w-full h-[calc(100vh-4rem)] bg-gray-50 z-40 overflow-hidden">
      {/* Chat History Sidebar */}
      <aside className="hidden md:flex h-full w-64 flex-shrink-0 border-r bg-white">
        <div className="flex flex-col h-full">
          <div className="flex-1 min-h-0 overflow-y-auto">
            <ChatHistorySidebar 
              activeChatId={activeChatId}
              onSelectChat={loadChatMessages}
              onCreateChat={handleCreateNewChat}
            />
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <section className="flex-1 flex flex-col h-full min-w-0">
        {/* Mobile chat selector */}
        <div className="md:hidden border-b border-gray-200 p-2 flex items-center justify-between bg-white z-10">
          <select 
            className="text-sm rounded-md border-gray-300 py-1 pl-2 pr-8 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={activeChatId || ''}
            onChange={(e) => {
              if (e.target.value === 'new') {
                handleCreateNewChat();
              } else if (e.target.value) {
                loadChatMessages(e.target.value);
              }
            }}
            disabled={loading}
          >
            <option value="" disabled>Select chat</option>
            <optgroup label="Chat History">
              {chatSessions.map(session => (
                <option key={session.id} value={session.id}>
                  {session.title || 'Untitled Chat'}
                </option>
              ))}
              <option value="new">+ New Chat</option>
            </optgroup>
          </select>
          <button
            onClick={() => handleCreateNewChat()}
            className="p-1 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
            aria-label="New Chat"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </div>
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-pulse text-blue-500">Loading...</div>
          </div>
        ) : (
          <>
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-white">
              {messages.length === 0 && (
                <div className="text-gray-400 text-center">No messages yet.</div>
              )}
              {messages.map((m, idx) => {
                const showSave = m.role === "user" || m.role === "assistant";
                const prevMessage = idx > 0 ? messages[idx - 1] : null;
                const handleSave = () => {
                  setConfirmOpenIdx(idx);
                };
                return (
                  <div
                    key={m.id || idx}
                    className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`relative max-w-[80%] px-4 py-2 pb-10 rounded-lg whitespace-pre-line text-sm shadow
                        ${m.role === "user"
                          ? "bg-blue-600 text-white self-end"
                          : "bg-gray-100 text-gray-700 self-start"
                        }`}
                    >
                      {Array.isArray(m.parts)
                        ? (m.parts as MessagePart[]).map((part, idx) => {
                            if (part.type === 'text') return <span key={idx}>{part.text}</span>;
                            if (part.type === 'reasoning') return <pre key={idx} className="bg-yellow-50 text-yellow-900 rounded p-2 my-1">{part.details?.map((d: ReasoningDetail) => d.type === 'text' ? d.text : '<redacted>').join(' ')}</pre>;
                            return null;
                          })
                        : m.role === "assistant" 
                          ? <MessageWithCitations content={m.content} />
                          : m.content}

                      {showSave && (
                        <button
                          type="button"
                          aria-label="Save as note"
                          onClick={handleSave}
                          className="absolute bottom-2 right-2 mt-2 bg-white border border-gray-300 rounded-full shadow p-1 hover:bg-blue-100 transition"
                        >
                          <span role="img" aria-label="Save">💾</span>
                        </button>
                      )}
                    </div>
                    {confirmOpenIdx === idx && (
                      <ConfirmDialog
                        open={true}
                        title="Save message as note?"
                        description="This will create a new note entry from this chat message."
                        onConfirm={async () => {
                          setConfirmOpenIdx(null);
                          const toastId = toast.loading("Saving note...", { duration: 1500 });
                          try {
                            const res = await fetch("/api/entries", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                cleaned_content: m.content,
                                metadata: {
                                  previous_message: prevMessage ? prevMessage.content : null
                                }
                              })
                            });
                            toast.dismiss(toastId);
                            if (!res.ok) throw new Error("Failed to save");
                            toast.success("Saved as note!", { duration: 2500 });
                          } catch {
                            toast.dismiss(toastId);
                            toast.error("Failed to save note", { duration: 3000 });
                          }
                        }}
                        onCancel={() => setConfirmOpenIdx(null)}
                      />
                    )}
                  </div>
                );
              })}
              <Toaster />
              {/* Streaming indicator */}
               {status === 'streaming' && messages.length > 0 && (
                 <div className="flex items-center justify-center py-2">
                   <span className="text-blue-500 animate-pulse">Assistant is typing...</span>
                 </div>
               )}
              <div ref={messagesEndRef} />
            </div>

            {/* Status indicators & controls */}
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

            {/* Error handling */}
            {error && (
              <div className="flex flex-col items-center py-2">
                <div className="text-red-600 mb-2">Something went wrong.</div>
                <button
                  type="button"
                  onClick={() => reload()}
                  className="bg-red-500 text-white rounded px-3 py-1 text-xs hover:bg-red-600"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Input form */}
            <form
              onSubmit={handleSubmit}
              className="flex items-center border-t p-2 gap-2 bg-white"
              autoComplete="off"
            >
              <input
                type="text"
                className="flex-1 rounded-full border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="Type your message..."
                value={input}
                onChange={handleInputChange}
                disabled={status !== 'ready' || !activeChatId}
                required
              />
              <button
                type="submit"
                disabled={status !== 'ready' || !input.trim() || !activeChatId}
                className="bg-blue-600 text-white rounded-full px-4 py-2 text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

