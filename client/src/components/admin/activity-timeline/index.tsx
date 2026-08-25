import { type ReactNode } from "react";
import { Clock } from "lucide-react";

export interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  actor?: {
    name: string;
    avatar?: string;
    role?: string;
  };
  icon?: ReactNode;
  iconBg?: string;
  statusBadge?: ReactNode;
  metadata?: Record<string, string | number>;
}

interface ActivityTimelineProps {
  items: TimelineItem[];
  emptyMessage?: string;
  className?: string;
}

export default function ActivityTimeline({
  items,
  emptyMessage = "No recent activity recorded.",
  className = "",
}: ActivityTimelineProps) {
  if (items.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-[var(--chrome-ink-soft)] bg-[var(--chrome-panel)] rounded-2xl border border-[var(--chrome-border)]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className={`p-5 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs ${className}`}
    >
      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--chrome-hairline)]">
        {items.map((item) => (
          <div key={item.id} className="relative group">
            {/* Dot / Icon */}
            <div
              className={`absolute -left-6 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-[var(--chrome-panel)] text-xs shadow-xs ${
                item.iconBg ?? "bg-amber-500 text-zinc-950"
              }`}
            >
              {item.icon ?? <Clock className="w-2.5 h-2.5" />}
            </div>

            {/* Content Box */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {item.actor && (
                    <span className="text-xs font-bold text-[var(--chrome-ink)]">
                      {item.actor.name}
                    </span>
                  )}
                  <span className="text-xs font-medium text-[var(--chrome-ink)]">
                    {item.title}
                  </span>
                  {item.statusBadge}
                </div>

                {item.description && (
                  <p className="text-xs text-[var(--chrome-ink-soft)] mt-1 leading-relaxed">
                    {item.description}
                  </p>
                )}

                {item.metadata && (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {Object.entries(item.metadata).map(([k, v]) => (
                      <span
                        key={k}
                        className="px-2 py-0.5 text-[10px] font-mono rounded-md bg-[var(--chrome-control)] text-[var(--chrome-ink)] border border-[var(--chrome-border)]"
                      >
                        {k}: {v}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <time className="text-[11px] font-medium text-[var(--chrome-ink-soft)] font-mono whitespace-nowrap flex-shrink-0">
                {item.timestamp}
              </time>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
