"use client";
import { useRef, useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { useChat } from "@ai-sdk/react";
import ChatHistorySidebar from "./ChatHistorySidebar";

import { Toaster } from "./ui/sonner";
import { ConfirmDialog } from "./ConfirmDialog";

// Utility: create a new chat session with a custom title
async function createChatSession(title: string = "New Chat"): Promise<{ id: string; title: string; created_at: string }> {
  const res = await fetch("/api/chat/histories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title })
  });
  const session = await res.json();
  return session;
}

// Utility: fetch all messages for a session
type Message = {
  id: string;
  sender: string;
  content: string;
  created_at?: string;
  citations?: { url: string; title?: string }[];
};

async function fetchMessages(sessionId: string): Promise<Message[]> {
  const res = await fetch(`/api/chat/histories/${sessionId}/messages`);
  const data = await res.json();
  return data.map((m: Message) => ({ ...m, citations: m.citations ?? [] }));
}

// Utility: save a message to a session
async function saveMessage(sessionId: string, content: string, sender: string, citations?: { url: string; title?: string }[]): Promise<void> {
  await fetch(`/api/chat/histories/${sessionId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sender, content, citations })
  });
}

// Types for citations
type Citation = {
  id: number;
  title: string;
  url: string;
  refCount: number;
};

// Utility to parse citations from text and create links
function parseCitations(text: string, externalCitations?: { url: string; title?: string }[]): {
  parsedText: React.ReactNode[];
  citations: Citation[];
} {
  // Find all citation references in format [n] or [n, m]
  const citationRegex = /\[(\d+(?:,\s*\d+)*)\]/g;
  const parts: React.ReactNode[] = [];
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
      parts.push(String(contentText.substring(lastIndex, match.index)));
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
            }
            
            return (
              <span key={id}>
                {idx > 0 && ', '}
                <a
                  href={citationsMap[id]?.url || '#'}
                  className="hover:underline"
                  target={citationsMap[id]?.url?.startsWith('http') ? '_blank' : '_self'}
                  rel={citationsMap[id]?.url?.startsWith('http') ? 'noopener noreferrer' : undefined}
                >
                  {id}
                </a>
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
    parts.push(String(contentText.substring(lastIndex)));
  }
  
  // Return only citations that were actually referenced
  const referencedCitations = Object.values(citationsMap).filter(c => c.refCount > 0);
  
  return {
    parsedText: parts,
    citations: referencedCitations
  };
}

// Helper: detect Perplexity citations and transform to correct array
type CitationUrl = { url: string; title?: string };

function isPerplexityCitation(obj: unknown): obj is { url: string; title?: string } {
  return (
    typeof obj === 'object' && 
    obj !== null && 
    'url' in obj && 
    typeof (obj as { url: string }).url === 'string'
  );
}

function getPerplexityCitations(citations: unknown): CitationUrl[] | undefined {
  if (Array.isArray(citations) && citations.every(isPerplexityCitation)) {
    return citations;
  }
  return undefined;
}

// Component to render message with citations
interface MessageWithCitationsProps {
  content: string;
  externalCitations?: { url: string; title?: string }[];
}

function MessageWithCitations({ content, externalCitations }: MessageWithCitationsProps) {
  const { parsedText, citations } = parseCitations(content, externalCitations);
  
  return (
    <div>
      <div className="whitespace-pre-wrap">
        {parsedText.map((part, index) => (
          <span key={index}>{part}</span>
        ))}
      </div>
      
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

// Fetch all chat sessions
async function fetchChatSessions(): Promise<{ id: string; title: string; created_at: string }[]> {
  try {
    const res = await fetch("/api/chat/histories");
    if (!res.ok) throw new Error("Failed to fetch");
    return await res.json();
  } catch (error) {
    console.error("Error fetching chat sessions:", error);
    return [];
  }
}

interface ToolInvocation {
  toolName: string;
  toolCallId: string;
  state: string;
  args?: Record<string, unknown>;
  result?: {
    summary?: string;
    citations?: { url: string; title?: string }[];
    text?: string;
  };
}

interface MessagePart {
  type: string;
  text?: string;
  toolInvocation?: ToolInvocation;
}

type AIMessage = {
  id: string;
  role: string;
  content: string;
  parts?: MessagePart[];
  toolInvocations?: ToolInvocation[];
  citations?: { url: string; title?: string }[];
};

export default function ChatUI() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmOpenIdx, setConfirmOpenIdx] = useState<number | null>(null);

  // Setup the chat hook with proper tool handling
  const { 
    messages, 
    input, 
    handleInputChange, 
    handleSubmit, 
    status, 
    stop, 
    reload, 
    setMessages 
  } = useChat({ 
    api: "/api/chat",
    maxSteps: 5, // Enable multi-step tool calls,
    onFinish: async (message: AIMessage) => {
      if (message.role === 'assistant' && activeChatId) {
        try {
          if (message.toolInvocations && message.toolInvocations.length > 0) {
            if (!message.content || message.content.trim() === '') {
              return;
            }
            const toolInvocation = message.toolInvocations[0];
            if (typeof toolInvocation === 'object' && toolInvocation && 'result' in toolInvocation && (toolInvocation as ToolInvocation).result?.summary) {
              const contentToSave = (toolInvocation as ToolInvocation).result!.summary as string;
              const citationsToSave = (toolInvocation as ToolInvocation).result!.citations || [];
              await saveMessage(activeChatId, contentToSave, 'assistant', citationsToSave);
            }
          } else {
            if (message.content && message.content.trim() !== '') {
              await saveMessage(activeChatId, message.content, 'assistant', []);
            }
          }
        } catch (error) {
          console.error('Failed to save assistant message:', error);
        }
      }
    }
  });

  // Restore loadChatMessages with proper types and scope
  const loadChatMessages = useCallback(async (chatId: string) => {
    try {
      setActiveChatId(chatId);
      const dbMessages = await fetchMessages(chatId);
      const aiMessages = dbMessages.map(msg => ({
        id: msg.id,
        role: msg.sender as 'user' | 'assistant',
        content: msg.content,
        citations: msg.citations ?? []
      }));
      setMessages(aiMessages);
    } catch (error) {
      console.error(`Failed to load messages for chat ${chatId}:`, error);
    }
  }, [setMessages]);

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
  }, [loadChatMessages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Create a new chat session
  const handleCreateNewChat = async (): Promise<string> => {
    const session = await createChatSession("New Chat");
    await loadChatMessages(session.id);
    return session.id;
  };

  // Enhanced submit handler that saves user messages
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Save user message to database first
    if (activeChatId) {
      try {
        await saveMessage(activeChatId, input, 'user');
      } catch (error) {
        console.error('Failed to save user message:', error);
      }
    }

    // Then submit to useChat
    handleSubmit(e);
  };

  // Render tool invocation UI
  const renderToolInvocation = (toolInvocation: ToolInvocation, callId: string) => {
    switch (toolInvocation.toolName) {
      case 'search_web_perplexity':
        switch (toolInvocation.state) {
          case 'call':
          case 'running':
          case 'partial-call':
            return (
              <div key={callId} className="bg-blue-50 border border-blue-200 rounded-lg p-3 my-2">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-blue-700 text-sm">
                    Searching the web for:{' '}
                    {toolInvocation.args && typeof toolInvocation.args === 'object' && 'query' in toolInvocation.args
                      ? `"${(toolInvocation.args as { query?: string }).query ?? ''}"`
                      : '(unknown query)'}
                  </span>
                </div>
              </div>
            );
          case 'result':
            const result = toolInvocation.result;
            return (
              <div key={callId} className="bg-green-50 border border-green-200 rounded-lg p-3 my-2">
                <div className="text-green-700 text-sm mb-2">✓ Web search completed</div>
                {result?.summary && (
                  <div className="text-green-800 text-sm leading-relaxed">
                    <MessageWithCitations 
                      content={result.summary} 
                      externalCitations={getPerplexityCitations(result.citations ?? [])}
                    />
                  </div>
                )}
              </div>
            );
          default:
            // Debug: show unknown states
            return (
              <div key={callId} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 my-2">
                <div className="text-yellow-700 text-sm">
                  Tool: {toolInvocation.toolName}, State: {toolInvocation.state}
                </div>
                {toolInvocation.args && (
                  <pre className="text-xs mt-1 text-yellow-600">
                    {JSON.stringify(toolInvocation.args, null, 2)}
                  </pre>
                )}
              </div>
            );
        }
        break;
      default:
        // Debug: show unknown tools
        return (
          <div key={callId} className="bg-gray-50 border border-gray-200 rounded-lg p-3 my-2">
            <div className="text-gray-700 text-sm">
              Unknown tool: {toolInvocation.toolName}, State: {toolInvocation.state}
            </div>
            <pre className="text-xs mt-1 text-gray-600">
              {JSON.stringify(toolInvocation, null, 2)}
            </pre>
          </div>
        );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="fixed inset-x-0 top-16 bottom-0 flex items-center justify-center bg-gray-50 z-40">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 top-16 bottom-0 flex w-full h-[calc(100vh-4rem)] bg-gray-50 z-40 overflow-hidden">
      {/* Chat History Sidebar */}
      <ChatHistorySidebar
        activeChatId={activeChatId}
        onSelectChat={loadChatMessages}
        onCreateChat={handleCreateNewChat}
      />

      {/* Main Chat Area */}
      <section className="flex-1 flex flex-col bg-white border-l border-gray-200 overflow-hidden">
        {activeChatId ? (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message: AIMessage, idx) => {
                const isUser = message.role === 'user';
                const prevMessage = idx > 0 ? messages[idx - 1] : null;

                return (
                  <div key={message.id} className={`mb-2 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      isUser 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      {isUser ? (
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      ) : (
                        <div>
                          {/* Render message parts properly */}
                          {message.parts ? (
                            message.parts.map((part: MessagePart, partIdx: number) => {
                              switch (part.type) {
                                case 'text':
                                  return (
                                    <div key={partIdx} className="whitespace-pre-wrap">
                                      <MessageWithCitations 
                                        content={part.text ?? ''} 
                                        externalCitations={getPerplexityCitations(message.citations ?? [])}
                                      />
                                    </div>
                                  );
                                case 'tool-invocation':
                                  return part.toolInvocation ? renderToolInvocation(part.toolInvocation, part.toolInvocation.toolCallId) : null;
                                default:
                                  return null;
                              }
                            })
                          ) : (
                            // Fallback for messages without parts
                            <MessageWithCitations 
                              content={message.content} 
                              externalCitations={getPerplexityCitations(message.citations ?? [])}
                            />
                          )}
                          
                          {/* Save as note button for assistant messages */}
                          {!isUser && (
                            <div className="mt-2 flex justify-end">
                              <button
                                onClick={() => setConfirmOpenIdx(idx)}
                                className="text-xs text-gray-500 hover:text-blue-600 transition-colors"
                              >
                                💾 Save as note
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Confirmation dialog */}
                    {confirmOpenIdx === idx && (
                      <ConfirmDialog
                        open={true}
                        title="Save as Note"
                        description="This will save the assistant's response as a new note in your collection."
                        onConfirm={async () => {
                          setConfirmOpenIdx(null);
                          const toastId = toast.loading("Saving note...", { duration: 1500 });
                          try {
                            // For assistant messages with tool invocations, we need to extract the content properly
                            let contentToSave = message.content;
                            
                            // If content is empty but there are tool invocations, extract from tool results
                            if (!contentToSave && message.toolInvocations) {
                              const toolResults = message.toolInvocations
                                .filter((inv: ToolInvocation) => inv.state === 'result' && inv.result?.summary)
                                .map((inv: ToolInvocation) => inv.result!.summary)
                                .join('\n\n');
                              contentToSave = toolResults;
                            }
                            
                            if (!contentToSave) {
                              throw new Error("No content to save");
                            }
                            
                            const res = await fetch("/api/entries", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                cleaned_content: contentToSave,
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
            {status === 'error' && (
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
              onSubmit={onSubmit}
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
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <h2 className="text-xl font-semibold mb-2">Welcome to Synapse Chat</h2>
              <p>Select a conversation or start a new one to begin.</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
