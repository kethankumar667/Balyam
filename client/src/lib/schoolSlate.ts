import { useCallback, useState } from "react";
import { SCHOOL_SLATE_ID, type SchoolSlateScope } from "@shared/cosmetics";
import { useCosmeticsStore } from "../store/cosmeticsStore";

/** What an account has to do to own the slate: shown beside a locked row in every game's picker. */
export const SCHOOL_SLATE_REQUIREMENT = "Earned by bringing three friends: see the Social Quest.";
const SLATE_FAILED = "School Slate could not be changed. Please try again.";

export interface SchoolSlate {
  /** The slate is what this game should draw. */
  isOn: boolean;
  /** The account owns it (earned, or opened for an admin), so a picker may offer it. */
  isOwned: boolean;
  /** Why the last change failed, or null. */
  error: string | null;
  /** Equips or removes the slate for this game. Resolves true once the server has confirmed. */
  setOn: (on: boolean) => Promise<boolean>;
}

/**
 * The earned School Slate look for one game. It is a personal look: it is read from the viewer's own loadout, is
 * never sent to the room, and changes no rule. A game draws the slate when `isOn`, and offers it in its own theme
 * picker when `isOwned`.
 */
export function useSchoolSlate(scope: SchoolSlateScope): SchoolSlate {
  const isOn = useCosmeticsStore((s) => s.resolved.tableThemes[scope] === SCHOOL_SLATE_ID);
  const isOwned = useCosmeticsStore((s) => s.ownedIds.has(SCHOOL_SLATE_ID));
  const [error, setError] = useState<string | null>(null);

  const setOn = useCallback(
    async (on: boolean): Promise<boolean> => {
      setError(null);
      const store = useCosmeticsStore.getState();
      const ok = on
        ? await store.equipItem("TABLE_THEME", scope, SCHOOL_SLATE_ID)
        : await store.unequipItem("TABLE_THEME", scope);
      if (!ok) setError(useCosmeticsStore.getState().errorMessage ?? SLATE_FAILED);
      return ok;
    },
    [scope],
  );

  return { isOn, isOwned, error, setOn };
}
