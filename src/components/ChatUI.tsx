"use client";
import { useRef, useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { useChat } from "@ai-sdk/react";
import ChatHistorySidebar from "./ChatHistorySidebar";
import { StreamingMessageWithCitations } from "./StreamingMessageWithCitations";
import { Menu } from 'lucide-react'; // Import Menu icon

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State for mobile sidebar

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
                    <StreamingMessageWithCitations 
                      content={result.summary} 
                      externalCitations={getPerplexityCitations(result.citations ?? [])}
                      isStreaming={false}
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
      {/* Mobile Hamburger Menu */}
      <div className="md:hidden absolute top-4 left-4 z-50">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-md text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Chat History Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out
          md:relative md:translate-x-0 md:flex md:w-72 
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          bg-gray-100 border-r border-gray-200 h-full overflow-y-auto
        `}
      >
        <ChatHistorySidebar
          activeChatId={activeChatId}
          onSelectChat={(chatId) => {
            loadChatMessages(chatId);
            setIsSidebarOpen(false); // Close sidebar on selection (mobile)
          }}
          onCreateChat={async () => {
            const newChatId = await handleCreateNewChat();
            // loadChatMessages(newChatId); // Already handled in handleCreateNewChat
            setIsSidebarOpen(false); // Close sidebar on new chat (mobile)
            return newChatId;
          }}
        />
      </div>

      {/* Overlay for mobile when sidebar is open */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Main Chat Area */}
      <section className="flex-1 flex flex-col bg-white overflow-hidden">
        {/* Header for Chat (Optional - can add chat title or hamburger for desktop if needed) */}
        <div className="p-4 border-b border-gray-200 md:hidden flex items-center h-16">
          {/* This div is a placeholder for the hamburger menu space, content can be added here if needed */}
          <span className="font-semibold text-lg ml-12"> {/* Adjusted margin for hamburger */}
            {activeChatId && messages.length > 0 && activeChatId !== 'new' ? 
              messages.find(s => s.id === activeChatId)?.content.substring(0,20) || "Chat" 
              : "Synapse Chat"}
          </span>
        </div>

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
                                      <StreamingMessageWithCitations 
                                        content={part.text ?? ''} 
                                        externalCitations={getPerplexityCitations(message.citations ?? [])}
                                        isStreaming={status === 'streaming' && idx === messages.length - 1}
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
                            <StreamingMessageWithCitations 
                              content={message.content} 
                              externalCitations={getPerplexityCitations(message.citations ?? [])}
                              isStreaming={status === 'streaming' && idx === messages.length - 1}
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
