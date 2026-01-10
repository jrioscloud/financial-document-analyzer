"use client";

import { Sankey, Tooltip, Rectangle, Layer } from "recharts";
import type { CategoryAmount } from "@/lib/api";

interface SpendingFlowChartProps {
  data: CategoryAmount[];
  title?: string;
}

// Chart colors
const COLORS = [
  "#22c55e", // brand green
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
];

interface SankeyNodeProps {
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
  payload: { name: string; value: number };
}

interface SankeyLinkProps {
  sourceX: number;
  targetX: number;
  sourceY: number;
  targetY: number;
  sourceControlX: number;
  targetControlX: number;
  linkWidth: number;
  index: number;
  payload: { source: { name: string }; target: { name: string }; value: number };
}

// Custom node renderer
function SankeyNode(props: SankeyNodeProps) {
  const { x, y, width, height, index, payload } = props;
  const isSource = index === 0;
  const color = isSource ? COLORS[0] : COLORS[index % COLORS.length];

  return (
    <Layer key={`node-${index}`}>
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        fillOpacity={0.9}
        radius={4}
      />
      <text
        x={isSource ? x - 8 : x + width + 8}
        y={y + height / 2}
        textAnchor={isSource ? "end" : "start"}
        dominantBaseline="middle"
        fill="#e5e5e5"
        fontSize={12}
        fontWeight={500}
      >
        {payload.name}
      </text>
      <text
        x={isSource ? x - 8 : x + width + 8}
        y={y + height / 2 + 16}
        textAnchor={isSource ? "end" : "start"}
        dominantBaseline="middle"
        fill="#a3a3a3"
        fontSize={11}
      >
        ${payload.value?.toLocaleString("en-US", { maximumFractionDigits: 0 })}
      </text>
    </Layer>
  );
}

// Custom link renderer with gradient
function SankeyLink(props: SankeyLinkProps) {
  const { sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, index } = props;
  const gradientId = `sankey-gradient-${index}`;
  const targetColor = COLORS[(index + 1) % COLORS.length];

  return (
    <Layer key={`link-${index}`}>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={COLORS[0]} stopOpacity={0.4} />
          <stop offset="100%" stopColor={targetColor} stopOpacity={0.4} />
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
        stroke="none"
        style={{ cursor: "pointer" }}
      />
    </Layer>
  );
}

// Custom tooltip
function CustomTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ payload: { source?: { name: string }; target?: { name: string }; value?: number; name?: string } }>;
}) {
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
        <>
          <p className="text-sm font-medium text-foreground">{data.name}</p>
          <p className="text-sm text-brand-400">
            ${data.value?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </>
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
  const topCategories = data.slice(0, 6);
  const totalSpending = topCategories.reduce((sum, cat) => sum + cat.amount, 0);

  const nodes = [
    { name: "Spending" },
    ...topCategories.map(cat => ({ name: cat.name }))
  ];

  const links = topCategories.map((cat, index) => ({
    source: 0,
    target: index + 1,
    value: cat.amount,
  }));

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

      <div className="h-[300px] w-full overflow-hidden">
        <Sankey
          width={700}
          height={280}
          data={{ nodes, links }}
          nodeWidth={12}
          nodePadding={30}
          margin={{ top: 20, right: 140, bottom: 20, left: 100 }}
          link={(linkProps: SankeyLinkProps) => <SankeyLink {...linkProps} />}
          node={(nodeProps: SankeyNodeProps) => <SankeyNode {...nodeProps} />}
        >
          <Tooltip content={<CustomTooltip />} />
        </Sankey>
      </div>
    </div>
  );
}
