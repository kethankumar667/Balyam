/* ─────────────────────────── Workbook ink palette ───────────────────────────
 *
 * Each seat gets one of four schoolroom inks the spec calls out — Reynolds
 * blue, Cello black, Hero red, plus a green ink for the fourth seat. We pick
 * the ink purely by the player's index in `state.playerOrder` so it's stable
 * across reconnects and consistent for everyone watching the board.
 */
export type Ink = {
  name: string;
  inkColor: string;
  inkShadow: string;
  /** Faint background fill we paint behind a word when it scores. */
  highlight: string;
};

export const INKS: Ink[] = [
  {
    name: "Reynolds Blue",
    inkColor: "#1e3a8a",
    inkShadow: "0 0 0.4px rgba(30,58,138,0.55)",
    highlight: "rgba(30,58,138,0.14)",
  },
  {
    name: "Cello Black",
    inkColor: "#111827",
    inkShadow: "0 0 0.4px rgba(17,24,39,0.55)",
    highlight: "rgba(17,24,39,0.12)",
  },
  {
    name: "Hero Red",
    inkColor: "#9b1c1c",
    inkShadow: "0 0 0.4px rgba(155,28,28,0.55)",
    highlight: "rgba(155,28,28,0.14)",
  },
  {
    name: "Camlin Green",
    inkColor: "#14532d",
    inkShadow: "0 0 0.4px rgba(20,83,45,0.55)",
    highlight: "rgba(20,83,45,0.14)",
  },
];

/** Seat-index → ink, negative-safe modulo so reconnect ordering never throws. */
export function inkFor(idx: number): Ink {
  return INKS[((idx % INKS.length) + INKS.length) % INKS.length];
}
