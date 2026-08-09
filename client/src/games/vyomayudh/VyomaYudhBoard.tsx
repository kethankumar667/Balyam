import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage, Player, VyomaWeapon, VyomaYudhPublicState } from "@shared/types";
import { VYOMA_WORLD } from "@shared/types";
import InlineRoomRail from "../../components/InlineRoomRail";
import { draw, PALETTE } from "./render";

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
  stateRef.current = state;

  const isPilot = state.pilotId === selfId;
  const nameOf = useMemo(() => {
    const map = new Map(players.map((p) => [p.id, p.name]));
    return (id: string) => map.get(id) ?? "Pilot";
  }, [players]);

  /* ── render loop ──────────────────────────────────────────────────
   * Runs on requestAnimationFrame purely to ANIMATE (blink, starfield
   * drift) between server broadcasts. It never advances game state — the
   * only source of truth is `state`, which arrives from the server. */
  useEffect(() => {
    let raf = 0;
    let frame = 0;
    const loop = () => {
      const canvas = canvasRef.current;
      if (canvas) draw(canvas, stateRef.current, frame++);
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

  /* ── keyboard ──
   * Held keys are re-sent on an interval because `steer` is a per-tick
   * nudge on the server, not a velocity. Holding Up must keep nudging. */
  const held = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!isPilot || state.isOver) return;

    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["arrowup", "w", "arrowdown", "s"].includes(k)) {
        held.current.add(k);
        e.preventDefault();
      }
      if (k === " ") { onMove("fire"); e.preventDefault(); }
      if (k === "1") onMove("special", { weapon: "missile" as VyomaWeapon });
      if (k === "2") onMove("special", { weapon: "laser" as VyomaWeapon });
      if (k === "3") onMove("special", { weapon: "wall" as VyomaWeapon });
    };
    const up = (e: KeyboardEvent) => held.current.delete(e.key.toLowerCase());

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    const pump = window.setInterval(() => {
      if (held.current.has("arrowup") || held.current.has("w")) onMove("steer", { dy: -1 });
      if (held.current.has("arrowdown") || held.current.has("s")) onMove("steer", { dy: 1 });
    }, 50);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.clearInterval(pump);
      held.current.clear();
    };
  }, [isPilot, state.isOver, onMove]);

  /* ── touch: drag anywhere on the canvas to steer ── */
  const [touchDir, setTouchDir] = useState<-1 | 0 | 1>(0);
  useEffect(() => {
    if (!isPilot || touchDir === 0) return;
    const t = window.setInterval(() => onMove("steer", { dy: touchDir }), 50);
    return () => window.clearInterval(t);
  }, [isPilot, touchDir, onMove]);

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
            const r = e.currentTarget.getBoundingClientRect();
            setTouchDir(e.clientY - r.top < r.height / 2 ? -1 : 1);
          }}
          onPointerUp={() => setTouchDir(0)}
          onPointerLeave={() => setTouchDir(0)}
        />
      </div>

      {/* Touch controls — only for the pilot, and only the actions that exist */}
      {isPilot && !state.isOver && (
        <div className="flex items-center justify-center gap-2">
          <button
            onPointerDown={() => onMove("fire")}
            className="flex-1 rounded-lg py-3 font-mono font-bold"
            style={{ background: PALETTE.hot, color: PALETTE.bg }}
          >
            FIRE
          </button>
          {(["missile", "laser", "wall"] as VyomaWeapon[]).map((w) => (
            <button
              key={w}
              onPointerDown={() => onMove("special", { weapon: w })}
              disabled={state.ammo[w] <= 0}
              className="rounded-lg px-3 py-3 font-mono text-xs font-bold disabled:opacity-40"
              style={{ background: PALETTE.dim, color: PALETTE.ink }}
            >
              {w[0].toUpperCase()}
              <span className="ml-1 tabular-nums">{state.ammo[w]}</span>
            </button>
          ))}
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
