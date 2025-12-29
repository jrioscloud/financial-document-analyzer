"use client";

import { useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/api";

interface ChatWidgetProps {
  messages: ChatMessage[];
  isLoading?: boolean;
}

// Tool icon mapping for visual feedback
const toolIcons: Record<string, React.ReactNode> = {
  search_transactions: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  analyze_spending: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  compare_periods: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  ),
  categorize_transaction: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  generate_report: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
};

function ToolBadge({ tool }: { tool: string }) {
  const icon = toolIcons[tool] || (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg
                    bg-brand-500/15 text-brand-400 border border-brand-500/20
                    text-xs font-medium transition-all duration-200
                    hover:bg-brand-500/20 hover:border-brand-500/30">
      {icon}
      <span>{tool}</span>
    </span>
  );
}

function MessageBubble({ message, index }: { message: ChatMessage; index: number }) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex w-full mb-4 animate-slide-up",
        isUser ? "justify-end" : "justify-start"
      )}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className={cn("flex gap-3 max-w-[85%]", isUser && "flex-row-reverse")}>
        {/* Avatar */}
        <div
          className={cn(
            "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
            isUser
              ? "bg-foreground text-background"
              : "gradient-brand text-white glow-sm"
          )}
        >
          {isUser ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          )}
        </div>

        {/* Message Content */}
        <div className="flex flex-col gap-2">
          <div
            className={cn(
              "rounded-2xl px-4 py-3 transition-all duration-200",
              isUser
                ? "bg-foreground text-background rounded-tr-md"
                : "glass-strong rounded-tl-md"
            )}
          >
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {message.content}
            </div>
          </div>

          {/* Tool Badges */}
          {message.tools_used && message.tools_used.length > 0 && (
            <div className="flex flex-wrap gap-1.5 animate-fade-in">
              {message.tools_used.map((tool, i) => (
                <ToolBadge key={i} tool={tool} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingIndicator() {
  return (
    <div className="flex justify-start mb-4 animate-fade-in">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0 w-8 h-8 rounded-lg gradient-brand flex items-center justify-center glow-sm animate-pulse-soft">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>

        {/* Loading Bubble */}
        <div className="glass-strong rounded-2xl rounded-tl-md px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" />
            </div>
            <span className="text-xs text-muted-foreground ml-2">Analyzing...</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  const suggestions = [
    { icon: "💰", text: "How much did I spend on food this month?" },
    { icon: "📊", text: "What are my top expense categories?" },
    { icon: "📈", text: "Compare my November vs December spending" },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 animate-fade-in">
      {/* Icon */}
      <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center glow mb-6">
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>

      {/* Title */}
      <h2 className="text-xl font-semibold text-foreground mb-2">
        Financial Assistant
      </h2>
      <p className="text-sm text-muted-foreground mb-8 max-w-md">
        Ask questions about your spending, income, and financial patterns. Upload a CSV to get started.
      </p>

      {/* Suggestions */}
      <div className="space-y-2 w-full max-w-md">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
          Try asking
        </p>
        {suggestions.map((suggestion, i) => (
          <button
            key={i}
            className="w-full text-left px-4 py-3 rounded-xl glass
                      text-sm text-muted-foreground hover:text-foreground
                      border border-transparent hover:border-brand-500/20
                      transition-all duration-200 interactive-scale"
          >
            <span className="mr-2">{suggestion.icon}</span>
            {suggestion.text}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ChatWidget({ messages, isLoading }: ChatWidgetProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/50 glass-strong">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse-soft" />
          <div>
            <h2 className="font-semibold text-foreground text-sm">
              Financial Assistant
            </h2>
            <p className="text-xs text-muted-foreground">
              {messages.length > 0
                ? `${messages.length} message${messages.length !== 1 ? "s" : ""} in conversation`
                : "Ready to analyze your finances"}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {messages.map((message, index) => (
                <MessageBubble key={index} message={message} index={index} />
              ))}
              {isLoading && <LoadingIndicator />}
              <div ref={scrollRef} />
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
