"use client";

import { useEffect, useState, useCallback } from "react";
import { getStats, type StatsResponse } from "@/lib/api";
import { SpendingPieChart } from "./charts/SpendingPieChart";
import { SpendingBarChart } from "./charts/SpendingBarChart";
import { SpendingLineChart } from "./charts/SpendingLineChart";
import { SpendingFlowChart } from "./charts/SpendingFlowChart";

interface DashboardProps {
  onUploadClick?: () => void;
}

// Skeleton loader for chart cards
function ChartSkeleton() {
  return (
    <div className="p-4 rounded-xl bg-card border border-border/50">
      <div className="h-4 w-32 skeleton mb-4" />
      <div className="h-[280px] flex items-center justify-center">
        <div className="w-32 h-32 rounded-full skeleton" />
      </div>
    </div>
  );
}

// Stats card component
function StatCard({
  label,
  value,
  subValue,
  icon,
}: {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="p-4 rounded-xl bg-card border border-border/50 animate-fade-in-up">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          {subValue && <p className="text-xs text-muted-foreground mt-1">{subValue}</p>}
        </div>
        <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-400">
          {icon}
        </div>
      </div>
    </div>
  );
}

// Empty state component
function EmptyState({ onUploadClick }: { onUploadClick?: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-md px-6 animate-fade-in-up">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-brand-500/10 flex items-center justify-center">
          <svg className="w-10 h-10 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">No Data Yet</h2>
        <p className="text-muted-foreground mb-6">
          Upload your bank statements to see spending insights and beautiful visualizations of your finances.
        </p>
        {onUploadClick && (
          <button
            onClick={onUploadClick}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gradient-brand text-white font-medium btn-glow"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload Transactions
          </button>
        )}
      </div>
    </div>
  );
}

export function Dashboard({ onUploadClick }: DashboardProps) {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-xl bg-card border border-border/50">
              <div className="h-3 w-20 skeleton mb-2" />
              <div className="h-8 w-24 skeleton" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-destructive/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Failed to Load Dashboard</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-sm transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // No data state
  if (!stats?.has_data) {
    return <EmptyState onUploadClick={onUploadClick} />;
  }

  // Calculate some additional stats
  const totalExpenses = stats.category_amounts?.reduce((sum, cat) => sum + cat.amount, 0) || 0;
  const topCategory = stats.category_amounts?.[0];
  const dateRangeStr = stats.date_range
    ? `${new Date(stats.date_range.start).toLocaleDateString("en-US", { month: "short", year: "numeric" })} - ${new Date(stats.date_range.end).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
    : "N/A";

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Total Transactions"
          value={stats.total_transactions.toLocaleString()}
          subValue={dateRangeStr}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <StatCard
          label="Total Spending"
          value={`$${totalExpenses.toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
          subValue={stats.sources.map((s) => s.name).join(", ")}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Top Category"
          value={topCategory?.name || "N/A"}
          subValue={topCategory ? `$${topCategory.amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : undefined}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="relative">
          <SpendingPieChart data={stats.category_amounts || []} />
        </div>

        {/* Bar Chart */}
        <SpendingBarChart data={stats.category_amounts || []} />
      </div>

      {/* Full-width Line Chart */}
      {stats.monthly_spending && stats.monthly_spending.length > 1 && (
        <SpendingLineChart data={stats.monthly_spending} />
      )}

      {/* Spending Flow (Sankey) Chart */}
      {stats.category_amounts && stats.category_amounts.length >= 3 && (
        <SpendingFlowChart data={stats.category_amounts} />
      )}

      {/* Recent Activity */}
      {stats.recent_transactions && stats.recent_transactions.length > 0 && (
        <div className="p-4 rounded-xl bg-card border border-border/50 animate-fade-in-up">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
            Recent Transactions
          </h3>
          <div className="space-y-3">
            {stats.recent_transactions.slice(0, 5).map((tx, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{tx.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(tx.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    • {tx.category}
                  </p>
                </div>
                <span
                  className={`text-sm font-medium tabular-nums ${tx.amount < 0 ? "text-destructive" : "text-brand-400"}`}
                >
                  {tx.amount < 0 ? "-" : "+"}${Math.abs(tx.amount).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
