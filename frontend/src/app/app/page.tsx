"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChatWidget } from "@/components/ChatWidget";
import { ChatInput } from "@/components/ChatInput";
import { FileUpload } from "@/components/FileUpload";
import { BrandIcon } from "@/components/BrandIcon";
import { sendMessage, getHistory, type ChatMessage, type UploadResponse } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

// Session ID storage key
const SESSION_KEY = "financial-analyzer-session";

export default function AppPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Get current user on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? null);
    });
  }, [supabase.auth]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

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
    <div className="relative flex min-h-screen bg-background overflow-hidden">
      {/* Ambient Background - BEAUTIFUL stage */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl animate-float" />
        <div
          className="absolute bottom-0 right-1/4 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "-3s" }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-600/5 rounded-full blur-3xl" />
      </div>

      {/* Sidebar */}
      <aside className="relative z-10 w-80 border-r border-border/50 glass-strong flex flex-col">
        {/* Logo & Header */}
        <div className="p-5 border-b border-border/50">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center glow-sm group-hover:scale-105 transition-transform">
                <BrandIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-foreground tracking-tight">
                  FinAnalyzer
                </h1>
                <p className="text-xs text-muted-foreground">AI Financial Insights</p>
              </div>
            </Link>
          </div>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                     border border-border/50 bg-secondary/50 hover:bg-secondary
                     text-sm font-medium text-foreground
                     transition-all duration-200 hover:border-brand-500/30 interactive-lift"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>
        </div>

        {/* File Upload */}
        <div className="px-4 pb-4">
          <FileUpload
            onUploadComplete={handleUploadComplete}
            onError={handleUploadError}
          />
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Footer */}
        <div className="p-4 border-t border-border/50">
          {/* User & Logout */}
          {userEmail && (
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-border/30">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-full bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <span className="text-xs text-muted-foreground truncate">{userEmail}</span>
              </div>
              <button
                onClick={handleLogout}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              >
                Sign out
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse-soft" />
            <span className="text-xs text-muted-foreground">Powered by LangChain + pgvector</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {["RAG", "Tool Calling", "Session Memory"].map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-[10px] font-medium rounded-full
                         bg-brand-500/10 text-brand-400 border border-brand-500/20"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="relative z-10 flex-1 flex flex-col p-6">
        {/* Gradient Border Container */}
        <div className="flex-1 flex flex-col gradient-border rounded-2xl glow">
          <div className="flex-1 flex flex-col bg-background rounded-2xl overflow-hidden">
            {/* Window Chrome */}
            <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors cursor-pointer" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-500 transition-colors cursor-pointer" />
                <div className="w-3 h-3 rounded-full bg-green-500/80 hover:bg-green-500 transition-colors cursor-pointer" />
              </div>
              <span className="text-sm text-muted-foreground">financial-analyzer.app</span>
              <div className="w-16" />
            </div>

            {/* Chat Content */}
            <ChatWidget messages={messages} isLoading={isLoading} onSuggestionClick={handleSend} />

            {/* Error Banner */}
            {error && (
              <div className="px-6 py-3 bg-destructive/10 border-t border-destructive/20 animate-slide-up">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-destructive">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="ml-auto text-destructive/60 hover:text-destructive transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Chat Input */}
            <ChatInput onSend={handleSend} disabled={isLoading} />
          </div>
        </div>
      </main>
    </div>
  );
}
