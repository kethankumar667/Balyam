import React from "react";
import { BrickBreakoutGame } from "../features/brick-breakout";

/**
 * The page heading lives here rather than in the game.
 *
 * `BrickBreakoutGame` is a canvas and a control pad; its only heading was an
 * h3 on the desktop-controls hint, so the document had no subject for either
 * a crawler or a screen reader. Putting the h1 in the page wrapper keeps it
 * true no matter which screen the game is showing — a boot splash, a menu or
 * a live board are states of one page, not three different pages.
 *
 * Visually hidden because a title bar above a handheld LCD would break the
 * illusion the whole feature is built on.
 */
export default function BrickBreakoutPage() {
  return (
    <>
      <h1 className="sr-only">Brick Breakout — retro paddle and ball arcade</h1>
      <BrickBreakoutGame />
    </>
  );
}
