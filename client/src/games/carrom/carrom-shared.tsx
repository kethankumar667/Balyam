import React, { useMemo, useState } from "react";
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

/* ─────────────────────────── BHALYAM Warm Palette ─────────────────────────── */
const WARM = {
  bg: "#F7E8C4",
  bgSoft: "#FFF8ED",
  bgWarm: "#F0DFB8",
  border: "#E8D5B5",
  borderDark: "#D4BA8E",
  wood: "#6D4323",
  woodDark: "#4A2C17",
  woodDeep: "#3B2214",
  gold: "#E4B128",
  goldDark: "#D4960C",
  goldLight: "#F5D06B",
  cream: "#FFF3DB",
  green: "#2E8B57",
  greenDark: "#1D6B40",
} as const;

/* ─────────────────────────── Letter Avatar ─────────────────────────── */
/** Generates a colored avatar circle with the first letter of the player's name. */
function LetterAvatar({
  name,
  isWhite,
  size = 40,
  isSelf,
  isTurn,
}: {
  name: string;
  isWhite: boolean;
  size?: number;
  isSelf?: boolean;
  isTurn?: boolean;
}) {
  const letter = (name[0] ?? "?").toUpperCase();
  const bg = isWhite
    ? "linear-gradient(135deg, #F0EAD6, #D4C4A0)"
    : "linear-gradient(135deg, #4A3728, #2A1A10)";
  const textColor = isWhite ? WARM.woodDark : "#E8D5B5";
  const borderColor = isTurn ? WARM.gold : isWhite ? "#C4A87A" : "#6B4226";

  return (
    <div
      className="relative rounded-full flex items-center justify-center flex-shrink-0 shadow-md"
      style={{
        width: size,
        height: size,
        background: bg,
        border: `2.5px solid ${borderColor}`,
        boxShadow: isTurn ? `0 0 12px ${WARM.gold}55` : "0 2px 6px rgba(0,0,0,0.15)",
      }}
    >
      <span
        className="font-black"
        style={{
          color: textColor,
          fontSize: size * 0.42,
          lineHeight: 1,
        }}
      >
        {letter}
      </span>
      {isSelf && (
        <span
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase tracking-wider px-1.5 py-0 rounded-full"
          style={{
            background: WARM.green,
            color: "#fff",
            border: `1.5px solid ${WARM.bgSoft}`,
            lineHeight: "14px",
          }}
        >
          YOU
        </span>
      )}
    </div>
  );
}

/* ─────────────────────────── Carrom Lounge Header ─────────────────────────── */
export function CarromLoungeHeader({
  modeLabel,
  onOpenSkins,
}: {
  modeLabel: string;
  onOpenSkins?: () => void;
}) {
  return (
    <div
      className="w-full flex items-center justify-between px-4 py-2.5 rounded-t-2xl"
      style={{
        background: `linear-gradient(135deg, ${WARM.bgSoft}, ${WARM.bg})`,
        borderBottom: `2px solid ${WARM.border}`,
      }}
    >
      {/* Menu icon placeholder */}
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer active:scale-95 transition"
        style={{ background: WARM.bgWarm, border: `1.5px solid ${WARM.border}` }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect y="2" width="16" height="2" rx="1" fill={WARM.woodDark} />
          <rect y="7" width="16" height="2" rx="1" fill={WARM.woodDark} />
          <rect y="12" width="16" height="2" rx="1" fill={WARM.woodDark} />
        </svg>
      </div>

      {/* Title */}
      <div className="flex flex-col items-center">
        <h1
          className="font-display text-lg font-black uppercase tracking-wider leading-tight"
          style={{ color: WARM.woodDark }}
        >
          Carrom Lounge
        </h1>
        <span
          className="text-[9px] font-black uppercase tracking-[0.2em] px-3 py-0.5 rounded-full mt-0.5"
          style={{
            background: WARM.woodDark,
            color: WARM.cream,
            letterSpacing: "0.15em",
          }}
        >
          {modeLabel} Mode
        </span>
      </div>

      {/* Skins button */}
      <div className="flex items-center gap-1.5">
        {onOpenSkins && (
          <button
            type="button"
            onClick={onOpenSkins}
            className="w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer active:scale-95 transition"
            style={{ background: WARM.bgWarm, border: `1.5px solid ${WARM.border}` }}
            title="Custom Skins"
          >
            <span className="text-sm">🎨</span>
          </button>
        )}
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer active:scale-95 transition"
          style={{ background: WARM.bgWarm, border: `1.5px solid ${WARM.border}` }}
        >
          <span className="text-sm">🔊</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Player Cards Row ─────────────────────────── */
export function CarromPlayerCards({
  state,
  players,
  selfId,
}: {
  state: CarromPublicState;
  players: Player[];
  selfId: string;
}) {
  const nameOf = useMemo(() => {
    const map = new Map(players.map((p) => [p.id, p.name]));
    return (id: string) => map.get(id) ?? "Player";
  }, [players]);

  return (
    <div
      className="w-full flex items-stretch gap-2 px-3 py-2.5 overflow-x-auto"
      style={{
        background: WARM.bgSoft,
        borderBottom: `1.5px solid ${WARM.border}`,
      }}
    >
      {state.seats.map((s) => {
        const isTurn = s.playerId === state.turnPlayerId && state.phase !== "finished";
        const isSelf = s.playerId === selfId;
        const name = nameOf(s.playerId);
        const isWhite = s.color === "white";

        return (
          <div
            key={s.playerId}
            className="flex-1 flex flex-col items-center gap-1 p-2 rounded-xl min-w-[72px] transition-all duration-300"
            style={{
              background: isTurn
                ? `linear-gradient(135deg, ${WARM.gold}22, ${WARM.goldDark}15)`
                : WARM.cream,
              border: isTurn
                ? `2px solid ${WARM.gold}`
                : `1.5px solid ${WARM.border}`,
              boxShadow: isTurn
                ? `0 4px 14px ${WARM.gold}30`
                : "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <LetterAvatar
              name={name}
              isWhite={isWhite}
              size={36}
              isSelf={isSelf}
              isTurn={isTurn}
            />
            <span
              className="text-[11px] font-bold leading-tight text-center truncate w-full mt-0.5"
              style={{ color: WARM.woodDark }}
            >
              {name.split(" ")[0]}
            </span>
            {/* Coin indicator + remaining */}
            <div className="flex items-center gap-1">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{
                  background: isWhite
                    ? `radial-gradient(circle at 35% 35%, ${CARROM_THEME.whiteCoinStart}, ${CARROM_THEME.whiteCoinEnd})`
                    : `radial-gradient(circle at 35% 35%, ${CARROM_THEME.blackCoinStart}, ${CARROM_THEME.blackCoinEnd})`,
                  border: `1px solid ${isWhite ? CARROM_THEME.whiteCoinRim : CARROM_THEME.blackCoinRim}`,
                }}
              />
              <span className="text-[9px] font-bold uppercase" style={{ color: WARM.wood }}>
                {s.remaining} left
              </span>
            </div>
            {/* Score */}
            <div className="flex items-baseline gap-0.5">
              <span
                className="text-base font-black tabular-nums leading-none"
                style={{ color: WARM.woodDark }}
              >
                {s.score}
              </span>
              <span
                className="text-[8px] font-extrabold uppercase tracking-widest"
                style={{ color: WARM.wood + "88" }}
              >
                PTS
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────── Turn Indicator Bar ─────────────────────────── */
export function CarromTurnBar({
  state,
  nameOf,
  selfId,
}: {
  state: CarromPublicState;
  nameOf: (id: string) => string;
  selfId: string;
}) {
  const [showRules, setShowRules] = useState(false);
  const isMyTurn = state.turnPlayerId === selfId && state.phase !== "finished";
  const turnName = state.turnPlayerId ? nameOf(state.turnPlayerId) : "";
  const mySeat = state.seats.find((s) => s.playerId === selfId);
  const myColor = mySeat?.color ?? "white";

  let instruction = "Waiting for opponent…";
  if (state.phase === "finished") {
    instruction = state.winnerId
      ? `🏆 ${nameOf(state.winnerId)} wins the match!`
      : "Match finished!";
  } else if (state.phase === "resolving") {
    instruction = "🎯 Shot in play… watching coins…";
  } else if (isMyTurn) {
    if (state.queenPendingFor === selfId) {
      instruction = "👑 Cover the Queen by pocketing your coin!";
    } else {
      instruction = `Pot all your ${myColor} coins and cover the Red`;
    }
  } else if (state.turnPlayerId) {
    instruction = `Waiting for ${turnName.split(" ")[0]}'s shot…`;
  }

  return (
    <>
      <div
        className="w-full flex items-center justify-between px-4 py-2"
        style={{
          background: WARM.cream,
          borderBottom: `1.5px solid ${WARM.border}`,
        }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {state.phase !== "finished" && (
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{
                background: isMyTurn ? WARM.green : WARM.gold,
                boxShadow: isMyTurn ? `0 0 8px ${WARM.green}88` : "none",
              }}
            />
          )}
          <div className="min-w-0 flex-1">
            {state.phase !== "finished" && state.turnPlayerId && (
              <div
                className="text-xs font-black uppercase tracking-wide"
                style={{ color: WARM.woodDark }}
              >
                {isMyTurn ? "Your" : `${turnName.split(" ")[0]}'s`} Turn
              </div>
            )}
            <div
              className="text-[11px] font-semibold leading-tight truncate"
              style={{ color: WARM.wood }}
            >
              {instruction}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowRules((v) => !v)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg cursor-pointer active:scale-95 transition-all"
          style={{
            background: WARM.bgWarm,
            border: `1.5px solid ${WARM.borderDark}`,
            color: WARM.woodDark,
          }}
        >
          <span className="text-sm">📜</span>
          <span className="text-[10px] font-bold uppercase tracking-wider">Rules</span>
        </button>
      </div>

      {/* Rules popover */}
      {showRules && (
        <div
          className="w-full px-4 py-3 text-xs space-y-1.5"
          style={{
            background: WARM.cream,
            borderBottom: `1.5px solid ${WARM.border}`,
            color: WARM.woodDark,
          }}
        >
          <ul className="list-disc list-inside space-y-1 font-semibold opacity-90">
            <li>Position your striker on the baseline, then drag to aim & shoot.</li>
            <li>Pot all your assigned coins (white or black) to score points.</li>
            <li>The Queen (red) is worth 5 points — but you must "cover" it by pocketing one of your own coins on the very next shot.</li>
            <li>If you pocket the striker, your turn ends and one of your potted coins returns to the center.</li>
            <li>First to reach the target score wins!</li>
          </ul>
          <button
            type="button"
            onClick={() => setShowRules(false)}
            className="text-[10px] font-bold uppercase px-2 py-1 rounded mt-1 cursor-pointer"
            style={{ background: WARM.bgWarm, border: `1px solid ${WARM.border}`, color: WARM.wood }}
          >
            Close
          </button>
        </div>
      )}
    </>
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
      className="relative w-full aspect-square max-w-[650px] max-h-full mx-auto select-none touch-none overflow-hidden"
      style={{
        borderRadius: "16px",
        padding: "10px",
        background: `linear-gradient(135deg, #1C0E06, #381F0E, #1C0E06)`,
        border: `3px solid ${WARM.wood}`,
        boxShadow: "0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      {/* Warm Corner Brackets */}
      <div className="absolute top-1.5 left-1.5 w-5 h-5 border-t-2 border-l-2 rounded-tl-md pointer-events-none" style={{ borderColor: `${WARM.gold}80` }} />
      <div className="absolute top-1.5 right-1.5 w-5 h-5 border-t-2 border-r-2 rounded-tr-md pointer-events-none" style={{ borderColor: `${WARM.gold}80` }} />
      <div className="absolute bottom-1.5 left-1.5 w-5 h-5 border-b-2 border-l-2 rounded-bl-md pointer-events-none" style={{ borderColor: `${WARM.gold}80` }} />
      <div className="absolute bottom-1.5 right-1.5 w-5 h-5 border-b-2 border-r-2 rounded-br-md pointer-events-none" style={{ borderColor: `${WARM.gold}80` }} />

      <svg
        ref={svgRef}
        viewBox={`0 0 ${size} ${size}`}
        className="w-full h-full rounded-xl shadow-inner cursor-crosshair"
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

        {/* ── Corner Arrows (diagonal red lines matching mockup) ── */}
        {[
          { cx: cushion + 3, cy: cushion + 3, dx: 1, dy: 1 },
          { cx: size - cushion - 3, cy: cushion + 3, dx: -1, dy: 1 },
          { cx: cushion + 3, cy: size - cushion - 3, dx: 1, dy: -1 },
          { cx: size - cushion - 3, cy: size - cushion - 3, dx: -1, dy: -1 },
        ].map((a, i) => (
          <line
            key={`arrow-${i}`}
            x1={a.cx}
            y1={a.cy}
            x2={a.cx + a.dx * 12}
            y2={a.cy + a.dy * 12}
            stroke="#B91C1C"
            strokeWidth={0.5}
            opacity={0.7}
            markerEnd="none"
          />
        ))}

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
            {/* Direct Ray — white dashed line like the mockup */}
            <line
              x1={trajectoryPoints.startX}
              y1={trajectoryPoints.startY}
              x2={trajectoryPoints.hitX}
              y2={trajectoryPoints.hitY}
              stroke="#FFFFFF"
              strokeWidth={0.6}
              strokeDasharray="1.2 1"
              opacity={0.85}
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
                  strokeWidth={0.5}
                  strokeDasharray="1 0.7"
                  opacity={0.6}
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
              stroke={trajectoryPoints.isReflected ? "#38BDF8" : "#FFFFFF"}
              strokeWidth={0.4}
              strokeDasharray="0.8 0.5"
            />
          </g>
        )}
      </svg>
    </div>
  );
}

/* ─────────────────────────── Shot Controls Panel ─────────────────────────── */
export function CarromShotControls({
  myTurn,
  strikerPos,
  onPlace,
  aim,
  phase,
}: {
  myTurn: boolean;
  strikerPos: number;
  onPlace: (pos: number) => void;
  aim: AimData | null;
  phase: string;
}) {
  const power = aim?.power ?? 0;
  const powerPct = Math.round(power * 100);
  const powerColor =
    power < 0.4 ? "#22C55E" : power < 0.75 ? "#EAB308" : "#EF4444";

  function step(delta: number) {
    HapticsManager.getInstance().subtle();
    const next = Math.max(0, Math.min(1, strikerPos + delta));
    onPlace(next);
  }

  return (
    <div
      className="w-full rounded-2xl overflow-hidden"
      style={{
        background: WARM.cream,
        border: `1.5px solid ${WARM.border}`,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      {/* Shot Power Bar */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${WARM.border}` }}>
        {/* Power section */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: WARM.woodDark }}>
              Shot Power
            </span>
            {aim && (
              <span
                className="text-xs font-black tabular-nums px-2 py-0.5 rounded-full"
                style={{ background: powerColor + "22", color: powerColor, border: `1px solid ${powerColor}44` }}
              >
                {powerPct}%
              </span>
            )}
          </div>
          <div
            className="w-full h-3 rounded-full overflow-hidden"
            style={{ background: WARM.bgWarm, border: `1px solid ${WARM.border}` }}
          >
            <div
              className="h-full rounded-full transition-all duration-75"
              style={{
                width: `${aim ? powerPct : 0}%`,
                background: aim
                  ? `linear-gradient(90deg, #22C55E, #EAB308 50%, #EF4444)`
                  : WARM.border,
              }}
            />
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="text-[8px] font-bold uppercase" style={{ color: WARM.wood + "88" }}>MIN</span>
            <span className="text-[8px] font-bold uppercase" style={{ color: WARM.wood + "88" }}>MAX</span>
          </div>
        </div>

        {/* Center drag-to-aim target */}
        <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              background: `radial-gradient(circle, ${WARM.cream} 30%, ${WARM.bgWarm} 60%, ${WARM.border} 100%)`,
              border: `2.5px solid ${aim ? powerColor : WARM.borderDark}`,
              boxShadow: aim ? `0 0 12px ${powerColor}44` : "0 2px 6px rgba(0,0,0,0.1)",
            }}
          >
            {/* Concentric target rings */}
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ border: `1.5px solid ${aim ? powerColor + "66" : WARM.border}` }}
            >
              <div
                className="w-4 h-4 rounded-full"
                style={{
                  background: aim ? powerColor : WARM.borderDark,
                  opacity: aim ? 0.8 : 0.4,
                }}
              />
            </div>
          </div>
          <span className="text-[8px] font-black uppercase text-center leading-tight" style={{ color: WARM.woodDark }}>
            {aim ? "RELEASE\nTO SHOOT" : "DRAG\nTO AIM"}
          </span>
        </div>

        {/* Right instruction */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0 w-20">
          <span className="text-2xl">👆</span>
          <span className="text-[9px] font-semibold text-center leading-tight" style={{ color: WARM.wood }}>
            Slide to aim{"\n"}Release to shoot
          </span>
        </div>
      </div>

      {/* Striker Position Slider — only when it's your turn */}
      {myTurn && phase === "aiming" && (
        <div className="flex items-center gap-2.5 px-4 py-2.5">
          <span className="text-[9px] font-black uppercase tracking-wider whitespace-nowrap" style={{ color: WARM.wood }}>
            Position:
          </span>
          <button
            type="button"
            onClick={() => step(-0.05)}
            className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer active:scale-95 transition text-xs font-bold"
            style={{ background: WARM.bgWarm, border: `1.5px solid ${WARM.border}`, color: WARM.woodDark }}
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
            className="flex-1 h-2 rounded-lg cursor-pointer"
            style={{ accentColor: WARM.gold }}
          />
          <button
            type="button"
            onClick={() => step(0.05)}
            className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer active:scale-95 transition text-xs font-bold"
            style={{ background: WARM.bgWarm, border: `1.5px solid ${WARM.border}`, color: WARM.woodDark }}
          >
            ▶
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Activity Log ─────────────────────────── */
export function CarromActivityLog({
  lastShot,
  lastCombo,
}: {
  lastShot: string | null;
  lastCombo?: string | null;
}) {
  if (!lastShot) return null;

  const now = new Date();
  const time = `${now.getHours() % 12 || 12}:${String(now.getMinutes()).padStart(2, "0")} ${now.getHours() >= 12 ? "PM" : "AM"}`;

  return (
    <div
      className="w-full flex items-center gap-2 px-4 py-2"
      style={{
        background: WARM.cream,
        border: `1px solid ${WARM.border}`,
        borderRadius: "12px",
      }}
    >
      <span className="text-sm flex-shrink-0">↩️</span>
      <span
        className="text-[11px] font-semibold flex-1 truncate"
        style={{ color: WARM.woodDark }}
      >
        {lastShot}
        {lastCombo && (
          <span style={{ color: WARM.gold }}> {lastCombo}</span>
        )}
      </span>
      <span
        className="text-[10px] font-bold tabular-nums flex-shrink-0"
        style={{ color: WARM.wood + "88" }}
      >
        {time}
      </span>
    </div>
  );
}

/* ─────────────────────────── Bottom Action Bar ─────────────────────────── */
export function CarromBottomBar({
  onToggleChat,
  chatBadge,
}: {
  onToggleChat?: () => void;
  chatBadge?: number;
}) {
  const items = [
    { icon: "💬", label: "Chat", badge: chatBadge, action: onToggleChat },
    { icon: "😊", label: "Emoji", action: undefined },
    { icon: "🎙️", label: "Voice", action: undefined },
    { icon: "⚡", label: "Quick Chat", action: undefined },
    { icon: "•••", label: "More", action: undefined },
  ];

  return (
    <div
      className="w-full flex items-center justify-around py-2 rounded-b-2xl"
      style={{
        background: WARM.woodDark,
        borderTop: `2px solid ${WARM.wood}`,
      }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={item.action}
          className="relative flex flex-col items-center gap-0.5 px-2 py-1 cursor-pointer active:scale-95 transition"
        >
          {item.badge != null && item.badge > 0 && (
            <span
              className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[9px] font-black text-white"
              style={{ background: "#EF4444" }}
            >
              {item.badge}
            </span>
          )}
          <span className="text-lg leading-none">{item.icon}</span>
          <span className="text-[9px] font-bold" style={{ color: WARM.cream + "CC" }}>
            {item.label}
          </span>
        </button>
      ))}
    </div>
  );
}
