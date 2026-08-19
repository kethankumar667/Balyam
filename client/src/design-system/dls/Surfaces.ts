export const SURFACES = {
  // Card surfaces
  cardDefault: "bg-stone-900/80 dark:bg-zinc-900/80 backdrop-blur-md border border-stone-800/80 dark:border-zinc-800/80 rounded-2xl shadow-xl",
  cardElevated: "bg-stone-900/90 dark:bg-zinc-900/90 backdrop-blur-lg border border-stone-750 dark:border-zinc-750 rounded-3xl shadow-2xl",
  cardInteractive: "bg-stone-900/80 dark:bg-zinc-900/80 hover:bg-stone-850/90 border border-stone-800 hover:border-amber-500/50 rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-250 cursor-pointer",

  // Panel surfaces
  panelDark: "bg-stone-950/70 dark:bg-zinc-950/70 backdrop-blur-sm border border-stone-800/60 dark:border-zinc-800/60 rounded-2xl",
  panelSubtle: "bg-stone-900/50 dark:bg-zinc-900/50 border border-stone-850 dark:border-zinc-850 rounded-xl",

  // Modal and Dialog surfaces
  modalHero: "bg-stone-900/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-stone-750 dark:border-zinc-750 rounded-3xl shadow-[0_24px_64px_-12px_rgba(0,0,0,0.8)]",
  drawerBottom: "bg-stone-900/95 dark:bg-zinc-900/95 backdrop-blur-xl border-t border-stone-750 rounded-t-3xl shadow-2xl",

  // Specialized Gaming Arenas
  arenaHero: "bg-gradient-to-tr from-amber-950/40 via-stone-900/90 to-zinc-900/90 border border-amber-500/40 rounded-3xl shadow-2xl backdrop-blur-xl",
  battlePassTrack: "bg-gradient-to-r from-amber-950/30 via-purple-950/20 to-stone-900/90 border border-stone-800 rounded-3xl shadow-2xl",
} as const;
