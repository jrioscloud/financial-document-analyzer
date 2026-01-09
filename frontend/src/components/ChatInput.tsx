"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Ask about your finances...",
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = message.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setMessage("");
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = message.trim().length > 0 && !disabled;

  return (
    <div className="border-t border-border/50 glass-strong">
      <div className="p-4">
        <div
          className={cn(
            "flex items-center gap-3 p-2 rounded-2xl transition-all duration-200",
            "bg-secondary/30 border",
            isFocused
              ? "border-brand-500/40 shadow-[0_0_0_3px_oklch(0.60_0.18_150_/_0.1)]"
              : "border-border/50 hover:border-border"
          )}
        >
          {/* Attachment Button */}
          <button
            className="flex-shrink-0 p-2.5 rounded-xl
                      text-muted-foreground hover:text-foreground
                      hover:bg-secondary/50 transition-all duration-200"
            title="Attach file"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
          </button>

          {/* Input Field */}
          <textarea
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="flex-1 bg-transparent border-none outline-none resize-none
                      text-sm text-foreground placeholder:text-muted-foreground
                      disabled:opacity-50 disabled:cursor-not-allowed max-h-32"
          />

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!canSend}
            className={cn(
              "flex-shrink-0 p-2.5 rounded-xl transition-all duration-200",
              "flex items-center justify-center",
              canSend
                ? "gradient-brand text-white btn-glow interactive-scale"
                : "bg-secondary/50 text-muted-foreground cursor-not-allowed"
            )}
          >
            {disabled ? (
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Hint Text */}
        <div className="flex items-center justify-between mt-2 px-2">
          <p className="text-[11px] text-muted-foreground/60">
            <kbd className="px-1.5 py-0.5 rounded bg-secondary/50 text-[10px] font-mono">Enter</kbd> to send · <kbd className="px-1.5 py-0.5 rounded bg-secondary/50 text-[10px] font-mono">Shift+Enter</kbd> for new line
          </p>
          {disabled && (
            <p className="text-[11px] text-brand-500 animate-pulse-soft">
              Analyzing your finances...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
