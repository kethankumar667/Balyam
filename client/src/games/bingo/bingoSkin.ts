import type { CSSProperties } from "react";
import { SLATE_ROOM_BACKGROUND } from "../../lib/schoolSlateMaterial";

/**
 * The looks of the Bingo table, as class strings: light and dark, and the School Slate an account earns.
 *
 * The board used to branch on `isNeon` in every element, which made each new piece of chrome a nest of ternaries
 * and left the two themes drifting apart. Everything a theme decides now lives here, once per theme.
 *
 * Light is a sheet of warm score paper; dark is a chocolate-wood table lit by a gold lamp. The saved setting is the
 * game skin hook's `"notebook"` / `"neon"`: the names are kept so a player's stored choice (`bhalyam.bingo.skin`)
 * still means light and dark. Bingo no longer draws the old purple-and-cyan neon.
 *
 * Every class is written out in full — built from string pieces, Tailwind's JIT would never see them.
 */
export interface BingoSkin {
  readonly isDark: boolean;
  /** The page behind everything. */
  page: string;
  /** A raised card: header, called strip, players. */
  card: string;
  /** A card that sits inside a card, or a quiet row. */
  well: string;
  ink: string;
  inkSoft: string;
  /** Hairline between rows. */
  divider: string;
  /** The grid's tray. */
  tray: string;
  /** An unmarked cell. */
  cell: string;
  /** A cell that has been struck off: gold, with the star badge. */
  cellMarked: string;
  /** The one cell that is open for marking right now. */
  cellMarkable: string;
  /** A cell the caller may pick this turn. */
  cellCallable: string;
  /** The empty slot in the called strip. */
  slotEmpty: string;
  /** The "your turn" banner. */
  bannerTurn: string;
  /** The "someone else's turn" banner. */
  bannerWait: string;
  /** The round icon buttons (theme switch). */
  iconButton: string;
  /** Switch track, off and on. */
  switchOff: string;
  switchOn: string;
  /** The "view all tables" text button. */
  link: string;
  /** Focus ring for every control. */
  focus: string;
  /** Room-rail variant that matches this skin. */
  railVariant: "dark" | "paper";
  /** Paint a class cannot say (the slate's doodles), laid over `page`. */
  pageStyle?: CSSProperties;
  /** The three colours of the stars and dots drifting at the page edge, and how strongly they show. */
  specks: readonly [string, string, string];
  speckOpacity: number;
  /** The gap a focus ring leaves, as the ring-offset colour of this skin's page. */
  ringOffset: string;
  /** The border that lifts an online dot off its avatar. */
  dotBorder: string;
}

const FOCUS_LIGHT = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#E4B128] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFF6DC]";
const FOCUS_DARK = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFD84D] focus-visible:ring-offset-2 focus-visible:ring-offset-[#2A170C]";

export const BINGO_SKIN_LIGHT: BingoSkin = {
  isDark: false,
  page: "bg-gradient-to-b from-[#FFF6DC] via-[#FBEBC4] to-[#F3DDA6] text-[#4A2C12]",
  card: "bg-[#FFF9E8]/95 border border-[#E8D3A2] shadow-[0_5px_0_rgba(190,150,70,0.22),0_14px_28px_rgba(120,80,20,0.12)]",
  well: "bg-[#FFF3D1]/80 border border-[#EAD7A8]",
  ink: "text-[#4A2C12]",
  inkSoft: "text-[#7A5A34]",
  divider: "border-[#E8D3A2]",
  tray: "bg-[#FFF6DA]/95 border border-[#E8D3A2] shadow-[inset_0_2px_6px_rgba(150,110,40,0.12),0_10px_24px_rgba(120,80,20,0.12)]",
  cell: "bg-[#FFFDF4] border-[#E3CFA0] text-[#4A2C12] shadow-[inset_0_-4px_0_rgba(200,160,80,0.28)]",
  cellMarked: "bg-gradient-to-b from-[#FFE066] to-[#F5B400] border-[#D99A00] text-[#3A2200] shadow-[inset_0_-4px_0_rgba(160,100,0,0.35)]",
  cellMarkable: "bg-[#FFF1B8] border-[#E4A800] text-[#4A2C12] ring-4 ring-[#F5B400]/70 animate-pulse motion-reduce:animate-none",
  cellCallable: "bg-[#FFFDF4] border-[#E4A800] text-[#4A2C12] ring-2 ring-[#F5B400]/60 hover:bg-[#FFF1B8]",
  slotEmpty: "bg-[#E9DDBF] shadow-[inset_0_2px_3px_rgba(120,90,40,0.25)]",
  bannerTurn: "bg-gradient-to-b from-[#FFF0A8] to-[#FFDD66] border-2 border-[#F0B400] text-[#4A2C12] shadow-[0_5px_0_rgba(200,150,0,0.3)]",
  bannerWait: "bg-[#FFF3D1]/90 border border-[#EAD7A8] text-[#4A2C12]",
  iconButton: "bg-[#FFF9E8] border border-[#E8D3A2] text-[#7A4A00] hover:bg-[#FFEFC0] shadow-[0_3px_0_rgba(190,150,70,0.22)]",
  switchOff: "bg-[#D9C8A0]",
  switchOn: "bg-[#E49A00]",
  link: "text-[#8A4B00] hover:bg-[#FFEFC0]",
  focus: FOCUS_LIGHT,
  railVariant: "paper",
  specks: ["#F2B84B", "#E8745A", "#5AA9E6"],
  speckOpacity: 0.6,
  ringOffset: "ring-offset-[#FFF6DC]",
  dotBorder: "border-[#FFF9E8]",
};

export const BINGO_SKIN_DARK: BingoSkin = {
  isDark: true,
  page: "bg-[radial-gradient(120%_70%_at_50%_0%,#4B2D18_0%,#2A170C_55%,#170C06_100%)] text-[#FFF1D0]",
  card: "bg-[#2D1B10]/95 border border-[#5C3B20] shadow-[0_5px_0_rgba(0,0,0,0.35),0_14px_28px_rgba(0,0,0,0.4)]",
  well: "bg-[#22130A]/80 border border-[#4D3219]",
  ink: "text-[#FFF1D0]",
  inkSoft: "text-[#D2B286]",
  divider: "border-[#5C3B20]",
  tray: "bg-[#241409]/95 border border-[#5C3B20] shadow-[inset_0_2px_8px_rgba(0,0,0,0.5),0_10px_24px_rgba(0,0,0,0.4)]",
  cell: "bg-[#1A0F07] border-[#4D3219] text-[#FFF1D0] shadow-[inset_0_-4px_0_rgba(0,0,0,0.55)]",
  cellMarked: "bg-gradient-to-b from-[#FFE066] to-[#F5B400] border-[#D99A00] text-[#3A2200] shadow-[inset_0_-4px_0_rgba(160,100,0,0.35)]",
  cellMarkable: "bg-[#3A2410] border-[#FFD84D] text-[#FFF1D0] ring-4 ring-[#FFD84D]/60 animate-pulse motion-reduce:animate-none",
  cellCallable: "bg-[#1A0F07] border-[#FFD84D] text-[#FFF1D0] ring-2 ring-[#FFD84D]/50 hover:bg-[#3A2410]",
  slotEmpty: "bg-[#150C06] shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]",
  bannerTurn: "bg-gradient-to-b from-[#3A2A08] to-[#2A1D05] border-2 border-[#FFD84D] text-[#FFF1D0] shadow-[0_0_22px_rgba(255,216,77,0.25)]",
  bannerWait: "bg-[#22130A]/90 border border-[#4D3219] text-[#FFF1D0]",
  iconButton: "bg-[#2D1B10] border border-[#5C3B20] text-[#FFD84D] hover:bg-[#3A2410] shadow-[0_3px_0_rgba(0,0,0,0.35)]",
  switchOff: "bg-[#4D3219]",
  switchOn: "bg-[#F5B400]",
  link: "text-[#FFD84D] hover:bg-[#3A2410]",
  focus: FOCUS_DARK,
  railVariant: "dark",
  specks: ["#FFD84D", "#E9A23B", "#C98B3C"],
  speckOpacity: 0.45,
  ringOffset: "ring-offset-[#2A170C]",
  dotBorder: "border-[#2D1B10]",
};

const FOCUS_SLATE = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFF0B3] focus-visible:ring-offset-2 focus-visible:ring-offset-[#15271E]";

/**
 * School Slate: a blackboard in teak. Chalk-white numbers on the green, a chalk-yellow stroke for what is struck off,
 * a teak line round every card. It is a dark skin (`isDark`), so the pieces that already read `isDark` (gold title,
 * green "Marked" tick) keep their meaning. Every ink here clears 4.5:1 on the board's green (#1F372B to #3A5F4C).
 */
export const BINGO_SKIN_SLATE: BingoSkin = {
  isDark: true,
  page: "bg-[#15271E] text-[#F4F7EE]",
  pageStyle: { background: SLATE_ROOM_BACKGROUND },
  card: "bg-[#1A2F24]/95 border border-[#8F6334] shadow-[0_5px_0_rgba(0,0,0,0.35),0_14px_28px_rgba(0,0,0,0.4)]",
  well: "bg-[#12241B]/80 border border-[#6A4825]",
  ink: "text-[#F4F7EE]",
  inkSoft: "text-[#C3D1BF]",
  divider: "border-[#6A4825]",
  tray: "bg-[#2A4638]/95 border-2 border-[#9A6A38] shadow-[inset_0_2px_8px_rgba(0,0,0,0.5),0_10px_24px_rgba(0,0,0,0.4)]",
  cell: "bg-[#1F372B] border-[#EEF2E6]/35 text-[#F4F7EE] shadow-[inset_0_-4px_0_rgba(0,0,0,0.45)]",
  cellMarked: "bg-gradient-to-b from-[#FFF0B3] to-[#F2D675] border-[#C9AE5B] text-[#1F372B] shadow-[inset_0_-4px_0_rgba(120,90,10,0.35)]",
  cellMarkable: "bg-[#3A5F4C] border-[#F2D675] text-[#F4F7EE] ring-4 ring-[#F2D675]/60 animate-pulse motion-reduce:animate-none",
  cellCallable: "bg-[#1F372B] border-[#F2D675] text-[#F4F7EE] ring-2 ring-[#F2D675]/50 hover:bg-[#3A5F4C]",
  slotEmpty: "bg-[#12241B] shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]",
  bannerTurn: "bg-gradient-to-b from-[#2F4B3A] to-[#1F372B] border-2 border-[#F2D675] text-[#F4F7EE] shadow-[0_0_22px_rgba(242,214,117,0.25)]",
  bannerWait: "bg-[#12241B]/90 border border-[#6A4825] text-[#F4F7EE]",
  iconButton: "bg-[#1A2F24] border border-[#8F6334] text-[#F2D675] hover:bg-[#2A4A3A] shadow-[0_3px_0_rgba(0,0,0,0.35)]",
  switchOff: "bg-[#4A5F52]",
  switchOn: "bg-[#C9AE5B]",
  link: "text-[#F2D675] hover:bg-[#2A4A3A]",
  focus: FOCUS_SLATE,
  railVariant: "dark",
  specks: ["#F2D675", "#EEF2E6", "#C4955A"],
  speckOpacity: 0.4,
  ringOffset: "ring-offset-[#15271E]",
  dotBorder: "border-[#1A2F24]",
};

export function bingoSkinFor(isDark: boolean): BingoSkin {
  return isDark ? BINGO_SKIN_DARK : BINGO_SKIN_LIGHT;
}
