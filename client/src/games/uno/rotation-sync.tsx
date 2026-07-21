import { useEffect, useRef, useState } from "react";
import type { Player } from "@shared/types";
import { useAudio } from "../../hooks/useAudio";
import { AUDIO } from "../../constants/audio";

/**
 * Synchronized rotate-to-landscape gate for UNO — same contract as
 * Rummy's own `games/rummy/rotation-sync.tsx` (see that file's header
 * comment for the full "why": independent per-device rotate prompts used
 * to desync the shuffle/deal opener across a table). UNO now gets the
 * identical treatment: every client reports its own orientation via the
 * already-generic `room:setOrientation` socket event (shared/types.ts's
 * `Player.needsRotation`, `RoomManager.setOrientation` — neither is
 * Rummy-specific, both were already game-agnostic room infrastructure),
 * and the deal opener holds at "gating" until every connected, non-bot
 * player is landscape.
 *
 * `useOrientationReport` is re-exported straight from Rummy's module
 * rather than duplicated — it carries zero Rummy branding or copy
 * (pure device-orientation + socket-report logic), the same "genuinely
 * shared, game-agnostic utility" precedent `uno-table.tsx` already
 * established by importing `Avatar` directly from `../rummy/Avatar`
 * instead of forking it.
 */
export { useOrientationReport } from "../rummy/rotation-sync";

/** Grace window before the gate starts naming names instead of "please wait". */
export const ROTATION_HOLD_MS = 5000;
/** Minimum "gating" hold so a fresh `players` snapshot never resolves
 *  before every OTHER player's own orientation report has round-tripped
 *  through the server — see Rummy's rotation-sync.tsx for the full
 *  rationale, identical here. */
export const ROTATION_SETTLE_MS = 600;

/** Deck-riffle stage length before cards start flying out — same values
 *  `uno-deal.tsx`'s original (now-superseded) `useUnoDealGate` used. */
const SHUFFLE_MS = 900;
const DEAL_MS = 1000;

export type UnoDealStage = "idle" | "gating" | "shuffle" | "deal";

export interface UnoRotationGate {
  stage: UnoDealStage;
  /** Connected, non-bot players still needing to rotate (excludes self when self is ready). */
  blockers: Player[];
  /** True once the 5s grace window has elapsed and someone's still blocking. */
  showBlockerNames: boolean;
  readyCount: number;
  totalCount: number;
}

const IDLE_GATE: UnoRotationGate = {
  stage: "idle",
  blockers: [],
  showBlockerNames: false,
  readyCount: 0,
  totalCount: 0,
};

/**
 * Drives the synchronized game-start sequence for one mounted shell
 * (Mobile or Desktop — both call this identically, matching Rummy's
 * pattern). Consumes the `bhalyam.uno.justStarted.<roomCode>`
 * sessionStorage flag exactly once per mount (Room.tsx sets it at the
 * lobby -> playing transition — same flag `uno-deal.tsx`'s original gate
 * already consumed, unchanged). The stage now parks at "gating" until
 * every connected, non-bot player's `needsRotation` clears, THEN runs
 * the shuffle (0.9s) -> deal (1.0s) -> idle sequence.
 */
export function useUnoRotationGate(opts: {
  roomCode: string | undefined;
  phase: "playing" | "finished";
  players: Player[];
  selfId: string | null;
  /** The LOCAL player's current orientation, from `useOrientationReport()`
   *  in the same component — see Rummy's rotation-sync.tsx for why this
   *  (not the server-echoed `players[selfId].needsRotation`) is used for
   *  self specifically. */
  selfNeedsRotation: boolean;
}): UnoRotationGate {
  const { roomCode, phase, players, selfId, selfNeedsRotation } = opts;
  const { play: playSound } = useAudio();

  const [stage, setStage] = useState<UnoDealStage>(() => {
    if (typeof window === "undefined" || !roomCode || phase !== "playing") return "idle";
    const key = `bhalyam.uno.justStarted.${roomCode}`;
    return window.sessionStorage.getItem(key) === "1" ? "gating" : "idle";
  });
  const gateStartRef = useRef<number | null>(null);
  const [, tick] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined" || !roomCode) return;
    const key = `bhalyam.uno.justStarted.${roomCode}`;
    const flag = window.sessionStorage.getItem(key);
    if (flag !== "1") {
      if (stage === "gating" && gateStartRef.current === null) {
        gateStartRef.current = Date.now();
      }
      return;
    }
    window.sessionStorage.removeItem(key);
    if (phase !== "playing") return;
    gateStartRef.current = Date.now();
    setStage("gating");
    // Intentionally [] — runs exactly once per mount, mirroring Rummy's gate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const eligible = players.filter((p) => p.isConnected && !p.isBot);
  const blockers = eligible.filter((p) => (p.id === selfId ? selfNeedsRotation : p.needsRotation));

  useEffect(() => {
    if (stage !== "gating") return;
    const id = window.setInterval(() => tick((n) => n + 1), 250);
    return () => window.clearInterval(id);
  }, [stage]);

  const elapsed = gateStartRef.current ? Date.now() - gateStartRef.current : 0;
  const readyToResolve = stage === "gating" && blockers.length === 0 && elapsed >= ROTATION_SETTLE_MS;

  useEffect(() => {
    if (!readyToResolve) return;
    // Same reduced-motion collapse `uno-deal.tsx`'s original gate applied —
    // the CSS keyframes already shrink themselves, but the JS stage
    // timers need their own shortcut.
    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const shuffleMs = reduceMotion ? 80 : SHUFFLE_MS;
    const dealMs = reduceMotion ? 80 : DEAL_MS;

    setStage("shuffle");
    playSound(AUDIO.UNO_SHUFFLE);
    // Deliberately no cleanup here (matches Rummy's rotation-sync.tsx
    // exactly) — `readyToResolve` is derived from `stage`, which this
    // effect itself changes, so it flips back to false on the very next
    // render. A returned cleanup would then tear down BOTH bare timers
    // below before they ever fire, freezing the gate on "shuffle"
    // forever. Fire-and-forget is intentional, not an oversight.
    window.setTimeout(() => {
      setStage("deal");
      playSound(AUDIO.UNO_DEAL);
    }, shuffleMs);
    window.setTimeout(() => setStage("idle"), shuffleMs + dealMs);
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

/** UNO's own gold/wood/cream palette in place of Rummy's felt-green —
 *  same structure as Rummy's `RotateDevicePrompt` otherwise. */
export function UnoRotateDevicePrompt({
  readiness,
}: {
  readiness?: { readyCount: number; totalCount: number };
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-6 text-center"
      style={{ background: "linear-gradient(180deg, #3a2010 0%, #1f1108 100%)" }}
    >
      <div className="space-y-4 max-w-xs">
        <div className="text-6xl animate-pulse">📱↻</div>
        <div className="text-lg font-extrabold uppercase tracking-wider text-[#F7DA8B]">
          Rotate your device
        </div>
        <div className="text-sm text-[#E9C892]/80">
          UNO is best played in landscape mode on mobile. Turn your phone
          sideways to see the full table.
        </div>
        {readiness && readiness.totalCount > 1 && (
          <div className="pt-3 border-t border-[#F7DA8B]/20 space-y-1">
            <div className="text-[10px] uppercase tracking-widest text-[#E9C892]/70 font-bold">
              Everyone's waiting on you
            </div>
            <div className="text-sm text-[#F7DA8B] font-semibold">
              {readiness.readyCount} of {readiness.totalCount} players ready
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Third-person "we're waiting on someone else" indicator — "overlay"
 *  (Mobile, full takeover) or "toast" (Desktop, non-blocking pill),
 *  matching Rummy's two-flavour split exactly. */
export function UnoWaitingForPlayersBanner({
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
          style={{ background: "linear-gradient(135deg, #6D4323, #4A2C16)", border: "1px solid rgba(247,218,139,0.4)" }}
        >
          <span className="text-base flex-shrink-0" aria-hidden>📱↻</span>
          <span className="text-xs sm:text-sm font-semibold text-[#F7E8C4]">{message}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-6 text-center"
      style={{ background: "linear-gradient(180deg, #3a2010 0%, #1f1108 100%)" }}
    >
      <div className="space-y-4 max-w-xs">
        <div className="text-6xl" aria-hidden>{showNames ? "🔔" : "🎴"}</div>
        <div className="text-lg font-extrabold uppercase tracking-wider text-[#F7DA8B]">
          {showNames ? "Still rotating…" : "Setting up the table…"}
        </div>
        <div className="text-sm text-[#E9C892]/80">{message}</div>
        <div className="flex justify-center gap-1.5 pt-1" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-[#F7DA8B]/70 animate-pulse"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
