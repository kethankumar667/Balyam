import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage, Player, VyomaWeapon, VyomaYudhPublicState } from "@shared/types";
import {
  VYOMA_SHIP_MARGIN,
  VYOMA_SHIP_SPEED,
  VYOMA_TICK_HZ,
  VYOMA_WORLD,
} from "@shared/types";
import InlineRoomRail from "../../components/InlineRoomRail";
import { draw, PALETTE } from "./render";
import { interpolateState, reconcileShipY, type Snapshot } from "./interpolate";

export interface VyomaYudhBoardProps {
  state: VyomaYudhPublicState;
  players: Player[];
  selfId: string;
  messages?: ChatMessage[];
  roomCode?: string;
  roomPhase?: string;
  onMove: (type: string, data?: unknown) => void;
}

/**
 * Vyoma Yudh board — a solo score attack.
 *
 * One component for both form factors: the canvas is the whole game and it
 * scales, so the only real difference is the control surface (keyboard vs
 * touch), which is decided by capability rather than by a separate file.
 *
 * The client is a terminal, not a simulator. It sends intent (steer/fire) and
 * draws whatever the server's last broadcast said. There is no local physics
 * and no local clock — that is what makes the server authoritative.
 */
export default function VyomaYudhBoard({
  state,
  players,
  selfId,
  messages = [],
  roomCode,
  roomPhase,
  onMove,
}: VyomaYudhBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);

  /**
   * The last two broadcasts, and when each arrived.
   *
   * The simulation runs at 20Hz and this canvas redraws at 60, so drawing
   * the newest broadcast directly means every enemy and bullet freezes for
   * three frames and then jumps. That is not a network problem — it happens
   * on a perfect connection — it is the game showing 20 positions a second
   * and calling it motion. Keeping the previous frame is what makes
   * smoothing possible at all.
   */
  const snapshots = useRef<{ prev: Snapshot | null; cur: Snapshot | null }>({
    prev: null,
    cur: null,
  });

  if (stateRef.current !== state) {
    const now = performance.now();
    snapshots.current = { prev: snapshots.current.cur, cur: { state, at: now } };
  }
  stateRef.current = state;
  if (!snapshots.current.cur) {
    snapshots.current = { prev: null, cur: { state, at: performance.now() } };
  }

  /**
   * `onMove` arrives as an inline arrow from Room.tsx, so it is a NEW
   * function on every render. Both steer pumps below used to list it as an
   * effect dependency, which meant every server broadcast tore down the
   * 50ms interval and started a fresh one — and this engine broadcasts at
   * 20Hz, i.e. every 50ms. The interval was racing the exact rate that
   * reset it and lost most of the time, so steering fired erratically or
   * not at all. That is the "not smooth" report, and it hit keyboard too.
   *
   * Holding it in a ref lets the pumps run for the life of the board.
   */
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  const isPilot = state.pilotId === selfId;

  /**
   * The direction currently held, and whether this seat flies at all.
   *
   * Declared here rather than beside the input handlers because the render
   * loop reads them every frame to predict the ship, and that loop mounts
   * once — so anything it touches has to be a ref, not a value captured at
   * the render that happened to set the loop up.
   */
  const steerRef = useRef<-1 | 0 | 1>(0);
  const isPilotRef = useRef(isPilot);
  isPilotRef.current = isPilot;
  const nameOf = useMemo(() => {
    const map = new Map(players.map((p) => [p.id, p.name]));
    return (id: string) => map.get(id) ?? "Pilot";
  }, [players]);

  /**
   * The predicted position of the local ship, in world units.
   *
   * null until the first broadcast that has a ship in it, so a spectator or
   * a finished run never invents one.
   */
  const predictedY = useRef<number | null>(null);

  /* ── render loop ──────────────────────────────────────────────────
   *
   * Draws 60 times a second from a world that updates 20 times a second.
   * Two different jobs, and they need different treatment:
   *
   *   Everything you do not control — enemies, bullets, pickups — is drawn
   *   part-way between the last two broadcasts. Smooth, at the cost of
   *   showing the world one tick (50ms) in the past, which nobody can see.
   *
   *   Your own ship does NOT pay that, because it is already waiting on a
   *   round trip before the server even hears that you pressed. It is flown
   *   locally at the same speed the server uses and pulled back toward the
   *   authoritative value every frame.
   *
   * The loop still advances no game state. Prediction is a drawing decision
   * that the next broadcast overrules; the server remains the only authority
   * on where the ship actually is.
   */
  useEffect(() => {
    let raf = 0;
    let frame = 0;
    let last = performance.now();
    const tickMs = 1000 / VYOMA_TICK_HZ;

    const loop = () => {
      const canvas = canvasRef.current;
      const now = performance.now();
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;

      const { prev, cur } = snapshots.current;
      if (canvas && cur) {
        // Clamped at 1: if broadcasts stall, hold at the newest known
        // position rather than extrapolating into a guess that has to be
        // yanked back when the connection returns.
        const alpha = Math.min(1, (now - cur.at) / tickMs);
        const view = prev ? interpolateState(prev.state, cur.state, alpha) : cur.state;

        const authoritative = cur.state.ship?.y ?? null;
        if (authoritative == null) {
          predictedY.current = null;
        } else {
          predictedY.current = reconcileShipY(
            predictedY.current ?? authoritative,
            authoritative,
            dt,
            isPilotRef.current ? steerRef.current : 0,
            VYOMA_SHIP_SPEED,
            VYOMA_SHIP_MARGIN,
            VYOMA_WORLD.h - VYOMA_SHIP_MARGIN,
          );
        }

        draw(
          canvas,
          predictedY.current != null && view.ship
            ? { ...view, ship: { ...view.ship, y: predictedY.current } }
            : view,
          frame++,
        );
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* ── canvas sizing ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const w = parent.clientWidth;
      const h = Math.round((w * VYOMA_WORLD.h) / VYOMA_WORLD.w);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  /* ── steering ────────────────────────────────────────────────────────
   *
   * ONE message per direction change. Not a stream.
   *
   * This used to pump `steer` every 50ms while a key or the screen was
   * held, because the server moved the ship a fixed distance per message.
   * That made flight speed a function of how many packets survived the
   * trip: on a phone, jitter and loss and socket buffering turned a steady
   * hold into a crawl, a stall, then a lurch. It is why the controls felt
   * heavy.
   *
   * The server now holds the direction and flies the ship on its own clock,
   * so the only thing that has to reach it is the moment the pilot changes
   * their mind. Twenty times less upstream traffic, and identical handling
   * on a good connection and a bad one.
   */
  const [touchDir, setTouchDir] = useState<-1 | 0 | 1>(0);

  const steer = useCallback((d: -1 | 0 | 1) => {
    // Deduped: re-sending a direction already held is the packet stream this
    // change exists to remove, and `pointermove` fires constantly.
    if (steerRef.current === d) return;
    steerRef.current = d;
    setTouchDir(d);
    onMoveRef.current("steer", { dy: d });
  }, []);

  /**
   * Steering is sticky now, so releasing has to be said out loud. Any path
   * that ends a hold — key up, pointer up, cancel, the run ending, the
   * board unmounting — must send a zero or the ship flies on by itself.
   */
  useEffect(() => {
    if (!isPilot || state.isOver) {
      if (steerRef.current !== 0) steer(0);
      return;
    }

    const held = new Set<string>();
    const dirFor = () => {
      const up = held.has("arrowup") || held.has("w");
      const down = held.has("arrowdown") || held.has("s");
      // Both at once cancels, rather than letting whichever was added last
      // win — that is what a physical stick does.
      return up && !down ? -1 : down && !up ? 1 : 0;
    };

    const onDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["arrowup", "w", "arrowdown", "s"].includes(k)) {
        held.add(k);
        steer(dirFor());
        e.preventDefault();
      }
      if (k === " ") { onMoveRef.current("fire"); e.preventDefault(); }
      if (k === "1") onMoveRef.current("special", { weapon: "missile" as VyomaWeapon });
      if (k === "2") onMoveRef.current("special", { weapon: "laser" as VyomaWeapon });
      if (k === "3") onMoveRef.current("special", { weapon: "wall" as VyomaWeapon });
    };
    const onUp = (e: KeyboardEvent) => {
      held.delete(e.key.toLowerCase());
      steer(dirFor());
    };
    // Alt-tabbing away with a key down would otherwise leave it held
    // forever — the browser never delivers the keyup.
    const onBlur = () => {
      held.clear();
      steer(0);
    };

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
      held.clear();
      if (steerRef.current !== 0) steer(0);
    };
  }, [isPilot, state.isOver, steer]);

  return (
    <div className="flex flex-col gap-3">
      {/* HUD */}
      <div
        className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 font-mono text-sm"
        style={{ background: PALETTE.bg, color: PALETTE.ink, border: `2px solid ${PALETTE.hot}` }}
      >
        <span className="font-bold truncate">
          {state.pilotId ? nameOf(state.pilotId) : "Run over"}
        </span>
        <span>LV {state.level}</span>
        <span>{"♥".repeat(Math.max(0, state.lives))}</span>
        <span className="font-bold tabular-nums">{state.score}</span>
      </div>

      {/* Boss health */}
      {state.bossHp != null && (
        <div className="h-2 rounded-full overflow-hidden" style={{ background: PALETTE.dim }}>
          <div
            className="h-full transition-[width] duration-150"
            style={{ width: `${Math.max(0, state.bossHp) * 100}%`, background: PALETTE.ink }}
          />
        </div>
      )}

      <div className="relative w-full">
        <canvas
          ref={canvasRef}
          className="w-full rounded-xl touch-none select-none"
          style={{ border: `2px solid ${PALETTE.hot}`, imageRendering: "pixelated" }}
          onPointerDown={(e) => {
            if (!isPilot) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            const r = e.currentTarget.getBoundingClientRect();
            steer(e.clientY - r.top < r.height / 2 ? -1 : 1);
          }}
          /* Drag now re-aims. Before, direction was sampled once on press, so
             sliding from the top half to the bottom without lifting kept
             flying UP — you had to release and re-press to turn around. */
          onPointerMove={(e) => {
            if (!isPilot || steerRef.current === 0) return;
            const r = e.currentTarget.getBoundingClientRect();
            steer(e.clientY - r.top < r.height / 2 ? -1 : 1);
          }}
          onPointerUp={() => steer(0)}
          onPointerLeave={() => steer(0)}
          /* Without this the ship flies on forever when the browser takes the
             pointer away — an incoming notification, a scroll gesture the OS
             claims, a palm touch. `pointercancel` fires instead of
             `pointerup`, so the old code never stopped steering. */
          onPointerCancel={() => steer(0)}
        />
      </div>

      {/*
        Touch controls.

        Steering used to be an undocumented gesture on the canvas itself, with
        nothing on screen naming it — so players found the four labelled
        buttons, concluded firing was the whole game, and reported "no
        movement controls on mobile". It also meant holding a thumb over the
        play area, hiding the ship you are trying to fly.

        Now it is an explicit pad, off the canvas: movement under the left
        thumb, actions under the right, the way a phone is actually held. The
        canvas gesture still works for anyone who found it.

        Only up/down exist because that is the whole movement model — the
        engine's `steer` carries `dy` alone and the run has only `shipY`.
        Desktop keyboard is the same two directions.
      */}
      {isPilot && !state.isOver && (
        <div className="flex items-stretch justify-between gap-3">
          <div className="flex flex-col gap-2">
            <SteerButton dir={-1} label="Fly up" onHold={steer} active={touchDir === -1} />
            <SteerButton dir={1} label="Fly down" onHold={steer} active={touchDir === 1} />
          </div>

          <div className="flex flex-1 flex-col gap-2">
            <button
              onPointerDown={() => onMove("fire")}
              aria-label="Fire"
              className="flex-1 rounded-lg py-3 font-mono font-bold active:scale-95 transition-transform"
              style={{ background: PALETTE.hot, color: PALETTE.bg, minHeight: 56 }}
            >
              FIRE
            </button>
            <div className="flex gap-2">
              {(["missile", "laser", "wall"] as VyomaWeapon[]).map((w) => (
                <button
                  key={w}
                  onPointerDown={() => onMove("special", { weapon: w })}
                  disabled={state.ammo[w] <= 0}
                  aria-label={`${w}, ${state.ammo[w]} left`}
                  className="flex-1 rounded-lg px-3 font-mono text-xs font-bold disabled:opacity-40 active:scale-95 transition-transform"
                  style={{ background: PALETTE.dim, color: PALETTE.ink, minHeight: 44 }}
                >
                  {w[0].toUpperCase()}
                  <span className="ml-1 tabular-nums">{state.ammo[w]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {state.result && (
        <div
          className="rounded-xl p-4 text-center"
          style={{ background: PALETTE.bg, color: PALETTE.ink }}
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.3em]">
            {state.result.reason === "cleared" ? "All levels cleared" : "Ship destroyed"}
          </p>
          <p className="font-mono text-[7vh] leading-none font-black tabular-nums my-1">
            {state.result.score}
          </p>
          <p className="font-mono text-xs">reached level {state.result.levelReached}</p>
        </div>
      )}

      {roomCode && (
        <InlineRoomRail
          code={roomCode}
          game="vyomayudh"
          phase={roomPhase ?? "playing"}
          players={players}
          selfId={selfId}
          messages={messages}
        />
      )}
    </div>
  );
}

/**
 * Hold-to-fly control.
 *
 * Press and hold to keep moving — the steer pump in the board component
 * re-sends `steer` every 50ms while a direction is held, so this only has to
 * own the direction, not the repeat.
 *
 * Releasing has three endings, and all three must clear the direction:
 * `pointerup` (finger lifted), `pointerleave` (finger slid off the button
 * mid-press) and `pointercancel` (the OS took the pointer — a notification,
 * a scroll the browser claimed). Miss the last one and the ship flies into
 * the wall on its own, which is the bug the canvas gesture had.
 *
 * 56px tall: comfortably over the 44px touch floor, and tall enough to hold
 * under a thumb without looking for it.
 */
function SteerButton({
  dir,
  label,
  onHold,
  active,
}: {
  dir: -1 | 1;
  label: string;
  onHold: (d: -1 | 0 | 1) => void;
  active: boolean;
}) {
  const stop = () => onHold(0);
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(e) => {
        // Capture so a finger that drifts off the button keeps steering
        // until it is actually lifted.
        e.currentTarget.setPointerCapture(e.pointerId);
        onHold(dir);
      }}
      onPointerUp={stop}
      /* No `onPointerLeave`. The pointer is CAPTURED on press, so this button
         is guaranteed the up/cancel event wherever the finger ends up — and
         with capture active, a leave firing as the thumb drifts a few pixels
         off the edge would stop the ship mid-hold, which is the opposite of
         what capture is for. */
      onPointerCancel={stop}
      className="rounded-lg px-5 touch-none select-none transition-transform active:scale-95"
      style={{
        minHeight: 56,
        minWidth: 64,
        background: active ? PALETTE.hot : PALETTE.dim,
        color: active ? PALETTE.bg : PALETTE.ink,
        border: `2px solid ${PALETTE.hot}`,
      }}
    >
      {/* Drawn, not a "▲" glyph — a text arrow inherits the font's metrics
          and sits off-centre in a button this size. */}
      <svg
        viewBox="0 0 24 24"
        width={22}
        height={22}
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="mx-auto"
        style={{ transform: dir === 1 ? "rotate(180deg)" : undefined }}
      >
        <path d="M5 15l7-7 7 7" />
      </svg>
    </button>
  );
}
