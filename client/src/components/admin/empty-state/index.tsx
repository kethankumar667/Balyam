import { type ReactNode } from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export default function EmptyState({
  title = "No records found",
  description = "There are currently no items matching your criteria.",
  icon,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`p-10 sm:p-14 text-center rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] flex flex-col items-center justify-center ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-[var(--chrome-control)] text-amber-500 flex items-center justify-center mb-3">
        {icon ?? <Inbox className="w-6 h-6" />}
      </div>
      <h3 className="text-sm font-bold text-[var(--chrome-ink)]">
        {title}
      </h3>
      <p className="text-xs text-[var(--chrome-ink-soft)] mt-1 max-w-sm leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
