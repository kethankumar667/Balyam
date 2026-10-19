import { useEffect, useState } from "react";
import type { MandaliAroundPerson } from "@shared/mandali/types";
import { apiJson } from "../../lib/playerIdentity";

/** How often the home page re-checks who is around while it is on screen. */
export const AROUND_POLL_MS = 30_000;

interface AroundResponse {
  success: boolean;
  around: MandaliAroundPerson[];
}

/**
 * Friends who are here right now, across every Mandali the player belongs to.
 *
 * Polled, not pushed: the Mandali screens get presence over a socket room they
 * join per group, and the home page belongs to no group. A 30 second read of a
 * list capped at a dozen people is cheaper and simpler than joining every room,
 * and "around" does not need to be second-accurate.
 *
 * ── Kind to a phone and a battery ─────────────────────────────────────
 * Nothing is asked while the tab is hidden, and coming back to the tab asks at
 * once, so the strip is current the moment it is seen without a timer ticking
 * in the background.
 *
 * ── A failed refresh is not news ──────────────────────────────────────
 * `apiJson` answers `null` for any failure. The last list is kept: a dropped
 * connection should not make three friends vanish and reappear. This is a
 * nicety on the page, never something the player acts on without a second
 * confirmation (Watch opens the real match), so staying quiet is right.
 *
 * Switched off (`enabled` false: a guest, who has no Mandali) it asks for
 * nothing and returns an empty list. Nothing is stored on the device.
 */
export function useAroundNow(enabled: boolean): MandaliAroundPerson[] {
  const [around, setAround] = useState<MandaliAroundPerson[]>([]);

  useEffect(() => {
    if (!enabled) {
      setAround([]);
      return undefined;
    }

    let cancelled = false;

    async function load() {
      const res = await apiJson<AroundResponse>("/api/mandali/around");
      if (cancelled || !res?.success) return;
      setAround(res.around);
    }

    function refreshIfVisible() {
      if (document.visibilityState === "visible") void load();
    }

    void load();
    const timer = window.setInterval(refreshIfVisible, AROUND_POLL_MS);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [enabled]);

  return around;
}
