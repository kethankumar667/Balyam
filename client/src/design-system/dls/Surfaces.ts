export const SURFACES = {
  // Card surfaces
  cardDefault: "bg-[var(--chrome-panel)] text-[var(--chrome-ink)] backdrop-blur-md border border-[var(--chrome-hairline)] rounded-2xl shadow-sm",
  cardElevated: "bg-[var(--chrome-panel)] text-[var(--chrome-ink)] backdrop-blur-lg border border-[var(--chrome-hairline)] rounded-3xl shadow-lg",
  cardInteractive: "bg-[var(--chrome-panel)] text-[var(--chrome-ink)] hover:bg-[var(--chrome-control)] border border-[var(--chrome-hairline)] hover:border-[var(--chrome-border)] rounded-2xl shadow-sm hover:shadow-lg motion-safe:hover:-translate-y-1 transition duration-200 cursor-pointer",

  // Panel surfaces
  panelDark: "bg-[var(--chrome-control)] text-[var(--chrome-ink)] backdrop-blur-sm border border-[var(--chrome-hairline)] rounded-2xl",
  panelSubtle: "bg-[var(--chrome-control)] text-[var(--chrome-ink)] border border-[var(--chrome-hairline)] rounded-xl",

  // Modal and Dialog surfaces
  modalHero: "bg-[var(--chrome-panel)] text-[var(--chrome-ink)] backdrop-blur-xl border border-[var(--chrome-hairline)] rounded-3xl shadow-2xl",
  drawerBottom: "bg-[var(--chrome-panel)] text-[var(--chrome-ink)] backdrop-blur-xl border-t border-[var(--chrome-hairline)] rounded-t-3xl shadow-2xl",

  // Specialized Gaming Arenas
  arenaHero: "bg-gradient-to-tr from-amber-950/40 via-stone-900/90 to-zinc-900/90 border border-amber-500/40 rounded-3xl shadow-2xl backdrop-blur-xl",
  battlePassTrack: "bg-gradient-to-r from-amber-950/30 via-purple-950/20 to-stone-900/90 border border-stone-800 rounded-3xl shadow-2xl",
} as const;
