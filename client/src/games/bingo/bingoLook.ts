import { useCallback } from "react";
import { useGameTheme } from "../../hooks/useGameTheme";
import { useSchoolSlate } from "../../lib/schoolSlate";
import { BINGO_SKIN_SLATE, bingoSkinFor, type BingoSkin } from "./bingoSkin";

/** The three looks of the Bingo table, in the order the theme button steps through them. */
export type BingoLook = "light" | "dark" | "slate";

/** Where the theme button goes next. The slate is in the ring only for an account that owns it. */
export function nextBingoLook(look: BingoLook, ownsSlate: boolean): BingoLook {
  if (look === "light") return "dark";
  if (look === "dark") return ownsSlate ? "slate" : "light";
  return "light";
}

export interface BingoLookModel {
  skin: BingoSkin;
  look: BingoLook;
  /** The look one press of the theme button moves to. */
  next: BingoLook;
  cycle: () => void;
}

/**
 * Which look the Bingo table wears. Light and dark are the saved skin setting (`bhalyam.bingo.skin`); the School
 * Slate is an equipped cosmetic, so it is read from the account's loadout and laid over them. Stepping off the slate
 * returns to light, so the saved setting is never left pointing at a look the screen is not showing.
 */
export function useBingoLook(): BingoLookModel {
  const { isNeon, setTheme } = useGameTheme("bingo", "notebook");
  const { isOn, isOwned, setOn } = useSchoolSlate("bingo");
  const look: BingoLook = isOn ? "slate" : isNeon ? "dark" : "light";
  const next = nextBingoLook(look, isOwned);

  const cycle = useCallback(() => {
    if (next === "slate") {
      void setOn(true);
      return;
    }
    if (look === "slate") void setOn(false);
    setTheme(next === "dark" ? "neon" : "notebook");
  }, [look, next, setOn, setTheme]);

  const skin = look === "slate" ? BINGO_SKIN_SLATE : bingoSkinFor(look === "dark");
  return { skin, look, next, cycle };
}
