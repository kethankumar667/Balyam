import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Sparkles, User as UserIcon, X } from "lucide-react";
import { AVATARS, findAvatar, type AvatarOption } from "../../lib/avatars";

export interface AvatarPickerProps {
  value: string | null;
  onChange: (id: string | null) => void;
  hideSummary?: boolean;
  onDone?: () => void;
  /** When true, shows the guest-restricted random sample of 12 avatars instead of all 50 */
  isGuest?: boolean;
}

type AvatarCategory = "all" | "modern" | "traditional" | "casual" | "kids";

interface CategoryDef {
  id: AvatarCategory;
  label: string;
  icon: string;
  match: (index: number) => boolean;
}

const CATEGORIES: CategoryDef[] = [
  { id: "all", label: "All Avatars", icon: "✨", match: () => true },
  { id: "modern", label: "Cool & Modern", icon: "🕶️", match: (i) => [2, 10, 11, 14, 15, 16, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30].includes(i) },
  { id: "traditional", label: "Classic & Traditional", icon: "👑", match: (i) => [0, 3, 7, 8, 9, 12, 13, 17, 18, 19, 20, 48, 49].includes(i) },
  { id: "casual", label: "Casual Vibes", icon: "🎨", match: (i) => [1, 4, 5, 6, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40].includes(i) },
  { id: "kids", label: "Youth & Fun", icon: "🌟", match: (i) => [41, 42, 43, 44, 45, 46, 47].includes(i) },
];

/**
 * Stable random selection: sampled once at module load-time so the guest
 * sees the same 12 avatars for the lifetime of the page, without re-randomising
 * every time the picker opens or re-renders. A new page load gives a new sample.
 *
 * Uses a Fisher-Yates partial shuffle over a copy so the full AVATARS array is
 * never mutated.
 */
const GUEST_AVATAR_COUNT = 12;
const GUEST_AVATARS: readonly AvatarOption[] = (() => {
  const pool = [...AVATARS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return Object.freeze(pool.slice(0, GUEST_AVATAR_COUNT));
})();

export default function AvatarPicker({
  value,
  onChange,
  hideSummary = false,
  onDone,
  isGuest = false,
}: AvatarPickerProps) {
  const chosen = findAvatar(value);
  const [selectedCategory, setSelectedCategory] = useState<AvatarCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const gridRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<Array<HTMLButtonElement | null>>([]);

  /**
   * Base avatar pool — guests get the stable 12-avatar sample, members see all 50.
   * Category filters still apply on top of the member pool.
   */
  const baseAvatars = isGuest ? GUEST_AVATARS : AVATARS;

  // Filter avatars based on category and optional search
  const filteredAvatars = useMemo(() => {
    // For guests, skip category filtering — they only have 12 and the "All" category is implicit
    if (isGuest) {
      if (!searchQuery.trim()) return [...baseAvatars];
      return baseAvatars.filter((av) =>
        av.label.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }
    const cat = CATEGORIES.find((c) => c.id === selectedCategory) ?? CATEGORIES[0];
    return AVATARS.filter((av, index) => {
      const matchesCategory = cat.match(index);
      if (!matchesCategory) return false;
      if (!searchQuery.trim()) return true;
      return (
        av.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(index + 1).includes(searchQuery.trim())
      );
    });
  }, [selectedCategory, searchQuery]);

  const activeIndex = Math.max(
    0,
    filteredAvatars.findIndex((a) => a.id === value),
  );

  const columnCount = useCallback(() => {
    const el = gridRef.current;
    if (!el) return 5;
    const cols = getComputedStyle(el).gridTemplateColumns.split(" ").filter(Boolean).length;
    return Math.max(1, cols);
  }, []);

  const focusTile = useCallback((i: number) => {
    const next = Math.max(0, Math.min(filteredAvatars.length - 1, i));
    const el = tileRefs.current[next];
    if (!el) return;
    el.focus();
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [filteredAvatars.length]);

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const cols = columnCount();
    let next: number;
    switch (e.key) {
      case "ArrowRight": next = index + 1; break;
      case "ArrowLeft":  next = index - 1; break;
      case "ArrowDown":  next = index + cols; break;
      case "ArrowUp":    next = index - cols; break;
      case "Home":       next = 0; break;
      case "End":        next = filteredAvatars.length - 1; break;
      case " ":
      case "Enter":
        e.preventDefault();
        if (filteredAvatars[index]) {
          onChange(filteredAvatars[index].id);
        }
        return;
      default: return;
    }
    if (next < 0 || next >= filteredAvatars.length) return;
    e.preventDefault();
    focusTile(next);
  }

  // Scroll active avatar into view
  useEffect(() => {
    if (!value) return;
    const el = tileRefs.current[activeIndex];
    el?.scrollIntoView({ block: "center", behavior: "auto" });
  }, [value, activeIndex]);

  return (
    <div className="space-y-4 select-none">
      {/* 1. LUXURY SHOWCASE HERO CARD */}
      {!hideSummary && (
        <div className="relative overflow-hidden rounded-2xl border-2 border-[#E2CEB0] dark:border-[#2C384E] bg-gradient-to-r from-[#FFFDF9] via-[#FAF3E4] to-[#F7ECD3] dark:from-[#161F2E] dark:via-[#1A2538] dark:to-[#131B29] p-3.5 sm:p-4 shadow-[0_4px_16px_rgba(217,119,6,0.08)] transition-all">
          {/* Subtle gold accent light */}
          <div
            className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-amber-400/20 blur-xl pointer-events-none"
            aria-hidden
          />

          <div className="flex items-center gap-3.5 sm:gap-4 relative z-10">
            {/* Persona Avatar Frame with Glow */}
            <div className="relative shrink-0">
              <div
                className={`w-16 h-16 sm:w-18 sm:h-18 rounded-2xl overflow-hidden flex items-center justify-center border-2 transition-all duration-300 ${
                  chosen
                    ? "border-[#D97706] dark:border-amber-400 shadow-[0_0_20px_rgba(217,119,6,0.35)] ring-2 ring-amber-300/60 dark:ring-amber-500/40 bg-[#FFFDF8]"
                    : "border-[#D5C2A5] dark:border-slate-700 bg-[#F4EADB]/80 dark:bg-slate-800"
                }`}
              >
                {chosen ? (
                  <img
                    src={chosen.src}
                    alt={chosen.label}
                    className="w-full h-full object-cover scale-[1.25] origin-center"
                  />
                ) : (
                  <UserIcon className="w-8 h-8 text-[#8C6D50] dark:text-slate-400" />
                )}
              </div>

              {chosen && (
                <div
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#D97706] text-white flex items-center justify-center text-[10px] shadow-sm ring-2 ring-white dark:ring-[#161F2E]"
                  title="Selected Persona"
                >
                  <Sparkles size={11} />
                </div>
              )}
            </div>

            {/* Persona Details */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#9A3412] dark:text-amber-400">
                  {chosen ? "Active Persona" : "Default Silhouette"}
                </span>
              </div>
              <h4 className="text-base sm:text-lg font-display font-black text-[#2B1B0E] dark:text-slate-100 truncate">
                {chosen ? chosen.label : "Choose Your Avatar"}
              </h4>
              <p className="text-xs text-[#6B5340] dark:text-slate-300 line-clamp-1">
                {chosen
                  ? "Displayed to all players across rooms and leaderboards."
                  : "Tap any character below to personalize your game presence."}
              </p>
            </div>

            {/* Reset to Silhouette Action */}
            {chosen && (
              <button
                type="button"
                onClick={() => onChange(null)}
                className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border border-[#D5C2A5] hover:border-rose-300 text-[#7C6249] hover:text-rose-700 hover:bg-rose-50/80 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition cursor-pointer active:scale-95 shadow-2xs"
                title="Remove avatar and use plain silhouette"
              >
                <X size={13} aria-hidden />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. CATEGORY FILTER PILLS — hidden for guests, they see all 12 */}
      {!isGuest && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none overscroll-contain">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? "bg-[#2B1B0E] text-amber-300 shadow-sm ring-1 ring-amber-400/50 dark:bg-amber-400 dark:text-[#1A1208]"
                    : "bg-[#F3E7D3]/80 hover:bg-[#EBDDC5] text-[#5C4328] dark:bg-[#1C2638] dark:hover:bg-[#253248] dark:text-slate-300 border border-[#E2CEB0]/60 dark:border-slate-700"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Guest notice: curated collection badge (compact, inline) */}
      {isGuest && (
        <p className="px-1 text-[10px] text-[#8C6D50] dark:text-slate-500">
          🎲 <span className="font-bold text-[#7C5A00] dark:text-amber-500">Guest selection</span> · 12 random avatars
        </p>
      )}

      {/* 3. AVATARS COUNT & QUICK HINT — hidden for guests */}
      {!isGuest && (
        <div className="flex items-center justify-between px-1 text-[11px] font-bold text-[#8C6D50] dark:text-slate-400">
          <span>
            Showing {filteredAvatars.length} avatar{filteredAvatars.length === 1 ? "" : "s"}
          </span>
          <span className="hidden sm:inline opacity-80">
            Use arrow keys or tap to select
          </span>
        </div>
      )}

      {/* 4. AVATAR GRID */}
      <div className={`relative rounded-2xl border border-[#E6D7BF] dark:border-slate-800 bg-[#FFFDF8]/70 dark:bg-[#121927]/60 shadow-inner ${isGuest ? "p-1.5" : "p-2 sm:p-3"}`}>
        <div
          ref={gridRef}
          role="radiogroup"
          aria-label="Choose an avatar"
          className={
            isGuest
              ? // Guests: 4-col × 3-row, tight gap, no scroll
                "grid grid-cols-4 gap-1.5"
              : // Members: 5-col × 10-row scrollable showcase
                "grid grid-cols-5 gap-2.5 sm:gap-3.5 max-h-[340px] sm:max-h-[380px] overflow-y-auto pr-1 pt-1 pb-4"
          }
        >
          {filteredAvatars.map((a, i) => {
            const isSelected = a.id === value;
            return (
              <button
                key={a.id}
                ref={(el) => {
                  tileRefs.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={a.label}
                tabIndex={i === activeIndex ? 0 : -1}
                onClick={() => onChange(a.id)}
                onKeyDown={(e) => onKeyDown(e, i)}
                className={`group relative aspect-square rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                  isSelected
                    ? "ring-[3.5px] ring-[#D97706] dark:ring-amber-400 scale-[1.08] shadow-[0_0_18px_rgba(217,119,6,0.45)] z-10"
                    : "ring-1 ring-[#DECBB2] dark:ring-slate-700/80 hover:ring-[#B8966E] dark:hover:ring-amber-400/60 hover:scale-[1.06] hover:-translate-y-0.5 shadow-2xs hover:shadow-md"
                }`}
              >
                {/* Avatar Portrait */}
                <img
                  src={a.src}
                  alt={a.label}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover scale-[1.22] origin-center group-hover:scale-[1.28] transition-transform duration-200"
                />

                {/* Selected Halo & Checkmark Badge */}
                {isSelected && (
                  <div className="absolute inset-0 bg-gradient-to-t from-amber-950/40 via-transparent to-transparent flex items-end justify-end p-1">
                    <span
                      aria-hidden
                      className="w-5 h-5 rounded-full bg-[#D97706] dark:bg-amber-400 text-white dark:text-[#1A1208] flex items-center justify-center shadow-md ring-1 ring-white dark:ring-[#121927]"
                    >
                      <Check className="w-3 h-3 stroke-[3.5]" />
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Fade Gradient for Scroll Depth */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-[#FFFDF8] dark:from-[#121927] to-transparent rounded-b-2xl"
          aria-hidden
        />
      </div>

      {/* 5. CONFIRM / DONE BUTTON (IF PROVIDED) */}
      {onDone && (
        <div className="pt-1 flex justify-end">
          <button
            type="button"
            onClick={onDone}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-display font-black text-sm text-white bg-gradient-to-r from-[#D97706] via-[#EA580C] to-[#C2410C] hover:brightness-105 active:scale-[0.98] shadow-md shadow-amber-600/25 transition cursor-pointer"
          >
            Confirm Selection
          </button>
        </div>
      )}
    </div>
  );
}
