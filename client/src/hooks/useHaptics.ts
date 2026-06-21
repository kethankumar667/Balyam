import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { HapticsManager } from "../services/HapticsManager";

/**
 * Stable accessor — components read live `enabled` state, and the
 * fire-and-forget methods are bound off the singleton so they're
 * reference-stable across renders.
 */
export function useHaptics() {
  const manager = useMemo(() => HapticsManager.getInstance(), []);
  const state = useSyncExternalStore(
    (cb) => manager.subscribe(cb),
    () => manager.getState(),
    () => manager.getState(),
  );
  return useMemo(
    () => ({
      enabled: state.enabled,
      supported: manager.isSupported(),
      setEnabled: (v: boolean) => manager.setEnabled(v),
      toggle: () => manager.toggle(),
      turn: () => manager.turn(),
      win: () => manager.win(),
      subtle: () => manager.subtle(),
    }),
    [manager, state.enabled],
  );
}

/**
 * Fires the "your turn" haptic exactly once per transition into your
 * turn. Pass the currently-active player id and the player's own id;
 * the hook handles dedup, re-renders, refresh, and "still your turn
 * after a re-render" cases without re-buzzing the device.
 *
 *   useTurnHaptics(state.turnPlayerId, selfId);
 *
 * Vibration enable/disable is respected automatically — the underlying
 * manager checks the persisted flag on every fire.
 */
export function useTurnHaptics(
  activePlayerId: string | null | undefined,
  selfId: string | null | undefined,
): void {
  const manager = useMemo(() => HapticsManager.getInstance(), []);
  const wasMineRef = useRef<boolean>(false);
  // Track whether we've seen any state at all yet, to skip the very
  // first render — otherwise refreshing the page mid-turn buzzes the
  // user as if they just got the turn.
  const seededRef = useRef<boolean>(false);

  useEffect(() => {
    const mine = !!selfId && activePlayerId === selfId;
    if (!seededRef.current) {
      seededRef.current = true;
      wasMineRef.current = mine;
      return;
    }
    if (mine && !wasMineRef.current) {
      manager.turn();
    }
    wasMineRef.current = mine;
  }, [manager, activePlayerId, selfId]);
}
