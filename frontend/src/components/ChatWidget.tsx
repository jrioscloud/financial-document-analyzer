"use client";

import { useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/api";
import { SpendingBreakdown, parseSpendingBreakdown } from "@/components/chat/SpendingBreakdown";

interface ChatWidgetProps {
  messages: ChatMessage[];
  isLoading?: boolean;
  hasData?: boolean;
  onSuggestionClick?: (text: string) => void;
  onUploadClick?: () => void;
}

// Tool icon mapping for visual feedback
const toolIcons: Record<string, React.ReactNode> = {
  search_transactions: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  analyze_spending: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  compare_periods: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  ),
  categorize_transaction: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  generate_report: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
};

// Inline tool indicator (shown at top of AI message)
function InlineToolIndicator({ tools }: { tools: string[] }) {
  if (!tools || tools.length === 0) return null;

  const primaryTool = tools[0];
  const icon = toolIcons[primaryTool] || (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );

  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-6 h-6 rounded-lg gradient-brand flex items-center justify-center text-white">
        {icon}
      </div>
      <span className="text-xs text-muted-foreground">
        Using {primaryTool.replace(/_/g, " ")} tool
        {tools.length > 1 && ` +${tools.length - 1} more`}
      </span>
    </div>
  );
}

// Markdown content with styled components - AESTHETIC FRAMEWORK applied
function MarkdownContent({ content }: { content: string }) {
  // First, check if this is a spending breakdown
  const spendingData = parseSpendingBreakdown(content);
  if (spendingData) {
    return <SpendingBreakdown {...spendingData} />;
  }

  return (
    <div className="prose-chat">
      <ReactMarkdown
        remarkPlugins={[
          remarkGfm,
          // Disable $ as math delimiter - only use \(...\) and \[...\]
          // This prevents currency values like $7,370.56 from being parsed as math
          [remarkMath, { singleDollarTextMath: false }]
        ]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Headings - Clear visual hierarchy
          h1: ({ children }) => (
            <h1 className="text-lg font-bold text-foreground mb-4 pb-2 border-b border-brand-500/20">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-semibold text-foreground mb-3 mt-5 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold text-foreground mb-2 mt-4 first:mt-0 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-medium text-brand-400 mb-2 mt-3 first:mt-0">
              {children}
            </h4>
          ),
          // Paragraphs - Comfortable reading
          p: ({ children }) => (
            <p className="text-[0.9375rem] leading-[1.75] mb-3 last:mb-0 text-foreground/90">
              {children}
            </p>
          ),
          // Strong/Bold - Brand accent
          strong: ({ children }) => (
            <strong className="font-semibold text-brand-400">{children}</strong>
          ),
          // Emphasis/Italic
          em: ({ children }) => (
            <em className="text-foreground/80 not-italic font-medium">{children}</em>
          ),
          // Lists - Clear structure
          ul: ({ children }) => (
            <ul className="my-3 space-y-2">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-3 space-y-2 list-decimal list-inside marker:text-brand-400">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-[0.9375rem] leading-relaxed flex items-start gap-2.5 pl-1">
              <span className="mt-[0.6rem] w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0" />
              <span className="flex-1">{children}</span>
            </li>
          ),
          // Code - Technical styling
          code: ({ children, className }) => {
            const isBlock = className?.includes("language-");
            if (isBlock) {
              return (
                <code className="block bg-background/60 rounded-lg p-4 text-xs font-mono overflow-x-auto border border-border/50">
                  {children}
                </code>
              );
            }
            return (
              <code className="px-1.5 py-0.5 rounded-md bg-brand-500/10 text-brand-400 text-[0.8125rem] font-mono">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="my-4">{children}</pre>
          ),
          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-brand-400 hover:text-brand-300 underline underline-offset-2 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          // Blockquote - Styled callout
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-brand-500/50 pl-4 my-4 py-1 bg-brand-500/5 rounded-r-lg text-foreground/80">
              {children}
            </blockquote>
          ),
          // Horizontal rule
          hr: () => (
            <hr className="my-5 border-t border-border/50" />
          ),
          // Tables - Financial data display
          table: ({ children }) => (
            <div className="overflow-x-auto my-4 rounded-xl border border-border/50 bg-background/30">
              <table className="w-full text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-brand-500/10 border-b border-border/50">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-border/30">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-brand-500/5 transition-colors">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2.5 text-left font-semibold text-brand-400 text-xs uppercase tracking-wider">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2.5 text-foreground/90">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function MessageBubble({ message, index }: { message: ChatMessage; index: number }) {
  const isUser = message.role === "user";
  // Detect markdown and tables for proper rendering
  // Note: We don't detect $ as math because currency values like $7,370.56
  // would be incorrectly parsed as LaTeX. Only detect explicit LaTeX commands.
  const hasRichContent = !isUser && (
    message.content.includes("###") ||
    message.content.includes("**") ||
    message.content.includes("- ") ||
    message.content.includes("| ") ||
    message.content.includes("\\[") ||    // Display math \[...\]
    message.content.includes("\\(") ||    // Inline math \(...\)
    message.content.includes("\\frac") || // LaTeX fractions
    message.content.includes("\\sum") ||  // LaTeX summation
    message.content.includes("\\int") ||  // LaTeX integral
    message.content.includes("\\text")    // LaTeX text
  );

  return (
    <div
      className={cn(
        "flex w-full mb-4 animate-slide-up",
        isUser ? "justify-end" : "justify-start"
      )}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className={cn("max-w-[85%] lg:max-w-[75%]")}>
        {/* User Message - Gradient Bubble */}
        {isUser ? (
          <div className="chat-bubble-user px-4 py-3 rounded-2xl rounded-br-md">
            <p className="text-sm text-white">{message.content}</p>
          </div>
        ) : (
          /* AI Message - Glass Bubble with Tool Indicator */
          <div className="chat-bubble-ai px-4 py-3 rounded-2xl rounded-bl-md">
            {/* Inline Tool Indicator */}
            <InlineToolIndicator tools={message.tools_used || []} />

            {/* Message Content */}
            {hasRichContent ? (
              <MarkdownContent content={message.content} />
            ) : (
              <p className="text-[0.9375rem] leading-[1.75] text-foreground/90">
                {message.content}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingIndicator() {
  return (
    <div className="flex justify-start mb-4 animate-fade-in">
      <div className="chat-bubble-ai px-4 py-4 rounded-2xl rounded-bl-md">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-lg gradient-brand flex items-center justify-center animate-pulse-soft">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" />
          </div>
          <span className="text-xs text-muted-foreground">Analyzing...</span>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  hasData,
  onSuggestionClick,
  onUploadClick
}: {
  hasData?: boolean;
  onSuggestionClick?: (text: string) => void;
  onUploadClick?: () => void;
}) {
  const suggestions = [
    { icon: "💰", text: "How much did I spend on food this month?" },
    { icon: "📊", text: "What are my top expense categories?" },
    { icon: "📈", text: "Compare my November vs December spending" },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 animate-fade-in">
      {/* Icon */}
      <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center glow mb-6 animate-scale-bounce">
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {hasData ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          )}
        </svg>
      </div>

      {/* Title */}
      <h2 className="text-xl font-semibold text-foreground mb-2">
        Financial Assistant
      </h2>

      {hasData ? (
        <>
          <p className="text-sm text-muted-foreground mb-8 max-w-md">
            Ask questions about your spending, income, and financial patterns.
          </p>

          {/* Suggestions - only show when data exists */}
          <div className="space-y-2 w-full max-w-md">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
              Try asking
            </p>
            {suggestions.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => onSuggestionClick?.(suggestion.text)}
                className={`stagger-item stagger-${i + 1} w-full text-left px-4 py-3 rounded-xl glass
                          text-sm text-muted-foreground hover:text-foreground
                          border border-transparent hover:border-brand-500/20
                          transition-all duration-200 interactive-scale btn-ripple`}
              >
                <span className="mr-2">{suggestion.icon}</span>
                {suggestion.text}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-6 max-w-md">
            Upload a CSV file to get started analyzing your financial data.
          </p>

          {/* Upload CTA - show when no data */}
          <button
            onClick={onUploadClick}
            className="px-6 py-3 gradient-brand rounded-xl text-white font-medium
                      flex items-center gap-2 btn-glow interactive-lift mb-6"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload CSV File
          </button>

          {/* Supported formats */}
          <div className="flex flex-wrap justify-center gap-2">
            <p className="text-xs text-muted-foreground mr-2">Supported:</p>
            {["Upwork", "Nu Bank", "BBVA"].map((format) => (
              <span
                key={format}
                className="px-2 py-0.5 text-[10px] font-medium rounded-full
                         bg-secondary/50 text-muted-foreground"
              >
                {format}
              </span>
            ))}
          </div>

          {/* Preview of what you can ask */}
          <div className="mt-8 pt-6 border-t border-border/30 w-full max-w-md">
            <p className="text-xs text-muted-foreground mb-3">
              Once uploaded, you&apos;ll be able to ask:
            </p>
            <div className="space-y-1.5 text-left">
              {suggestions.map((suggestion, i) => (
                <p key={i} className="text-xs text-muted-foreground/60">
                  <span className="mr-1.5">{suggestion.icon}</span>
                  {suggestion.text}
                </p>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function ChatWidget({ messages, isLoading, hasData, onSuggestionClick, onUploadClick }: ChatWidgetProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  return (
    <ScrollArea className="flex-1">
      <div className="p-6 space-y-4">
        {messages.length === 0 ? (
          <EmptyState hasData={hasData} onSuggestionClick={onSuggestionClick} onUploadClick={onUploadClick} />
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
  );
}
