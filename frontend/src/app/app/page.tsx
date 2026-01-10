"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChatWidget } from "@/components/ChatWidget";
import { ChatInput } from "@/components/ChatInput";
import { FileUpload } from "@/components/FileUpload";
import { BrandIcon } from "@/components/BrandIcon";
import { TransactionBrowser } from "@/components/TransactionBrowser";
import { sendMessage, getHistory, getStats, getSessions, type ChatMessage, type UploadResponse, type StatsResponse, type SessionInfo } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

// Storage keys
const SESSION_KEY = "financial-analyzer-session";
const HAS_DATA_KEY = "financial-analyzer-has-data";

export default function AppPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasData, setHasData] = useState(false);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [showBrowser, setShowBrowser] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [chatHistory, setChatHistory] = useState<SessionInfo[]>([]);
  const [showChatHistory, setShowChatHistory] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  // Load chat history from backend
  const fetchChatHistory = useCallback(async () => {
    try {
      const data = await getSessions(20);
      setChatHistory(data.sessions);
    } catch (err) {
      console.error("Failed to load chat history:", err);
    }
  }, []);

  // Load chat history on mount
  useEffect(() => {
    fetchChatHistory();
  }, [fetchChatHistory]);

  // Load a previous chat
  const loadChat = useCallback(async (session: SessionInfo) => {
    try {
      setIsLoading(true);
      const data = await getHistory(session.id);
      setMessages(data.messages);
      setSessionId(session.id);
      localStorage.setItem(SESSION_KEY, session.id);
    } catch (err) {
      console.error("Failed to load chat:", err);
      setError("Failed to load conversation");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch stats on mount and after upload
  const fetchStats = useCallback(async () => {
    try {
      const data = await getStats();
      setStats(data);
      if (data.has_data) {
        setHasData(true);
        localStorage.setItem(HAS_DATA_KEY, "true");
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  }, []);

  // Load stats on mount
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Get current user on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? null);
    });
  }, [supabase.auth]);

  // Mark initialization complete after initial loads
  useEffect(() => {
    // Give a small delay to ensure UI doesn't flash
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

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
          if (data.messages.length > 0) {
            setMessages(data.messages);
          }
        })
        .catch((err) => {
          console.error("Failed to load history:", err);
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
          localStorage.setItem(SESSION_KEY, response.session_id);
        }

        // Add assistant response
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: response.answer,
          tools_used: response.tools_used,
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Refresh chat history from backend (session was updated server-side)
        fetchChatHistory();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to send message";
        setError(errorMsg);
        // Remove the user message if failed
        setMessages((prev) => prev.slice(0, -1));
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, fetchChatHistory]
  );

  const handleUploadComplete = (result: UploadResponse) => {
    // Mark that we have data
    setHasData(true);
    localStorage.setItem(HAS_DATA_KEY, "true");

    // Refresh stats to show updated data
    fetchStats();

    // Add a system-like message about the upload
    const uploadMessage: ChatMessage = {
      role: "assistant",
      content: `${result.status}\n\nYou can now ask questions about your ${result.transactions_count} transactions from "${result.filename}".`,
    };
    setMessages((prev) => [...prev, uploadMessage]);
  };

  // Handle upload click from empty state
  const handleUploadClick = () => {
    // Trigger the file input in the FileUpload component using its ID
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
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

  // Show loading screen while initializing
  if (isInitializing) {
    return (
      <div className="relative flex min-h-screen bg-background items-center justify-center">
        {/* Ambient Background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl animate-float" />
          <div
            className="absolute bottom-0 right-1/4 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl animate-float"
            style={{ animationDelay: "-3s" }}
          />
        </div>

        {/* Loading Content */}
        <div className="relative z-10 flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center glow animate-pulse-soft">
            <BrandIcon className="w-8 h-8 text-white" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">Loading FinAnalyzer</h2>
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" />
            </div>
          </div>
        </div>
      </div>
    );
  }

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
        <div className="p-4 pb-2">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                     gradient-brand text-white font-medium
                     transition-all duration-200 btn-glow interactive-lift"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>
        </div>

        {/* Chat History */}
        {chatHistory.length > 0 && (
          <div className="px-4 pb-4">
            <button
              onClick={() => setShowChatHistory(!showChatHistory)}
              className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
            >
              <span className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Recent Chats ({chatHistory.length})
              </span>
              <svg
                className={`w-3 h-3 transition-transform ${showChatHistory ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showChatHistory && (
              <div className="space-y-1 max-h-40 overflow-y-auto animate-slide-down">
                {chatHistory.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => loadChat(session)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all duration-200
                              hover:bg-secondary/50 group
                              ${sessionId === session.id ? 'bg-brand-500/10 border border-brand-500/20' : 'border border-transparent'}`}
                  >
                    <div className="flex items-start gap-2">
                      <svg className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0 group-hover:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground truncate">{session.title}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {session.message_count} messages · {new Date(session.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* File Upload */}
        <div className="px-4 pb-4">
          <FileUpload
            onUploadComplete={handleUploadComplete}
            onError={handleUploadError}
          />
        </div>

        {/* Data Stats Panel */}
        {stats?.has_data && (
          <div className="px-4 pb-4 animate-fade-in">
            <div className="rounded-lg bg-brand-500/10 border border-brand-500/20 p-3">
              {/* Header with View Data button */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span className="text-xs font-medium text-brand-400">Available Data</span>
                </div>
                <button
                  onClick={() => setShowBrowser(true)}
                  className="text-[10px] text-brand-400 hover:text-brand-300 transition-colors"
                >
                  View All →
                </button>
              </div>

              {/* Stats summary */}
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Transactions:</span>
                  <span className="text-foreground font-medium">{stats.total_transactions.toLocaleString()}</span>
                </div>
                {stats.date_range && (
                  <div className="flex justify-between">
                    <span>Date Range:</span>
                    <span className="text-foreground font-medium">
                      {new Date(stats.date_range.start).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      {' - '}
                      {new Date(stats.date_range.end).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                )}
              </div>

              {/* File list (collapsible) */}
              {stats.files && stats.files.length > 0 && (
                <div className="mt-2 pt-2 border-t border-brand-500/20">
                  <button
                    onClick={() => setShowFiles(!showFiles)}
                    className="w-full flex items-center justify-between text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span>Uploaded Files ({stats.files.length})</span>
                    <svg
                      className={`w-3 h-3 transition-transform ${showFiles ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showFiles && (
                    <div className="mt-2 space-y-1.5 animate-slide-down">
                      {stats.files.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 p-2 rounded-lg bg-background/50 border border-border/30"
                        >
                          <svg className="w-3.5 h-3.5 text-brand-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-foreground truncate" title={file.filename}>
                              {file.filename}
                            </p>
                            <p className="text-[9px] text-muted-foreground">
                              {file.count} txns • {file.source}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Categories */}
              {stats.categories.length > 0 && (
                <div className="mt-2 pt-2 border-t border-brand-500/20">
                  <span className="text-[10px] text-muted-foreground">Top Categories:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {stats.categories.slice(0, 4).map((cat) => (
                      <span
                        key={cat.name}
                        className="px-1.5 py-0.5 text-[10px] rounded bg-secondary/50 text-muted-foreground"
                      >
                        {cat.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

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
        <div className="flex-1 flex flex-col gradient-border-animated rounded-2xl glow animate-glow-pulse">
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
            <ChatWidget
              messages={messages}
              isLoading={isLoading}
              hasData={hasData}
              onSuggestionClick={handleSend}
              onUploadClick={handleUploadClick}
            />

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

      {/* Transaction Browser Modal */}
      <TransactionBrowser
        isOpen={showBrowser}
        onClose={() => setShowBrowser(false)}
        stats={stats}
      />
    </div>
  );
}
