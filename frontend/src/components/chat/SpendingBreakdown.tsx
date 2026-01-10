"use client";

/**
 * SpendingBreakdown - Renders spending data in a polished format
 * matching the landing page demo style with colored bullets and right-aligned amounts
 */

interface SpendingItem {
  category: string;
  amount: string;
}

interface SpendingBreakdownProps {
  title?: string;
  items: SpendingItem[];
  total?: string;
  insight?: string;
}

// Rotating colors for category bullets
const BULLET_COLORS = [
  "bg-brand-500",   // green
  "bg-blue-500",    // blue
  "bg-purple-500",  // purple
  "bg-teal-500",    // teal
  "bg-orange-500",  // orange
  "bg-pink-500",    // pink
  "bg-cyan-500",    // cyan
];

export function SpendingBreakdown({ title, items, total, insight }: SpendingBreakdownProps) {
  return (
    <div className="space-y-3">
      {/* Title */}
      {title && (
        <p className="text-[0.9375rem] leading-relaxed">
          {title}
        </p>
      )}

      {/* Items Box */}
      <div className="p-3 rounded-lg bg-secondary/30">
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${BULLET_COLORS[index % BULLET_COLORS.length]}`} />
                {item.category}
              </span>
              <span className="font-semibold tabular-nums">{item.amount}</span>
            </div>
          ))}
        </div>

        {/* Total Row */}
        {total && (
          <div className="flex justify-between items-center text-sm mt-3 pt-3 border-t border-border/30">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold text-brand-400 tabular-nums">{total}</span>
          </div>
        )}
      </div>

      {/* Insight */}
      {insight && (
        <p className="text-[0.9375rem] leading-relaxed text-foreground/90">
          {insight}
        </p>
      )}
    </div>
  );
}

/**
 * Parse markdown content and extract spending breakdown data
 * Returns null if content doesn't match spending pattern
 */
export function parseSpendingBreakdown(content: string): SpendingBreakdownProps | null {
  // Check if this looks like a spending breakdown
  // Pattern: bullet list with "Category - $amount" or "Category - **$amount**"
  const lines = content.split('\n');

  let title: string | undefined;
  const items: SpendingItem[] = [];
  let total: string | undefined;
  let insight: string | undefined;

  // Patterns to match
  const itemPattern = /^[-•*]\s*(.+?)\s*[-–—]\s*\*?\*?(\$[\d,]+\.?\d*\s*(?:MXN|USD)?)\*?\*?\s*$/;
  const totalPattern = /^\*?\*?Total:?\*?\*?\s*\*?\*?(\$[\d,]+\.?\d*\s*(?:MXN|USD)?)\*?\*?\s*$/i;
  const titlePattern = /spending breakdown|expenses|your spending/i;

  let foundItems = false;
  const insightLines: string[] = [];
  let pastItems = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for title line
    if (!title && titlePattern.test(trimmed)) {
      // Clean up the title - remove markdown
      title = trimmed
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/:$/, ':');
      continue;
    }

    // Check for total
    const totalMatch = trimmed.match(totalPattern);
    if (totalMatch) {
      total = totalMatch[1];
      pastItems = true;
      continue;
    }

    // Check for item
    const itemMatch = trimmed.match(itemPattern);
    if (itemMatch) {
      items.push({
        category: itemMatch[1].trim(),
        amount: itemMatch[2].trim(),
      });
      foundItems = true;
      continue;
    }

    // If we've found items and this isn't an item/total, it's likely insight
    if (foundItems && pastItems && trimmed.length > 10) {
      insightLines.push(trimmed);
    }
  }

  // Need at least 2 items to consider this a spending breakdown
  if (items.length < 2) {
    return null;
  }

  if (insightLines.length > 0) {
    insight = insightLines.join(' ').replace(/\*\*/g, '').replace(/\*/g, '');
  }

  return { title, items, total, insight };
}
