"use client";
import { useState, useEffect } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";

type ChatHistory = {
  id: string;
  title: string;
  created_at: string;
  updated_at?: string;
};

interface ChatHistorySidebarProps {
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onCreateChat: () => Promise<string>;
}

export default function ChatHistorySidebar({
  activeChatId,
  onSelectChat,
  onCreateChat,
}: ChatHistorySidebarProps) {
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all chat histories
  useEffect(() => {
    const fetchChatHistories = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/chat/histories");
        const data = await res.json();
        setChatHistories(data);
      } catch (error) {
        console.error("Failed to fetch chat histories:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChatHistories();
  }, []);

  // Handle creating a new chat
  const handleCreateNewChat = async () => {
    try {
      const newChatId = await onCreateChat();
      // Refresh the chat histories list
      const res = await fetch("/api/chat/histories");
      const data = await res.json();
      setChatHistories(data);
      
      // Select the newly created chat
      onSelectChat(newChatId);
    } catch (error) {
      console.error("Failed to create new chat:", error);
    }
  };

  // Format date to a readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="w-64 h-[70vh] border-r border-gray-200 bg-white shadow rounded-l-lg flex flex-col">
      <div className="p-3 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-700">Chat History</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-pulse text-gray-400">Loading...</div>
          </div>
        ) : chatHistories.length === 0 ? (
          <div className="text-center text-gray-400 p-4">
            No chat history yet.
          </div>
        ) : (
          chatHistories.map((chat) => (
            <button
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                activeChatId === chat.id
                  ? "bg-blue-100 text-blue-700"
                  : "hover:bg-gray-100"
              }`}
            >
              <div className="font-medium truncate">{chat.title || "Untitled Chat"}</div>
              <div className="text-xs text-gray-500">
                {formatDate(chat.updated_at || chat.created_at)}
              </div>
            </button>
          ))
        )}
      </div>
      
      <div className="p-2 border-t border-gray-200">
        <button
          onClick={handleCreateNewChat}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          New Chat
        </button>
      </div>
    </div>
  );
}
