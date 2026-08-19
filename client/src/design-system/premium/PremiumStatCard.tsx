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
      className={`rounded-2xl p-4 sm:p-5 ${GLASSMORPHISM.panel} shadow-lg relative overflow-hidden flex flex-col justify-between space-y-2 group transition-all duration-200 hover:border-stone-700 ${className}`}
    >
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-10 pointer-events-none transition-opacity group-hover:opacity-20"
        style={{ backgroundColor: accentColor }}
      />

      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono uppercase tracking-wider text-stone-400 font-bold">
          {label}
        </span>
        {icon && <span className="text-stone-400 group-hover:scale-110 transition-transform">{icon}</span>}
      </div>

      <div>
        <span className="text-xl sm:text-2xl font-black font-mono text-stone-100 dark:text-zinc-100 block tracking-tight">
          {value}
        </span>
        {subValue && (
          <span className="text-[10px] font-mono text-stone-400 block mt-0.5">
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
};
