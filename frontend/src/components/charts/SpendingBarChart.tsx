"use client";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import type { CategoryAmount } from "@/lib/api";

interface ChartData {
  name: string;
  amount: number;
  count: number;
  [key: string]: string | number;
}

// Chart colors - gradient from brand to softer tones
const COLORS = [
  "oklch(0.60 0.18 150)",  // brand green
  "oklch(0.58 0.16 155)",
  "oklch(0.56 0.14 160)",
  "oklch(0.54 0.12 165)",
  "oklch(0.52 0.10 170)",
  "oklch(0.50 0.08 175)",
  "oklch(0.48 0.06 180)",
  "oklch(0.46 0.04 185)",
];

interface SpendingBarChartProps {
  data: CategoryAmount[];
  title?: string;
}

// Custom tooltip
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

export function SpendingBarChart({ data, title = "Top Spending Categories" }: SpendingBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
        No spending data available
      </div>
    );
  }

  // Take top 8 and sort by amount descending, cast for Recharts
  const chartData: ChartData[] = [...data]
    .slice(0, 8)
    .sort((a, b) => b.amount - a.amount)
    .map(item => ({
      name: item.name,
      amount: item.amount,
      count: item.count,
    }));

  return (
    <div className="p-4 rounded-xl bg-card border border-border/50 animate-fade-in-up">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
        {title}
      </h3>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
          >
            <XAxis
              type="number"
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "oklch(0.65 0.01 260)", fontSize: 11 }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={100}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "oklch(0.92 0.005 240)", fontSize: 11 }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "oklch(1 0 0 / 0.05)" }} />
            <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={24}>
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  className="transition-opacity hover:opacity-80"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
