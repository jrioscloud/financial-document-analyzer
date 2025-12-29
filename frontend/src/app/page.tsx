"use client";

import { useState, useEffect, useCallback } from "react";
import { ChatWidget } from "@/components/ChatWidget";
import { ChatInput } from "@/components/ChatInput";
import { FileUpload } from "@/components/FileUpload";
import { sendMessage, getHistory, type ChatMessage, type UploadResponse } from "@/lib/api";

// Session ID storage key
const SESSION_KEY = "financial-analyzer-session";

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load session from localStorage on mount
  useEffect(() => {
    const storedSession = localStorage.getItem(SESSION_KEY);
    if (storedSession) {
      setSessionId(storedSession);
      // Load history for existing session
      getHistory(storedSession)
        .then((data) => {
          setMessages(data.messages);
        })
        .catch((err) => {
          console.error("Failed to load history:", err);
          // Start fresh if history fails
          localStorage.removeItem(SESSION_KEY);
        });
    }
  }, []);

  // Save session ID when it changes
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem(SESSION_KEY, sessionId);
    }
  }, [sessionId]);

  const handleSend = useCallback(
    async (message: string) => {
      // Add user message immediately
      const userMessage: ChatMessage = {
        role: "user",
        content: message,
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);

      try {
        const response = await sendMessage(message, sessionId || undefined);

        // Update session ID if new
        if (response.session_id) {
          setSessionId(response.session_id);
        }

        // Add assistant response
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: response.answer,
          tools_used: response.tools_used,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to send message";
        setError(errorMsg);
        // Remove the user message if failed
        setMessages((prev) => prev.slice(0, -1));
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId]
  );

  const handleUploadComplete = (result: UploadResponse) => {
    // Add a system-like message about the upload
    const uploadMessage: ChatMessage = {
      role: "assistant",
      content: `${result.status}\n\nYou can now ask questions about your ${result.transactions_count} transactions from "${result.filename}".`,
    };
    setMessages((prev) => [...prev, uploadMessage]);
  };

  const handleUploadError = (errorMsg: string) => {
    setError(errorMsg);
  };

  const handleNewChat = () => {
    localStorage.removeItem(SESSION_KEY);
    setSessionId(null);
    setMessages([]);
    setError(null);
  };

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Sidebar */}
      <aside className="w-80 border-r border-zinc-200 dark:border-zinc-800 p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Financial Analyzer
          </h1>
          <button
            onClick={handleNewChat}
            className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            New Chat
          </button>
        </div>

        <FileUpload
          onUploadComplete={handleUploadComplete}
          onError={handleUploadError}
        />

        <div className="flex-1" />

        <div className="text-xs text-zinc-400 text-center">
          <p>Powered by LangChain + pgvector</p>
          <p className="mt-1">RAG Financial Analysis</p>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        <ChatWidget messages={messages} isLoading={isLoading} />

        {error && (
          <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        <ChatInput onSend={handleSend} disabled={isLoading} />
      </main>
    </div>
  );
}
