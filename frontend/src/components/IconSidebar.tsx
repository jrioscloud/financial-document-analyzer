"use client";

import { useState } from "react";
import { BrandIcon } from "./BrandIcon";
import Link from "next/link";

export type ViewType = "chat" | "dashboard";

interface IconSidebarProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
}

interface NavItem {
  id: ViewType;
  icon: React.ReactNode;
  label: string;
}

const navItems: NavItem[] = [
  {
    id: "chat",
    label: "Chat",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    ),
  },
  {
    id: "dashboard",
    label: "Dashboard",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
];

export function IconSidebar({ activeView, onViewChange }: IconSidebarProps) {
  const [hoveredItem, setHoveredItem] = useState<ViewType | null>(null);

  return (
    <div className="relative z-10 w-16 border-r border-border/50 glass-strong flex flex-col">
      {/* Logo */}
      <div className="p-3 flex justify-center border-b border-border/50">
        <Link href="/" className="group">
          <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center glow-sm group-hover:scale-105 transition-transform">
            <BrandIcon className="w-5 h-5 text-white" />
          </div>
        </Link>
      </div>

      {/* Navigation Icons */}
      <nav className="flex-1 py-4 flex flex-col items-center gap-2">
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <div key={item.id} className="relative">
              <button
                onClick={() => onViewChange(item.id)}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
                className={`
                  relative w-10 h-10 rounded-xl flex items-center justify-center
                  transition-all duration-200 group
                  ${isActive
                    ? "bg-brand-500/15 text-brand-400 border border-brand-500/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 border border-transparent"
                  }
                `}
              >
                {/* Active indicator line */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-500 rounded-r-full -ml-3" />
                )}
                {item.icon}
              </button>

              {/* Tooltip */}
              {hoveredItem === item.id && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 animate-fade-in">
                  <div className="px-2.5 py-1.5 rounded-lg bg-popover border border-border/50 shadow-lg">
                    <span className="text-xs font-medium text-foreground whitespace-nowrap">
                      {item.label}
                    </span>
                  </div>
                  {/* Arrow */}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-popover border-l border-b border-border/50 rotate-45" />
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom spacer */}
      <div className="p-3 flex justify-center">
        <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse-soft" />
      </div>
    </div>
  );
}
