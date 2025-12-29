"use client";

import { useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/api";

interface ChatWidgetProps {
  messages: ChatMessage[];
  isLoading?: boolean;
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex w-full mb-4",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-2",
          isUser
            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
            : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
        )}
      >
        <div className="whitespace-pre-wrap text-sm">{message.content}</div>
        {message.tools_used && message.tools_used.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {message.tools_used.map((tool, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-full bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                {tool}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingIndicator() {
  return (
    <div className="flex justify-start mb-4">
      <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg px-4 py-3">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" />
        </div>
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
    <Card className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
          Financial Assistant
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Ask questions about your spending, income, and financial patterns
        </p>
      </div>
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-zinc-500 dark:text-zinc-400">
            <div className="text-4xl mb-4">💬</div>
            <p className="text-sm">
              Start a conversation! Try asking:
            </p>
            <ul className="mt-2 text-sm space-y-1">
              <li>&quot;How much did I spend on food this month?&quot;</li>
              <li>&quot;What are my top expense categories?&quot;</li>
              <li>&quot;Compare my November vs December spending&quot;</li>
            </ul>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <MessageBubble key={index} message={message} />
            ))}
            {isLoading && <LoadingIndicator />}
            <div ref={scrollRef} />
          </>
        )}
      </ScrollArea>
    </Card>
  );
}
