import type { ReactNode } from "react";
import { cn } from "../../../lib/cn";

/**
 * A readable, semantic scorecard table for mobile. Numeric columns right-align
 * and use tabular figures; a row can be highlighted (e.g. the total). Uses real
 * <table> markup for screen-reader row/column semantics.
 */
export interface ScorecardColumn {
  key: string;
  label: string;
  numeric?: boolean;
  grow?: boolean;
}

export interface ScorecardRow {
  id: string;
  cells: Record<string, ReactNode>;
  highlight?: boolean;
  muted?: boolean;
}

export interface ScorecardTableProps {
  columns: ScorecardColumn[];
  rows: ScorecardRow[];
  caption?: string;
  className?: string;
}

export function ScorecardTable({ columns, rows, caption, className }: ScorecardTableProps) {
  return (
    <div className={cn("overflow-x-auto rounded-2xl border border-[#E4D3AC] bg-[#FFFBF0]", className)}>
      <table className="w-full border-collapse text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-[#E4D3AC] bg-[#F3E6C6]">
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={cn(
                  "px-2.5 py-2 text-[11px] font-bold uppercase tracking-wide text-[#9A6E1A]",
                  c.numeric ? "text-right tabular-nums" : "text-left",
                  c.grow && "w-full",
                )}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              className={cn(
                "border-b border-[#EFE2C7] last:border-0",
                r.highlight && "bg-[#E4B128]/15 font-black",
                r.muted && "text-[#6D4323]/55",
              )}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn("px-2.5 py-2 text-[#3A2210]", c.numeric ? "text-right tabular-nums" : "text-left")}
                >
                  {r.cells[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
