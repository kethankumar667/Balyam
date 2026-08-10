import React, { useMemo } from "react";
import type { CarromPublicState, CarromSeat, Player, StrikerSkin, BoardFeltSkin } from "@shared/types";
import { CARROM_BOARD } from "@shared/types";
import { HapticsManager } from "../../services/HapticsManager";

/* ─────────────────────────── Skin Definitions ─────────────────────────── */
export interface SkinConfig {
  name: string;
  boardBgStart: string;
  boardBgEnd: string;
  boardLine: string;
  pocketRim: string;
}

export const BOARD_SKINS: Record<BoardFeltSkin, SkinConfig> = {
  birch: {
    name: "Classic Birch",
    boardBgStart: "#F9EBD0",
    boardBgEnd: "#EED8B0",
    boardLine: "#6B4226",
    pocketRim: "#D4AF37",
  },
  velvet: {
    name: "Royal Velvet Blue",
    boardBgStart: "#1E293B",
    boardBgEnd: "#0F172A",
    boardLine: "#94A3B8",
    pocketRim: "#38BDF8",
  },
  emerald: {
    name: "Emerald Green",
    boardBgStart: "#065F46",
    boardBgEnd: "#044E35",
    boardLine: "#A7F3D0",
    pocketRim: "#F59E0B",
  },
  ebony: {
    name: "Midnight Ebony",
    boardBgStart: "#18181B",
    boardBgEnd: "#09090B",
    boardLine: "#D4AF37",
    pocketRim: "#EAB308",
  },
};

export interface StrikerSkinConfig {
  name: string;
  start: string;
  end: string;
  rim: string;
  core: string;
}

export const STRIKER_SKINS: Record<StrikerSkin, StrikerSkinConfig> = {
  pearl: {
    name: "Pearl Royal",
    start: "#FFFFFF",
    end: "#E0F2FE",
    rim: "#0284C7",
    core: "#0284C7",
  },
  gold: {
    name: "Golden Emperor",
    start: "#FEF08A",
    end: "#CA8A04",
    rim: "#EAB308",
    core: "#B45309",
  },
  cyber: {
    name: "Neon Cyber",
    start: "#67E8F9",
    end: "#0891B2",
    rim: "#22D3EE",
    core: "#06B6D4",
  },
  ruby: {
    name: "Ruby Flame",
    start: "#FCA5A5",
    end: "#DC2626",
    rim: "#EF4444",
    core: "#991B1B",
  },
  emerald: {
    name: "Emerald Legend",
    start: "#6EE7B7",
    end: "#059669",
    rim: "#10B981",
    core: "#047857",
  },
};

export const CARROM_THEME = {
  frameDark: "#2A160A",
  frameMid: "#5C361E",
  whiteCoinStart: "#FFFDF7",
  whiteCoinEnd: "#E3D3B4",
  whiteCoinRim: "#8C6339",
  blackCoinStart: "#3A3029",
  blackCoinEnd: "#1A130E",
  blackCoinRim: "#A36D43",
  queenStart: "#EF4444",
  queenEnd: "#991B1B",
  queenRim: "#F59E0B",
};

export interface AimData {
  angle: number;
  power: number;
  dx: number;
  dy: number;
}

/* ─────────────────────────── Carrom Score Header ─────────────────────────── */
export function CarromScoreHeader({
  state,
  players,
  selfId,
  onOpenSkins,
}: {
  state: CarromPublicState;
  players: Player[];
  selfId: string;
  onOpenSkins?: () => void;
}) {
  const nameOf = useMemo(() => {
    const map = new Map(players.map((p) => [p.id, p.name]));
    return (id: string) => map.get(id) ?? "Player";
  }, [players]);

  const seats = state.seats;
  const modeLabel =
    state.mode === "freestyle"
      ? "Freestyle"
      : state.mode === "discpool"
      ? "Disc Pool"
      : "Classic";

  return (
    <div className="w-full flex flex-col gap-2 p-3 rounded-2xl bg-gradient-to-r from-stone-900/90 via-stone-800/90 to-stone-900/90 border border-amber-500/20 shadow-xl backdrop-blur-md">
      {/* Top Meta Bar */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          {modeLabel} Mode
        </span>

        {onOpenSkins && (
          <button
            type="button"
            onClick={onOpenSkins}
            className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/30 transition cursor-pointer flex items-center gap-1 active:scale-95"
          >
            🎨 Custom Skins
          </button>
        )}
      </div>

      {/* Players Header */}
      <div className="flex items-stretch gap-2.5">
        {seats.map((s) => {
          const isTurn = s.playerId === state.turnPlayerId && state.phase !== "finished";
          const isSelf = s.playerId === selfId;
          const name = nameOf(s.playerId);
          const isWhite = s.color === "white";

          return (
            <div
              key={s.playerId}
              className={`flex-1 flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl transition-all duration-300 ${
                isTurn
                  ? "bg-gradient-to-r from-amber-500/20 to-amber-600/10 border-2 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]"
                  : "bg-white/5 border border-white/10"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center shadow-md"
                  style={{
                    background: isWhite
                      ? `radial-gradient(circle at 35% 35%, ${CARROM_THEME.whiteCoinStart}, ${CARROM_THEME.whiteCoinEnd})`
                      : `radial-gradient(circle at 35% 35%, ${CARROM_THEME.blackCoinStart}, ${CARROM_THEME.blackCoinEnd})`,
                    border: `1.5px solid ${isWhite ? CARROM_THEME.whiteCoinRim : CARROM_THEME.blackCoinRim}`,
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      border: `1px solid ${isWhite ? "rgba(140,99,57,0.5)" : "rgba(163,109,67,0.5)"}`,
                    }}
                  />
                </div>

                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black text-amber-100/90 truncate flex items-center gap-1">
                    {name}
                    {isSelf && <span className="text-[10px] text-amber-400 font-mono">(You)</span>}
                  </span>
                  <span className="text-[10px] font-bold text-amber-200/60 uppercase tracking-wider">
                    {s.color} · {s.remaining} left
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end flex-shrink-0">
                <span className="text-base font-black font-mono text-amber-300 leading-none">
                  {s.score}
                </span>
                <span className="text-[8px] font-extrabold uppercase tracking-widest text-amber-400/50">
                  PTS
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────── SVG High-Definition Carrom Board ─────────────────────────── */
export function CarromSvgBoard({
  state,
  selfId,
  myTurn,
  aim,
  svgRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  state: CarromPublicState;
  selfId: string;
  myTurn: boolean;
  aim: AimData | null;
  svgRef: React.RefObject<SVGSVGElement>;
  onPointerDown: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerMove: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerUp: (e: React.PointerEvent<SVGSVGElement>) => void;
}) {
  const striker = state.pieces.find((p) => p.kind === "striker");
  const size = CARROM_BOARD.size;
  const cushion = CARROM_BOARD.cushion;
  const center = size / 2;

  const feltSkin = BOARD_SKINS[state.boardSkin ?? "birch"] ?? BOARD_SKINS.birch;
  const strikerSkin = STRIKER_SKINS[state.strikerSkin ?? "pearl"] ?? STRIKER_SKINS.pearl;

  const pockets = [
    { x: cushion, y: cushion },
    { x: size - cushion, y: cushion },
    { x: cushion, y: size - cushion },
    { x: size - cushion, y: size - cushion },
  ];

  // 1-Cushion Reflection Trajectory Calculation
  const trajectoryPoints = useMemo(() => {
    if (!aim || !striker) return null;
    const startX = striker.x;
    const startY = striker.y;
    const dirX = Math.cos(aim.angle);
    const dirY = Math.sin(aim.angle);
    const maxDist = 50 * aim.power;

    const r = CARROM_BOARD.strikerRadius;
    const minB = cushion + r;
    const maxB = size - cushion - r;

    // Check collision with 4 cushion walls
    let tMin = maxDist;
    let hitNormal = { x: 0, y: 0 };

    if (dirX > 0) {
      const t = (maxB - startX) / dirX;
      if (t > 0 && t < tMin) {
        tMin = t;
        hitNormal = { x: -1, y: 0 };
      }
    } else if (dirX < 0) {
      const t = (minB - startX) / dirX;
      if (t > 0 && t < tMin) {
        tMin = t;
        hitNormal = { x: 1, y: 0 };
      }
    }

    if (dirY > 0) {
      const t = (maxB - startY) / dirY;
      if (t > 0 && t < tMin) {
        tMin = t;
        hitNormal = { x: 0, y: -1 };
      }
    } else if (dirY < 0) {
      const t = (minB - startY) / dirY;
      if (t > 0 && t < tMin) {
        tMin = t;
        hitNormal = { x: 0, y: 1 };
      }
    }

    const hitX = startX + dirX * tMin;
    const hitY = startY + dirY * tMin;

    if (tMin < maxDist) {
      // Compute reflected vector
      const dot = dirX * hitNormal.x + dirY * hitNormal.y;
      const refX = dirX - 2 * dot * hitNormal.x;
      const refY = dirY - 2 * dot * hitNormal.y;
      const remDist = maxDist - tMin;
      const endX = hitX + refX * remDist;
      const endY = hitY + refY * remDist;

      return {
        startX,
        startY,
        hitX,
        hitY,
        endX,
        endY,
        isReflected: true,
      };
    }

    return {
      startX,
      startY,
      hitX: startX + dirX * maxDist,
      hitY: startY + dirY * maxDist,
      isReflected: false,
    };
  }, [aim, striker, cushion, size]);

  return (
    <div
      id="game-board-container"
      className="relative w-full aspect-square max-w-[650px] mx-auto select-none touch-none rounded-3xl overflow-hidden p-3 bg-gradient-to-br from-[#1C0E06] via-[#381F0E] to-[#1C0E06] border-4 border-[#5C361E] shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
    >
      {/* Metallic Corner Brackets */}
      <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-amber-400/60 rounded-tl-lg pointer-events-none" />
      <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-amber-400/60 rounded-tr-lg pointer-events-none" />
      <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-amber-400/60 rounded-bl-lg pointer-events-none" />
      <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-amber-400/60 rounded-br-lg pointer-events-none" />

      <svg
        ref={svgRef}
        viewBox={`0 0 ${size} ${size}`}
        className="w-full h-full rounded-2xl shadow-inner cursor-crosshair"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <defs>
          <radialGradient id="boardVarnish" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor={feltSkin.boardBgStart} />
            <stop offset="100%" stopColor={feltSkin.boardBgEnd} />
          </radialGradient>

          <linearGradient id="cushionBorder" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4A2C17" />
            <stop offset="50%" stopColor="#6B4226" />
            <stop offset="100%" stopColor="#381F0E" />
          </linearGradient>

          <radialGradient id="pocketInner" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#050302" />
            <stop offset="80%" stopColor="#140B05" />
            <stop offset="100%" stopColor={feltSkin.pocketRim} />
          </radialGradient>

          <radialGradient id="whiteCoinGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor={CARROM_THEME.whiteCoinStart} />
            <stop offset="70%" stopColor="#ECE0C8" />
            <stop offset="100%" stopColor={CARROM_THEME.whiteCoinEnd} />
          </radialGradient>

          <radialGradient id="blackCoinGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor={CARROM_THEME.blackCoinStart} />
            <stop offset="70%" stopColor="#241B15" />
            <stop offset="100%" stopColor={CARROM_THEME.blackCoinEnd} />
          </radialGradient>

          <radialGradient id="queenGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#F87171" />
            <stop offset="50%" stopColor={CARROM_THEME.queenStart} />
            <stop offset="100%" stopColor={CARROM_THEME.queenEnd} />
          </radialGradient>

          <radialGradient id="customStrikerGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor={strikerSkin.start} />
            <stop offset="100%" stopColor={strikerSkin.end} />
          </radialGradient>

          <filter id="pieceShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0.4" dy="0.7" stdDeviation="0.4" floodColor="#000" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Felt Surface */}
        <rect x={0} y={0} width={size} height={size} fill="url(#boardVarnish)" />

        {/* Cushion Frame */}
        <rect
          x={cushion}
          y={cushion}
          width={size - cushion * 2}
          height={size - cushion * 2}
          fill="none"
          stroke="url(#cushionBorder)"
          strokeWidth={0.8}
        />
        <rect
          x={cushion + 0.5}
          y={cushion + 0.5}
          width={size - cushion * 2 - 1}
          height={size - cushion * 2 - 1}
          fill="none"
          stroke={feltSkin.boardLine}
          strokeWidth={0.4}
          opacity={0.8}
        />

        {/* ── Rosette & Circles ── */}
        <circle cx={center} cy={center} r={CARROM_BOARD.coinRadius * 4.8} fill="none" stroke={feltSkin.boardLine} strokeWidth={0.5} />
        <circle cx={center} cy={center} r={CARROM_BOARD.coinRadius * 4.2} fill="none" stroke="#B91C1C" strokeWidth={0.35} strokeDasharray="1.5 1" />
        <circle cx={center} cy={center} r={CARROM_BOARD.coinRadius * 1.3} fill="#B91C1C" opacity={0.85} />
        <circle cx={center} cy={center} r={CARROM_BOARD.coinRadius * 1.3} fill="none" stroke={feltSkin.pocketRim} strokeWidth={0.3} />

        {/* ── 4 Baselines ── */}
        <line x1={cushion + 7} y1={CARROM_BOARD.baseline} x2={size - cushion - 7} y2={CARROM_BOARD.baseline} stroke={feltSkin.boardLine} strokeWidth={0.5} />
        <line x1={cushion + 7} y1={CARROM_BOARD.baseline - 1.5} x2={size - cushion - 7} y2={CARROM_BOARD.baseline - 1.5} stroke={feltSkin.boardLine} strokeWidth={0.3} />
        <circle cx={cushion + 7} cy={CARROM_BOARD.baseline - 0.75} r={1.5} fill="none" stroke="#B91C1C" strokeWidth={0.4} />
        <circle cx={cushion + 7} cy={CARROM_BOARD.baseline - 0.75} r={0.7} fill="#B91C1C" />
        <circle cx={size - cushion - 7} cy={CARROM_BOARD.baseline - 0.75} r={1.5} fill="none" stroke="#B91C1C" strokeWidth={0.4} />
        <circle cx={size - cushion - 7} cy={CARROM_BOARD.baseline - 0.75} r={0.7} fill="#B91C1C" />

        <line x1={cushion + 7} y1={size - CARROM_BOARD.baseline} x2={size - cushion - 7} y2={size - CARROM_BOARD.baseline} stroke={feltSkin.boardLine} strokeWidth={0.5} />
        <line x1={cushion + 7} y1={size - CARROM_BOARD.baseline + 1.5} x2={size - cushion - 7} y2={size - CARROM_BOARD.baseline + 1.5} stroke={feltSkin.boardLine} strokeWidth={0.3} />
        <circle cx={cushion + 7} cy={size - CARROM_BOARD.baseline + 0.75} r={1.5} fill="none" stroke="#B91C1C" strokeWidth={0.4} />
        <circle cx={cushion + 7} cy={size - CARROM_BOARD.baseline + 0.75} r={0.7} fill="#B91C1C" />
        <circle cx={size - cushion - 7} cy={size - CARROM_BOARD.baseline + 0.75} r={1.5} fill="none" stroke="#B91C1C" strokeWidth={0.4} />
        <circle cx={size - cushion - 7} cy={size - CARROM_BOARD.baseline + 0.75} r={0.7} fill="#B91C1C" />

        <line x1={CARROM_BOARD.baseline} y1={cushion + 7} x2={CARROM_BOARD.baseline} y2={size - cushion - 7} stroke={feltSkin.boardLine} strokeWidth={0.5} />
        <line x1={CARROM_BOARD.baseline - 1.5} y1={cushion + 7} x2={CARROM_BOARD.baseline - 1.5} y2={size - cushion - 7} stroke={feltSkin.boardLine} strokeWidth={0.3} />
        <line x1={size - CARROM_BOARD.baseline} y1={cushion + 7} x2={size - CARROM_BOARD.baseline} y2={size - cushion - 7} stroke={feltSkin.boardLine} strokeWidth={0.5} />
        <line x1={size - CARROM_BOARD.baseline + 1.5} y1={cushion + 7} x2={size - CARROM_BOARD.baseline + 1.5} y2={size - cushion - 7} stroke={feltSkin.boardLine} strokeWidth={0.3} />

        {/* ── Pockets ── */}
        {pockets.map((p, i) => (
          <circle key={`pocket-${i}`} cx={p.x} cy={p.y} r={CARROM_BOARD.pocketRadius} fill="url(#pocketInner)" stroke={feltSkin.pocketRim} strokeWidth={0.4} />
        ))}

        {/* ── Rendered Pieces ── */}
        {state.pieces
          .filter((p) => !p.pocketed)
          .map((p) => {
            const isStriker = p.kind === "striker";
            const isQueen = p.kind === "queen";
            const isWhite = p.kind === "white";
            const r = isStriker ? CARROM_BOARD.strikerRadius : CARROM_BOARD.coinRadius;

            return (
              <g key={p.id} filter="url(#pieceShadow)">
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={r}
                  fill={
                    isStriker
                      ? "url(#customStrikerGrad)"
                      : isQueen
                      ? "url(#queenGrad)"
                      : isWhite
                      ? "url(#whiteCoinGrad)"
                      : "url(#blackCoinGrad)"
                  }
                  stroke={
                    isStriker
                      ? strikerSkin.rim
                      : isQueen
                      ? CARROM_THEME.queenRim
                      : isWhite
                      ? CARROM_THEME.whiteCoinRim
                      : CARROM_THEME.blackCoinRim
                  }
                  strokeWidth={isStriker ? 0.45 : 0.35}
                />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={r * 0.65}
                  fill="none"
                  stroke={isStriker ? strikerSkin.core : "rgba(255,255,255,0.3)"}
                  strokeWidth={0.25}
                />
                {isQueen && <circle cx={p.x} cy={p.y} r={r * 0.25} fill="#F59E0B" opacity={0.9} />}
                {isStriker && <circle cx={p.x} cy={p.y} r={r * 0.3} fill={strikerSkin.core} opacity={0.9} />}
              </g>
            );
          })}

        {/* ── 1-Cushion Reflection Trajectory ── */}
        {trajectoryPoints && (
          <g>
            {/* Direct Ray */}
            <line
              x1={trajectoryPoints.startX}
              y1={trajectoryPoints.startY}
              x2={trajectoryPoints.hitX}
              y2={trajectoryPoints.hitY}
              stroke="#EF4444"
              strokeWidth={0.8}
              strokeDasharray="1.2 0.8"
            />

            {/* Rebound Ray */}
            {trajectoryPoints.isReflected && (
              <>
                <line
                  x1={trajectoryPoints.hitX}
                  y1={trajectoryPoints.hitY}
                  x2={trajectoryPoints.endX}
                  y2={trajectoryPoints.endY}
                  stroke="#38BDF8"
                  strokeWidth={0.7}
                  strokeDasharray="1 0.7"
                />
                {/* Rebound Starburst Dot */}
                <circle
                  cx={trajectoryPoints.hitX}
                  cy={trajectoryPoints.hitY}
                  r={1}
                  fill="#38BDF8"
                  className="animate-ping"
                />
              </>
            )}

            {/* Target Reticle */}
            <circle
              cx={trajectoryPoints.isReflected ? trajectoryPoints.endX : trajectoryPoints.hitX}
              cy={trajectoryPoints.isReflected ? trajectoryPoints.endY : trajectoryPoints.hitY}
              r={CARROM_BOARD.coinRadius}
              fill="none"
              stroke={trajectoryPoints.isReflected ? "#38BDF8" : "#EF4444"}
              strokeWidth={0.4}
              strokeDasharray="0.8 0.5"
            />
          </g>
        )}
      </svg>

      {/* Dynamic Shot Power Gauge */}
      {aim && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-stone-900/90 border border-amber-400/50 shadow-2xl backdrop-blur-md flex items-center gap-2 pointer-events-none animate-fade-in">
          <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
            ⚡ Power: {Math.round(aim.power * 100)}%
          </span>
          <div className="w-20 h-2 bg-stone-800 rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full transition-all duration-75"
              style={{
                width: `${aim.power * 100}%`,
                background:
                  aim.power < 0.4
                    ? "#22C55E"
                    : aim.power < 0.75
                    ? "#EAB308"
                    : "#EF4444",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Baseline Position & Angle Controls ─────────────────────────── */
export function CarromControls({
  myTurn,
  strikerPos,
  onPlace,
  queenPendingFor,
  selfId,
  isOver,
  winnerId,
  phase,
  nameOf,
}: {
  myTurn: boolean;
  strikerPos: number;
  onPlace: (pos: number) => void;
  queenPendingFor: string | null;
  selfId: string;
  isOver: boolean;
  winnerId: string | null;
  phase: string;
  nameOf: (id: string) => string;
}) {
  function step(delta: number) {
    HapticsManager.getInstance().subtle();
    const next = Math.max(0, Math.min(1, strikerPos + delta));
    onPlace(next);
  }

  return (
    <div className="w-full max-w-[650px] mx-auto flex flex-col gap-3">
      {/* Queen Cover Warning */}
      {queenPendingFor && (
        <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-950/80 to-amber-950/80 border border-red-500/40 text-center shadow-lg animate-pulse">
          <span className="text-xs font-black text-red-200">
            👑 QUEEN PENDING!{" "}
            {queenPendingFor === selfId
              ? "Cover the Queen by pocketing your coin on this shot!"
              : `${nameOf(queenPendingFor)} must cover the Queen!`}
          </span>
        </div>
      )}

      {/* Position Control Slider & Nudge Buttons */}
      {myTurn && (
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-stone-900/80 border border-amber-500/20 shadow-lg backdrop-blur-md">
          <span className="text-xs font-black text-amber-200 uppercase tracking-wide whitespace-nowrap">
            Striker Position:
          </span>

          <button
            type="button"
            onClick={() => step(-0.05)}
            className="w-8 h-8 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold flex items-center justify-center border border-amber-500/30 active:scale-95 transition cursor-pointer"
            title="Nudge Left"
          >
            ◀
          </button>

          <input
            type="range"
            min={0}
            max={1}
            step={0.005}
            value={strikerPos}
            onChange={(e) => {
              HapticsManager.getInstance().subtle();
              onPlace(Number(e.target.value));
            }}
            className="flex-1 accent-amber-500 h-2 bg-stone-800 rounded-lg cursor-pointer"
          />

          <button
            type="button"
            onClick={() => step(0.05)}
            className="w-8 h-8 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold flex items-center justify-center border border-amber-500/30 active:scale-95 transition cursor-pointer"
            title="Nudge Right"
          >
            ▶
          </button>
        </div>
      )}

      {/* Status Cue Line */}
      <div className="text-center text-xs font-bold text-amber-200/80 py-1">
        {isOver
          ? winnerId
            ? `🏆 ${nameOf(winnerId)} wins the match!`
            : "Match finished!"
          : phase === "resolving"
          ? "🎯 Shot in play... watching coins..."
          : myTurn
          ? "🎯 Pull back from striker & release to shoot!"
          : "⏳ Waiting for opponent's shot..."}
      </div>
    </div>
  );
}
