"use client";

import Link from "next/link";
import { BrandIcon } from "@/components/BrandIcon";

// Tool card data
const tools = [
  {
    name: "Search Transactions",
    description: "Find any transaction by keyword, date range, or amount with semantic search.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    color: "from-blue-500/20 to-blue-600/20",
    textColor: "text-blue-400",
  },
  {
    name: "Analyze Spending",
    description: "Get totals, averages, and trends for any category or time period.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    color: "from-brand-500/20 to-brand-600/20",
    textColor: "text-brand-400",
  },
  {
    name: "Compare Periods",
    description: "See month-over-month changes with percentage breakdowns.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
    color: "from-purple-500/20 to-purple-600/20",
    textColor: "text-purple-400",
  },
  {
    name: "Auto-Categorize",
    description: "AI-powered categorization for every transaction automatically.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
    color: "from-orange-500/20 to-orange-600/20",
    textColor: "text-orange-400",
  },
  {
    name: "Generate Reports",
    description: "Create detailed spending summaries by category and time range.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    color: "from-teal-500/20 to-teal-600/20",
    textColor: "text-teal-400",
  },
  {
    name: "Auto-Ingest",
    description: "Drop CSV/PDF files — they're automatically processed and indexed.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
    color: "from-brand-500/20 to-brand-600/20",
    textColor: "text-brand-400",
    featured: true,
  },
];

const techStack = ["Next.js 16", "FastAPI", "LangChain", "pgvector", "OpenAI", "Terraform"];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Ambient Background - BEAUTIFUL stage */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl animate-float" />
        <div
          className="absolute bottom-0 right-1/4 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "-3s" }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-600/5 rounded-full blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center">
                <BrandIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-semibold tracking-tight">FinAnalyzer</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">
                Features
              </a>
              <a href="#demo" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">
                Demo
              </a>
              <Link
                href="/app"
                className="px-4 py-2 gradient-brand hover:opacity-90 rounded-lg text-sm font-medium text-white btn-glow transition-all duration-200"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32 px-6">
        <div className="max-w-4xl mx-auto text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm text-muted-foreground mb-8">
            <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse-soft" />
            Powered by RAG + LangChain
          </div>
          <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6 text-gradient">
            Understand Your Finances
            <br />
            With AI Precision
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Upload bank statements, ask questions in plain English, and get instant insights about your spending patterns.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/app"
              className="w-full sm:w-auto px-8 py-4 gradient-brand hover:opacity-90 rounded-xl text-lg font-semibold flex items-center justify-center gap-2 text-white btn-glow interactive-lift"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Documents
            </Link>
            <button
              onClick={() => alert("🎬 YouTube demo video coming soon!\n\nFor now, scroll down to see the interactive demo.")}
              className="w-full sm:w-auto px-8 py-4 glass hover:bg-secondary/50 rounded-xl text-lg font-medium transition-colors duration-200"
            >
              Watch Demo
            </button>
          </div>
        </div>
      </section>

      {/* Chat Interface Preview */}
      <section id="demo" className="relative z-10 px-6 pb-24">
        <div className="max-w-5xl mx-auto">
          <div className="gradient-border rounded-2xl glow">
            <div className="bg-background rounded-2xl overflow-hidden">
              {/* Chat Header */}
              <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <span className="text-sm text-muted-foreground">financial-analyzer.app</span>
                <div className="w-20" />
              </div>

              {/* Chat Messages */}
              <div className="p-6 h-[400px] overflow-y-auto space-y-4">
                {/* User Message */}
                <div className="flex justify-end animate-slide-up" style={{ animationDelay: "0.1s" }}>
                  <div className="chat-bubble-user px-4 py-3 rounded-2xl rounded-br-md max-w-md">
                    <p className="text-sm text-white">How much did I spend on restaurants last month?</p>
                  </div>
                </div>

                {/* AI Response */}
                <div className="flex justify-start animate-slide-up" style={{ animationDelay: "0.3s" }}>
                  <div className="chat-bubble-ai px-4 py-3 rounded-2xl rounded-bl-md max-w-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-lg gradient-brand flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <span className="text-xs text-muted-foreground">Using analyze_spending tool</span>
                    </div>
                    <p className="text-sm">
                      You spent <span className="text-brand-400 font-semibold">$847.32</span> on restaurants in November 2024.
                      That&apos;s across <span className="text-brand-400 font-semibold">23 transactions</span>, averaging $36.84 per visit.
                    </p>
                    <div className="mt-3 p-3 rounded-lg bg-secondary/30">
                      <p className="text-xs text-muted-foreground mb-2">Top merchants:</p>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Coffee Shop A</span>
                          <span className="text-muted-foreground">$156.20</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Restaurant B</span>
                          <span className="text-muted-foreground">$124.50</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Takeout C</span>
                          <span className="text-muted-foreground">$98.00</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* User Follow-up */}
                <div className="flex justify-end animate-slide-up" style={{ animationDelay: "0.5s" }}>
                  <div className="chat-bubble-user px-4 py-3 rounded-2xl rounded-br-md max-w-md">
                    <p className="text-sm text-white">Compare that to October</p>
                  </div>
                </div>

                {/* AI Comparison */}
                <div className="flex justify-start animate-slide-up" style={{ animationDelay: "0.7s" }}>
                  <div className="chat-bubble-ai px-4 py-3 rounded-2xl rounded-bl-md max-w-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-lg gradient-brand flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <span className="text-xs text-muted-foreground">Using compare_periods tool</span>
                    </div>
                    <p className="text-sm mb-3">
                      Restaurant spending decreased by <span className="text-brand-400 font-semibold">12.3%</span> from October to November.
                    </p>
                    <div className="flex gap-4">
                      <div className="flex-1 p-3 rounded-lg bg-secondary/30 text-center">
                        <p className="text-xs text-muted-foreground mb-1">October</p>
                        <p className="text-lg font-semibold">$966.18</p>
                      </div>
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </div>
                      <div className="flex-1 p-3 rounded-lg bg-secondary/30 text-center">
                        <p className="text-xs text-muted-foreground mb-1">November</p>
                        <p className="text-lg font-semibold text-brand-400">$847.32</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-border/50">
                <div className="flex items-center gap-3">
                  <button className="p-3 rounded-xl glass hover:bg-secondary/50 transition-colors duration-200">
                    <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </button>
                  <div className="flex-1 bg-secondary/30 border border-border/50 rounded-xl px-4 py-3 text-sm text-muted-foreground">
                    Ask about your spending...
                  </div>
                  <button className="p-3 gradient-brand rounded-xl btn-glow">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="relative z-10 px-6 py-24 border-t border-border/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Powerful AI Tools</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Five specialized tools working together to give you complete financial visibility.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map((tool) => (
              <div
                key={tool.name}
                className={`glass rounded-2xl p-6 interactive-lift ${
                  tool.featured ? "gradient-brand-subtle border-brand-500/20" : ""
                }`}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center mb-4`}>
                  <span className={tool.textColor}>{tool.icon}</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">{tool.name}</h3>
                <p className="text-sm text-muted-foreground">{tool.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="relative z-10 px-6 py-24 border-t border-border/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-8">Built With Modern Tech</h2>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-muted-foreground">
            {techStack.map((tech, i) => (
              <div key={tech} className="flex items-center gap-2">
                <span className="text-sm font-medium">{tech}</span>
                {i < techStack.length - 1 && <span className="text-border ml-6">•</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-6 py-24">
        <div className="max-w-3xl mx-auto text-center">
          <div className="glass rounded-3xl p-12 glow">
            <h2 className="text-3xl font-bold mb-4">Ready to analyze your finances?</h2>
            <p className="text-muted-foreground mb-8">
              Upload your first bank statement and start asking questions in seconds.
            </p>
            <Link
              href="/app"
              className="inline-block px-8 py-4 gradient-brand hover:opacity-90 rounded-xl text-lg font-semibold text-white btn-glow interactive-lift"
            >
              Start Free Analysis
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center">
              <BrandIcon className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm text-muted-foreground">FinAnalyzer</span>
          </div>
          <p className="text-sm text-muted-foreground">Portfolio project demonstrating RAG + Tool Calling</p>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
