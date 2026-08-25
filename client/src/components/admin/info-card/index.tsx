import { type ReactNode } from "react";

export interface InfoField {
  label: string;
  value: ReactNode;
  isMono?: boolean;
}

interface InfoCardProps {
  title?: string;
  fields: InfoField[];
  columns?: 1 | 2 | 3;
  icon?: ReactNode;
  className?: string;
}

export default function InfoCard({
  title,
  fields,
  columns = 2,
  icon,
  className = "",
}: InfoCardProps) {
  const colClass =
    columns === 1
      ? "grid-cols-1"
      : columns === 3
      ? "grid-cols-1 sm:grid-cols-3"
      : "grid-cols-1 sm:grid-cols-2";

  return (
    <div
      className={`p-5 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs ${className}`}
    >
      {title && (
        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-[var(--chrome-hairline)]">
          {icon}
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--chrome-ink)]">
            {title}
          </h3>
        </div>
      )}

      <div className={`grid ${colClass} gap-4`}>
        {fields.map((f) => (
          <div key={f.label} className="flex flex-col">
            <span className="text-[11px] font-bold text-[var(--chrome-ink-soft)] uppercase">
              {f.label}
            </span>
            <div
              className={`text-xs font-semibold text-[var(--chrome-ink)] mt-1 ${
                f.isMono ? "font-mono" : ""
              }`}
            >
              {f.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
