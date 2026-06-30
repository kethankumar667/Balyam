/**
 * Rummy microcopy — every loading banner, idle warning, and between-rounds
 * transition string in one place so the table's voice stays consistent.
 * Phase A.2 (docs/rummy/roadmap.md) — see nostalgia-brief.md "Storytelling"
 * pillar: every empty state and transition is a chance to feel warm.
 *
 * Functional/legal text (chip math, validation errors) stays inline next
 * to the logic it explains — only the replaceable, warm copy lives here.
 */
export const RUMMY_COPY = {
  /** Lobby shuffle-stage banner, shown while the deck "cuts". */
  shuffling: "Shuffling deck…",
  /** Lobby deal-stage banner, shown while the 13-card deal animates. */
  dealing: (playerCount: number): string =>
    `Dealing 13 cards to ${playerCount} player${playerCount === 1 ? "" : "s"}…`,
  /** Last-10-seconds turn warning (mobile). */
  idleWarning: (secondsLeft: number): string => `Taking a sip? ${secondsLeft}s…`,
  /** Between-rounds transition in pool matches. */
  roundComplete: (roundNumber: number): string =>
    `Round ${roundNumber} complete — top up your chai?`,
} as const;
