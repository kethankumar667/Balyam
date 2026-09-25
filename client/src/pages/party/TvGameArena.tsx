import { useMemo } from "react";
import { Dice6, Layers, RotateCw, RotateCcw, Radio, Flame, ShieldAlert } from "lucide-react";
import type { GameKind, Player, RoomPublicState, UnoCard, UnoColor, UnoRank } from "@shared/types";
import { TvTurnTimer } from "./TvTurnTimer";
import type { TvActiveTurnInfo } from "./types";
import { findAvatar } from "../../lib/avatars";
import { UnoCardFace, UnoCardBack } from "../../games/uno/uno-shared";

export interface TvGameArenaProps {
  room: RoomPublicState;
  gameState: Record<string, unknown> | null;
  activeTurn: TvActiveTurnInfo;
}

export function TvGameArena({ room, gameState, activeTurn }: TvGameArenaProps) {
  const game = room.game;
  const players = room.players;

  // Determine dynamic ambient color based on active game state
  const ambientGlow = useMemo(() => {
    if (game === "uno") {
      const topCard = gameState?.topCard as Partial<UnoCard> | undefined;
      const curColor = ((gameState?.currentColor as UnoColor | null) ?? topCard?.color ?? "R") as UnoColor;
      if (curColor === "R") return "rgba(225, 29, 72, 0.22)";
      if (curColor === "B") return "rgba(37, 99, 235, 0.22)";
      if (curColor === "G") return "rgba(16, 185, 129, 0.22)";
      if (curColor === "Y") return "rgba(245, 158, 11, 0.22)";
      return "rgba(168, 85, 247, 0.22)";
    }
    if (game === "handcricket") return "rgba(16, 185, 129, 0.18)";
    if (game === "ludo") return "rgba(245, 158, 11, 0.20)";
    if (game === "snl") return "rgba(217, 119, 6, 0.20)";
    return "rgba(245, 158, 11, 0.16)";
  }, [game, gameState]);

  // Derive high-energy stadium commentary ticker text
  const tickerCommentary = useMemo(() => {
    const rawAction = (gameState?.lastAction as string | null) ?? activeTurn.actionText;
    if (rawAction) return rawAction;
    if (game === "uno") {
      const unoPlayers = players.filter((p) => {
        const handSizes = (gameState?.handSizes as Record<string, number> | undefined) ?? {};
        const count = handSizes[p.id] ?? 7;
        const unoDeclared = (gameState?.unoDeclaredBy as string[] | undefined) ?? [];
        return count === 1 || unoDeclared.includes(p.id);
      });
      if (unoPlayers.length > 0) {
        return `🔥 UNO ALERT: ${unoPlayers.map((p) => p.name).join(", ")} is down to 1 card! Match Point!`;
      }
      return `${activeTurn.name}'s turn to play! Couch spectators: watch the discard pile!`;
    }
    if (game === "ludo") {
      const dice = gameState?.diceValue as number | null;
      if (dice) return `🎲 Last dice rolled: ${dice}! ${activeTurn.name} is moving pawns!`;
      return `🎲 ${activeTurn.name} is preparing to roll the golden dice!`;
    }
    if (game === "handcricket") {
      return `🏏 Live stadium broadcast: ${activeTurn.name} in the spotlight!`;
    }
    return `⚡ Live match underway: ${activeTurn.name} is taking their turn!`;
  }, [game, gameState, activeTurn, players]);

  return (
    <div className="relative flex-1 w-full max-w-7xl mx-auto flex flex-col justify-between gap-2.5 p-2 sm:p-3 select-none min-h-0 overflow-hidden">
      {/* Dynamic Ambient Stadium Ambilight Halo */}
      <div className="absolute inset-0 pointer-events-none -z-10 flex items-center justify-center overflow-hidden">
        <div
          className="w-[900px] h-[550px] rounded-full blur-[140px] transition-colors duration-700 opacity-90 animate-pulse"
          style={{ background: ambientGlow, animationDuration: "4s" }}
        />
      </div>

      {/* Top Active Turn Spotlight & Turn Timer */}
      <div className="shrink-0 w-full">
        <TvTurnTimer
          deadlineMs={activeTurn.deadlineMs}
          totalSeconds={activeTurn.turnTimerSeconds || 30}
          playerName={activeTurn.name}
          playerAvatar={activeTurn.avatar}
          playerColor={activeTurn.color}
          actionText={activeTurn.actionText}
        />
      </div>

      {/* Center Stage: Dedicated High-Energy TV Game Spectator Stadium (Fully Responsive without Clipping) */}
      <div className="flex-1 w-full flex items-center justify-center min-h-0 my-auto py-1 overflow-hidden">
        {game === "ludo" ? (
          <LudoTvBoard gameState={gameState} players={players} activePlayerId={activeTurn.playerId} />
        ) : game === "snl" ? (
          <SnlTvBoard gameState={gameState} players={players} activePlayerId={activeTurn.playerId} />
        ) : game === "uno" ? (
          <UnoTvBoard gameState={gameState} players={players} activePlayerId={activeTurn.playerId} />
        ) : game === "rummy" ? (
          <RummyTvBoard gameState={gameState} players={players} activePlayerId={activeTurn.playerId} />
        ) : game === "handcricket" ? (
          <HandCricketTvBoard gameState={gameState} players={players} />
        ) : (
          <GenericTvBoard gameState={gameState} players={players} game={game} />
        )}
      </div>

      {/* Bottom Live Action Commentary Ticker */}
      <div className="shrink-0 w-full flex flex-col sm:flex-row items-center justify-between gap-2 px-3.5 py-2 rounded-2xl bg-black/60 border border-amber-900/40 backdrop-blur-md shadow-xl text-xs sm:text-sm">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-[11px] font-black uppercase tracking-wider flex-shrink-0">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>Stadium Feed</span>
          </div>
          <span className="font-bold text-amber-200 truncate">
            {tickerCommentary}
          </span>
        </div>

        <div className="flex items-center gap-2 text-stone-400 text-xs font-mono flex-shrink-0">
          <span>📱 Phone Controller Enabled</span>
        </div>
      </div>
    </div>
  );
}

// ── 1. Ludo TV Spectator Board ──
function LudoTvBoard({
  gameState,
  players,
  activePlayerId,
}: {
  gameState: Record<string, unknown> | null;
  players: Player[];
  activePlayerId: string;
}) {
  const diceValue = (gameState?.diceValue as number | null) ?? null;
  const turnPhase = (gameState?.turnPhase as string) ?? "waiting";

  return (
    <div className="w-full max-w-5xl h-full flex flex-col md:flex-row items-center justify-center gap-5 p-4 sm:p-5 rounded-3xl bg-black/60 border-2 border-amber-600/40 shadow-2xl backdrop-blur-md min-h-0">
      {/* Dice & Turn Action Center Card */}
      <div className="flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl bg-stone-900/90 border border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.2)] text-center min-w-[190px]">
        <span className="text-[11px] font-mono font-black uppercase tracking-widest text-amber-400 mb-1.5">
          Latest Roll
        </span>
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 border-4 border-yellow-200 flex items-center justify-center shadow-xl mb-2.5 transform hover:scale-105 transition-transform">
          {diceValue ? (
            <span className="text-5xl font-black font-mono text-stone-950">{diceValue}</span>
          ) : (
            <Dice6 className="w-12 h-12 text-stone-950 animate-pulse" />
          )}
        </div>
        <span className="px-3 py-0.5 rounded-full bg-amber-500/20 text-xs font-black text-amber-300 border border-amber-500/40 capitalize">
          Phase: {turnPhase}
        </span>
      </div>

      {/* Roster & Pawn Status Grid */}
      <div className="flex-1 grid grid-cols-2 gap-3 w-full max-h-[38vh] overflow-y-auto pr-1">
        {players.map((p) => {
          const isActive = p.id === activePlayerId;
          const avatarObj = p.avatar ? findAvatar(p.avatar) : null;
          const playerColors = (gameState?.playerColors as Record<string, string> | undefined) ?? {};
          const pColor = playerColors[p.id];
          return (
            <div
              key={p.id}
              className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${
                isActive
                  ? "bg-amber-500/25 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.35)] scale-[1.02]"
                  : "bg-stone-900/60 border-stone-800"
              }`}
            >
              <div
                className="w-11 h-11 rounded-xl overflow-hidden border-2 flex items-center justify-center flex-shrink-0 shadow-md"
                style={{ borderColor: pColor || (isActive ? "#F59E0B" : "#78716C") }}
              >
                {avatarObj?.src ? (
                  <img src={avatarObj.src} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-black text-white text-sm">{p.name.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="block font-black text-amber-100 text-sm truncate">{p.name}</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-amber-300">
                  {isActive ? "🎲 Taking Turn..." : "Waiting"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 2. Snakes & Ladders TV Spectator Board ──
function SnlTvBoard({
  gameState,
  players,
  activePlayerId,
}: {
  gameState: Record<string, unknown> | null;
  players: Player[];
  activePlayerId: string;
}) {
  const positions = (gameState?.positions as Record<string, number> | undefined) ?? {};
  const diceValue = (gameState?.diceValue as number | null) ?? null;

  return (
    <div className="w-full max-w-5xl h-full flex flex-col md:flex-row items-center justify-center gap-5 p-4 sm:p-5 rounded-3xl bg-black/60 border-2 border-amber-600/40 shadow-2xl backdrop-blur-md min-h-0">
      {/* Dice & Step Center Card */}
      <div className="flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl bg-stone-900/90 border border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.2)] text-center min-w-[190px]">
        <span className="text-[11px] font-mono font-black uppercase tracking-widest text-amber-400 mb-1.5">
          Dice Roll
        </span>
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 border-4 border-yellow-200 flex items-center justify-center shadow-xl mb-2.5">
          {diceValue ? (
            <span className="text-5xl font-black font-mono text-stone-950">{diceValue}</span>
          ) : (
            <Dice6 className="w-12 h-12 text-stone-950 animate-pulse" />
          )}
        </div>
        <span className="text-xs font-black text-amber-200/90">Race to Square 100</span>
      </div>

      {/* Player Positions Race Track */}
      <div className="flex-1 flex flex-col gap-2.5 w-full max-h-[38vh] overflow-y-auto pr-1">
        {players.map((p) => {
          const square = positions[p.id] ?? 0;
          const isActive = p.id === activePlayerId;
          const percent = Math.min(100, Math.max(0, square));
          return (
            <div
              key={p.id}
              className={`p-3 rounded-2xl border-2 transition-all ${
                isActive
                  ? "bg-amber-500/25 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                  : "bg-stone-900/60 border-stone-800"
              }`}
            >
              <div className="flex items-center justify-between text-xs sm:text-sm font-bold mb-1.5">
                <span className="text-amber-100 truncate font-black">{p.name}</span>
                <span className="font-mono text-amber-300 font-black">
                  Square {square} / 100
                </span>
              </div>
              <div className="w-full h-3 bg-stone-800 rounded-full overflow-hidden border border-stone-700">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-400 rounded-full transition-all duration-500"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 3. High-Energy UNO TV Spectator Stadium ──
const UNO_COLOR_META: Record<UnoColor, { name: string; text: string; bg: string; border: string; glow: string; badge: string }> = {
  R: { name: "Red", text: "text-rose-400", bg: "bg-rose-600", border: "border-rose-500", glow: "shadow-[0_0_35px_rgba(225,29,72,0.45)]", badge: "bg-rose-500 text-white" },
  B: { name: "Blue", text: "text-blue-400", bg: "bg-blue-600", border: "border-blue-500", glow: "shadow-[0_0_35px_rgba(37,99,235,0.45)]", badge: "bg-blue-500 text-white" },
  G: { name: "Green", text: "text-emerald-400", bg: "bg-emerald-600", border: "border-emerald-500", glow: "shadow-[0_0_35px_rgba(16,185,129,0.45)]", badge: "bg-emerald-500 text-white" },
  Y: { name: "Yellow", text: "text-amber-300", bg: "bg-amber-500", border: "border-amber-400", glow: "shadow-[0_0_35px_rgba(245,158,11,0.45)]", badge: "bg-amber-400 text-stone-950 font-black" },
};

function UnoTvBoard({
  gameState,
  players,
  activePlayerId,
}: {
  gameState: Record<string, unknown> | null;
  players: Player[];
  activePlayerId: string;
}) {
  const rawCard = gameState?.topCard as Partial<UnoCard> | undefined;
  const currentColor = ((gameState?.currentColor as UnoColor | null) ?? rawCard?.color ?? "R") as UnoColor;
  const direction = (gameState?.direction as number) ?? 1;
  const deckCount = (gameState?.deckCount as number) ?? 0;
  const handSizes = (gameState?.handSizes as Record<string, number> | undefined) ?? {};
  const unoDeclaredBy = (gameState?.unoDeclaredBy as string[] | undefined) ?? [];
  const pendingDrawCount = (gameState?.pendingDrawCount as number) ?? 0;

  // Construct valid UnoCard with fallback normalization
  const rank: UnoRank = (rawCard?.rank as UnoRank) ?? "7";
  const effectiveCard: UnoCard = {
    id: rawCard?.id ?? "top-card",
    color: rawCard?.color ?? (rank === "Wild" || rank === "Wild+4" ? null : currentColor),
    rank: rank,
  };

  const meta = UNO_COLOR_META[currentColor] ?? UNO_COLOR_META.R;

  // Dynamic grid column layout so up to 10 players fit cleanly in 2 rows without overflowing
  const gridColsClass =
    players.length <= 4
      ? "grid-cols-2 sm:grid-cols-4"
      : players.length <= 6
      ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
      : players.length <= 8
      ? "grid-cols-2 sm:grid-cols-4"
      : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5";

  return (
    <div className="w-full max-w-6xl h-full flex flex-col items-center justify-between gap-3 p-3 sm:p-4 rounded-[28px] bg-gradient-to-b from-stone-900/90 via-black/95 to-black/90 border-2 border-amber-600/40 shadow-2xl backdrop-blur-xl min-h-0 overflow-hidden">
      {/* Top Banner: Cosmic Direction Orbit & Action Status */}
      <div className="shrink-0 w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-stone-900/70 border border-amber-500/20">
        <div className="flex items-center gap-2">
          {direction === 1 ? (
            <RotateCw className="w-4 h-4 text-emerald-400 animate-spin" style={{ animationDuration: "5s" }} />
          ) : (
            <RotateCcw className="w-4 h-4 text-emerald-400 animate-spin" style={{ animationDuration: "5s" }} />
          )}
          <span className="text-[11px] font-mono font-black tracking-wider uppercase text-amber-300">
            Flow: {direction === 1 ? "Clockwise ↻" : "Counter-Clockwise ↺"}
          </span>
        </div>

        {pendingDrawCount > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-black text-[11px] uppercase tracking-wider animate-bounce shadow-[0_0_15px_rgba(225,29,72,0.8)]">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Draw Stack Chain: +{pendingDrawCount} Cards!</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-stone-400 uppercase">Active Color:</span>
          <span className={`px-2 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider ${meta.badge}`}>
            {meta.name}
          </span>
        </div>
      </div>

      {/* Center Table: 3D Stacked Draw Pile + Central Discard Card */}
      <div className="shrink-0 w-full flex items-center justify-center gap-6 sm:gap-10 my-auto py-1">
        {/* 3D Stacked Draw Pile */}
        <div className="flex flex-col items-center">
          <div className="relative w-18 h-26 sm:w-22 sm:h-32 flex items-center justify-center">
            {/* Depth cards beneath */}
            <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-xl bg-stone-800 border border-stone-600 shadow-md transform rotate-3" />
            <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 rounded-xl bg-stone-900 border border-stone-700 shadow-sm transform -rotate-2" />
            {/* Top facedown card */}
            <div className="relative w-full h-full rounded-xl overflow-hidden border-2 border-amber-400/80 shadow-xl">
              <UnoCardBack className="w-full h-full object-cover" />
            </div>
          </div>
          <span className="mt-1.5 px-2.5 py-0.5 rounded-lg bg-stone-900/90 border border-stone-700 text-[11px] font-mono font-black text-amber-300 shadow-inner">
            Draw Deck: {deckCount}
          </span>
        </div>

        {/* Central Discard Spotlight with Authentic UNO Card Face */}
        <div className="flex flex-col items-center">
          <div className={`relative w-22 h-32 sm:w-26 sm:h-38 rounded-2xl p-1 transition-all duration-500 transform hover:scale-105 ${meta.glow}`}>
            <UnoCardFace card={effectiveCard} className="w-full h-full drop-shadow-xl" />
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-stone-900/90 border border-stone-700 shadow-inner">
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-200">
              Discard Top
            </span>
          </div>
        </div>
      </div>

      {/* Players Stadium Arena Roster (Max 2 Rows on Desktop/TV, fully visible for 10 players) */}
      <div className={`w-full grid ${gridColsClass} gap-2 sm:gap-2.5 max-h-[38vh] overflow-y-auto pr-1`}>
        {players.map((p) => {
          const count = handSizes[p.id] ?? 7;
          const isActive = p.id === activePlayerId;
          const hasUno = count === 1 || unoDeclaredBy.includes(p.id);
          const avatarObj = p.avatar ? findAvatar(p.avatar) : null;
          const fanCount = Math.min(5, Math.max(1, count));

          return (
            <div
              key={p.id}
              className={`relative p-2 sm:p-2.5 rounded-xl border-2 flex items-center justify-between gap-2 transition-all ${
                hasUno
                  ? "bg-rose-950/80 border-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.6)] animate-pulse scale-[1.02]"
                  : isActive
                  ? "bg-amber-500/25 border-amber-400 shadow-[0_0_18px_rgba(245,158,11,0.35)] scale-[1.01]"
                  : "bg-stone-900/70 border-stone-800"
              }`}
            >
              {/* UNO Danger Badge */}
              {hasUno && (
                <div className="absolute -top-2.5 right-2 px-1.5 py-0.2 rounded-full bg-rose-600 text-white font-black text-[9px] uppercase tracking-widest flex items-center gap-0.5 shadow-lg animate-bounce">
                  <Flame className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
                  <span>UNO!</span>
                </div>
              )}

              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden border-2 flex-shrink-0 bg-stone-800 shadow-md ${
                    hasUno ? "border-rose-500" : isActive ? "border-amber-400" : "border-stone-700"
                  }`}
                >
                  {avatarObj?.src ? (
                    <img src={avatarObj.src} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="flex items-center justify-center h-full font-black text-white text-[11px]">
                      {p.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <span className="block font-black text-amber-100 text-xs sm:text-sm truncate">
                    {p.name}
                  </span>
                  <span className={`text-[10px] sm:text-[11px] font-bold ${isActive ? "text-amber-400" : "text-stone-400"}`}>
                    {isActive ? "⚡ Playing" : `${count} ${count === 1 ? "card" : "cards"}`}
                  </span>
                </div>
              </div>

              {/* Fanned Mini Card Backs for Visual Hand Size */}
              <div className="flex -space-x-2.5 items-center flex-shrink-0">
                {Array.from({ length: fanCards(fanCount) }).map((_, idx) => (
                  <div
                    key={idx}
                    className="w-4 h-6 sm:w-4.5 sm:h-7 rounded-sm shadow-md overflow-hidden border border-black/40"
                    style={{
                      transform: `rotate(${(idx - (fanCount - 1) / 2) * 8}deg)`,
                      zIndex: idx,
                    }}
                  >
                    <UnoCardBack className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function fanCards(count: number): number {
  return Math.min(5, Math.max(1, count));
}

// ── 4. Rummy TV Spectator Table (Zero Private State Leaks!) ──
function RummyTvBoard({
  gameState,
  players,
  activePlayerId,
}: {
  gameState: Record<string, unknown> | null;
  players: Player[];
  activePlayerId: string;
}) {
  const closedDeckCount = (gameState?.closedDeckCount as number) ?? 0;
  const topOfOpenPile = gameState?.topOfOpenPile as { suit?: string; rank?: string } | undefined;
  const handSizes = (gameState?.handSizes as Record<string, number> | undefined) ?? {};
  const wildJoker = gameState?.wildJoker as { suit?: string; rank?: string } | undefined;

  const gridColsClass =
    players.length <= 4
      ? "grid-cols-2 sm:grid-cols-4"
      : "grid-cols-2 sm:grid-cols-3";

  return (
    <div className="w-full max-w-5xl h-full flex flex-col md:flex-row items-center justify-center gap-5 p-4 sm:p-5 rounded-3xl bg-black/60 border-2 border-amber-600/40 shadow-2xl backdrop-blur-md min-h-0">
      {/* Table Center: Open Pile Card & Wild Joker */}
      <div className="flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl bg-stone-900/90 border border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.2)] text-center min-w-[210px]">
        <div className="flex items-center gap-3 mb-3">
          {/* Wild Joker */}
          <div className="text-center">
            <span className="text-[10px] font-mono font-black uppercase tracking-wider text-amber-400 block mb-1">
              Wild Joker
            </span>
            <div className="w-16 h-22 rounded-xl bg-amber-100 border-2 border-amber-500 text-stone-950 flex flex-col items-center justify-center font-black shadow-md">
              <span className="text-xl leading-none">{wildJoker?.rank ?? "★"}</span>
              <span className="text-[10px] uppercase">{wildJoker?.suit ?? "Joker"}</span>
            </div>
          </div>

          {/* Open Discard Pile */}
          <div className="text-center">
            <span className="text-[10px] font-mono font-black uppercase tracking-wider text-amber-400 block mb-1">
              Open Discard
            </span>
            <div className="w-16 h-22 rounded-xl bg-white border-2 border-stone-400 text-stone-950 flex flex-col items-center justify-center font-black shadow-md">
              <span className="text-xl leading-none">{topOfOpenPile?.rank ?? "—"}</span>
              <span className="text-[10px] uppercase">{topOfOpenPile?.suit ?? ""}</span>
            </div>
          </div>
        </div>

        <span className="px-3 py-1 rounded-xl bg-stone-800 border border-stone-700 text-xs font-mono font-black text-amber-300">
          Closed Deck: {closedDeckCount} cards
        </span>
      </div>

      {/* Players Hand Count Table */}
      <div className={`flex-1 grid ${gridColsClass} gap-3 w-full max-h-[38vh] overflow-y-auto pr-1`}>
        {players.map((p) => {
          const count = handSizes[p.id] ?? 13;
          const isActive = p.id === activePlayerId;
          const avatarObj = p.avatar ? findAvatar(p.avatar) : null;
          return (
            <div
              key={p.id}
              className={`p-3 rounded-2xl border-2 flex items-center justify-between gap-2.5 transition-all ${
                isActive
                  ? "bg-amber-500/25 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)] scale-[1.02]"
                  : "bg-stone-900/60 border-stone-800"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-amber-500/30 flex-shrink-0 bg-stone-800 shadow-md">
                  {avatarObj?.src ? (
                    <img src={avatarObj.src} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="flex items-center justify-center h-full font-black text-white text-xs">
                      {p.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="font-black text-amber-100 text-sm truncate">{p.name}</span>
              </div>

              <div className="px-2.5 py-1 rounded-xl bg-stone-800 border border-stone-700 text-[11px] font-mono font-black text-amber-300 flex-shrink-0">
                {count} cards
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 5. Hand Cricket TV Broadcast Stadium Scoreboard ──
function HandCricketTvBoard({
  gameState,
  players,
}: {
  gameState: Record<string, unknown> | null;
  players: Player[];
}) {
  const innings1 = gameState?.innings1 as { runs?: number; wickets?: number; balls?: number } | undefined;
  const innings2 = gameState?.innings2 as { runs?: number; wickets?: number; balls?: number } | undefined;
  const currentInnings = (gameState?.innings2 ? 2 : 1) as 1 | 2;
  const activeInnings = currentInnings === 2 ? innings2 : innings1;

  const runs = activeInnings?.runs ?? 0;
  const wickets = activeInnings?.wickets ?? 0;
  const balls = activeInnings?.balls ?? 0;
  const oversStr = `${Math.floor(balls / 6)}.${balls % 6}`;

  const battingPlayer = players[0]?.name ?? "Batting";
  const bowlingPlayer = players[1]?.name ?? "Bowling";

  return (
    <div className="w-full max-w-5xl h-full flex flex-col items-center justify-center gap-4 p-5 rounded-3xl bg-black/70 border-2 border-emerald-500/40 shadow-2xl backdrop-blur-md min-h-0">
      <div className="w-full flex items-center justify-between border-b border-amber-900/40 pb-2.5">
        <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-black">
          Hand Cricket Television Broadcast
        </span>
        <span className="px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-xs font-black border border-emerald-500/40">
          Innings {currentInnings}
        </span>
      </div>

      {/* Big Broadcast Score Banner */}
      <div className="flex items-baseline justify-center gap-3 my-2">
        <span className="text-6xl sm:text-7xl font-black font-mono text-amber-300 tracking-tight drop-shadow-[0_0_30px_rgba(245,158,11,0.4)]">
          {runs}/{wickets}
        </span>
        <span className="text-2xl sm:text-3xl font-mono text-amber-400/90 font-bold">
          ({oversStr} Ovs)
        </span>
      </div>

      {/* Matchup Bar */}
      <div className="w-full grid grid-cols-2 gap-3.5 text-center mt-1">
        <div className="p-3.5 rounded-2xl bg-stone-900/80 border border-amber-900/40 shadow-md">
          <span className="text-xs uppercase tracking-wider text-amber-400 font-black block mb-0.5">
            Batting
          </span>
          <span className="text-lg font-black text-amber-100">{battingPlayer}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-stone-900/80 border border-amber-900/40 shadow-md">
          <span className="text-xs uppercase tracking-wider text-stone-400 font-black block mb-0.5">
            Bowling
          </span>
          <span className="text-lg font-black text-amber-100">{bowlingPlayer}</span>
        </div>
      </div>
    </div>
  );
}

// ── 6. Generic / Universal Fallback TV Board ──
function GenericTvBoard({
  players,
  game,
}: {
  gameState: Record<string, unknown> | null;
  players: Player[];
  game: GameKind;
}) {
  const gridColsClass =
    players.length <= 4
      ? "grid-cols-2 sm:grid-cols-4"
      : players.length <= 6
      ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
      : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5";

  return (
    <div className="w-full max-w-5xl h-full flex flex-col items-center justify-center gap-5 p-5 rounded-3xl bg-black/60 border-2 border-amber-600/40 shadow-2xl backdrop-blur-md min-h-0">
      <div className="flex items-center gap-3 text-amber-300 font-black text-lg">
        <Layers className="w-6 h-6 text-amber-400" />
        <span>Live Stadium Arena • {game.toUpperCase()}</span>
      </div>

      <div className={`grid ${gridColsClass} gap-3 w-full max-h-[38vh] overflow-y-auto pr-1`}>
        {players.map((p) => (
          <div
            key={p.id}
            className="p-3.5 rounded-2xl bg-stone-900/70 border border-amber-900/40 text-center shadow-lg"
          >
            <span className="block font-black text-amber-100 text-base mb-0.5 truncate">
              {p.name}
            </span>
            <span className="text-xs font-mono text-amber-400/90 font-bold">Active Seated</span>
          </div>
        ))}
      </div>
    </div>
  );
}
