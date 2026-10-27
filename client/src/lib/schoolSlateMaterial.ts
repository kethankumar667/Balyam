/**
 * The School Slate material, shared by every game that draws it: a classroom blackboard in a teak frame, chalk-yellow
 * accents, and the ghost of old doodles under the eraser's sweeps. The colours are the ones Rummy's slate has always
 * used (`games/rummy/rummy-worlds.css`), written once here so the other games are the same board and not a cousin of it.
 * The doodles are one drawing, `public/textures/school-slate.svg`, which the shop preview uses too.
 *
 * A slate is only a look. It never recolours a seat, a suit or a piece that carries meaning; a game draws its ink
 * and chalk over it and keeps every pair of text on board at 4.5:1 or better.
 */

export const SLATE = {
  /** The room around the board. */
  room: "#15271e",
  feltDeep: "#1f372b",
  felt: "#2a4638",
  feltLit: "#3a5f4c",
  panel: "#1a2f24",
  panelLit: "#2a4a3a",
  /** The teak frame: quiet, normal and strong. */
  teakQuiet: "#6a4825",
  teak: "#8f6334",
  teakStrong: "#c4955a",
  teakDark: "#4d3115",
  /** Chalk: yellow for emphasis, white for lines. */
  chalkYellow: "#f2d675",
  chalkYellowDim: "#c9ae5b",
  chalkGlow: "#fff0b3",
  chalkWhite: "#eef2e6",
  /** Ink on the board, brightest first. */
  ink: "#f4f7ee",
  inkMid: "#dce6d6",
  inkLow: "#c3d1bf",
  /** Ink on a pale chalk surface (a marked cell, a card laid on the board). */
  inkOnChalk: "#1f372b",
} as const;

export const SLATE_TEXTURE = 'url("/textures/school-slate.svg")';

/** The wall the board hangs on: soft light across the green, the doodles faint, a darker green at the edges. */
export const SLATE_ROOM_BACKGROUND = [
  "linear-gradient(104deg, transparent 8%, #eef2e60a 22%, transparent 40%)",
  "linear-gradient(97deg, transparent 52%, #eef2e608 66%, transparent 82%)",
  "radial-gradient(ellipse 60% 40% at 78% 18%, #eef2e60d, transparent 70%)",
  "radial-gradient(ellipse 50% 45% at 18% 82%, #eef2e60a, transparent 70%)",
  `${SLATE_TEXTURE} 0 0 / 820px 564px repeat`,
  `radial-gradient(ellipse 120% 100% at 50% 40%, #223a2d 0%, ${SLATE.room} 100%)`,
].join(", ");

/** The board itself: chalk dust and an eraser smear over the drawing, on the lit green. */
export const SLATE_BOARD_BACKGROUND = [
  "radial-gradient(ellipse 50% 40% at 28% 28%, #eef2e612, transparent 70%)",
  "linear-gradient(100deg, transparent 30%, #eef2e60c 48%, transparent 66%)",
  `${SLATE_TEXTURE} 10px 10px / 640px 440px repeat`,
  `radial-gradient(ellipse 70% 85% at 50% 40%, ${SLATE.feltLit} 0%, ${SLATE.felt} 55%, ${SLATE.feltDeep} 100%)`,
].join(", ");

/** A smaller board (a panel, a card) with the same material at a size that does not swallow the doodles. */
export const SLATE_PANEL_BACKGROUND = [
  "radial-gradient(ellipse 60% 50% at 30% 20%, #eef2e610, transparent 70%)",
  `${SLATE_TEXTURE} 0 0 / 420px 289px repeat`,
  `linear-gradient(180deg, ${SLATE.panelLit} 0%, ${SLATE.panel} 100%)`,
].join(", ");

/** The teak frame round a board, with the shadow that lifts it off the wall. */
export const SLATE_BOARD_SHADOW = [
  "inset 0 0 0 2px #00000040",
  "inset 0 2px 0 #ffffff22",
  "inset 0 0 44px #00000070",
  `0 0 0 3px ${SLATE.teakQuiet}`,
  "0 9px 0 -1px #8a5a2b",
  "0 15px 16px -6px #000000b0",
].join(", ");

/** A frame drawn inside the screen edge (the phone table): teak, a brass line, a darker teak, then a vignette. */
export const SLATE_INSET_FRAME = `0 0 0 6px #7b5127 inset, 0 0 0 7px #c79a5f inset, 0 0 0 10px ${SLATE.teakDark} inset, 0 0 46px #000a inset`;
