import React, { useEffect, useMemo, useRef, useState } from "react";
import type { CarromPublicState, CarromSeat, Player, StrikerSkin, BoardFeltSkin } from "@shared/types";
import { CARROM_BOARD } from "@shared/types";
import { HapticsManager } from "../../services/HapticsManager";
import { findAvatar } from "../../lib/avatars";
import SeatTargetReactionWheel from "../../components/reactions/SeatTargetReactionWheel";
import {
  appendEntry,
  formatFeedClock,
  shouldRecordShot,
  type CarromFeedEntry,
} from "./carromFeed";

export type { CarromFeedEntry };

/* ─────────────────────────── Skin Definitions ─────────────────────────── */
export interface SkinConfig {
  name: string;
  boardBgStart: string;
  boardBgEnd: string;
  boardLine: string;
  pocketRim: string;
  /** Outer wooden frame — the band the playing surface is set into. */
  frameStart: string;
  frameEnd: string;
  /** Lighter corner blocks on the frame. */
  frameCorner: string;
  /** Lacquered band between the frame and the playing surface. */
  bandStart: string;
  bandEnd: string;
  /** Grain streaks brushed over the playing surface. */
  grain: string;
}

export const BOARD_SKINS: Record<BoardFeltSkin, SkinConfig> = {
  birch: {
    name: "Classic Birch",
    boardBgStart: "#F0D6A6",
    boardBgEnd: "#D9B77E",
    // Real boards rule their markings in black, not brown. The old brown
    // lines were a large part of why the board read as an illustration.
    boardLine: "#1F1408",
    pocketRim: "#3A3A3A",
    frameStart: "#F3AC53",
    frameEnd: "#BE6F1E",
    frameCorner: "#F8CE52",
    bandStart: "#9A1F1F",
    bandEnd: "#5A0C0C",
    grain: "#9C7440",
  },
  velvet: {
    name: "Royal Velvet Blue",
    boardBgStart: "#1E293B",
    boardBgEnd: "#0F172A",
    boardLine: "#CBD5E1",
    pocketRim: "#38BDF8",
    frameStart: "#3B5A8C",
    frameEnd: "#1B2C4E",
    frameCorner: "#7BA7E0",
    bandStart: "#132444",
    bandEnd: "#060D1C",
    grain: "#2C4468",
  },
  emerald: {
    name: "Emerald Green",
    boardBgStart: "#0A6B4F",
    boardBgEnd: "#04452D",
    boardLine: "#D1FAE5",
    pocketRim: "#F59E0B",
    frameStart: "#3E8C64",
    frameEnd: "#12432C",
    frameCorner: "#8FE3B8",
    bandStart: "#0B3A26",
    bandEnd: "#04200F",
    grain: "#0C5138",
  },
  ebony: {
    name: "Midnight Ebony",
    boardBgStart: "#25252A",
    boardBgEnd: "#101014",
    boardLine: "#E7C86B",
    pocketRim: "#EAB308",
    frameStart: "#4C4C4C",
    frameEnd: "#1A1A1A",
    frameCorner: "#D4AF37",
    bandStart: "#2A2A2A",
    bandEnd: "#0A0A0A",
    grain: "#33333A",
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
    start: "#2563EB",
    end: "#1D4ED8",
    rim: "#1E40AF",
    core: "#60A5FA",
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

/* ─────────────────────────── Board viewport ───────────────────────────
 * The engine's coordinate space is 0..100 with the playfield inset by
 * `cushion` (6), so coins rebound inside 6..94. A real board's frame sits
 * OUTSIDE that surface, so the SVG viewBox is widened past the engine space
 * rather than stealing width from the playfield. Physics is untouched: a coin
 * at (50,50) is still dead centre.
 */
export const BOARD_VIEW = {
  /** Outer edge of the wooden frame, in engine units. */
  min: -8.5,
  /** Total width/height of the viewBox. */
  span: 117,
} as const;

/** Maps a pointer event to engine board coordinates. Must track BOARD_VIEW —
 *  the SVG is square and uses the default `xMidYMid meet`, so the viewBox maps
 *  linearly onto the element's box. When `isFlipped` is true (Seat 1), coordinates
 *  are rotated 180 degrees into world space. */
export function pointerToBoard(
  rect: { left: number; top: number; width: number; height: number },
  clientX: number,
  clientY: number,
  isFlipped = false
): { x: number; y: number } {
  let x = BOARD_VIEW.min + ((clientX - rect.left) / rect.width) * BOARD_VIEW.span;
  let y = BOARD_VIEW.min + ((clientY - rect.top) / rect.height) * BOARD_VIEW.span;
  if (isFlipped) {
    x = CARROM_BOARD.size - x;
    y = CARROM_BOARD.size - y;
  }
  return { x, y };
}

/** Converts server 0..1 striker position to UI slider position (left-to-right on screen). */
export function toUiSliderPos(serverPos: number, isFlipped = false): number {
  const clamped = Math.max(0, Math.min(1, serverPos));
  return isFlipped ? 1 - clamped : clamped;
}

/** Converts UI slider position (left-to-right on screen) back to server 0..1 striker position. */
export function toServerSliderPos(uiPos: number, isFlipped = false): number {
  const clamped = Math.max(0, Math.min(1, uiPos));
  return isFlipped ? 1 - clamped : clamped;
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

/* ─────────────────────────── Rules (single source) ─────────────────────────── */
/** The rules existed TWICE with different wording — an always-open panel on
 *  desktop and a different five-bullet popover behind the turn bar's "Rules"
 *  button. Two lists meant two things to keep true; they had already drifted
 *  (only one of them mentioned the Queen's 5 points, only the other mentioned
 *  the striker-foul rule). One list now, rendered in both places. */
export const CARROM_RULES: readonly string[] = [
  "Slide the position slider to place your striker on the baseline.",
  "Drag backward from the striker to set aim angle & power, then release.",
  "The dashed line previews the trajectory — including bank shots.",
  "Pot every coin of your colour, then cover the Queen, to win.",
  "The Queen (red) is worth 5 points, but you must cover it by potting one of your own coins on the very next shot.",
  "Pot the striker and your turn ends — one of your potted coins returns to the centre.",
];

export function CarromRulesList({ className = "" }: { className?: string }) {
  return (
    <ul
      className={`text-[11px] font-semibold space-y-1.5 list-disc list-outside pl-4 ${className}`}
      style={{ color: WARM.wood }}
    >
      {CARROM_RULES.map((rule) => (
        <li key={rule}>{rule}</li>
      ))}
    </ul>
  );
}

/* ─────────────────────────── Letter Avatar ─────────────────────────── */
/** Generates a colored avatar circle with the first letter of the player's name. */
function LetterAvatar({
  name,
  avatar,
  isWhite,
  size = 40,
  isSelf,
  isTurn,
}: {
  name: string;
  avatar?: string;
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
  const option = findAvatar(avatar);
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => setImgFailed(false), [option?.src]);
  const showImage = !!option && !imgFailed;

  return (
    <div
      className="relative rounded-full flex items-center justify-center flex-shrink-0 shadow-md overflow-hidden"
      style={{
        width: size,
        height: size,
        background: showImage ? undefined : bg,
        border: `2.5px solid ${borderColor}`,
        boxShadow: isTurn ? `0 0 12px ${WARM.gold}55` : "0 2px 6px rgba(0,0,0,0.15)",
      }}
    >
      {showImage ? (
        <img
          src={option!.src}
          alt=""
          aria-hidden
          className="w-full h-full object-cover scale-[1.25] origin-center"
          style={{ objectPosition: "50% 22%" }}
          onError={() => setImgFailed(true)}
          draggable={false}
        />
      ) : (
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
      )}
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
/** Square icon button used across the lounge chrome. Every control in this
 *  header is a real <button> with a handler and an accessible name — the
 *  previous version shipped two <div>s styled to look tappable (a hamburger
 *  with no menu and a speaker with no sound system behind it), which is worse
 *  than no control at all. */
function IconButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className="w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer active:scale-95 transition focus-visible:outline-none focus-visible:ring-2"
      style={{
        background: active ? WARM.gold + "33" : WARM.bgWarm,
        border: `1.5px solid ${active ? WARM.gold : WARM.border}`,
        color: WARM.woodDark,
      }}
    >
      {children}
    </button>
  );
}

export function CarromLoungeHeader({
  modeLabel,
  onOpenSkins,
  onLeave,
  onToggleRules,
  rulesOpen,
}: {
  modeLabel: string;
  onOpenSkins?: () => void;
  /** Carrom owns its own Leave now. The room shell used to float a separate
   *  Leave button into the top-right corner, where it collided with this
   *  header and sat flush against the viewport edge. */
  onLeave?: () => void;
  /** Mobile only — desktop keeps the rules panel permanently open in the
   *  right column, so it passes neither of these. */
  onToggleRules?: () => void;
  rulesOpen?: boolean;
}) {
  return (
    <div
      className="w-full flex items-center justify-between gap-2 px-3 py-2.5"
      style={{
        background: `linear-gradient(135deg, ${WARM.bgSoft}, ${WARM.bg})`,
        borderBottom: `2px solid ${WARM.border}`,
      }}
    >
      {/* Leave */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        {onLeave && (
          <button
            type="button"
            onClick={onLeave}
            aria-label="Leave the match"
            className="flex items-center gap-1.5 h-9 px-2.5 rounded-lg cursor-pointer active:scale-95 transition focus-visible:outline-none focus-visible:ring-2"
            style={{ background: WARM.bgWarm, border: `1.5px solid ${WARM.border}`, color: WARM.woodDark }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M15 5l-7 7 7 7"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">Leave</span>
          </button>
        )}
      </div>

      {/* Title */}
      <div className="flex flex-col items-center flex-shrink-0">
        <h1
          className="font-display text-lg font-black uppercase tracking-wider leading-tight"
          style={{ color: WARM.woodDark }}
        >
          Carrom Lounge
        </h1>
        <span
          className="text-[9px] font-black uppercase px-3 py-0.5 rounded-full mt-0.5"
          style={{
            background: WARM.woodDark,
            color: WARM.cream,
            letterSpacing: "0.15em",
          }}
        >
          {modeLabel} Mode
        </span>
      </div>

      {/* Rules + Skins */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
        {onToggleRules && (
          <IconButton label="How to play" onClick={onToggleRules} active={rulesOpen}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 17.5v.01M12 14c0-2 2.5-2.2 2.5-4.3A2.5 2.5 0 009.6 9"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
              />
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.1" />
            </svg>
          </IconButton>
        )}
        {onOpenSkins && (
          <IconButton label="Striker & board skins" onClick={onOpenSkins}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 3a9 9 0 100 18c.9 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.4-1-.3-.3-.4-.6-.4-1 0-.8.6-1.5 1.5-1.5H16a5 5 0 005-5c0-4.4-4-8-9-8z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <circle cx="7.5" cy="11.5" r="1.3" fill="currentColor" />
              <circle cx="11.5" cy="7.5" r="1.3" fill="currentColor" />
              <circle cx="16" cy="10" r="1.3" fill="currentColor" />
            </svg>
          </IconButton>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── Player Cards Row ─────────────────────────── */
export function CarromPlayerCards({
  state,
  players,
  selfId,
  /** "row" is the mobile strip under the header. "column" is the desktop
   *  sidebar list, which previously existed as a second hand-written copy of
   *  this markup inside CarromBoardDesktop — same avatar, YOU badge, coin dot
   *  and score, built twice and already drifting (the copy used a 40px avatar
   *  and no turn glow). */
  orientation = "row",
  /** From useSeatReactions() — registers each seat's card as the anchor a
   *  targeted reaction flies to/from and shakes on landing. Optional so this
   *  component still renders fine anywhere reactions aren't wired up. */
  registerCardRef,
  onTarget,
  activeTargetId,
  onCloseTarget,
}: {
  state: CarromPublicState;
  players: Player[];
  selfId: string;
  orientation?: "row" | "column";
  registerCardRef?: (playerId: string | null) => (el: HTMLElement | null) => void;
  onTarget?: (playerId: string) => void;
  activeTargetId?: string | null;
  onCloseTarget?: () => void;
}) {
  const nameOf = useMemo(() => {
    const map = new Map(players.map((p) => [p.id, p.name]));
    return (id: string) => map.get(id) ?? "Player";
  }, [players]);
  const avatarOf = useMemo(() => {
    const map = new Map(players.map((p) => [p.id, p.avatar]));
    return (id: string) => map.get(id);
  }, [players]);

  if (orientation === "column") {
    return (
      <div
        className="rounded-2xl overflow-hidden flex-shrink-0"
        style={{
          background: WARM.bgSoft,
          border: `1.5px solid ${WARM.border}`,
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        }}
      >
        <div className="px-3 py-2" style={{ borderBottom: `1px solid ${WARM.border}` }}>
          <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: WARM.woodDark }}>
            Players
          </span>
        </div>
        {state.seats.map((s) => {
          const isTurn = s.playerId === state.turnPlayerId && state.phase !== "finished";
          const isSelf = s.playerId === selfId;
          const name = nameOf(s.playerId);
          const isWhite = s.color === "white";
          const isTargetActive = activeTargetId === s.playerId;

          return (
            <div
              key={s.playerId}
              ref={registerCardRef?.(s.playerId)}
              className={`relative flex items-center gap-3 px-3 py-2.5 transition-all duration-200 ${!isSelf ? "cursor-pointer hover:bg-amber-100/40 active:scale-[0.99]" : ""}`}
              onClick={!isSelf ? () => onTarget?.(s.playerId) : undefined}
              title={!isSelf ? `Tap to react at ${name}` : undefined}
              style={{
                background: isTurn ? `${WARM.gold}22` : "transparent",
                borderBottom: `1px solid ${WARM.border}`,
              }}
            >
              {isTargetActive && onCloseTarget && (
                <SeatTargetReactionWheel
                  game="carrom"
                  targetPlayerId={s.playerId}
                  targetPlayerName={name}
                  onClose={onCloseTarget}
                  position="top"
                />
              )}
              <LetterAvatar name={name} avatar={avatarOf(s.playerId)} isWhite={isWhite} size={38} isSelf={isSelf} isTurn={isTurn} />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold truncate block" style={{ color: WARM.woodDark }}>
                  {name}
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{
                      background: isWhite
                        ? `radial-gradient(circle at 35% 35%, ${CARROM_THEME.whiteCoinStart}, ${CARROM_THEME.whiteCoinEnd})`
                        : `radial-gradient(circle at 35% 35%, ${CARROM_THEME.blackCoinStart}, ${CARROM_THEME.blackCoinEnd})`,
                      border: `1px solid ${isWhite ? CARROM_THEME.whiteCoinRim : CARROM_THEME.blackCoinRim}`,
                    }}
                  />
                  <span className="text-[9px] font-bold uppercase" style={{ color: WARM.wood + "AA" }}>
                    {s.remaining} left
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end flex-shrink-0">
                <span className="text-lg font-black tabular-nums leading-none" style={{ color: WARM.woodDark }}>
                  {s.score}
                </span>
                <span
                  className="text-[7px] font-extrabold uppercase tracking-widest"
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
        const isTargetActive = activeTargetId === s.playerId;

        return (
          <div
            key={s.playerId}
            ref={registerCardRef?.(s.playerId)}
            className={`relative flex-1 flex flex-col items-center gap-1 p-2 rounded-xl min-w-[72px] transition-all duration-300 ${!isSelf ? "cursor-pointer hover:brightness-105 active:scale-[0.98]" : ""}`}
            onClick={!isSelf ? () => onTarget?.(s.playerId) : undefined}
            title={!isSelf ? `Tap to react at ${name}` : undefined}
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
            {isTargetActive && onCloseTarget && (
              <SeatTargetReactionWheel
                game="carrom"
                targetPlayerId={s.playerId}
                targetPlayerName={name}
                onClose={onCloseTarget}
                position="top"
              />
            )}
            <LetterAvatar
              name={name}
              avatar={avatarOf(s.playerId)}
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
    /* The "Rules" button that used to sit here has moved to the header. In the
     * 288px desktop sidebar it stole enough width to truncate the objective
     * itself — the screen read "Pot all your white coins and…" — while the
     * full rules were already permanently open in the right-hand column. The
     * instruction is the one line that must always be readable, so it now
     * wraps instead of competing for space. */
    <div
      className="w-full flex items-start gap-2 px-4 py-2"
      style={{
        background: WARM.cream,
        borderBottom: `1.5px solid ${WARM.border}`,
      }}
      aria-live="polite"
    >
      {state.phase !== "finished" && (
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1"
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
          className="text-[11px] font-semibold leading-snug"
          style={{ color: WARM.wood }}
        >
          {instruction}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── SVG High-Definition Carrom Board ─────────────────────────── */

/** Arrowhead triangle as an SVG `points` string. `dir` must be a unit vector
 *  pointing the way the arrow travels. */
function arrowHead(
  tipX: number,
  tipY: number,
  dirX: number,
  dirY: number,
  len: number,
  half: number
): string {
  const bx = tipX - dirX * len;
  const by = tipY - dirY * len;
  const px = -dirY;
  const py = dirX;
  return `${tipX},${tipY} ${bx + px * half},${by + py * half} ${bx - px * half},${by - py * half}`;
}

/** Arc between two angles (degrees, y-down screen convention). */
function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const rad = (d: number) => (d * Math.PI) / 180;
  const x0 = cx + r * Math.cos(rad(a0));
  const y0 = cy + r * Math.sin(rad(a0));
  const x1 = cx + r * Math.cos(rad(a1));
  const y1 = cy + r * Math.sin(rad(a1));
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  const sweep = a1 > a0 ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} ${sweep} ${x1} ${y1}`;
}

export function CarromSvgBoard({
  state,
  selfId,
  myTurn,
  aim,
  svgRef,
  isFlipped = false,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  state: CarromPublicState;
  selfId: string;
  myTurn: boolean;
  aim: AimData | null;
  svgRef: React.RefObject<SVGSVGElement>;
  isFlipped?: boolean;
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

  /* Board geometry, all in engine units. The playing surface is exactly the
   * rebound area (cushion..size-cushion); the frame is drawn OUTSIDE it. */
  const play = cushion;                 // 6  — surface edge / rebound wall
  const playW = size - cushion * 2;     // 88 — surface width
  const frameOut = BOARD_VIEW.min;      // -8.5 — outer edge of the wood frame
  const bandIn = 3.0;                   // lacquered band starts here
  const L = CARROM_BOARD.baseline;      // 18 — centre of the base-line channel
  const R = size - L;                   // 82
  /* The engine parks the striker centre exactly on `baseline`, so the two base
   * lines straddle it one striker-radius out. That is how a real board is
   * ruled — the striker must be placed touching both lines — and it means the
   * channel width is correct by construction rather than by eye. */
  const sr = CARROM_BOARD.strikerRadius; // 2.6
  const lineOut = L - sr;                // 15.4
  const lineIn = L + sr;                 // 20.6

  return (
    <div
      id="game-board-container"
      className="relative w-full aspect-square max-w-[650px] max-h-full mx-auto select-none touch-none"
      style={{ filter: "drop-shadow(0 14px 34px rgba(0,0,0,0.45))" }}
    >
      <svg
        ref={svgRef}
        viewBox={`${BOARD_VIEW.min} ${BOARD_VIEW.min} ${BOARD_VIEW.span} ${BOARD_VIEW.span}`}
        className="w-full h-full cursor-crosshair"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <defs>
          <linearGradient id="frameGrad" x1="0%" y1="0%" x2="30%" y2="100%">
            <stop offset="0%" stopColor={feltSkin.frameStart} />
            <stop offset="48%" stopColor={feltSkin.frameStart} />
            <stop offset="100%" stopColor={feltSkin.frameEnd} />
          </linearGradient>

          <linearGradient id="bandGrad" x1="0%" y1="0%" x2="60%" y2="100%">
            <stop offset="0%" stopColor={feltSkin.bandStart} />
            <stop offset="100%" stopColor={feltSkin.bandEnd} />
          </linearGradient>

          <linearGradient id="surfaceGrad" x1="0%" y1="0%" x2="20%" y2="100%">
            <stop offset="0%" stopColor={feltSkin.boardBgStart} />
            <stop offset="100%" stopColor={feltSkin.boardBgEnd} />
          </linearGradient>

          {/* Wood grain. feTurbulence stretched wide and squeezed tall gives
              the long horizontal streaks of a planed board. Static geometry,
              so the browser filters it once rather than every frame. */}
          <filter id="grainNoise" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.035 0.3" numOctaves={5} seed={7} />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0.7 0 0 0 -0.30"
            />
          </filter>
          {/* One mask spanning the whole board, not just the playing surface.
              feTurbulence is evaluated in user space, so every element masked
              with it samples the same continuous grain — the pocket aprons
              line up with the bed instead of showing as bare pale discs. A
              surface-sized mask clipped them to a quadrant. */}
          <mask id="grainMask">
            <rect
              x={frameOut}
              y={frameOut}
              width={BOARD_VIEW.span}
              height={BOARD_VIEW.span}
              filter="url(#grainNoise)"
            />
          </mask>

          <radialGradient id="surfaceVignette" cx="50%" cy="44%" r="74%">
            <stop offset="52%" stopColor="#000000" stopOpacity={0} />
            <stop offset="100%" stopColor="#000000" stopOpacity={0.22} />
          </radialGradient>

          <linearGradient id="boardGloss" x1="0%" y1="0%" x2="55%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.20} />
            <stop offset="42%" stopColor="#FFFFFF" stopOpacity={0.04} />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
          </linearGradient>

          <radialGradient id="pocketInner" cx="50%" cy="42%" r="62%">
            <stop offset="0%" stopColor="#000000" />
            <stop offset="62%" stopColor="#0B0B0B" />
            <stop offset="100%" stopColor="#2A2A2A" />
          </radialGradient>

          <linearGradient id="boltGrad" x1="0%" y1="0%" x2="60%" y2="100%">
            <stop offset="0%" stopColor="#6E6E6E" />
            <stop offset="100%" stopColor="#2B2B2B" />
          </linearGradient>

          <radialGradient id="whiteCoinGrad" cx="35%" cy="32%" r="68%">
            <stop offset="0%" stopColor={CARROM_THEME.whiteCoinStart} />
            <stop offset="70%" stopColor="#ECE0C8" />
            <stop offset="100%" stopColor={CARROM_THEME.whiteCoinEnd} />
          </radialGradient>

          <radialGradient id="blackCoinGrad" cx="35%" cy="32%" r="68%">
            <stop offset="0%" stopColor="#4A403A" />
            <stop offset="60%" stopColor={CARROM_THEME.blackCoinStart} />
            <stop offset="100%" stopColor={CARROM_THEME.blackCoinEnd} />
          </radialGradient>

          <radialGradient id="queenGrad" cx="35%" cy="32%" r="68%">
            <stop offset="0%" stopColor="#FF77DD" />
            <stop offset="50%" stopColor="#E0115F" />
            <stop offset="100%" stopColor="#770033" />
          </radialGradient>

          <radialGradient id="customStrikerGrad" cx="35%" cy="32%" r="68%">
            <stop offset="0%" stopColor={strikerSkin.start} />
            <stop offset="100%" stopColor={strikerSkin.end} />
          </radialGradient>

          <filter id="pieceShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0.3" dy="0.55" stdDeviation="0.35" floodColor="#000" floodOpacity="0.45" />
          </filter>
        </defs>

        <g transform={isFlipped ? `rotate(180 ${center} ${center})` : undefined}>
          {/* ── Wooden frame ── */}
          <rect
            x={frameOut}
            y={frameOut}
            width={BOARD_VIEW.span}
            height={BOARD_VIEW.span}
            rx={4}
            fill="url(#frameGrad)"
          />
          {/* Grain on the frame too — a flat orange band was the last thing
              still reading as vector art rather than timber. */}
          <rect
            x={frameOut}
            y={frameOut}
            width={BOARD_VIEW.span}
            height={BOARD_VIEW.span}
            rx={4}
            fill="#3A1F06"
            mask="url(#grainMask)"
            opacity={0.16}
          />
          <rect
            x={frameOut}
            y={frameOut}
            width={BOARD_VIEW.span}
            height={BOARD_VIEW.span}
            rx={4}
            fill="none"
            stroke="#00000055"
            strokeWidth={0.8}
          />

          {/* ── Lacquered band ── */}
          <rect
            x={bandIn}
            y={bandIn}
            width={size - bandIn * 2}
            height={size - bandIn * 2}
            rx={1.6}
            fill="url(#bandGrad)"
          />

          {/* ── Corner blocks + Lightning Bolt Icon ── */}
          {[0, 90, 180, 270].map((deg) => {
            const b = 12;
            const rr = 3;
            const x0 = frameOut;
            return (
              <g key={`corner-${deg}`} transform={`rotate(${deg} ${center} ${center})`}>
                <path
                  d={`M ${x0 + rr} ${x0} L ${x0 + b} ${x0} L ${x0 + b} ${x0 + b} L ${x0} ${x0 + b} L ${x0} ${x0 + rr} A ${rr} ${rr} 0 0 1 ${x0 + rr} ${x0} Z`}
                  fill={feltSkin.frameCorner}
                />
                <polygon
                  points={`${x0 + 4.5},${x0 + 2.2} ${x0 + 8.5},${x0 + 2.2} ${x0 + 5.8},${x0 + 6.0} ${x0 + 9.5},${x0 + 6.0} ${x0 + 3.8},${x0 + 10.5} ${x0 + 5.4},${x0 + 6.8} ${x0 + 2.8},${x0 + 6.8}`}
                  fill="#DC2626"
                  stroke="#991B1B"
                  strokeWidth={0.25}
                />
              </g>
            );
          })}

          {/* ── Playing surface ── */}
          <rect x={play} y={play} width={playW} height={playW} fill="url(#surfaceGrad)" />
          <rect
            x={play}
            y={play}
            width={playW}
            height={playW}
            fill={feltSkin.grain}
            mask="url(#grainMask)"
            opacity={0.38}
          />
          <rect x={play} y={play} width={playW} height={playW} fill="url(#surfaceVignette)" />
          {/* Crisp edge where the surface meets the lacquered band */}
          <rect
            x={play}
            y={play}
            width={playW}
            height={playW}
            fill="none"
            stroke="#00000070"
            strokeWidth={0.6}
          />

          {/* ── Markings on all 4 corners ── */}
          {[0, 90, 180, 270].map((deg) => (
            <g key={`mark-line-${deg}`} transform={`rotate(${deg} ${center} ${center})`}>
              {/* Base-line pair */}
              <line x1={lineOut} y1={lineOut} x2={R + sr} y2={lineOut} stroke={feltSkin.boardLine} strokeWidth={0.9} />
              <line x1={lineOut} y1={lineIn} x2={R + sr} y2={lineIn} stroke={feltSkin.boardLine} strokeWidth={0.9} />

              {/* Red base circles, one at each end of the channel */}
              {[L + 4.8, R - 4.8].map((bx) => (
                <g key={`base-${bx}`}>
                  <circle cx={bx} cy={L} r={2.55} fill="#C42B1C" />
                  <circle cx={bx} cy={L} r={2.55} fill="none" stroke={feltSkin.boardLine} strokeWidth={0.6} />
                </g>
              ))}

              {/* Corner spot, centred in the crossing square */}
              <circle cx={L} cy={L} r={1.3} fill={feltSkin.boardLine} />

              {/* Diagonal aim line, pointing out to the pocket */}
              <line x1={lineOut} y1={lineOut} x2={12.4} y2={12.4} stroke={feltSkin.boardLine} strokeWidth={0.7} />
              <polygon points={arrowHead(10.9, 10.9, -0.7071, -0.7071, 2.2, 1.15)} fill={feltSkin.boardLine} />
            </g>
          ))}

          {/* ── Corner Sweep Arcs (Mirrored Top vs Bottom for exact Design Board Parity) ── */}
          {[
            { cx: L, cy: L, a0: 75, a1: 20, tipAngle: 20, dirX: Math.sin((20 * Math.PI) / 180), dirY: -Math.cos((20 * Math.PI) / 180) },
            { cx: R, cy: L, a0: 105, a1: 160, tipAngle: 160, dirX: -Math.sin((160 * Math.PI) / 180), dirY: Math.cos((160 * Math.PI) / 180) },
            { cx: R, cy: R, a0: 255, a1: 200, tipAngle: 200, dirX: Math.sin((200 * Math.PI) / 180), dirY: -Math.cos((200 * Math.PI) / 180) },
            { cx: L, cy: R, a0: 285, a1: 340, tipAngle: 340, dirX: -Math.sin((340 * Math.PI) / 180), dirY: Math.cos((340 * Math.PI) / 180) },
          ].map((arc, idx) => (
            <g key={`corner-arc-${idx}`}>
              <path
                d={arcPath(arc.cx, arc.cy, 9.6, arc.a0, arc.a1)}
                fill="none"
                stroke={feltSkin.boardLine}
                strokeWidth={0.75}
                strokeLinecap="round"
              />
              <polygon
                points={arrowHead(
                  arc.cx + 9.6 * Math.cos((arc.tipAngle * Math.PI) / 180),
                  arc.cy + 9.6 * Math.sin((arc.tipAngle * Math.PI) / 180),
                  arc.dirX,
                  arc.dirY,
                  2.1,
                  1.1
                )}
                fill={feltSkin.boardLine}
              />
            </g>
          ))}

          {/* ── Centre circle: smooth outer ring, smooth red inner rings ── */}
          <circle cx={center} cy={center} r={11.6} fill="none" stroke={feltSkin.boardLine} strokeWidth={0.7} />
          <circle cx={center} cy={center} r={9.45} fill="none" stroke="#C42B1C" strokeWidth={1.8} />
          <circle cx={center} cy={center} r={7.5} fill="none" stroke="#C42B1C" strokeWidth={0.7} />
          <circle cx={center} cy={center} r={1.9} fill="#C42B1C" />

          {/* ── Pockets ── */}
          {pockets.map((p, i) => (
            <g key={`pocket-${i}`}>
              {/* Bed wrapped around the hole. Without this the lacquer band ran
                  straight behind the pocket and it read as a black blob resting
                  on the frame rather than a hole cut into the playing surface. */}
              <circle cx={p.x} cy={p.y} r={CARROM_BOARD.pocketRadius + 1.3} fill="url(#surfaceGrad)" />
              <circle
                cx={p.x}
                cy={p.y}
                r={CARROM_BOARD.pocketRadius + 1.3}
                fill={feltSkin.grain}
                mask="url(#grainMask)"
                opacity={0.38}
              />
              <circle
                cx={p.x}
                cy={p.y}
                r={CARROM_BOARD.pocketRadius + 1.3}
                fill="none"
                stroke="#00000040"
                strokeWidth={0.4}
              />
              <circle cx={p.x} cy={p.y} r={CARROM_BOARD.pocketRadius + 0.6} fill={feltSkin.pocketRim} opacity={0.9} />
              <circle cx={p.x} cy={p.y} r={CARROM_BOARD.pocketRadius} fill="url(#pocketInner)" />
              <circle
                cx={p.x}
                cy={p.y}
                r={CARROM_BOARD.pocketRadius}
                fill="none"
                stroke="#000000"
                strokeWidth={0.5}
                opacity={0.7}
              />
            </g>
          ))}

          {/* ── Rendered Pieces ── */}
          {state.pieces
            .filter((p) => !p.pocketed)
            .map((p) => {
              const isStriker = p.kind === "striker";
              const isQueen = p.kind === "queen";
              const isWhite = p.kind === "white";
              const r = isStriker ? CARROM_BOARD.strikerRadius : CARROM_BOARD.coinRadius;
              const ringColor = isStriker
                ? strikerSkin.core
                : isWhite
                ? "#00000030"
                : "#FFFFFF2E";

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
                  {/* Turned concentric grooves — the detail that reads as a
                      machined disc rather than a flat dot. */}
                  <circle cx={p.x} cy={p.y} r={r * 0.72} fill="none" stroke={ringColor} strokeWidth={0.3} />
                  <circle cx={p.x} cy={p.y} r={r * 0.48} fill="none" stroke={ringColor} strokeWidth={0.25} />
                  {/* Specular highlight */}
                  <ellipse
                    cx={p.x - r * 0.3}
                    cy={p.y - r * 0.36}
                    rx={r * 0.32}
                    ry={r * 0.22}
                    fill="#FFFFFF"
                    opacity={isWhite || isStriker ? 0.5 : 0.24}
                    transform={`rotate(-35 ${p.x - r * 0.3} ${p.y - r * 0.36})`}
                  />
                  {isQueen && <circle cx={p.x} cy={p.y} r={r * 0.25} fill="#F59E0B" opacity={0.9} />}
                  {isStriker && <circle cx={p.x} cy={p.y} r={r * 0.26} fill={strikerSkin.core} />}
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

          {/* Lacquer sheen across the whole board, struck from the top-left. */}
          <rect
            x={frameOut}
            y={frameOut}
            width={BOARD_VIEW.span}
            height={BOARD_VIEW.span}
            rx={4}
            fill="url(#boardGloss)"
            pointerEvents="none"
          />
        </g>
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
  isFlipped = false,
}: {
  myTurn: boolean;
  strikerPos: number;
  onPlace: (pos: number) => void;
  aim: AimData | null;
  phase: string;
  isFlipped?: boolean;
}) {
  const power = aim?.power ?? 0;
  const powerPct = Math.round(power * 100);
  const powerColor =
    power < 0.4 ? "#22C55E" : power < 0.75 ? "#EAB308" : "#EF4444";

  /* This panel used to say the same thing three times — a "DRAG TO AIM" dial,
   * a 👆 "Slide to aim / Release to shoot" column, and a rules bullet saying
   * the same — while the power bar sat visibly empty and the whole panel
   * looked identical whether or not you were allowed to shoot. One dial, one
   * hint line that tracks the actual state. */
  const canShoot = myTurn && phase === "aiming";
  const hint = !canShoot
    ? phase === "resolving"
      ? "Coins are still moving…"
      : "Waiting for your opponent's shot"
    : aim
    ? "Release to shoot — drag further for more power"
    : "Drag back from the striker to aim";

  const uiPos = toUiSliderPos(strikerPos, isFlipped);

  function step(delta: number) {
    HapticsManager.getInstance().subtle();
    const nextUi = Math.max(0, Math.min(1, uiPos + delta));
    onPlace(toServerSliderPos(nextUi, isFlipped));
  }

  return (
    <div
      className="w-full rounded-2xl overflow-hidden transition-opacity duration-200"
      style={{
        background: WARM.cream,
        border: `1.5px solid ${canShoot ? WARM.borderDark : WARM.border}`,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        opacity: canShoot ? 1 : 0.62,
      }}
    >
      {/* Shot Power */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ borderBottom: canShoot ? `1px solid ${WARM.border}` : undefined }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: WARM.woodDark }}>
              Shot Power
            </span>
            <span
              className="text-xs font-black tabular-nums px-2 py-0.5 rounded-full transition-colors"
              style={{
                background: aim ? powerColor + "22" : "transparent",
                color: aim ? powerColor : WARM.wood + "77",
                border: `1px solid ${aim ? powerColor + "44" : "transparent"}`,
              }}
            >
              {aim ? `${powerPct}%` : "—"}
            </span>
          </div>
          <div
            className="w-full h-3 rounded-full overflow-hidden"
            style={{
              background: WARM.bgWarm,
              border: `1px solid ${WARM.border}`,
            }}
            role="progressbar"
            aria-label="Shot power"
            aria-valuenow={aim ? powerPct : 0}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full transition-all duration-75"
              style={{
                width: `${aim ? powerPct : 0}%`,
                background: `linear-gradient(90deg, #22C55E, #EAB308 50%, #EF4444)`,
              }}
            />
          </div>
          <div
            className="text-[9px] font-semibold mt-1 leading-tight"
            style={{ color: WARM.wood + "AA" }}
          >
            {hint}
          </div>
        </div>

        {/* Aim state dial — the single indicator */}
        <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              background: `radial-gradient(circle, ${WARM.cream} 30%, ${WARM.bgWarm} 60%, ${WARM.border} 100%)`,
              border: `2.5px solid ${aim ? powerColor : WARM.borderDark}`,
              boxShadow: aim ? `0 0 12px ${powerColor}44` : "0 2px 6px rgba(0,0,0,0.1)",
            }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ border: `1.5px solid ${aim ? powerColor + "66" : WARM.border}` }}
            >
              <div
                className="w-4 h-4 rounded-full transition-all"
                style={{
                  background: aim ? powerColor : WARM.borderDark,
                  opacity: aim ? 0.85 : 0.4,
                }}
              />
            </div>
          </div>
          <span
            className="text-[8px] font-black uppercase text-center leading-tight whitespace-pre"
            style={{ color: WARM.woodDark }}
          >
            {aim ? "RELEASE\nTO SHOOT" : canShoot ? "DRAG\nTO AIM" : "WAITING"}
          </span>
        </div>
      </div>

      {/* Striker Position Slider — only when it's your turn */}
      {canShoot && (
        <div className="flex items-center gap-2.5 px-4 py-2.5">
          <span className="text-[9px] font-black uppercase tracking-wider whitespace-nowrap" style={{ color: WARM.wood }}>
            Position:
          </span>
          <button
            type="button"
            onClick={() => step(-0.05)}
            aria-label="Move striker left"
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
            value={uiPos}
            aria-label="Striker position on the baseline"
            onChange={(e) => {
              HapticsManager.getInstance().subtle();
              const nextUi = Number(e.target.value);
              onPlace(toServerSliderPos(nextUi, isFlipped));
            }}
            className="flex-1 h-2 rounded-lg cursor-pointer"
            style={{ accentColor: WARM.gold }}
          />
          <button
            type="button"
            onClick={() => step(0.05)}
            aria-label="Move striker right"
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
/** Accumulates a real shot history with real timestamps. Semantics (and the
 *  reason the old render-time clock was wrong) live in `carromFeed.ts`, which
 *  is pure so it can be tested without a DOM. */
export function useCarromFeed(
  phase: string,
  lastShot: string | null,
  lastCombo?: string | null
): CarromFeedEntry[] {
  const [entries, setEntries] = useState<CarromFeedEntry[]>([]);
  const prevPhase = useRef<string | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    const was = prevPhase.current;
    prevPhase.current = phase;
    if (!shouldRecordShot(was, phase, lastShot) || !lastShot) return;
    setEntries((prev) =>
      appendEntry(prev, { id: seq.current++, text: lastShot, combo: lastCombo, at: Date.now() })
    );
  }, [phase, lastShot, lastCombo]);

  return entries;
}

export function CarromActivityLog({
  entries,
  className = "",
  /** Desktop lets the feed absorb the leftover column height instead of
   *  leaving several hundred pixels of empty background below it. */
  fill = false,
}: {
  entries: CarromFeedEntry[];
  className?: string;
  fill?: boolean;
}) {
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries.length]);

  return (
    <div
      className={`w-full flex flex-col rounded-2xl overflow-hidden ${fill ? "flex-1 min-h-0" : ""} ${className}`}
      style={{
        background: WARM.bgSoft,
        border: `1.5px solid ${WARM.border}`,
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      }}
    >
      <div className="px-3 py-2 flex-shrink-0" style={{ borderBottom: `1px solid ${WARM.border}` }}>
        <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: WARM.woodDark }}>
          Shot History
        </span>
      </div>
      <div
        ref={scroller}
        className={`overflow-y-auto ${fill ? "flex-1 min-h-0" : "max-h-24"}`}
      >
        {entries.length === 0 ? (
          <p className="px-3 py-3 text-[11px] font-semibold" style={{ color: WARM.wood + "99" }}>
            No shots yet — the first strike will show up here.
          </p>
        ) : (
          entries.map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-2 px-3 py-1.5"
              style={{ borderBottom: `1px solid ${WARM.border}66` }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: e.combo ? WARM.gold : WARM.borderDark }}
              />
              <span
                className="text-[11px] font-semibold flex-1 min-w-0 truncate"
                style={{ color: WARM.woodDark }}
              >
                {e.text}
                {e.combo && <span style={{ color: WARM.goldDark }}> {e.combo}</span>}
              </span>
              <span
                className="text-[10px] font-bold tabular-nums flex-shrink-0"
                style={{ color: WARM.wood + "88" }}
              >
                {formatFeedClock(e.at)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── Bottom Action Bar ─────────────────────────── */
/** Mobile room toolbar.
 *
 *  Every one of these five buttons was inert: four were declared with
 *  `action: undefined`, and the fifth (Chat) took an `onToggleChat` prop that
 *  the mobile board never passed. Mobile Carrom therefore had no chat, no
 *  voice and no way to see the room code at all. They now drive the strip-less
 *  `InlineRoomRail` through the same `bhalyam:open-room-panel` bridge Ludo's
 *  bottom nav uses, so the panels are the app's real ones rather than new
 *  Carrom-only copies. */
export function CarromBottomBar({ unread = 0 }: { unread?: number }) {
  const openPanel = (panel: string) => {
    HapticsManager.getInstance().subtle();
    window.dispatchEvent(new CustomEvent("bhalyam:open-room-panel", { detail: { panel } }));
  };

  const items: { icon: string; label: string; panel: string; badge?: number }[] = [
    { icon: "💬", label: "Chat", panel: "chat", badge: unread },
    { icon: "😊", label: "Emoji", panel: "emoji" },
    { icon: "🎙️", label: "Voice", panel: "voice" },
    { icon: "👥", label: "Players", panel: "players" },
    { icon: "⋯", label: "Room", panel: "room" },
  ];

  return (
    <div
      className="w-full flex items-center justify-around py-2 flex-shrink-0"
      style={{
        background: WARM.woodDark,
        borderTop: `2px solid ${WARM.wood}`,
        paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
      }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => openPanel(item.panel)}
          aria-label={item.label}
          className="relative flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[44px] px-2 py-1 cursor-pointer active:scale-95 transition"
        >
          {item.badge != null && item.badge > 0 && (
            <span
              className="absolute top-0 right-2 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[9px] font-black text-white"
              style={{ background: "#EF4444" }}
            >
              {item.badge > 9 ? "9+" : item.badge}
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
