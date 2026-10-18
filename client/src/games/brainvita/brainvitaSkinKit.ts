import type { SkinId } from "./brainvitaSkins";

/**
 * What a world is made of. A world is not a palette: it chooses a whole set of art (scene, board,
 * table dressing), the shape and finish of its marbles, how a captured marble scatters, the lettering on
 * its sign and how its sounds are voiced. The tokens below carry the paint and those choices; the drawing
 * itself lives in the world's own component.
 */

/** Which set of art is drawn: the scene behind, the board, and the things on the table. */
export type Surface = "wood" | "holo" | "stone" | "reef" | "toy" | "palace";
/** The marble's form and finish. */
export type MarbleKind = "glass" | "orb" | "pebble" | "pearl" | "candy" | "gem";
/** What a captured marble turns into. */
export type ParticleKind = "spark" | "pixel" | "dust" | "bubble" | "confetti" | "petal";
export type SignIcon = "crown" | "orbit" | "leaf" | "shell" | "blocks";
/** How the sounds are voiced: what the marbles are knocking against. */
export type VoiceId = "wood" | "synth" | "stone" | "water" | "toy" | "bell";

/** Paint for the wooden board: three stops of the top face, the thick edge, the grain, the groove and the carved sprigs. */
export interface BoardPalette {
  stops: readonly [string, string, string];
  side: string;
  edge: string;
  grainDark: string;
  grainLight: string;
  grooveDark: string;
  grooveLight: string;
  sprigDark: string;
  sprigLight: string;
}

/** Paint for the glass board: the pane's gradient and a sheen across its top corner. */
export interface GlassPalette {
  top: string;
  mid: string;
  bottom: string;
  sheen: string;
  shadow: string;
}

export interface SkinTokens {
  id: SkinId;
  name: string;
  surface: Surface;
  marbleKind: MarbleKind;
  particleKind: ParticleKind;
  /** The colours a captured marble's pieces take, in turn. */
  particleColors: readonly string[];
  /** Wood's carved board, or null for a world that draws its own. */
  board: BoardPalette | null;
  /** Holo's pane, or null. */
  glass: GlassPalette | null;
  accent: string;
  accentSoft: string;
  /** The second colour: the selected marble's glow in the glass world. */
  accentAlt: string;
  /** The five stops of a marble's gradient, highlight first. */
  marbleStops: readonly [string, string, string, string, string];
  tableBackground: string;
  plankBackground: string;
  plankBorder: string;
  plankShadow: string;
  /** Round and pill buttons in the header. */
  chipBackground: string;
  chipBorder: string;
  /** The accent's strength (0-1) over the favoured action's plank. */
  hintWash: number;
  /** The side panel on a wide screen. */
  panelBackground: string;
  panelBorder: string;
  signBackground: string;
  signBorder: string;
  signShadow: string;
  signRadius: string;
  signIcon: SignIcon;
  titleColor: string;
  titleShadow: string;
  titleStroke: string;
  titleFont: string;
  /** The title's size: a clamp, because the sign must fit between two buttons on a 320px phone. */
  titleSize: string;
  titleWeight: number;
  titleSpacing: string;
  /** One colour per letter of the title, or null for a single colour. */
  titleLetters: readonly string[] | null;
  holeWell: string;
  holeRim: string;
  marbleFill: string;
  marbleShadow: string;
  marbleSelectedShadow: string;
  voice: VoiceId;
  /** The board's colour in the small picture shown in the theme dialog. */
  swatchBoard: string;
}

/** "#rrggbb" and an alpha as an rgba() colour. */
export function rgba(hex: string, alpha: number): string {
  const value = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

export const marbleGradient = (stops: readonly string[]): string =>
  `radial-gradient(circle at 34% 27%, ${stops[0]} 0%, ${stops[1]} 17%, ${stops[2]} 46%, ${stops[3]} 74%, ${stops[4]} 100%)`;

export const FONT_DISPLAY = `"Righteous", "Noto Sans Telugu", system-ui, sans-serif`;
export const FONT_ROUND = `"Fredoka", "Nunito", "Noto Sans Telugu", system-ui, sans-serif`;
export const FONT_MONO = `"JetBrains Mono", ui-monospace, monospace`;
export const FONT_QUIET = `"Poppins", "Noto Sans Telugu", system-ui, sans-serif`;

export interface ChromeSpec {
  accent: string;
  accentSoft: string;
  plankTop: string;
  plankBottom: string;
  /** The darkest end of the table, which the side panel is tinted with. */
  tableEdge: string;
  /** A coloured glow on the planks, for a world that gives off light. */
  glow?: number;
  /** How solid the side panel is. A light table needs it nearly opaque for the text on it to be read. */
  panelAlpha?: number;
  /** How strongly the favoured action (Hint) is washed with the accent. Some worlds fill it, others only outline it. */
  hintWash?: number;
}

type Chrome = Pick<SkinTokens, "plankBackground" | "plankBorder" | "plankShadow" | "chipBackground" | "chipBorder" | "panelBackground" | "panelBorder" | "hintWash">;

/** The stats plank, header buttons and side panel: one formula, so the chrome of every world sits on its table the same way. */
export function chrome(spec: ChromeSpec): Chrome {
  const { accent, accentSoft, plankTop, plankBottom, tableEdge, glow = 0, panelAlpha = 0.62, hintWash = 0.34 } = spec;
  return {
    hintWash,
    plankBackground: `linear-gradient(180deg, ${rgba(plankTop, 0.93)} 0%, ${rgba(plankBottom, 0.95)} 100%)`,
    plankBorder: `1px solid ${rgba(accent, glow > 0 ? 0.5 : 0.38)}`,
    plankShadow: `${glow > 0 ? `0 0 18px ${rgba(accent, glow)}, ` : ""}0 6px 14px rgba(0,0,0,0.42), inset 0 1px 0 ${rgba(accentSoft, 0.18)}`,
    chipBackground: rgba(plankBottom, 0.86),
    chipBorder: `1px solid ${rgba(accent, 0.45)}`,
    panelBackground: rgba(tableEdge, panelAlpha),
    panelBorder: `1px solid ${rgba(accent, 0.22)}`,
  };
}
