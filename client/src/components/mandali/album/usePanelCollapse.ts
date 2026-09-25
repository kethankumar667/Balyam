import { useCallback, useState } from "react";
import { readConsent } from "../../../lib/privacy/consent";

/** Declared in lib/privacy/dataInventory.ts. */
const LAYOUT_KEY = "bhalyam.mandali.layout";

export type PanelSide = "left" | "right";
/** true = folded away. */
export type PanelState = Record<PanelSide, boolean>;

const OPEN: PanelState = { left: false, right: false };

/**
 * Where the choice is kept. It is a preference, so someone who chose "Only what's
 * essential" gets it for this tab session only (the consent layer would purge a
 * localStorage copy on the next load and the panels would spring back open).
 */
function store(): Storage | null {
  try {
    return readConsent()?.choice === "essential-only" ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

function read(): PanelState {
  try {
    const raw = store()?.getItem(LAYOUT_KEY);
    if (!raw) return OPEN;
    const parsed = JSON.parse(raw) as Partial<PanelState>;
    return { left: parsed.left === true, right: parsed.right === true };
  } catch {
    return OPEN;
  }
}

function write(next: PanelState): void {
  try {
    store()?.setItem(LAYOUT_KEY, JSON.stringify(next));
  } catch {
    /* private mode: the choice holds until the page is closed */
  }
}

/**
 * Which side panels of the desktop Mandali are folded away, remembered between visits
 * so the page stays the way the person left it.
 */
export function usePanelCollapse(): { collapsed: PanelState; toggle: (side: PanelSide) => void } {
  const [collapsed, setCollapsed] = useState<PanelState>(read);

  const toggle = useCallback((side: PanelSide) => {
    setCollapsed((current) => {
      const next = { ...current, [side]: !current[side] };
      write(next);
      return next;
    });
  }, []);

  return { collapsed, toggle };
}
