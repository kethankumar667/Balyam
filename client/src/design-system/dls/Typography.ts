export const TYPOGRAPHY = {
  // Title levels
  heroTitle: "text-2xl sm:text-3xl lg:text-4xl font-black text-[var(--chrome-ink)] tracking-tight leading-tight",
  pageTitle: "text-xl sm:text-2xl lg:text-3xl font-black text-[var(--chrome-ink)] tracking-tight",
  sectionHeader: "text-base sm:text-lg font-bold text-[var(--chrome-ink)] tracking-tight",
  cardTitle: "text-sm sm:text-base font-bold text-[var(--chrome-ink)] leading-snug",

  // Body text
  body: "text-sm text-[var(--chrome-ink-soft)] leading-relaxed",
  bodySubtle: "text-sm text-[var(--chrome-ink-soft)] leading-relaxed",
  caption: "text-xs text-[var(--chrome-ink-soft)] leading-normal",

  // Metadata and stats
  metaPill: "text-[10px] font-mono font-bold uppercase tracking-wider",
  statNumberLarge: "text-2xl sm:text-3xl lg:text-4xl font-black font-mono text-[var(--chrome-ink)] tracking-tight",
  statNumberMedium: "text-xl sm:text-2xl font-black font-mono text-[var(--chrome-ink)] tracking-tight",
  statNumberSmall: "text-sm sm:text-base font-bold font-mono text-[var(--chrome-accent)]",
} as const;
