import type { ComponentType } from "react";
import type { GameTag } from "./data";
import {
  type BhalyamIconProps,
  KiteIcon,
  LudoGlyph,
  WordBuildingGlyph,
  JoystickGlyph,
  TambolaGlyph,
  RpsGlyph,
  StarGameGlyph,
} from "./icons";

/**
 * Filter pictograms.
 *
 * These replace the emoji the first pass used. Three reasons, in order of
 * how much they actually matter:
 *
 *  1. `shared/reactions.ts` already sets the house rule: "Every glyph here is
 *     Unicode 6.0 or older, so it renders on old Android rather than showing
 *     a tofu box." The emoji set broke it — 🧠 is Unicode 9.0 and would have
 *     shipped as an empty box on exactly the cheap Android handsets this app
 *     is aimed at.
 *  2. Emoji are drawn by the OS, so the row looked like Apple on iPhone,
 *     Google on Android and Microsoft on Windows. The rest of BHALYAM is one
 *     hand-drawn 24x24 stroke family; the category row was the only surface
 *     borrowing someone else's illustration style.
 *  3. Stroke glyphs inherit `currentColor`, so they theme with the parchment
 *     tokens for free. Emoji ignore colour entirely.
 *
 * Each filter borrows the glyph of a game that lives in it, so no icon is
 * abstract: Board & Cards is the Ludo board, Classroom is the Word Building
 * sheet, Party & Quiz is the Tambola ticket. Multiplayer takes the Rock Paper
 * Scissors hands, which are two players by definition, and Solo Play takes
 * the joystick.
 */
export const CATEGORY_ICON: Record<GameTag, ComponentType<BhalyamIconProps>> = {
  retro: StarGameGlyph,
  upcoming: KiteIcon,
  solo: JoystickGlyph,
  multiplayer: RpsGlyph,
  board: LudoGlyph,
  party: TambolaGlyph,
  classroom: WordBuildingGlyph,
};

/** The "everything" chip. The brand kite, not a filter. */
export const ALL_CATEGORIES_ICON = KiteIcon;
