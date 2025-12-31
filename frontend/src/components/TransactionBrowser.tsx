"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  getTransactions,
  type Transaction,
  type TransactionFilters,
  type StatsResponse,
} from "@/lib/api";

interface TransactionBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  stats: StatsResponse | null;
}

export function TransactionBrowser({ isOpen, onClose, stats }: TransactionBrowserProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [searchInput, setSearchInput] = useState("");

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTransactions(page, 25, filters);
      setTransactions(data.transactions);
      setTotalPages(data.total_pages);
      setTotal(data.total);
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    if (isOpen) {
      fetchTransactions();
    }
  }, [isOpen, fetchTransactions]);

  const handleSearch = () => {
    setPage(1);
    setFilters((prev) => ({ ...prev, search: searchInput || undefined }));
  };

  const handleCategoryFilter = (category: string | undefined) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, category }));
  };

  const handleSourceFilter = (source: string | undefined) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, source }));
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setFilters({});
  };

  const formatAmount = (amount: number, currency: string) => {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency === "MXN" ? "MXN" : "USD",
      minimumFractionDigits: 2,
    });
    return formatter.format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-5xl max-h-[85vh] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-bounce">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Transaction Browser</h2>
            <p className="text-sm text-muted-foreground">
              {total.toLocaleString()} transactions found
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-border bg-secondary/30">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="flex-1 min-w-[200px] max-w-md">
              <div className="relative">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search descriptions..."
                  className="w-full px-4 py-2 pl-10 rounded-lg bg-background border border-border
                           text-sm text-foreground placeholder:text-muted-foreground
                           focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Category Filter */}
            <select
              value={filters.category || ""}
              onChange={(e) => handleCategoryFilter(e.target.value || undefined)}
              className="px-3 py-2 rounded-lg bg-background border border-border text-sm
                       text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            >
              <option value="">All Categories</option>
              {stats?.categories.map((cat) => (
                <option key={cat.name} value={cat.name}>
                  {cat.name} ({cat.count})
                </option>
              ))}
            </select>

            {/* Source Filter */}
            <select
              value={filters.source || ""}
              onChange={(e) => handleSourceFilter(e.target.value || undefined)}
              className="px-3 py-2 rounded-lg bg-background border border-border text-sm
                       text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            >
              <option value="">All Sources</option>
              {stats?.sources.map((src) => (
                <option key={src.name} value={src.name}>
                  {src.name} ({src.count})
                </option>
              ))}
            </select>

            {/* Clear Filters */}
            {(filters.search || filters.category || filters.source) && (
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="flex items-center gap-3 text-muted-foreground">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Loading transactions...</span>
              </div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
              No transactions found
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-secondary/50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(tx.date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground max-w-xs truncate" title={tx.description}>
                      {tx.description}
                    </td>
                    <td className="px-4 py-3">
                      {tx.category && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
                          {tx.category}
                        </span>
                      )}
                    </td>
                    <td className={cn(
                      "px-4 py-3 text-sm text-right whitespace-nowrap font-medium",
                      tx.amount > 0 ? "text-green-500" : "text-foreground"
                    )}>
                      {formatAmount(tx.amount, tx.currency)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {tx.source_bank}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-secondary/30">
            <div className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-border
                         disabled:opacity-50 disabled:cursor-not-allowed
                         hover:bg-secondary transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm rounded-lg border border-border
                         disabled:opacity-50 disabled:cursor-not-allowed
                         hover:bg-secondary transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
