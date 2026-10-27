import React from "react";
import { GLASSMORPHISM } from "./glassmorphism";

interface PremiumStatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  subValue?: string;
  accentColor?: string;
  className?: string;
}

export const PremiumStatCard: React.FC<PremiumStatCardProps> = ({
  label,
  value,
  icon,
  subValue,
  accentColor = "var(--color-warning)",
  className = "",
}) => {
  return (
    <div
      className={`rounded-2xl p-4 sm:p-5 ${GLASSMORPHISM.panel} shadow-sm relative overflow-hidden flex flex-col justify-between space-y-2 group transition-colors duration-200 hover:border-[var(--chrome-border)] ${className}`}
    >
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-10 pointer-events-none transition-opacity group-hover:opacity-20"
        style={{ backgroundColor: accentColor }}
      />

      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--chrome-ink-soft)] font-bold">
          {label}
        </span>
        {icon && <span className="text-[var(--chrome-accent)] motion-safe:group-hover:scale-110 transition-transform">{icon}</span>}
      </div>

      <div>
        <span className="text-xl sm:text-2xl font-black font-mono text-[var(--chrome-ink)] block tracking-tight">
          {value}
        </span>
        {subValue && (
          <span className="text-xs text-[var(--chrome-ink-soft)] block mt-0.5">
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
};
