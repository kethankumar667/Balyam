import { ReactNode } from "react";
import { LayoutGrid, Sparkles, User, Users, Shield, GraduationCap } from "lucide-react";
import type { CategorySelection } from "../bhalyam/CategoryFilter";

export interface FilterBarProps {
  selectedCategory: CategorySelection;
  onSelectCategory: (category: CategorySelection) => void;
  className?: string;
}

interface CategoryOption {
  id: CategorySelection;
  label: string;
  icon: ReactNode;
}

const CATEGORIES: CategoryOption[] = [
  { id: "all", label: "All Games", icon: <LayoutGrid className="w-4 h-4" /> },
  { id: "retro", label: "Retro 90s", icon: <Sparkles className="w-4 h-4 text-amber-500" /> },
  { id: "board", label: "Board & Cards", icon: <Shield className="w-4 h-4" /> },
  { id: "multiplayer", label: "Multiplayer", icon: <Users className="w-4 h-4" /> },
  { id: "solo", label: "Single Player", icon: <User className="w-4 h-4" /> },
  { id: "classroom", label: "Classroom", icon: <GraduationCap className="w-4 h-4" /> },
];

export default function FilterBar({
  selectedCategory,
  onSelectCategory,
  className = "",
}: FilterBarProps) {
  return (
    <div
      role="tablist"
      aria-label="Game categories"
      className={`flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none select-none ${className}`}
    >
      {CATEGORIES.map((cat) => {
        const active = selectedCategory === cat.id;
        return (
          <button
            key={cat.id}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onSelectCategory(cat.id)}
            className={`min-h-[44px] px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all duration-150 flex items-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
              active
                ? "bg-amber-500 text-white font-extrabold shadow-md scale-102"
                : "bg-surface-0 border border-surface-rim text-ink-mid hover:text-ink-hi hover:bg-surface-1"
            }`}
          >
            <span className="flex-shrink-0">{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
}
