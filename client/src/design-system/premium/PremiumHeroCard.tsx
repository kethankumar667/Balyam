import React from "react";
import { GLASSMORPHISM } from "./glassmorphism";

interface PremiumHeroCardProps {
  category: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  glowColor?: string;
  className?: string;
}

export const PremiumHeroCard: React.FC<PremiumHeroCardProps> = ({
  category,
  title,
  subtitle,
  actions,
  badge,
  glowColor = "#F59E0B",
  className = "",
}) => {
  return (
    <div
      className={`rounded-3xl p-6 sm:p-8 ${GLASSMORPHISM.elevatedCard} shadow-2xl relative overflow-hidden backdrop-blur-xl ${className}`}
    >
      {/* Dynamic Ambient Aura Glow */}
      <div
        className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ backgroundColor: glowColor }}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div className="space-y-1.5 max-w-2xl">
          <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-amber-400 block">
            {category}
          </span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-stone-100 dark:text-zinc-100 tracking-tight leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-stone-400 dark:text-zinc-400 font-mono leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {(actions || badge) && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {badge}
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
