import { useEffect, useRef, useState } from "react";
import type { Player } from "@shared/types";
import { getSocket } from "../../lib/socket";

/**
 * Synchronized rotate-to-landscape gate for Rummy.
 *
 * THE BUG THIS FIXES: each client used to decide independently whether it
 * needed to show "rotate your device" and, separately, whether to play the
 * shuffle/deal opener — entirely locally, with zero awareness of anyone
 * else's screen. Playing among friends, if one person had auto-rotate
 * disabled, their table would sit on the rotate prompt for an arbitrary
 * length of time while everyone else's table had already shuffled, dealt,
 * and moved on — desynced from minute one.
 *
 * THE FIX: every client reports its own "do I need to rotate?" flag to the
 * server (`room:setOrientation`), which re-broadcasts it to the room via
 * the normal `room:state` push (same channel as `isReady`/`chosenColor`,
 * see shared/types.ts `Player.needsRotation`). The deal-opener no longer
 * fires the instant the room flips to "playing" — it holds in a "gating"
 * stage until every connected, non-bot player's flag clears. If everyone
 * was already landscape (the common case), the hold resolves immediately;
 * nobody pays an artificial delay. If someone's still rotating, the gate
 * shows a generic "setting up the table" message for `ROTATION_HOLD_MS`
 * (5s), then escalates to naming the specific player(s) still blocking so
 * the rest of the table can nudge them.
 */

/** Grace window before the gate starts naming names instead of "please wait". */
export const ROTATION_HOLD_MS = 5000;

/**
 * Minimum time the gate stays in "gating" before it's allowed to resolve,
 * even if the player list already shows zero blockers. Every client's
 * orientation report needs one full round trip (emit → server →
 * re-broadcast) before anyone ELSE can see it — without this floor, a
 * fresh `players` snapshot can look "all clear" for a few hundred
 * milliseconds right as the round starts, before a portrait player's
 * very first report has had time to land. Comfortably covers one RTT on
 * a normal connection without being a noticeable pause on its own (it
 * overlaps with the shuffle/deal animation that follows).
 */
export const ROTATION_SETTLE_MS = 600;

/** Small-viewport portrait detection — Rummy works best in landscape. */
function evalNeedsLandscape(): boolean {
  if (typeof window === "undefined") return false;
  const isMobile = window.innerWidth < 768;
  const isPortrait = window.innerHeight > window.innerWidth;
  return isMobile && isPortrait;
}

/**
 * Detects whether THIS device currently needs rotating to landscape, and
 * reports every change to the server so the rest of the room can see it.
 * Returns the local value too, for the always-on personal rotate prompt
 * (which fires any time the player is in portrait, gate or no gate).
 */
export function useOrientationReport(): boolean {
  const [needsRotation, setNeedsRotation] = useState(() => evalNeedsLandscape());
  useEffect(() => {
    function onResize() {
      setNeedsRotation(evalNeedsLandscape());
    }
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  // Report only on actual change — once on mount, then whenever it flips.
  const lastReportedRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (lastReportedRef.current === needsRotation) return;
    lastReportedRef.current = needsRotation;
    getSocket().emit("room:setOrientation", needsRotation);
  }, [needsRotation]);

  return needsRotation;
}

export type RummyDealStage = "idle" | "gating" | "shuffle" | "deal";

export interface RummyRotationGate {
  stage: RummyDealStage;
  /** Connected, non-bot players still needing to rotate (excludes self when self is ready). */
  blockers: Player[];
  /** True once the 5s grace window has elapsed and someone's still blocking. */
  showBlockerNames: boolean;
  readyCount: number;
  totalCount: number;
}

const IDLE_GATE: RummyRotationGate = {
  stage: "idle",
  blockers: [],
  showBlockerNames: false,
  readyCount: 0,
  totalCount: 0,
};

/**
 * Drives the synchronized game-start sequence for one mounted shell
 * (Mobile or Desktop — both call this identically).
 *
 * Consumes the `bhalyam.rummy.justStarted.<roomCode>` sessionStorage flag
 * exactly once per mount (Room.tsx sets it at the lobby → playing
 * transition). That part is unchanged from the original single-device
 * trigger — what changed is what happens next: instead of immediately
 * starting the shuffle, the stage parks at "gating" until every connected,
 * non-bot player's `needsRotation` clears, THEN runs the existing
 * shuffle (0.9s) → deal (0.9s) → idle sequence — same timings, now
 * synchronized instead of firing independently per device.
 */
export function useRummyRotationGate(opts: {
  roomCode: string | undefined;
  // "arranging" is mid-round (post-show window) — treated like any non-"playing"
  // phase here: the deal already happened, so the gate stays idle.
  phase: "playing" | "arranging" | "finished";
  players: Player[];
  selfId: string | null;
  /**
   * The LOCAL player's current orientation, from `useOrientationReport()`
   * in the same component. Used instead of `players[selfId].needsRotation`
   * for self specifically — that field only updates after a full
   * emit → server → re-broadcast round trip, which lags behind the
   * instant, synchronous truth this client already has about itself. Without
   * this, the gate could resolve "everyone's ready" for a split second
   * before the player's OWN rotation report has even reached the server,
   * defeating the entire gate on the very table that needed it most.
   */
  selfNeedsRotation: boolean;
}): RummyRotationGate {
  const { roomCode, phase, players, selfId, selfNeedsRotation } = opts;

  // Peek at the sessionStorage flag SYNCHRONOUSLY in the lazy initializer so
  // the very first render already starts in "gating" (not "idle") when a
  // fresh game has just been started. Without this, the component renders
  // once with stage="idle" (full board visible), then the useEffect fires and
  // flips to "gating" — causing the 1-frame flash the user sees.
  //
  // IMPORTANT: we only PEEK here (do NOT consume/remove the key). The
  // useEffect below is still responsible for removing the key so the flag is
  // consumed exactly once. This is safe across React StrictMode double-invoke
  // because both initializer calls find the same key and both return "gating";
  // React keeps the result of the second call, and the first useEffect run
  // then removes the key normally.
  const [stage, setStage] = useState<RummyDealStage>(() => {
    if (typeof window === "undefined" || !roomCode || phase !== "playing") return "idle";
    const key = `bhalyam.rummy.justStarted.${roomCode}`;
    return window.sessionStorage.getItem(key) === "1" ? "gating" : "idle";
  });
  const gateStartRef = useRef<number | null>(null);
  const [, tick] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined" || !roomCode) return;
    const key = `bhalyam.rummy.justStarted.${roomCode}`;
    const flag = window.sessionStorage.getItem(key);
    if (flag !== "1") {
      // The lazy initializer already consumed-or-peeked this; if stage is
      // already "gating" we still need to record the gate start time.
      if (stage === "gating" && gateStartRef.current === null) {
        gateStartRef.current = Date.now();
      }
      return;
    }
    window.sessionStorage.removeItem(key);
    if (phase !== "playing") return;
    gateStartRef.current = Date.now();
    setStage("gating");
    // Intentionally [] — runs exactly once per mount, the flag is the
    // single source of truth (mirrors the original trigger contract).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const eligible = players.filter((p) => p.isConnected && !p.isBot);
  const blockers = eligible.filter((p) =>
    p.id === selfId ? selfNeedsRotation : p.needsRotation,
  );

  // Re-render every 250ms while gating so the 5s reveal threshold gets
  // re-evaluated even when nobody's player list changes in between.
  useEffect(() => {
    if (stage !== "gating") return;
    const id = window.setInterval(() => tick((n) => n + 1), 250);
    return () => window.clearInterval(id);
  }, [stage]);

  // Resolve only once nobody's blocking AND a brief settle window has
  // passed since the gate started. The settle window matters: a fresh
  // `players` list can show zero blockers for a split second before
  // OTHER players' own orientation reports have round-tripped through
  // the server (emit → server → re-broadcast). Without it, this gate
  // can resolve to "everyone's ready" on a table where a portrait
  // player hasn't even had their first report land yet — the bug looks
  // identical to the self-blocking one this hook already guards against,
  // just observed from a DIFFERENT player's screen.
  const elapsed = gateStartRef.current
    ? Date.now() - gateStartRef.current
    : 0;
  const readyToResolve =
    stage === "gating" && blockers.length === 0 && elapsed >= ROTATION_SETTLE_MS;

  useEffect(() => {
    if (!readyToResolve) return;
    setStage("shuffle");
    window.setTimeout(() => setStage("deal"), 900);
    window.setTimeout(() => setStage("idle"), 1800);
  }, [readyToResolve]);

  if (stage === "idle") return IDLE_GATE;

  return {
    stage,
    blockers,
    showBlockerNames: stage === "gating" && elapsed >= ROTATION_HOLD_MS,
    readyCount: eligible.length - blockers.length,
    totalCount: eligible.length,
  };
}

function joinNames(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * Personal full-takeover prompt — shown to a player whose OWN device is in
 * portrait. `readiness` is supplied only while the start-of-game gate is
 * active; mid-game rotations (gate already resolved) show the plain prompt.
 */
export function RotateDevicePrompt({
  readiness,
}: {
  readiness?: { readyCount: number; totalCount: number };
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-6 text-center"
      style={{ background: "linear-gradient(180deg, #0f3a26 0%, #052e16 100%)" }}
    >
      <div className="space-y-4 max-w-xs">
        <div className="text-6xl animate-pulse">📱↻</div>
        <div className="text-lg font-extrabold uppercase tracking-wider text-emerald-100">
          Rotate your device
        </div>
        <div className="text-sm text-emerald-200/80">
          Rummy is best played in landscape mode on mobile. Turn your phone
          sideways to see the full table.
        </div>
        {readiness && readiness.totalCount > 1 && (
          <div className="pt-3 border-t border-emerald-400/20 space-y-1">
            <div className="text-[10px] uppercase tracking-widest text-emerald-300/70 font-bold">
              Everyone's waiting on you
            </div>
            <div className="text-sm text-emerald-100 font-semibold">
              {readiness.readyCount} of {readiness.totalCount} players ready
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Third-person "we're waiting on someone else" indicator — shown to players
 * who are themselves ready. Two flavours:
 *   - "overlay": full-screen takeover (Mobile — nobody should start poking
 *     at cards before the synchronized deal plays for everyone).
 *   - "toast": small non-blocking pill at the top (Desktop — the table was
 *     never gated before this feature, so it stays interactive; this is
 *     purely informational so a desktop player knows why mobile friends
 *     haven't appeared yet, and can nudge them).
 */
export function WaitingForPlayersBanner({
  blockers,
  showNames,
  variant,
}: {
  blockers: Player[];
  showNames: boolean;
  variant: "overlay" | "toast";
}) {
  const namesText = joinNames(blockers.map((p) => p.name));
  const plural = blockers.length > 1;
  const message = showNames
    ? `Waiting for ${namesText} to rotate ${plural ? "their" : "their"} device${plural ? "s" : ""} — give ${plural ? "them" : "a nudge"}!`
    : "Setting up the table — waiting for everyone to get comfortable…";

  if (variant === "toast") {
    return (
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-1.5rem)] pointer-events-none">
        <div
          className="rounded-full px-4 py-2 flex items-center justify-center gap-2 shadow-2xl text-center"
          style={{
            background: "linear-gradient(135deg, #166534, #14532d)",
            border: "1px solid rgba(251,191,36,0.4)",
          }}
        >
          <span className="text-base flex-shrink-0" aria-hidden>📱↻</span>
          <span className="text-xs sm:text-sm font-semibold text-emerald-50">
            {message}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-6 text-center"
      style={{ background: "linear-gradient(180deg, #0f3a26 0%, #052e16 100%)" }}
    >
      <div className="space-y-4 max-w-xs">
        <div className="text-6xl" aria-hidden>{showNames ? "🔔" : "🃏"}</div>
        <div className="text-lg font-extrabold uppercase tracking-wider text-emerald-100">
          {showNames ? "Still rotating…" : "Setting up the table…"}
        </div>
        <div className="text-sm text-emerald-200/80">{message}</div>
        <div className="flex justify-center gap-1.5 pt-1" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-emerald-300/70 animate-pulse"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
