import { cn } from "../../../lib/cn";
import { NotebookSurface } from "./NotebookSurface";

/**
 * A simple notebook-styled vertical bar chart card. Bars scale to the max
 * value; each carries a value label above and a category label below. Values
 * are also listed as text so the chart isn't the only way to read the data
 * (accessibility). Scrolls horizontally when there are many bars.
 */
export interface GraphBar {
  label: string;
  value: number;
  tone?: "neutral" | "green" | "red" | "gold";
}

export interface NotebookGraphCardProps {
  title: string;
  bars: GraphBar[];
  unit?: string;
  className?: string;
}

const TONE: Record<NonNullable<GraphBar["tone"]>, string> = {
  neutral: "bg-[#1D63C4]",
  green: "bg-[#2E7D32]",
  red: "bg-[#C0392B]",
  gold: "bg-[#E4B128]",
};

export function NotebookGraphCard({ title, bars, unit, className }: NotebookGraphCardProps) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <NotebookSurface className={cn("px-4 py-4", className)}>
      <h2 className="font-display text-xl text-[#3A2210]">{title}</h2>
      {bars.length === 0 ? (
        <p className="mt-2 text-sm text-[#6D4323]/70">No data yet.</p>
      ) : (
        <>
          <div className="mt-4 flex h-40 items-end gap-2 overflow-x-auto pb-1" role="img" aria-label={title}>
            {bars.map((b, i) => (
              <div key={i} className="flex min-w-[28px] flex-1 flex-col items-center gap-1">
                <span className="text-[11px] font-bold tabular-nums text-[#3A2210]">{b.value}</span>
                <div className="flex w-full flex-1 items-end">
                  <div
                    className={cn("w-full rounded-t-md", TONE[b.tone ?? "neutral"])}
                    style={{ height: `${Math.round((b.value / max) * 100)}%`, minHeight: b.value > 0 ? "4px" : "0" }}
                  />
                </div>
                <span className="text-[10px] font-semibold text-[#6D4323]/70">{b.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-[#6D4323]/70">
            {bars.map((b) => `${b.label}: ${b.value}`).join(" · ")}
            {unit ? ` (${unit})` : ""}
          </p>
        </>
      )}
    </NotebookSurface>
  );
}
