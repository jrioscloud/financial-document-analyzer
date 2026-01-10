"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { MonthlySpending } from "@/lib/api";

interface ChartData {
  month: string;
  expenses: number;
  income: number;
  [key: string]: string | number;
}

interface SpendingLineChartProps {
  data: MonthlySpending[];
  title?: string;
}

// Format month string (YYYY-MM) to display format (Jan, Feb, etc.)
function formatMonth(month: string): string {
  const date = new Date(month + "-01");
  return date.toLocaleDateString("en-US", { month: "short" });
}

// Custom tooltip
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string }>;
  label?: string;
}) {
  if (!active || !payload?.length || !label) return null;

  const date = new Date(label + "-01");
  const monthName = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="px-3 py-2 rounded-lg bg-popover border border-border/50 shadow-lg">
      <p className="text-sm font-medium text-foreground mb-1">{monthName}</p>
      {payload.map((entry, index) => (
        <p
          key={index}
          className={`text-sm ${entry.dataKey === "expenses" ? "text-destructive" : "text-brand-400"}`}
        >
          {entry.dataKey === "expenses" ? "Expenses" : "Income"}: $
          {entry.value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </p>
      ))}
    </div>
  );
}

export function SpendingLineChart({ data, title = "Monthly Spending" }: SpendingLineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
        No monthly data available
      </div>
    );
  }

  // Ensure data is sorted by month and cast for Recharts
  const chartData: ChartData[] = [...data]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(item => ({
      month: item.month,
      expenses: item.expenses,
      income: item.income,
    }));

  // Calculate totals
  const totalExpenses = chartData.reduce((sum, item) => sum + item.expenses, 0);
  const avgMonthly = totalExpenses / chartData.length;

  return (
    <div className="p-4 rounded-xl bg-card border border-border/50 animate-fade-in-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </h3>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "oklch(0.60 0.20 25)" }} />
            <span className="text-muted-foreground">Expenses</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "oklch(0.60 0.18 150)" }} />
            <span className="text-muted-foreground">Income</span>
          </div>
        </div>
      </div>

      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="expensesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.60 0.20 25)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="oklch(0.60 0.20 25)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.60 0.18 150)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="oklch(0.60 0.18 150)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(1 0 0 / 0.05)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tickFormatter={formatMonth}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "oklch(0.65 0.01 260)", fontSize: 11 }}
            />
            <YAxis
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "oklch(0.65 0.01 260)", fontSize: 11 }}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="expenses"
              stroke="oklch(0.60 0.20 25)"
              strokeWidth={2}
              fill="url(#expensesGradient)"
            />
            <Area
              type="monotone"
              dataKey="income"
              stroke="oklch(0.60 0.18 150)"
              strokeWidth={2}
              fill="url(#incomeGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Summary stats */}
      <div className="flex gap-4 mt-4 pt-4 border-t border-border/30">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">Total Expenses</p>
          <p className="text-lg font-semibold text-foreground">
            ${totalExpenses.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">Monthly Average</p>
          <p className="text-lg font-semibold text-foreground">
            ${avgMonthly.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">Months Tracked</p>
          <p className="text-lg font-semibold text-foreground">{chartData.length}</p>
        </div>
      </div>
    </div>
  );
}
