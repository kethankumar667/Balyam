import type { CSSProperties } from "react";
import { SLATE, SLATE_ROOM_BACKGROUND } from "../../lib/schoolSlateMaterial";

/**
 * The School Slate for Star Game. The game's colours are read through CSS variables with the arcade indigo as the
 * fallback (`PAPER` in star-shared.tsx, and the surface classes in the two shells), so the slate is one block of
 * variables set on the board's wrapper: no shell has a slate branch, and without the block nothing changes.
 *
 * Only surfaces and text are remapped. Gold, the seat neons, the paper chits' own colours and the red/green of a
 * result are left alone: they carry meaning, and a slate never recolours a seat.
 */
export const STAR_SLATE_VARS = {
  "--star-page": SLATE.room,
  "--star-cream": SLATE.panel,
  "--star-creamDeep": "#12241b",
  "--star-paper": SLATE.felt,
  "--star-kraft": SLATE.feltLit,
  "--star-ink": SLATE.ink,
  "--star-pencil": SLATE.inkLow,
  "--star-rim": SLATE.teakQuiet,
  "--star-deep": "#12241b",
  "--star-deep2": "#16291f",
  "--star-deepest": "#0b1812",
  "--star-lit": SLATE.felt,
  "--star-line": SLATE.teakQuiet,
  "--star-linehi": SLATE.panelLit,
  "--star-dim": SLATE.chalkYellowDim,
  "--star-page-bg": SLATE_ROOM_BACKGROUND,
  // The room photograph is replaced by the slate's own wall, with a green vignette instead of the indigo scrim.
  "--star-room-opacity": "0",
  "--star-scrim": "radial-gradient(58% 50% at 50% 46%, transparent, rgba(5,12,8,0.5) 100%)",
} as unknown as CSSProperties;
