import { useEffect, useRef, useState, useCallback } from "react";
import type { Player } from "@shared/types";
import { AudioManager } from "../services/AudioManager";
import { AUDIO } from "../constants/audio";

export interface JoinEvent {
  id: string;
  playerId: string;
  name: string;
  avatar?: string;
  isBot: boolean;
  timestamp: number;
}

export interface UseJoinAnimationTrackerOptions {
  /** Stable identity of the room being viewed. Changing it resets all tracker
   *  state so feedback from a previous room can never leak into the next
   *  one, even if the owning component (e.g. Room.tsx) stays mounted across
   *  the route param change. */
  roomCode?: string;
  /** Whether the tracker should emit join events (typically `phase === "lobby"`). */
  enabled?: boolean;
  /** Auto-dismiss duration for join banners in milliseconds (default: 2500ms). */
  autoDismissMs?: number;
  /** Duration in ms a seat is considered "newly joined" for row glow animation (default: 1200ms). */
  newSeatDurationMs?: number;
  /** Called with every genuinely-new join in a batch (uncapped). This is the
   *  single detection feed other join-driven presentation (e.g. the lobby
   *  coin-particle flight) must consume instead of re-diffing the roster. */
  onJoin?: (joined: JoinEvent[]) => void;
}

/** Hard ceiling on simultaneously visible join banners, regardless of burst size. */
const MAX_SIMULTANEOUS_JOIN_BANNERS = 3;

/**
 * Authoritative Player & Bot Join Animation Tracker Hook.
 *
 * The single source of "who just joined this room" for all join-feedback UI
 * (banner, participant-row highlight, lobby coin-particle flight). Nothing
 * else in the room UI should independently diff `roomState.players`.
 *
 * Guarantees strict idempotency:
 * 1. Initial room load / page refresh: existing players are seeded without emitting join events.
 * 2. Reconnect / Recovery: presence toggles (`isConnected: true/false`) do not trigger join animations.
 * 3. State Resync: identical player lists do not replay animations.
 * 4. Room identity change: all tracker state resets and the new room's roster is seeded silently.
 * 5. Genuine Joins: emits a single `JoinEvent` (human or bot) exactly once per new player ID.
 *
 * Known limitation: a player who is merely omitted from one incomplete
 * state snapshot (not an actual departure) must not replay as a "new" join
 * when they reappear. Since the room-state contract has no explicit
 * leave/rejoin-as-new-seat signal, seen IDs only ever grow for the lifetime
 * of a room — the safer choice is treating a returning ID as not-new rather
 * than risking a false replay.
 */
export function useJoinAnimationTracker(
  players: Player[] | undefined,
  options: UseJoinAnimationTrackerOptions = {},
) {
  const {
    roomCode,
    enabled = true,
    autoDismissMs = 2500,
    newSeatDurationMs = 1200,
  } = options;

  const [recentJoins, setRecentJoins] = useState<JoinEvent[]>([]);
  const [newPlayerIds, setNewPlayerIds] = useState<Set<string>>(new Set());

  // Every player ID ever seen in this room session. Only grows — see the
  // "known limitation" note above for why this must never shrink.
  const seenPlayerIdsRef = useRef<Set<string>>(new Set());
  const didInitializeRef = useRef(false);
  const roomCodeRef = useRef(roomCode);
  const dismissTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const newSeatTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Read via ref so a fresh `onJoin` identity every render never re-triggers
  // (or is missed by) the detection effect below.
  const onJoinRef = useRef(options.onJoin);
  onJoinRef.current = options.onJoin;

  const clearAllTimers = useCallback(() => {
    dismissTimersRef.current.forEach((t) => clearTimeout(t));
    dismissTimersRef.current.clear();
    newSeatTimersRef.current.forEach((t) => clearTimeout(t));
    newSeatTimersRef.current.clear();
  }, []);

  // Room identity changed: wipe every trace of the previous room so its
  // feedback (banners, highlights, pending timers) cannot bleed into the
  // next one. Does not depend on the component unmounting.
  useEffect(() => {
    if (roomCodeRef.current === roomCode) return;
    roomCodeRef.current = roomCode;
    clearAllTimers();
    didInitializeRef.current = false;
    seenPlayerIdsRef.current = new Set();
    setRecentJoins([]);
    setNewPlayerIds(new Set());
  }, [roomCode, clearAllTimers]);

  // Belt-and-suspenders: clear every outstanding timer on unmount too.
  useEffect(() => clearAllTimers, [clearAllTimers]);

  useEffect(() => {
    if (!players || players.length === 0) return;

    if (!didInitializeRef.current) {
      didInitializeRef.current = true;
      seenPlayerIdsRef.current = new Set(players.map((p) => p.id));
      return;
    }

    const currentIds = new Set(players.map((p) => p.id));

    if (!enabled) {
      // If disabled (e.g. not in lobby), keep seen IDs updated without triggering join events
      currentIds.forEach((id) => seenPlayerIdsRef.current.add(id));
      return;
    }

    // De-duplicate defensively: a malformed roster must never emit more than
    // one event per player ID, and emission order follows the authoritative
    // list order.
    const dedupedThisPass = new Set<string>();
    const newlyJoined = players.filter((p) => {
      if (seenPlayerIdsRef.current.has(p.id) || dedupedThisPass.has(p.id)) return false;
      dedupedThisPass.add(p.id);
      return true;
    });

    currentIds.forEach((id) => seenPlayerIdsRef.current.add(id));

    if (newlyJoined.length === 0) return;

    const now = Date.now();
    const events: JoinEvent[] = newlyJoined.map((p, i) => ({
      id: `join-${p.id}-${now}-${i}`,
      playerId: p.id,
      name: p.name,
      avatar: p.avatar,
      isBot: Boolean(p.isBot),
      timestamp: now,
    }));

    // One sound per authoritative update — never one per joined player — so
    // a burst of simultaneous joins can't overlap audio.
    try {
      const audio = AudioManager.getInstance();
      const hasHuman = newlyJoined.some((p) => !p.isBot);
      audio.play(hasHuman ? AUDIO.UI_NOTIFICATION : AUDIO.UI_CLICK);
    } catch {
      // Audio might be uninitialized or blocked by browser policy; safe to ignore
    }

    // Mark newly joined seats. Uncapped — a seat's highlight must not
    // disappear just because its banner fell outside the 3-banner cap.
    setNewPlayerIds((prev) => {
      const next = new Set(prev);
      newlyJoined.forEach((p) => next.add(p.id));
      return next;
    });

    newlyJoined.forEach((p) => {
      const existing = newSeatTimersRef.current.get(p.id);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        setNewPlayerIds((prev) => {
          const next = new Set(prev);
          next.delete(p.id);
          return next;
        });
        newSeatTimersRef.current.delete(p.id);
      }, newSeatDurationMs);
      newSeatTimersRef.current.set(p.id, timer);
    });

    // Add to recent joins toast queue, capped at 3 simultaneous so a burst
    // of joins (e.g. several players landing in the same broadcast) can't
    // spam `aria-live="polite"` announcements or flood the banner stack.
    setRecentJoins((prev) => [...prev, ...events].slice(-MAX_SIMULTANEOUS_JOIN_BANNERS));

    // Schedule auto-dismiss for each event independently, keyed by event ID
    // so a manual dismissal or a room-reset can cancel exactly its own timer
    // without touching any other queued event.
    events.forEach((evt) => {
      const timer = setTimeout(() => {
        setRecentJoins((prev) => prev.filter((item) => item.id !== evt.id));
        dismissTimersRef.current.delete(evt.id);
      }, autoDismissMs);
      dismissTimersRef.current.set(evt.id, timer);
    });

    onJoinRef.current?.(events);
  }, [players, enabled, autoDismissMs, newSeatDurationMs]);

  const dismissJoin = useCallback((id: string) => {
    const timer = dismissTimersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      dismissTimersRef.current.delete(id);
    }
    setRecentJoins((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearJoins = useCallback(() => {
    dismissTimersRef.current.forEach((t) => clearTimeout(t));
    dismissTimersRef.current.clear();
    setRecentJoins([]);
    setNewPlayerIds(new Set());
  }, []);

  return {
    recentJoins,
    newPlayerIds,
    dismissJoin,
    clearJoins,
  };
}
