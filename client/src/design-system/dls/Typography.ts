export const TYPOGRAPHY = {
  // Title levels
  heroTitle: "text-2xl sm:text-3xl lg:text-4xl font-black text-stone-100 dark:text-zinc-100 tracking-tight leading-tight",
  pageTitle: "text-xl sm:text-2xl lg:text-3xl font-black text-stone-100 dark:text-zinc-100 tracking-tight",
  sectionHeader: "text-base sm:text-lg font-bold text-stone-100 dark:text-zinc-100 tracking-tight",
  cardTitle: "text-sm sm:text-base font-bold text-stone-200 dark:text-zinc-200 leading-snug",

  // Body text
  body: "text-xs sm:text-sm text-stone-300 dark:text-zinc-300 leading-relaxed",
  bodySubtle: "text-xs text-stone-400 dark:text-zinc-400 leading-relaxed font-mono",
  caption: "text-[11px] text-stone-500 font-mono leading-normal",

  // Metadata and stats
  metaPill: "text-[10px] font-mono font-bold uppercase tracking-wider",
  statNumberLarge: "text-2xl sm:text-3xl lg:text-4xl font-black font-mono text-stone-100 dark:text-zinc-100 tracking-tight",
  statNumberMedium: "text-xl sm:text-2xl font-black font-mono text-stone-100 dark:text-zinc-100 tracking-tight",
  statNumberSmall: "text-sm sm:text-base font-bold font-mono text-amber-400",
} as const;
