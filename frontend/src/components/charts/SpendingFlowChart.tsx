"use client";

import { Sankey, Tooltip, Layer, Rectangle } from "recharts";
import type { CategoryAmount } from "@/lib/api";

interface SpendingFlowChartProps {
  data: CategoryAmount[];
  title?: string;
}

// Node colors - gradient from teal to category colors
const NODE_COLORS = [
  "oklch(0.60 0.18 150)", // Income - brand green
  "oklch(0.65 0.15 200)", // blue
  "oklch(0.70 0.18 85)",  // yellow/orange
  "oklch(0.60 0.20 280)", // purple
  "oklch(0.65 0.22 340)", // magenta/pink
  "oklch(0.58 0.14 220)", // cyan
  "oklch(0.72 0.16 60)",  // amber
  "oklch(0.55 0.18 310)", // violet
];

// Custom node component with rounded corners
function CustomNode({ x, y, width, height, index, payload }: {
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
  payload: { name: string; value?: number };
}) {
  const isSource = payload.name === "Spending";
  const color = isSource ? NODE_COLORS[0] : NODE_COLORS[(index % (NODE_COLORS.length - 1)) + 1];

  return (
    <Layer key={`node-${index}`}>
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        fillOpacity={0.9}
        rx={4}
        ry={4}
        className="transition-opacity hover:opacity-100"
        style={{ cursor: 'pointer' }}
      />
      <text
        x={isSource ? x + width + 8 : x - 8}
        y={y + height / 2}
        textAnchor={isSource ? "start" : "end"}
        dominantBaseline="middle"
        fill="oklch(0.92 0.005 240)"
        fontSize={11}
        fontWeight={500}
      >
        {payload.name}
      </text>
      {payload.value && (
        <text
          x={isSource ? x + width + 8 : x - 8}
          y={y + height / 2 + 14}
          textAnchor={isSource ? "start" : "end"}
          dominantBaseline="middle"
          fill="oklch(0.65 0.01 260)"
          fontSize={10}
        >
          ${payload.value.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </text>
      )}
    </Layer>
  );
}

// Custom link with gradient
function CustomLink({ sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, index }: {
  sourceX: number;
  targetX: number;
  sourceY: number;
  targetY: number;
  sourceControlX: number;
  targetControlX: number;
  linkWidth: number;
  index: number;
}) {
  const gradientId = `gradient-${index}`;
  const color = NODE_COLORS[(index % (NODE_COLORS.length - 1)) + 1];

  return (
    <Layer key={`link-${index}`}>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={NODE_COLORS[0]} stopOpacity={0.5} />
          <stop offset="100%" stopColor={color} stopOpacity={0.5} />
        </linearGradient>
      </defs>
      <path
        d={`
          M${sourceX},${sourceY}
          C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}
          L${targetX},${targetY + linkWidth}
          C${targetControlX},${targetY + linkWidth} ${sourceControlX},${sourceY + linkWidth} ${sourceX},${sourceY + linkWidth}
          Z
        `}
        fill={`url(#${gradientId})`}
        strokeWidth={0}
        className="transition-opacity hover:opacity-80"
        style={{ cursor: 'pointer' }}
      />
    </Layer>
  );
}

// Custom tooltip
function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { source?: { name: string }; target?: { name: string }; value?: number } }> }) {
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="px-3 py-2 rounded-lg bg-popover border border-border/50 shadow-lg">
      {data.source && data.target ? (
        <>
          <p className="text-sm text-muted-foreground">
            {data.source.name} → {data.target.name}
          </p>
          <p className="text-sm font-medium text-brand-400">
            ${data.value?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </>
      ) : (
        <p className="text-sm font-medium text-foreground">{data.value}</p>
      )}
    </div>
  );
}

export function SpendingFlowChart({ data, title = "Spending Flow" }: SpendingFlowChartProps) {
  if (!data || data.length < 2) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
        Not enough data for flow visualization
      </div>
    );
  }

  // Transform data for Sankey chart
  // Source node (0) = "Spending" (total outflow)
  // Target nodes (1+) = Categories
  const topCategories = data.slice(0, 6); // Limit to 6 categories for readability

  const nodes = [
    { name: "Spending" },
    ...topCategories.map(cat => ({ name: cat.name }))
  ];

  const links = topCategories.map((cat, index) => ({
    source: 0,
    target: index + 1,
    value: cat.amount,
  }));

  const totalSpending = topCategories.reduce((sum, cat) => sum + cat.amount, 0);

  return (
    <div className="p-4 rounded-xl bg-card border border-border/50 animate-fade-in-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </h3>
        <span className="text-xs text-muted-foreground">
          Total: ${totalSpending.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </span>
      </div>

      <div className="h-[280px] flex items-center justify-center">
        <Sankey
          width={500}
          height={260}
          data={{ nodes, links }}
          nodeWidth={10}
          nodePadding={24}
          margin={{ top: 10, right: 120, bottom: 10, left: 20 }}
          link={<CustomLink sourceX={0} targetX={0} sourceY={0} targetY={0} sourceControlX={0} targetControlX={0} linkWidth={0} index={0} />}
          node={<CustomNode x={0} y={0} width={0} height={0} index={0} payload={{ name: "" }} />}
        >
          <Tooltip content={<CustomTooltip />} />
        </Sankey>
      </div>
    </div>
  );
}
