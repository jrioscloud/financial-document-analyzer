"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { CategoryAmount } from "@/lib/api";

interface ChartData {
  name: string;
  amount: number;
  count: number;
  [key: string]: string | number; // Index signature for Recharts compatibility
}

// Chart colors from CSS variables (using Tailwind values as fallback)
const COLORS = [
  "oklch(0.60 0.18 150)",  // chart-1: brand green
  "oklch(0.65 0.15 200)",  // chart-2: blue
  "oklch(0.70 0.18 85)",   // chart-3: yellow/orange
  "oklch(0.60 0.20 280)",  // chart-4: purple
  "oklch(0.65 0.22 340)",  // chart-5: magenta/pink
  "oklch(0.58 0.14 220)",  // extra: cyan
  "oklch(0.72 0.16 60)",   // extra: amber
  "oklch(0.55 0.18 310)",  // extra: violet
];

interface SpendingPieChartProps {
  data: CategoryAmount[];
  title?: string;
}

// Custom tooltip component
function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartData }> }) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  return (
    <div className="px-3 py-2 rounded-lg bg-popover border border-border/50 shadow-lg">
      <p className="text-sm font-medium text-foreground">{data.name}</p>
      <p className="text-sm text-brand-400">
        ${data.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
      </p>
      <p className="text-xs text-muted-foreground">{data.count} transactions</p>
    </div>
  );
}

// Custom legend component
function CustomLegend({ payload }: { payload?: Array<{ value: string; color: string }> }) {
  if (!payload) return null;

  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-4">
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-muted-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function SpendingPieChart({ data, title = "Spending by Category" }: SpendingPieChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
        No spending data available
      </div>
    );
  }

  // Take top 8 categories for the pie chart and cast for Recharts
  const chartData: ChartData[] = data.slice(0, 8).map(item => ({
    name: item.name,
    amount: item.amount,
    count: item.count,
  }));
  const total = chartData.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="p-4 rounded-xl bg-card border border-border/50 animate-fade-in-up">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
        {title}
      </h3>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="45%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="amount"
              nameKey="name"
              stroke="none"
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  className="transition-opacity hover:opacity-80"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Center total */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginTop: "-20px" }}>
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground">
            ${total.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
      </div>
    </div>
  );
}
