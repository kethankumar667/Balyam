import { ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { LayoutGrid, Sparkles, User, Users, Shield, GraduationCap, ChevronLeft, ChevronRight } from "lucide-react";
import type { CategorySelection } from "../bhalyam/CategoryFilter";
import { useTheme } from "../../lib/useTheme";

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
  const [theme] = useTheme();
  const isDark = theme === "dark";

  const trackRef = useRef<HTMLDivElement | null>(null);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const [edges, setEdges] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdges({
      left: el.scrollLeft > 2,
      right: el.scrollLeft < max - 2,
    });
  }, []);

  useLayoutEffect(measure, [measure, selectedCategory]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    for (const child of Array.from(el.children)) {
      ro.observe(child);
    }
    return () => {
      el.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, [measure]);

  const activeIndex = Math.max(
    0,
    CATEGORIES.findIndex((c) => c.id === selectedCategory),
  );

  useEffect(() => {
    refs.current[activeIndex]?.scrollIntoView({
      inline: "nearest",
      block: "nearest",
      behavior: "smooth",
    });
  }, [activeIndex]);

  const nudge = useCallback((side: "left" | "right") => {
    const el = trackRef.current;
    if (!el) return;
    const step = Math.max(120, el.clientWidth * 0.6);
    el.scrollBy({ left: side === "right" ? step : -step, behavior: "smooth" });
  }, []);

  return (
    <div className={`relative w-full group/filter ${className}`}>
      {/* Edge Cues for responsive touch & click navigation */}
      <EdgeCue side="left" show={edges.left} onNudge={nudge} isDark={isDark} />
      <EdgeCue side="right" show={edges.right} onNudge={nudge} isDark={isDark} />

      {/* Horizontal Scroll Track */}
      <div
        ref={trackRef}
        role="tablist"
        aria-label="Game categories"
        className="flex items-center gap-2 overflow-x-auto py-2 px-1 sm:px-1.5
                   scroll-smooth overscroll-x-contain scroll-px-6 touch-pan-x select-none
                   [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {CATEGORIES.map((cat, i) => {
          const active = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`min-h-[44px] px-4 py-2 rounded-full font-bold text-xs sm:text-sm whitespace-nowrap
                          flex-shrink-0 transition-all duration-150 flex items-center gap-2 cursor-pointer
                          focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                active
                  ? "bg-amber-500 text-zinc-950 font-extrabold shadow-md border border-amber-400/60 ring-2 ring-amber-500/30"
                  : isDark
                  ? "bg-[#111927]/90 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10"
                  : "bg-[#FAF2DF] border border-[#E8D8BE] text-[#5C3B1E] hover:text-[#2A1D13] hover:bg-[#F2E4CB] shadow-2xs"
              }`}
            >
              <span className="flex-shrink-0">{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EdgeCue({
  side,
  show,
  onNudge,
  isDark,
}: {
  side: "left" | "right";
  show: boolean;
  onNudge: (side: "left" | "right") => void;
  isDark: boolean;
}) {
  const isRight = side === "right";

  return (
    <button
      type="button"
      aria-label={isRight ? "Scroll next categories" : "Scroll previous categories"}
      aria-hidden={!show}
      tabIndex={-1}
      disabled={!show}
      onClick={() => onNudge(side)}
      data-side={side}
      className={`absolute inset-y-0 z-20 flex items-center justify-center transition-all duration-200 cursor-pointer ${
        isRight ? "right-0" : "left-0"
      } ${
        show ? "opacity-100 scale-100" : "pointer-events-none opacity-0 scale-75"
      }`}
    >
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center shadow-lg border transition-transform active:scale-90 ${
          isDark
            ? "bg-[#1E294B] border-amber-400 text-amber-300 shadow-black/80"
            : "bg-[#FFF2D6] border-[#EA9A32] text-[#B45309] shadow-amber-900/30"
        }`}
      >
        {isRight ? (
          <ChevronRight className="w-4 h-4 text-current" strokeWidth={3} />
        ) : (
          <ChevronLeft className="w-4 h-4 text-current" strokeWidth={3} />
        )}
      </div>
    </button>
  );
}
