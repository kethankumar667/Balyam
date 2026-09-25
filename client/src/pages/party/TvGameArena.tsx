import { useMemo } from "react";
import { Dice6, Layers, RotateCw, RotateCcw, AlertTriangle, ArrowRight } from "lucide-react";
import type { GameKind, Player, RoomPublicState } from "@shared/types";
import { TvTurnTimer } from "./TvTurnTimer";
import type { TvActiveTurnInfo } from "./types";
import { findAvatar } from "../../lib/avatars";

export interface TvGameArenaProps {
  room: RoomPublicState;
  gameState: Record<string, unknown> | null;
  activeTurn: TvActiveTurnInfo;
}

export function TvGameArena({ room, gameState, activeTurn }: TvGameArenaProps) {
  const game = room.game;
  const players = room.players;

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto flex flex-col justify-between gap-4 p-4 select-none">
      {/* Top Active Turn Spotlight & Turn Timer */}
      <TvTurnTimer
        deadlineMs={activeTurn.deadlineMs}
        totalSeconds={activeTurn.turnTimerSeconds || 30}
        playerName={activeTurn.name}
        playerAvatar={activeTurn.avatar}
        playerColor={activeTurn.color}
        actionText={activeTurn.actionText}
      />

      {/* Center Stage: Dedicated TV Game Spectator Board */}
      <div className="flex-1 flex items-center justify-center min-h-[46vh] max-h-[58vh]">
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

      {/* Bottom Spectator Status Bar */}
      <div className="w-full flex items-center justify-between text-xs sm:text-sm text-stone-400 border-t border-amber-900/30 pt-2 px-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="font-semibold text-amber-200/80">Live Spectator Broadcast</span>
        </div>
        <span>📱 Seated players interact using their phone screens</span>
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
    <div className="w-full max-w-4xl h-full flex flex-col md:flex-row items-center justify-center gap-6 p-4 rounded-3xl bg-black/50 border border-amber-900/40 shadow-2xl backdrop-blur-md">
      {/* Dice & Turn Action Center Card */}
      <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-stone-900/80 border border-amber-500/30 shadow-inner text-center min-w-[200px]">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 mb-2">
          Latest Roll
        </span>
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 border-2 border-yellow-200 flex items-center justify-center shadow-lg mb-2">
          {diceValue ? (
            <span className="text-5xl font-black font-mono text-stone-950">{diceValue}</span>
          ) : (
            <Dice6 className="w-12 h-12 text-stone-950 animate-pulse" />
          )}
        </div>
        <span className="text-xs font-bold text-amber-200/90 capitalize">
          Phase: {turnPhase}
        </span>
      </div>

      {/* Roster & Pawn Status Grid */}
      <div className="flex-1 grid grid-cols-2 gap-4 w-full">
        {players.map((p) => {
          const isActive = p.id === activePlayerId;
          const avatarObj = p.avatar ? findAvatar(p.avatar) : null;
          const playerColors = (gameState?.playerColors as Record<string, string> | undefined) ?? {};
          const pColor = playerColors[p.id];
          return (
            <div
              key={p.id}
              className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                isActive
                  ? "bg-amber-500/20 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)]"
                  : "bg-stone-900/50 border-stone-800"
              }`}
            >
              <div
                className="w-12 h-12 rounded-xl overflow-hidden border-2 flex items-center justify-center flex-shrink-0"
                style={{ borderColor: pColor || (isActive ? "#F59E0B" : "#78716C") }}
              >
                {avatarObj?.src ? (
                  <img src={avatarObj.src} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-white text-sm">{p.name.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="block font-black text-amber-100 text-sm truncate">{p.name}</span>
                <span className="text-xs font-mono text-amber-300/70">
                  {isActive ? "🎲 Taking Turn" : "Waiting"}
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
    <div className="w-full max-w-4xl h-full flex flex-col md:flex-row items-center justify-center gap-6 p-4 rounded-3xl bg-black/50 border border-amber-900/40 shadow-2xl backdrop-blur-md">
      {/* Dice & Step Center Card */}
      <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-stone-900/80 border border-amber-500/30 text-center min-w-[200px]">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 mb-2">
          Dice Roll
        </span>
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 border-2 border-yellow-200 flex items-center justify-center shadow-lg mb-2">
          {diceValue ? (
            <span className="text-5xl font-black font-mono text-stone-950">{diceValue}</span>
          ) : (
            <Dice6 className="w-12 h-12 text-stone-950 animate-pulse" />
          )}
        </div>
        <span className="text-xs font-bold text-amber-200/80">Race to Square 100</span>
      </div>

      {/* Player Positions Race Track */}
      <div className="flex-1 flex flex-col gap-3 w-full">
        {players.map((p) => {
          const square = positions[p.id] ?? 0;
          const isActive = p.id === activePlayerId;
          const percent = Math.min(100, Math.max(0, square));
          return (
            <div
              key={p.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                isActive
                  ? "bg-amber-500/20 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                  : "bg-stone-900/50 border-stone-800"
              }`}
            >
              <div className="flex items-center justify-between text-xs sm:text-sm font-bold mb-1.5">
                <span className="text-amber-100 truncate">{p.name}</span>
                <span className="font-mono text-amber-400 font-black">Square {square} / 100</span>
              </div>
              <div className="w-full h-3 bg-stone-800 rounded-full overflow-hidden border border-stone-700">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
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

// ── 3. UNO TV Spectator Arena ──
function UnoTvBoard({
  gameState,
  players,
  activePlayerId,
}: {
  gameState: Record<string, unknown> | null;
  players: Player[];
  activePlayerId: string;
}) {
  const topCard = gameState?.topCard as { color?: string; value?: string | number } | undefined;
  const currentColor = (gameState?.currentColor as string | null) ?? topCard?.color ?? "red";
  const direction = (gameState?.direction as number) ?? 1;
  const deckCount = (gameState?.deckCount as number) ?? 0;
  const handSizes = (gameState?.handSizes as Record<string, number> | undefined) ?? {};
  const unoDeclaredBy = (gameState?.unoDeclaredBy as string[] | undefined) ?? [];

  const colorBg =
    currentColor === "red"
      ? "bg-rose-600 border-rose-400 shadow-[0_0_30px_rgba(225,29,72,0.4)]"
      : currentColor === "blue"
      ? "bg-blue-600 border-blue-400 shadow-[0_0_30px_rgba(37,99,235,0.4)]"
      : currentColor === "green"
      ? "bg-emerald-600 border-emerald-400 shadow-[0_0_30px_rgba(5,150,105,0.4)]"
      : currentColor === "yellow"
      ? "bg-amber-500 border-amber-300 shadow-[0_0_30px_rgba(245,158,11,0.4)]"
      : "bg-purple-600 border-purple-400 shadow-[0_0_30px_rgba(147,51,234,0.4)]";

  return (
    <div className="w-full max-w-4xl h-full flex flex-col md:flex-row items-center justify-center gap-6 p-4 rounded-3xl bg-black/50 border border-amber-900/40 shadow-2xl backdrop-blur-md">
      {/* Top Discard Card & Direction Indicator */}
      <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-stone-900/80 border border-amber-500/30 text-center min-w-[220px]">
        <div className="flex items-center gap-2 mb-2 text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
          <span>Direction</span>
          {direction === 1 ? (
            <RotateCw className="w-4 h-4 text-emerald-400 animate-spin" style={{ animationDuration: "6s" }} />
          ) : (
            <RotateCcw className="w-4 h-4 text-emerald-400 animate-spin" style={{ animationDuration: "6s" }} />
          )}
        </div>

        {/* Big Top Discard Card */}
        <div
          className={`w-24 h-36 rounded-2xl border-4 flex flex-col items-center justify-center font-black text-white text-3xl shadow-2xl mb-2 transition-colors ${colorBg}`}
        >
          <span className="text-sm font-bold uppercase opacity-80 mb-1">
            {currentColor}
          </span>
          <span>{topCard?.value ?? "?"}</span>
        </div>

        <span className="text-xs font-mono text-stone-400">
          Draw Pile: {deckCount} cards
        </span>
      </div>

      {/* Players Hand Count & UNO! Alert */}
      <div className="flex-1 grid grid-cols-2 gap-3.5 w-full">
        {players.map((p) => {
          const count = handSizes[p.id] ?? 7;
          const isActive = p.id === activePlayerId;
          const hasUno = unoDeclaredBy.includes(p.id) || count === 1;
          const avatarObj = p.avatar ? findAvatar(p.avatar) : null;
          return (
            <div
              key={p.id}
              className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                hasUno
                  ? "bg-rose-950/60 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)] animate-pulse"
                  : isActive
                  ? "bg-amber-500/20 border-amber-400"
                  : "bg-stone-900/50 border-stone-800"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-amber-500/30 flex-shrink-0 bg-stone-800">
                  {avatarObj?.src ? (
                    <img src={avatarObj.src} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="flex items-center justify-center h-full font-bold text-white text-xs">
                      {p.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <span className="block font-black text-amber-100 text-sm truncate">{p.name}</span>
                  {hasUno && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-400">
                      <AlertTriangle className="w-3 h-3" /> UNO!
                    </span>
                  )}
                </div>
              </div>

              <div className="px-3 py-1 rounded-xl bg-stone-800 border border-stone-700 text-xs font-mono font-bold text-amber-300 flex-shrink-0">
                {count} {count === 1 ? "card" : "cards"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
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

  return (
    <div className="w-full max-w-4xl h-full flex flex-col md:flex-row items-center justify-center gap-6 p-4 rounded-3xl bg-black/50 border border-amber-900/40 shadow-2xl backdrop-blur-md">
      {/* Table Center: Open Pile Card & Wild Joker */}
      <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-stone-900/80 border border-amber-500/30 text-center min-w-[220px]">
        <div className="flex items-center gap-3 mb-3">
          {/* Wild Joker */}
          <div className="text-center">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 block mb-1">
              Wild Joker
            </span>
            <div className="w-16 h-22 rounded-xl bg-amber-100 border-2 border-amber-400 text-stone-950 flex flex-col items-center justify-center font-black shadow-md">
              <span className="text-lg leading-none">{wildJoker?.rank ?? "★"}</span>
              <span className="text-xs uppercase">{wildJoker?.suit ?? "Joker"}</span>
            </div>
          </div>

          {/* Open Discard Pile */}
          <div className="text-center">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 block mb-1">
              Open Discard
            </span>
            <div className="w-16 h-22 rounded-xl bg-white border-2 border-stone-300 text-stone-950 flex flex-col items-center justify-center font-black shadow-md">
              <span className="text-lg leading-none">{topOfOpenPile?.rank ?? "—"}</span>
              <span className="text-xs uppercase">{topOfOpenPile?.suit ?? ""}</span>
            </div>
          </div>
        </div>

        <span className="text-xs font-mono text-stone-400">
          Closed Deck: {closedDeckCount} cards
        </span>
      </div>

      {/* Players Hand Count Table */}
      <div className="flex-1 grid grid-cols-2 gap-3.5 w-full">
        {players.map((p) => {
          const count = handSizes[p.id] ?? 13;
          const isActive = p.id === activePlayerId;
          const avatarObj = p.avatar ? findAvatar(p.avatar) : null;
          return (
            <div
              key={p.id}
              className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                isActive
                  ? "bg-amber-500/20 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                  : "bg-stone-900/50 border-stone-800"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-amber-500/30 flex-shrink-0 bg-stone-800">
                  {avatarObj?.src ? (
                    <img src={avatarObj.src} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="flex items-center justify-center h-full font-bold text-white text-xs">
                      {p.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="font-black text-amber-100 text-sm truncate">{p.name}</span>
              </div>

              <div className="px-3 py-1 rounded-xl bg-stone-800 border border-stone-700 text-xs font-mono font-bold text-amber-300 flex-shrink-0">
                {count} cards in hand
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
    <div className="w-full max-w-4xl h-full flex flex-col items-center justify-center gap-4 p-6 rounded-3xl bg-black/60 border border-amber-900/40 shadow-2xl backdrop-blur-md">
      <div className="w-full flex items-center justify-between border-b border-amber-900/40 pb-3">
        <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
          Hand Cricket Television Broadcast
        </span>
        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/40">
          Innings {currentInnings}
        </span>
      </div>

      {/* Big Broadcast Score Banner */}
      <div className="flex items-baseline justify-center gap-3 my-2">
        <span className="text-6xl sm:text-7xl font-black font-mono text-amber-300 tracking-tight">
          {runs}/{wickets}
        </span>
        <span className="text-2xl sm:text-3xl font-mono text-amber-400/80 font-bold">
          ({oversStr} Ovs)
        </span>
      </div>

      {/* Matchup Bar */}
      <div className="w-full grid grid-cols-2 gap-4 text-center mt-2">
        <div className="p-3.5 rounded-2xl bg-stone-900/70 border border-amber-900/30">
          <span className="text-xs uppercase tracking-wider text-amber-400 font-bold block mb-0.5">
            Batting
          </span>
          <span className="text-lg font-black text-amber-100">{battingPlayer}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-stone-900/70 border border-amber-900/30">
          <span className="text-xs uppercase tracking-wider text-stone-400 font-bold block mb-0.5">
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
  return (
    <div className="w-full max-w-4xl h-full flex flex-col items-center justify-center gap-6 p-6 rounded-3xl bg-black/50 border border-amber-900/40 shadow-2xl backdrop-blur-md">
      <div className="flex items-center gap-3 text-amber-300 font-bold text-lg">
        <Layers className="w-6 h-6 text-amber-400" />
        <span>Live Stadium Arena • {game.toUpperCase()}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
        {players.map((p) => (
          <div
            key={p.id}
            className="p-4 rounded-2xl bg-stone-900/60 border border-amber-900/30 text-center"
          >
            <span className="block font-black text-amber-100 text-base mb-1 truncate">
              {p.name}
            </span>
            <span className="text-xs font-mono text-amber-400/80">Active In Room</span>
          </div>
        ))}
      </div>
    </div>
  );
}
