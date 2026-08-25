import { type ReactNode } from "react";

interface SectionHeaderProps {
  title: string;
  description?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export default function SectionHeader({
  title,
  description,
  badge,
  actions,
  className = "",
}: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between gap-4 pb-2 mb-3 ${className}`}>
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--chrome-ink)]">
            {title}
          </h2>
          {badge}
        </div>
        {description && (
          <p className="text-xs text-[var(--chrome-ink-soft)] mt-0.5">
            {description}
          </p>
        )}
      </div>

      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
