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
      role="status"
      className={`p-10 sm:p-14 text-center rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] flex flex-col items-center justify-center ${className}`}
    >
      {/* Decorative — title/description below are the actual message; the
          icon carries no information a screen reader needs, and role="status"
          on the container means this text is announced (aria-live: polite,
          implicit in the status role) the moment a search or filter change
          makes it appear, not just readable if the user happens to land on it. */}
      <div aria-hidden="true" className="w-12 h-12 rounded-2xl bg-[var(--chrome-control)] text-amber-500 flex items-center justify-center mb-3">
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
