import React from "react";
import { Zap, BookOpen } from "lucide-react";
import type { GameSkinTheme } from "../../hooks/useGameTheme";

interface GameThemeToggleProps {
  theme: GameSkinTheme;
  onToggle: () => void;
  className?: string;
  variant?: "compact" | "full" | "iconOnly";
}

export function GameThemeToggle({
  theme,
  onToggle,
  className = "",
  variant = "compact",
}: GameThemeToggleProps) {
  const isNotebook = theme === "notebook";

  if (variant === "iconOnly") {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-label={isNotebook ? "Switch to Neon Theme" : "Switch to Notebook Theme"}
        title={isNotebook ? "Switch to Neon Theme" : "Switch to Notebook Theme"}
        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs border ${
          isNotebook
            ? "border-amber-300 bg-amber-50/95 text-amber-700 hover:bg-amber-100"
            : "border-purple-500/80 bg-purple-950/70 text-purple-300 hover:bg-purple-900/80 shadow-[0_0_12px_rgba(168,85,247,0.35)]"
        } ${className}`}
      >
        {isNotebook ? (
          <Zap className="w-4 h-4 text-amber-500 fill-amber-400" />
        ) : (
          <BookOpen className="w-4 h-4 text-purple-300" />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isNotebook ? "Switch to Neon Theme" : "Switch to Notebook Theme"}
      title={isNotebook ? "Switch to Neon Theme" : "Switch to Notebook Theme"}
      className={`h-9 px-3 rounded-full flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs border ${
        isNotebook
          ? "border-amber-300 bg-amber-50/95 text-amber-900 hover:bg-amber-100 hover:border-amber-400"
          : "border-purple-500/70 bg-purple-950/80 text-purple-200 hover:bg-purple-900/80 hover:border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.35)]"
      } ${className}`}
    >
      {isNotebook ? (
        <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-400 flex-shrink-0" />
      ) : (
        <BookOpen className="w-3.5 h-3.5 text-purple-300 flex-shrink-0" />
      )}
      <span className={variant === "compact" ? "hidden sm:inline" : ""}>
        {isNotebook ? "⚡ Neon Theme" : "📓 Notebook Theme"}
      </span>
    </button>
  );
}

export default GameThemeToggle;
