import { useMemo, useState, useEffect, useRef } from "react";
import { Dice6, Layers, RotateCw, RotateCcw, Radio, Flame, ShieldAlert, Crown, Swords, Trophy, Zap, Star } from "lucide-react";
import type {
  GameKind,
  Player,
  RoomPublicState,
  UnoCard,
  UnoColor,
  UnoRank,
  LudoColor,
  LudoToken,
  SnlEvent,
  HcState,
  HcBall,
  HcBatterStats,
  HcBowlerStats,
  RpsChoice,
  WordBuildingScoredWord,
} from "@shared/types";
import { TvTurnTimer } from "./TvTurnTimer";
import type { TvActiveTurnInfo } from "./types";
import { findAvatar } from "../../lib/avatars";
import { UnoCardFace, UnoCardBack } from "../../games/uno/uno-shared";
import { UnoActionToast } from "../../games/uno/uno-action-toast";
import { fireUnoDeclareConfetti } from "../../games/uno/uno-confetti";
import { Dice } from "../../games/ludo/Dice";
import { GotchaCaptureOverlay, LuckySixBurst } from "../../games/ludo/LudoAnimations";
import { COLOR_HEX } from "../../games/ludo/board-layout";
import { useHcSkin, type HcSkin, HC_SKINS } from "../../games/handcricket/hc-skin";

// Snakes & Ladders animations
import { SnakeBiteOverlay, LadderClimbOverlay, SnlWinnerCelebration } from "../../games/snl/SnlAnimations";

// Rock Paper Scissors animations
import { RpsClashOverlay, RpsWinnerCelebration, type RpsClashKind } from "../../games/rps/RpsAnimations";

// Hand Cricket 3D stadium celebrations
import { Hc3DCelebrationLayer } from "../../games/handcricket/animations3d/Hc3DCelebrationLayer";

// Rummy animations
import {
  RummyDeclareFlourish,
  RummyInvalidDeclareOverlay,
  RummyPureSequenceBurst,
  RummyWinnerCelebration,
} from "../../games/rummy/RummyAnimations";

// Word Building animations
import {
  WordBuildingWordBurst,
  WordBuildingComboBanner,
  WordBuildingWinnerCelebration,
} from "../../games/wordbuilding/WordBuildingAnimations";

// Dots & Boxes animations
import {
  DotsBoxesMineBurst,
  DotsBoxesWinnerCelebration,
} from "../../games/dotsboxes/DotsBoxesAnimations";

// Star Game animations
import {
  StarBurstOverlay,
  StarWinnerCelebration,
} from "../../games/stargame/StarAnimations";

// Bingo animations
import {
  BingoBallCalledOverlay,
  BingoWinnerCelebration,
} from "../../games/bingo/BingoAnimations";

// Name Place Animal Thing animations
import {
  NpatLetterRevealBurst,
  NpatWinnerCelebration,
} from "../../games/namesplaceanimal/NpatAnimations";

export interface TvGameArenaProps {
  room: RoomPublicState;
  gameState: Record<string, unknown> | null;
  activeTurn: TvActiveTurnInfo;
}

export function TvGameArena({ room, gameState, activeTurn }: TvGameArenaProps) {
  const game = room.game;
  const players = room.players;
  const [hcSkin] = useHcSkin();

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
    if (game === "ludo") {
      const playerColors = (gameState?.playerColors as Record<string, LudoColor> | undefined) ?? {};
      const activeColor = playerColors[activeTurn.playerId] ?? "yellow";
      if (activeColor === "red") return "rgba(225, 29, 72, 0.25)";
      if (activeColor === "green") return "rgba(16, 185, 129, 0.25)";
      if (activeColor === "blue") return "rgba(37, 99, 235, 0.25)";
      if (activeColor === "yellow") return "rgba(245, 158, 11, 0.25)";
      return "rgba(245, 158, 11, 0.20)";
    }
    if (game === "handcricket") {
      if (hcSkin === "cricbuzz") return "rgba(0, 179, 138, 0.28)";
      if (hcSkin === "doordarshan") return "rgba(217, 119, 6, 0.28)";
      if (hcSkin === "nostalgia") return "rgba(245, 158, 11, 0.22)";
      return "rgba(6, 182, 212, 0.28)";
    }
    if (game === "snl") return "rgba(217, 119, 6, 0.20)";
    if (game === "rps") return "rgba(239, 68, 68, 0.20)";
    if (game === "rummy") return "rgba(16, 185, 129, 0.22)";
    if (game === "wordbuilding") return "rgba(59, 130, 246, 0.20)";
    if (game === "dotsboxes") return "rgba(245, 158, 11, 0.20)";
    if (game === "stargame") return "rgba(234, 179, 8, 0.22)";
    if (game === "bingo") return "rgba(236, 72, 153, 0.20)";
    if (game === "namesplaceanimal") return "rgba(168, 85, 247, 0.20)";
    return "rgba(245, 158, 11, 0.16)";
  }, [game, gameState, activeTurn, hcSkin]);

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
      const turnPhase = (gameState?.turnPhase as string) ?? "rolling";
      const lastEvent = gameState?.lastEvent as { kind?: string; byPlayerId?: string; victimPlayerId?: string } | undefined;
      if (lastEvent?.kind === "capture") {
        const attacker = players.find((p) => p.id === lastEvent.byPlayerId)?.name ?? "Player";
        const victim = players.find((p) => p.id === lastEvent.victimPlayerId)?.name ?? "Player";
        return `💥 KNOCKOUT! ${attacker} captured ${victim}'s pawn and sent it back to the yard!`;
      }
      if (lastEvent?.kind === "home") {
        return `🏆 HOME RUN! A pawn made it all the way home!`;
      }
      if (dice === 6) {
        return `🔥 LUCKY SIX! ${activeTurn.name} rolled a 6 and earns another roll!`;
      }
      if (dice) {
        return `🎲 Rolled a ${dice}! ${activeTurn.name} is ${turnPhase === "moving" ? "choosing a pawn to move" : "taking their turn"}!`;
      }
      return `🎲 ${activeTurn.name} is rolling the 3D dice in the stadium!`;
    }
    if (game === "snl") {
      const dice = gameState?.diceValue as number | null;
      if (dice === 6) {
        return `🔥 LUCKY SIX! ${activeTurn.name} rolled a 6 in Snakes & Ladders!`;
      }
      if (dice) {
        return `🎲 Rolled a ${dice}! Moving up the board toward 100!`;
      }
      return `🎲 ${activeTurn.name} is rolling the dice!`;
    }
    if (game === "rps") {
      return `⚔️ Showdown in progress: ${players[0]?.name ?? "P1"} vs ${players[1]?.name ?? "P2"}! Make your throws!`;
    }
    if (game === "handcricket") {
      return `🏏 Live stadium broadcast: ${activeTurn.name} in the spotlight!`;
    }
    if (game === "wordbuilding") {
      return `📚 Word Building match: ${activeTurn.name} is selecting letters!`;
    }
    if (game === "dotsboxes") {
      return `✏️ Dots & Boxes: ${activeTurn.name} is claiming territory!`;
    }
    if (game === "bingo") {
      return `🎱 Bingo Tumbler: Watching the next number drop!`;
    }
    return `⚡ Live match underway: ${activeTurn.name} is taking their turn!`;
  }, [game, gameState, activeTurn, players]);

  return (
    <div className="relative flex-1 w-full max-w-7xl mx-auto flex flex-col justify-between gap-2.5 p-2 sm:p-3 select-none min-h-0 overflow-hidden">
      {/* Dynamic Ambient Stadium Ambilight Halo */}
      <div className="absolute inset-0 pointer-events-none -z-10 flex items-center justify-center overflow-hidden">
        <div
          className="w-[950px] h-[600px] rounded-full blur-[140px] transition-colors duration-700 opacity-90 animate-pulse"
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

      {/* Center Stage: Dedicated High-Energy TV Game Spectator Stadium */}
      <div className="flex-1 w-full flex items-center justify-center min-h-0 my-auto py-1 overflow-hidden">
        {game === "ludo" ? (
          <LudoTvBoard gameState={gameState} players={players} activePlayerId={activeTurn.playerId} />
        ) : game === "snl" ? (
          <SnlTvBoard gameState={gameState} players={players} activePlayerId={activeTurn.playerId} />
        ) : game === "uno" ? (
          <UnoTvBoard gameState={gameState} players={players} activePlayerId={activeTurn.playerId} />
        ) : game === "handcricket" ? (
          <HandCricketTvBoard gameState={gameState} players={players} activePlayerId={activeTurn.playerId} />
        ) : game === "rps" ? (
          <RpsTvBoard gameState={gameState} players={players} activePlayerId={activeTurn.playerId} />
        ) : game === "rummy" ? (
          <RummyTvBoard gameState={gameState} players={players} activePlayerId={activeTurn.playerId} />
        ) : game === "wordbuilding" ? (
          <WordBuildingTvBoard gameState={gameState} players={players} activePlayerId={activeTurn.playerId} />
        ) : game === "dotsboxes" ? (
          <DotsBoxesTvBoard gameState={gameState} players={players} activePlayerId={activeTurn.playerId} />
        ) : game === "stargame" ? (
          <StarTvBoard gameState={gameState} players={players} activePlayerId={activeTurn.playerId} />
        ) : game === "bingo" ? (
          <BingoTvBoard gameState={gameState} players={players} activePlayerId={activeTurn.playerId} />
        ) : game === "namesplaceanimal" ? (
          <NpatTvBoard gameState={gameState} players={players} activePlayerId={activeTurn.playerId} />
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

// ── 1. High-Energy Ludo Live Dice Stadium Arena ──
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
  const turnPhase = (gameState?.turnPhase as string) ?? "rolling";
  const playerColors = (gameState?.playerColors as Record<string, LudoColor> | undefined) ?? {};
  const tokensByPlayer = (gameState?.tokens as Record<string, LudoToken[]> | undefined) ?? {};
  const winnerId = (gameState?.winnerId as string | null) ?? null;

  // Capture Animation State (GOTCHA! overlay)
  const [showCapture, setShowCapture] = useState<{
    attackerName: string;
    victimName: string;
    attackerColor: LudoColor;
  } | null>(null);

  const [showLuckySix, setShowLuckySix] = useState(false);

  const lastEvent = gameState?.lastEvent as {
    kind?: string;
    byPlayerId?: string;
    victimPlayerId?: string;
    ts: number;
  } | undefined;

  const lastHandledEventTs = useRef<number>(0);
  const lastDiceValue = useRef<number | null>(null);

  useEffect(() => {
    if (lastEvent && lastEvent.kind === "capture" && lastEvent.ts !== lastHandledEventTs.current) {
      lastHandledEventTs.current = lastEvent.ts;
      const attacker = players.find((p) => p.id === lastEvent.byPlayerId);
      const victim = players.find((p) => p.id === lastEvent.victimPlayerId);
      const attackerColor = (playerColors[lastEvent.byPlayerId ?? ""] ?? "red") as LudoColor;
      setShowCapture({
        attackerName: attacker?.name ?? "Attacker",
        victimName: victim?.name ?? "Victim",
        attackerColor,
      });
    }
  }, [lastEvent, players, playerColors]);

  useEffect(() => {
    if (diceValue === 6 && lastDiceValue.current !== 6) {
      setShowLuckySix(true);
    }
    lastDiceValue.current = diceValue;
  }, [diceValue]);

  const activeColor = playerColors[activePlayerId] ?? "yellow";
  const activeColorHex = COLOR_HEX[activeColor] ?? "#F59E0B";
  const winnerPlayer = players.find((p) => p.id === winnerId);

  const gridColsClass =
    players.length <= 4
      ? "grid-cols-2 sm:grid-cols-4"
      : players.length <= 6
      ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
      : "grid-cols-2 sm:grid-cols-4";

  return (
    <div className="relative w-full max-w-6xl h-full flex flex-col items-center justify-between gap-3 p-3 sm:p-5 rounded-[28px] bg-gradient-to-b from-stone-900/90 via-black/95 to-black/90 border-2 border-amber-600/40 shadow-2xl backdrop-blur-xl min-h-0 overflow-hidden">
      {/* Signature In-Game GOTCHA! Capture Animation Overlay */}
      {showCapture && (
        <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center">
          <GotchaCaptureOverlay
            attackerName={showCapture.attackerName}
            victimName={showCapture.victimName}
            attackerColor={showCapture.attackerColor}
            left={50}
            top={50}
            onComplete={() => setShowCapture(null)}
          />
        </div>
      )}

      {/* Lucky 6 Celebration Overlay */}
      {showLuckySix && (
        <LuckySixBurst onComplete={() => setShowLuckySix(false)} />
      )}

      {/* Winner Celebration Overlay */}
      {winnerPlayer && (
        <SnlWinnerCelebration winner={winnerPlayer} />
      )}

      {/* Top Bar: Active Color & Roll Status */}
      <div className="shrink-0 w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-stone-900/70 border border-amber-500/20">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full animate-ping" style={{ backgroundColor: activeColorHex }} />
          <span className="text-[11px] font-mono font-black tracking-wider uppercase text-amber-300">
            Active Seat: {activeColor}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-black uppercase text-amber-400">
            Latest Roll
          </span>
          <span className="px-2 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
            {turnPhase === "rolling" ? "ROLLING..." : `ROLLED ${diceValue ?? "—"}`}
          </span>
        </div>
      </div>

      {/* Center Hero: Majestic 3D Stadium Live Dice Arena */}
      <div className="flex-1 flex flex-col items-center justify-center my-auto py-2">
        <div className="relative w-52 h-52 sm:w-64 sm:h-64 rounded-full border-4 border-amber-500/50 bg-gradient-to-b from-stone-900/90 via-black to-stone-950 flex flex-col items-center justify-center shadow-[0_0_70px_rgba(245,158,11,0.35)] overflow-hidden">
          {/* Rotating Cosmic Accent Ring */}
          <div className="absolute inset-2 rounded-full border border-dashed border-amber-500/20 animate-spin" style={{ animationDuration: "25s" }} />

          {/* 3D Animated Dice */}
          <div className="relative z-10 transform scale-110 sm:scale-125 mb-1">
            <Dice
              value={diceValue}
              rolling={turnPhase === "rolling"}
              highlight={diceValue === 6}
              size="5.5rem"
            />
          </div>

          {/* Roll Status Badge */}
          <div className="relative z-10 mt-2 text-center">
            {diceValue === 6 ? (
              <div className="px-3 py-0.5 rounded-full bg-rose-600 text-white font-black text-xs uppercase tracking-wider animate-bounce shadow-[0_0_15px_rgba(225,29,72,0.8)] flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                <span>LUCKY 6! ROLL AGAIN!</span>
              </div>
            ) : diceValue ? (
              <span className="px-3 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-black text-xs uppercase tracking-wider">
                Move {diceValue} Spaces
              </span>
            ) : (
              <span className="px-3 py-0.5 rounded-full bg-stone-800 text-stone-400 font-mono font-bold text-xs uppercase tracking-wider">
                Awaiting Roll
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Player Roster & Pawn Status (Up to 8 players, perfectly visible in max 2 rows) */}
      <div className={`shrink-0 w-full grid ${gridColsClass} gap-2 sm:gap-2.5 max-h-[38vh] overflow-y-auto pr-1`}>
        {players.map((p) => {
          const isActive = p.id === activePlayerId;
          const pColor = playerColors[p.id] ?? "red";
          const hex = COLOR_HEX[pColor] ?? "#F59E0B";
          const avatarObj = p.avatar ? findAvatar(p.avatar) : null;
          const pTokens = tokensByPlayer[p.id] ?? [];
          const homeTokens = pTokens.filter((t) => t.state === "home").length;
          const yardTokens = pTokens.filter((t) => t.state === "yard").length;
          const trackTokens = pTokens.filter((t) => t.state === "track" || t.state === "stretch").length;

          return (
            <div
              key={p.id}
              className={`p-2 sm:p-2.5 rounded-xl border-2 flex items-center justify-between gap-2 transition-all ${
                isActive
                  ? "bg-amber-500/25 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.35)] scale-[1.01]"
                  : "bg-stone-900/70 border-stone-800"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden border-2 flex-shrink-0 bg-stone-800 shadow-md relative"
                  style={{ borderColor: hex }}
                >
                  {avatarObj?.src ? (
                    <img src={avatarObj.src} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="flex items-center justify-center h-full font-black text-white text-[11px]">
                      {p.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  {homeTokens === 4 && (
                    <div className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-amber-400 flex items-center justify-center">
                      <Crown className="w-2.5 h-2.5 text-stone-950" />
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <span className="block font-black text-amber-100 text-xs sm:text-sm truncate">
                    {p.name}
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    {/* 4 Pawn Pips */}
                    {Array.from({ length: 4 }).map((_, i) => {
                      const isHomePip = i < homeTokens;
                      const isTrackPip = !isHomePip && i < homeTokens + trackTokens;
                      return (
                        <span
                          key={i}
                          className={`w-2 h-2 rounded-full border ${
                            isHomePip
                              ? "bg-emerald-400 border-emerald-300 shadow-[0_0_5px_rgba(16,185,129,0.8)]"
                              : isTrackPip
                              ? "bg-amber-400 border-amber-300 shadow-[0_0_4px_rgba(245,158,11,0.5)]"
                              : "bg-stone-700 border-stone-600"
                          }`}
                          title={isHomePip ? "Pawn Home" : isTrackPip ? "Pawn on Track" : "Pawn in Yard"}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <span className="block font-mono font-black text-xs sm:text-sm text-amber-300">
                  {homeTokens}/4 Home
                </span>
                <span className="text-[10px] font-bold text-stone-400">
                  {yardTokens > 0 ? `${yardTokens} in Yard` : "Active"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 2. Snakes & Ladders High-Energy 3D Stadium Arena ──
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
  const turnPhase = (gameState?.turnPhase as string) ?? "rolling";
  const winnerId = (gameState?.winnerId as string | null) ?? null;
  const recentEvents = (gameState?.recentEvents as SnlEvent[] | undefined) ?? [];

  // SNL Event Animations State
  const [activeSnakeBite, setActiveSnakeBite] = useState<{
    playerName: string;
    from: number;
    to: number;
  } | null>(null);

  const [activeLadderClimb, setActiveLadderClimb] = useState<{
    playerName: string;
    from: number;
    to: number;
  } | null>(null);

  const [showLuckySix, setShowLuckySix] = useState(false);
  const lastEventTs = useRef<number>(0);
  const lastDiceValue = useRef<number | null>(null);

  useEffect(() => {
    const latest = recentEvents[recentEvents.length - 1];
    if (!latest || latest.ts === lastEventTs.current) return;
    lastEventTs.current = latest.ts;

    const pName = players.find((p) => p.id === latest.playerId)?.name ?? "Player";
    const fromPos = latest.from ?? 1;
    const toPos = latest.to ?? 1;

    if (latest.kind === "snake") {
      setActiveSnakeBite({ playerName: pName, from: fromPos, to: toPos });
      const tid = setTimeout(() => setActiveSnakeBite(null), 1400);
      return () => clearTimeout(tid);
    } else if (latest.kind === "ladder") {
      setActiveLadderClimb({ playerName: pName, from: fromPos, to: toPos });
      const tid = setTimeout(() => setActiveLadderClimb(null), 1400);
      return () => clearTimeout(tid);
    }
  }, [recentEvents, players]);

  useEffect(() => {
    if (diceValue === 6 && lastDiceValue.current !== 6) {
      setShowLuckySix(true);
    }
    lastDiceValue.current = diceValue;
  }, [diceValue]);

  const winnerPlayer = players.find((p) => p.id === winnerId);

  return (
    <div className="relative w-full max-w-6xl h-full flex flex-col items-center justify-between gap-3 p-3 sm:p-5 rounded-[28px] bg-gradient-to-b from-stone-900/90 via-black/95 to-black/90 border-2 border-amber-600/40 shadow-2xl backdrop-blur-xl min-h-0 overflow-hidden">
      {/* Snake Bite "OUCH!" Animation Overlay */}
      {activeSnakeBite && (
        <SnakeBiteOverlay
          playerName={activeSnakeBite.playerName}
          from={activeSnakeBite.from}
          to={activeSnakeBite.to}
          x={50}
          y={56}
          onComplete={() => setActiveSnakeBite(null)}
        />
      )}

      {/* Ladder Climb "SKY HIGH!" Animation Overlay */}
      {activeLadderClimb && (
        <LadderClimbOverlay
          playerName={activeLadderClimb.playerName}
          from={activeLadderClimb.from}
          to={activeLadderClimb.to}
          x={50}
          y={56}
          onComplete={() => setActiveLadderClimb(null)}
        />
      )}

      {/* Lucky 6 Burst Overlay */}
      {showLuckySix && (
        <LuckySixBurst onComplete={() => setShowLuckySix(false)} />
      )}

      {/* Exact 100 Match Winner Celebration Overlay */}
      {winnerPlayer && (
        <SnlWinnerCelebration winner={winnerPlayer} />
      )}

      {/* Top Bar: Game Mode & Dice Status */}
      <div className="shrink-0 w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-stone-900/70 border border-amber-500/20">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-black tracking-wider uppercase text-amber-300">
            🐍 Snakes & Ladders Live Arena 🪜
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-black uppercase text-amber-400">
            Latest Roll
          </span>
          <span className="px-2 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
            {turnPhase === "rolling" ? "ROLLING..." : `ROLLED ${diceValue ?? "—"}`}
          </span>
        </div>
      </div>

      {/* Center Hero: 3D Stadium Live Dice Arena */}
      <div className="flex-1 flex flex-col items-center justify-center my-auto py-2">
        <div className="relative w-52 h-52 sm:w-64 sm:h-64 rounded-full border-4 border-amber-500/50 bg-gradient-to-b from-stone-900/90 via-black to-stone-950 flex flex-col items-center justify-center shadow-[0_0_70px_rgba(245,158,11,0.35)] overflow-hidden">
          {/* Rotating Cosmic Accent Ring */}
          <div className="absolute inset-2 rounded-full border border-dashed border-amber-500/20 animate-spin" style={{ animationDuration: "25s" }} />

          {/* 3D Animated Dice */}
          <div className="relative z-10 transform scale-110 sm:scale-125 mb-1">
            <Dice
              value={diceValue}
              rolling={turnPhase === "rolling"}
              highlight={diceValue === 6}
              size="5.5rem"
            />
          </div>

          {/* Roll Status Badge */}
          <div className="relative z-10 mt-2 text-center">
            {diceValue === 6 ? (
              <div className="px-3 py-0.5 rounded-full bg-rose-600 text-white font-black text-xs uppercase tracking-wider animate-bounce shadow-[0_0_15px_rgba(225,29,72,0.8)] flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                <span>LUCKY 6! ROLL AGAIN!</span>
              </div>
            ) : diceValue ? (
              <span className="px-3 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-black text-xs uppercase tracking-wider">
                Move {diceValue} Squares
              </span>
            ) : (
              <span className="px-3 py-0.5 rounded-full bg-stone-800 text-stone-400 font-mono font-bold text-xs uppercase tracking-wider">
                Awaiting Roll
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Player Race Track Progress (Up to 8 players) */}
      <div className="shrink-0 w-full flex flex-col gap-2 max-h-[38vh] overflow-y-auto pr-1">
        {players.map((p) => {
          const square = positions[p.id] ?? 0;
          const isActive = p.id === activePlayerId;
          const percent = Math.min(100, Math.max(0, square));
          const avatarObj = p.avatar ? findAvatar(p.avatar) : null;

          return (
            <div
              key={p.id}
              className={`p-2.5 rounded-2xl border-2 flex items-center justify-between gap-3 transition-all ${
                isActive
                  ? "bg-amber-500/25 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)] scale-[1.01]"
                  : "bg-stone-900/70 border-stone-800"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 w-44 flex-shrink-0">
                <div className="w-9 h-9 rounded-xl overflow-hidden border border-amber-400/50 bg-stone-800 flex-shrink-0 shadow-md">
                  {avatarObj?.src ? (
                    <img src={avatarObj.src} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="flex items-center justify-center h-full font-black text-white text-[11px]">
                      {p.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <span className="block font-black text-amber-100 text-xs sm:text-sm truncate">{p.name}</span>
                  <span className="text-[10px] font-bold text-amber-400">
                    {square === 100 ? "🏆 WINNER!" : `Square ${square}/100`}
                  </span>
                </div>
              </div>

              {/* Progress Track */}
              <div className="flex-1 h-3.5 bg-stone-800 rounded-full overflow-hidden border border-stone-700/80 relative">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${percent}%` }}
                />
              </div>

              <div className="w-16 text-right font-mono font-black text-amber-300 text-xs flex-shrink-0">
                {percent}%
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
  const lastAction = (gameState?.lastAction as string | null) ?? null;
  const winnerId = (gameState?.winnerId as string | null) ?? null;

  // Construct valid UnoCard with fallback normalization
  const rank: UnoRank = (rawCard?.rank as UnoRank) ?? "7";
  const effectiveCard: UnoCard = {
    id: rawCard?.id ?? "top-card",
    color: rawCard?.color ?? (rank === "Wild" || rank === "Wild+4" ? null : currentColor),
    rank: rank,
  };

  const meta = UNO_COLOR_META[currentColor] ?? UNO_COLOR_META.R;

  // Trigger confetti burst on UNO declarations
  const prevUnoRef = useRef<number>(0);
  useEffect(() => {
    if (unoDeclaredBy.length > prevUnoRef.current) {
      fireUnoDeclareConfetti();
    }
    prevUnoRef.current = unoDeclaredBy.length;
  }, [unoDeclaredBy]);

  const winnerPlayer = players.find((p) => p.id === winnerId);

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
    <div className="relative w-full max-w-6xl h-full flex flex-col items-center justify-between gap-3 p-3 sm:p-4 rounded-[28px] bg-gradient-to-b from-stone-900/90 via-black/95 to-black/90 border-2 border-amber-600/40 shadow-2xl backdrop-blur-xl min-h-0 overflow-hidden">
      {/* UNO In-Game Action Toast Banner (Skip, Reverse, Draw Two, Wild Draw 4) */}
      <UnoActionToast lastAction={lastAction} className="top-14" />

      {/* Match Winner Celebration Overlay */}
      {winnerPlayer && (
        <SnlWinnerCelebration winner={winnerPlayer} />
      )}

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
                {Array.from({ length: fanCount }).map((_, idx) => (
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

// ── 4. Rock Paper Scissors High-Energy 3D Showdown Arena ──
function RpsTvBoard({
  gameState,
  players,
  activePlayerId: _activePlayerId,
}: {
  gameState: Record<string, unknown> | null;
  players: Player[];
  activePlayerId: string;
}) {
  const scores = (gameState?.scores as Record<string, number> | undefined) ?? {};
  const currentChoices = (gameState?.currentChoices as Record<string, RpsChoice> | undefined) ?? {};
  const lastResult = gameState?.lastResult as {
    winnerId: string | null;
    choices: Record<string, RpsChoice>;
  } | undefined;
  const lastRevealTs = (gameState?.lastRevealTs as number | undefined) ?? 0;
  const winnerId = (gameState?.winnerId as string | null) ?? null;

  const [activeClash, setActiveClash] = useState<{ kind: RpsClashKind; message?: string } | null>(null);
  const prevRevealTs = useRef<number>(0);

  useEffect(() => {
    if (lastRevealTs && lastRevealTs !== prevRevealTs.current && lastResult) {
      prevRevealTs.current = lastRevealTs;
      const winnerChoice = lastResult.winnerId ? lastResult.choices[lastResult.winnerId] : null;
      const clashKind: RpsClashKind = !lastResult.winnerId
        ? "draw"
        : winnerChoice === "rock"
        ? "crush"
        : winnerChoice === "scissors"
        ? "cut"
        : "cover";

      const winnerP = players.find((p) => p.id === lastResult.winnerId);
      const msg = lastResult.winnerId ? `${winnerP?.name ?? "Player"} won the round!` : "It's a standoff draw!";
      setActiveClash({ kind: clashKind, message: msg });
    }
  }, [lastRevealTs, lastResult, players]);

  const p1 = players[0];
  const p2 = players[1];
  const p1Choice = inRevealWindow(lastRevealTs) ? lastResult?.choices[p1?.id ?? ""] : currentChoices[p1?.id ?? ""];
  const p2Choice = inRevealWindow(lastRevealTs) ? lastResult?.choices[p2?.id ?? ""] : currentChoices[p2?.id ?? ""];
  const winnerName = players.find((p) => p.id === winnerId)?.name ?? "Champion";

  return (
    <div className="relative w-full max-w-5xl h-full flex flex-col items-center justify-between gap-4 p-4 sm:p-5 rounded-3xl bg-black/70 border-2 border-red-500/40 shadow-2xl backdrop-blur-md min-h-0">
      {/* Signature Clash Overlay Animation */}
      {activeClash && (
        <RpsClashOverlay
          kind={activeClash.kind}
          message={activeClash.message}
          onComplete={() => setActiveClash(null)}
        />
      )}

      {/* Match Winner Celebration Overlay */}
      {winnerId && (
        <RpsWinnerCelebration winnerName={winnerName} />
      )}

      {/* Top Header */}
      <div className="w-full flex items-center justify-between border-b border-red-900/40 pb-2.5">
        <div className="flex items-center gap-2">
          <Swords className="w-5 h-5 text-rose-400 animate-pulse" />
          <span className="text-xs font-mono uppercase tracking-widest text-rose-300 font-black">
            RPS Grand Showdown Arena
          </span>
        </div>
        <span className="px-3 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono text-xs font-black border border-rose-500/40">
          First to {Number(gameState?.target ?? 3)} Points
        </span>
      </div>

      {/* Center 2-Fighter Clash Stage */}
      <div className="flex-1 w-full flex items-center justify-around my-auto py-2">
        {/* Fighter 1 */}
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-3 border-rose-500/80 bg-stone-800 shadow-xl mb-2">
            {p1?.avatar ? (
              <img src={findAvatar(p1.avatar)?.src ?? ""} alt={p1.name} className="w-full h-full object-cover" />
            ) : (
              <span className="flex items-center justify-center h-full font-black text-2xl text-white">
                {p1?.name.slice(0, 2).toUpperCase() ?? "P1"}
              </span>
            )}
          </div>
          <span className="font-black text-amber-100 text-sm sm:text-base">{p1?.name ?? "Player 1"}</span>
          <span className="text-3xl font-black font-mono text-rose-400 mt-1">{scores[p1?.id ?? ""] ?? 0}</span>
          <div className="mt-2 text-3xl">
            {p1Choice ? rpsIcon(p1Choice) : "❓"}
          </div>
        </div>

        {/* VS Cosmic Emblem */}
        <div className="flex flex-col items-center justify-center">
          <span className="text-4xl sm:text-5xl font-black text-rose-500 italic drop-shadow-[0_0_20px_rgba(244,63,94,0.8)] animate-pulse">
            VS
          </span>
        </div>

        {/* Fighter 2 */}
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-3 border-blue-500/80 bg-stone-800 shadow-xl mb-2">
            {p2?.avatar ? (
              <img src={findAvatar(p2.avatar)?.src ?? ""} alt={p2.name} className="w-full h-full object-cover" />
            ) : (
              <span className="flex items-center justify-center h-full font-black text-2xl text-white">
                {p2?.name.slice(0, 2).toUpperCase() ?? "P2"}
              </span>
            )}
          </div>
          <span className="font-black text-amber-100 text-sm sm:text-base">{p2?.name ?? "Player 2"}</span>
          <span className="text-3xl font-black font-mono text-blue-400 mt-1">{scores[p2?.id ?? ""] ?? 0}</span>
          <div className="mt-2 text-3xl">
            {p2Choice ? rpsIcon(p2Choice) : "❓"}
          </div>
        </div>
      </div>
    </div>
  );
}

function inRevealWindow(lastRevealTs: number): boolean {
  return Date.now() - lastRevealTs < 2500;
}

function rpsIcon(choice: RpsChoice): string {
  if (choice === "rock") return "🪨";
  if (choice === "paper") return "📜";
  if (choice === "scissors") return "✂️";
  return "❓";
}

// ── 5. Hand Cricket High-Energy Multi-Theme Stadium TV Arena ──
function HandCricketTvBoard({
  gameState,
  players,
  activePlayerId,
}: {
  gameState: Record<string, unknown> | null;
  players: Player[];
  activePlayerId: string;
}) {
  const [skin, setSkin] = useHcSkin();

  // If host passes a skin preference in gameState, synchronize with host
  const hostSkin = (gameState?.skin as HcSkin | undefined) ?? (gameState?.theme as HcSkin | undefined);
  const prevHostSkinRef = useRef<HcSkin | undefined>(undefined);
  useEffect(() => {
    if (hostSkin && hostSkin !== prevHostSkinRef.current) {
      prevHostSkinRef.current = hostSkin;
      setSkin(hostSkin);
    }
  }, [hostSkin, setSkin]);

  const innings1 = gameState?.innings1 as {
    runs?: number;
    wickets?: number;
    balls?: number;
    history?: HcBall[];
    overs?: number;
    strikerIdx?: number;
    currentBowlerId?: string | null;
    batterStats?: Record<string, HcBatterStats>;
    bowlerStats?: Record<string, HcBowlerStats>;
    battingPlayerId?: string;
    bowlingPlayerId?: string;
  } | undefined;

  const innings2 = gameState?.innings2 as typeof innings1 | undefined;
  const currentInnings = (gameState?.innings2 ? 2 : 1) as 1 | 2;
  const activeInnings = currentInnings === 2 ? innings2 : innings1;

  const runs = activeInnings?.runs ?? 0;
  const wickets = activeInnings?.wickets ?? 0;
  const balls = activeInnings?.balls ?? 0;
  const oversStr = `${Math.floor(balls / 6)}.${balls % 6}`;

  const battingPlayerId = activeInnings?.battingPlayerId ?? players[0]?.id ?? "";
  const bowlingPlayerId = activeInnings?.bowlingPlayerId ?? players[1]?.id ?? "";
  const battingPlayer = players.find((p) => p.id === battingPlayerId) ?? players[0];
  const bowlingPlayer = players.find((p) => p.id === bowlingPlayerId) ?? players[1];

  const battingAvatar = battingPlayer?.avatar ? findAvatar(battingPlayer.avatar) : null;
  const bowlingAvatar = bowlingPlayer?.avatar ? findAvatar(bowlingPlayer.avatar) : null;

  // Run rates & match telemetry
  const crr = balls > 0 ? ((runs / balls) * 6).toFixed(2) : "0.00";
  const isSecondInnings = currentInnings === 2;
  const targetRuns = isSecondInnings ? (innings1?.runs ?? 0) + 1 : null;
  const runsNeeded = targetRuns !== null ? Math.max(0, targetRuns - runs) : null;
  const totalMaxBalls = (activeInnings?.overs ?? 10) * 6;
  const ballsRemaining = Math.max(0, totalMaxBalls - balls);
  const rrr = runsNeeded !== null && ballsRemaining > 0 ? ((runsNeeded / ballsRemaining) * 6).toFixed(2) : null;

  // Recent Balls of this over (latest 6 balls)
  const history = (activeInnings?.history as HcBall[] | undefined) ?? [];
  const thisOverBalls = history.slice(-6);

  // Construct valid HcState for Hc3DCelebrationLayer
  const typedHcState = (gameState ?? {}) as unknown as HcState;

  // Theme-specific CSS styling classes
  const themeClasses = useMemo(() => {
    switch (skin) {
      case "cricbuzz":
        return {
          container: "bg-gradient-to-b from-[#004838] via-[#00382B] to-[#00221A] border-2 border-[#00B38A]/60 shadow-[0_0_60px_rgba(0,179,138,0.3)]",
          brandTitle: "text-[#00B38A]",
          scoreColor: "text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]",
          badgeColor: "bg-[#009270] text-white border-[#00B38A]",
          cardBatting: "bg-[#002B21]/90 border-[#009270]/40 text-emerald-100",
          cardBowling: "bg-[#002B21]/90 border-[#009270]/40 text-emerald-100",
          accentText: "text-[#00E5AE]",
          overRibbonBg: "bg-[#00221A]/80 border-[#007056]",
        };
      case "doordarshan":
        return {
          container: "bg-gradient-to-b from-[#2A180C] via-[#1A0E06] to-[#0D0703] border-4 border-amber-700/60 shadow-[0_0_60px_rgba(217,119,6,0.35)] font-mono",
          brandTitle: "text-amber-400",
          scoreColor: "text-amber-300 drop-shadow-[0_0_25px_rgba(245,158,11,0.5)]",
          badgeColor: "bg-amber-600/30 text-amber-300 border-amber-500",
          cardBatting: "bg-[#1E1208]/90 border-amber-800/60 text-amber-200",
          cardBowling: "bg-[#1E1208]/90 border-amber-800/60 text-amber-200",
          accentText: "text-amber-400",
          overRibbonBg: "bg-[#140A04]/90 border-amber-900",
        };
      case "nostalgia":
        return {
          container: "bg-[#FBF5E0] border-4 border-[#C8A66B] shadow-[0_0_50px_rgba(180,120,40,0.35)] text-stone-900 font-sans",
          brandTitle: "text-blue-900",
          scoreColor: "text-blue-950",
          badgeColor: "bg-blue-600 text-white border-blue-900",
          cardBatting: "bg-white/80 border-[#C8A66B] text-stone-900 shadow-sm",
          cardBowling: "bg-white/80 border-[#C8A66B] text-stone-900 shadow-sm",
          accentText: "text-blue-700",
          overRibbonBg: "bg-amber-100/60 border-amber-300",
        };
      case "broadcast":
      default:
        return {
          container: "bg-gradient-to-b from-[#0B1528] via-[#070F1C] to-black border-2 border-cyan-500/50 shadow-[0_0_70px_rgba(6,182,212,0.3)]",
          brandTitle: "text-cyan-400",
          scoreColor: "text-amber-300 drop-shadow-[0_0_35px_rgba(245,158,11,0.5)]",
          badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/50",
          cardBatting: "bg-[#0B1C33]/90 border-cyan-500/30 text-cyan-100",
          cardBowling: "bg-[#1C1408]/90 border-amber-500/30 text-amber-100",
          accentText: "text-cyan-300",
          overRibbonBg: "bg-black/60 border-cyan-900/50",
        };
    }
  }, [skin]);

  return (
    <div className={`relative w-full max-w-6xl h-full flex flex-col justify-between gap-3 p-3 sm:p-5 rounded-[28px] transition-colors duration-500 backdrop-blur-xl min-h-0 overflow-hidden ${themeClasses.container}`}>
      {/* 3D TV Sports Celebrations Layer (Four, Six, Bowled, Duck, Hattrick, Streak, Milestone, Winner) */}
      {gameState && (
        <Hc3DCelebrationLayer
          state={typedHcState}
          players={players}
          selfId={activePlayerId}
          forcedSkin={skin}
        />
      )}

      {/* Top Bar: Brand Ticker & Interactive Mode/Theme Toggler */}
      <div className="shrink-0 w-full flex flex-col sm:flex-row items-center justify-between gap-2.5 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-black text-xs uppercase tracking-wider border shadow-sm">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span className={themeClasses.brandTitle}>
              {skin === "cricbuzz" ? "cricbuzz live" : skin === "doordarshan" ? "दूरदर्शन National Rerun" : skin === "nostalgia" ? "Notebook Cricket" : "Premier League 4K"}
            </span>
          </div>
          <span className={`px-2 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider border ${themeClasses.badgeColor}`}>
            Innings {currentInnings}
          </span>
        </div>

        {/* Live Interactive Mode Toggler */}
        <div className="flex items-center gap-1 p-1 rounded-full bg-black/60 border border-stone-700/60 shadow-inner">
          <span className="text-[10px] font-mono uppercase text-stone-400 px-2 font-bold hidden sm:inline">Theme:</span>
          {HC_SKINS.map((opt) => {
            const isActive = opt.id === skin;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSkin(opt.id)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  isActive
                    ? skin === "cricbuzz"
                      ? "bg-[#00B38A] text-stone-950 shadow-md scale-105"
                      : skin === "doordarshan"
                      ? "bg-amber-500 text-stone-950 shadow-md scale-105"
                      : skin === "nostalgia"
                      ? "bg-blue-600 text-white shadow-md scale-105"
                      : "bg-cyan-400 text-stone-950 shadow-md scale-105"
                    : "text-stone-400 hover:text-white"
                }`}
              >
                {opt.id === "broadcast" ? "📺 Broadcast" : opt.id === "cricbuzz" ? "🏏 Cricbuzz" : opt.id === "doordarshan" ? "📼 Rerun" : "📓 Classic"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Center Stadium Scoreboard */}
      <div className="flex-1 flex flex-col items-center justify-center my-auto py-1">
        {/* Main Score Banner */}
        <div className="flex items-baseline justify-center gap-3">
          <span className={`text-6xl sm:text-7xl md:text-8xl font-black font-mono tracking-tight ${themeClasses.scoreColor}`}>
            {runs}/{wickets}
          </span>
          <span className="text-2xl sm:text-3xl md:text-4xl font-mono font-bold opacity-80">
            ({oversStr} Ovs)
          </span>
        </div>

        {/* Run Rates & Target Telemetry */}
        <div className="flex items-center gap-3 mt-1 text-xs sm:text-sm font-mono font-bold">
          <span className="px-2.5 py-0.5 rounded-lg bg-black/40 border border-white/10">
            CRR: <strong className={themeClasses.accentText}>{crr}</strong>
          </span>
          {isSecondInnings && targetRuns !== null && (
            <span className="px-2.5 py-0.5 rounded-lg bg-black/40 border border-amber-500/30 text-amber-300">
              Need {runsNeeded} runs from {ballsRemaining} balls (RRR: {rrr ?? "—"})
            </span>
          )}
        </div>

        {/* This Over Recent Balls Ribbon */}
        <div className={`mt-3 px-3 py-1.5 rounded-2xl flex items-center gap-2 border shadow-lg ${themeClasses.overRibbonBg}`}>
          <span className="text-[10px] sm:text-xs font-mono font-black uppercase tracking-wider opacity-70">
            This Over:
          </span>
          <div className="flex items-center gap-1.5">
            {thisOverBalls.length === 0 ? (
              <span className="text-xs font-mono opacity-50">Starting over...</span>
            ) : (
              thisOverBalls.map((b, i) => {
                const isSix = b.runs === 6;
                const isFour = b.runs === 4;
                const isWkt = Boolean(b.wicket);
                return (
                  <div
                    key={i}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-mono font-black text-xs transition-all transform hover:scale-110 shadow-md ${
                      isWkt
                        ? "bg-red-600 text-white animate-bounce shadow-[0_0_12px_rgba(220,38,38,0.9)]"
                        : isSix
                        ? "bg-gradient-to-br from-rose-500 via-orange-500 to-amber-400 text-white shadow-[0_0_12px_rgba(244,63,94,0.8)] animate-pulse"
                        : isFour
                        ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-stone-950 shadow-[0_0_10px_rgba(245,158,11,0.6)]"
                        : b.runs > 0
                        ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
                        : "bg-stone-800/80 text-stone-400 border border-stone-700/60"
                    }`}
                  >
                    {isWkt ? "W" : b.runs}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom Split Spotlight Cards: Batting & Bowling */}
      <div className="shrink-0 w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5">
        {/* Batting Card */}
        <div className={`p-3 rounded-2xl border-2 flex items-center justify-between gap-3 shadow-lg ${themeClasses.cardBatting}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-11 h-11 rounded-xl overflow-hidden border-2 border-amber-400/60 bg-stone-900 flex-shrink-0 shadow-md">
              {battingAvatar?.src ? (
                <img src={battingAvatar.src} alt={battingPlayer?.name ?? "Batter"} className="w-full h-full object-cover" />
              ) : (
                <span className="flex items-center justify-center h-full font-black text-white text-xs">
                  {battingPlayer?.name?.slice(0, 2).toUpperCase() ?? "BAT"}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-black uppercase text-amber-400">🏏 Batting</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <span className="block font-black text-sm sm:text-base truncate">
                {battingPlayer?.name ?? "Batter"}
              </span>
            </div>
          </div>
          <div className="text-right flex-shrink-0 font-mono">
            <span className="block text-xs font-bold opacity-80">On Strike</span>
            <span className="text-sm font-black text-amber-300">Active</span>
          </div>
        </div>

        {/* Bowling Card */}
        <div className={`p-3 rounded-2xl border-2 flex items-center justify-between gap-3 shadow-lg ${themeClasses.cardBowling}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-11 h-11 rounded-xl overflow-hidden border-2 border-stone-600 bg-stone-900 flex-shrink-0 shadow-md">
              {bowlingAvatar?.src ? (
                <img src={bowlingAvatar.src} alt={bowlingPlayer?.name ?? "Bowler"} className="w-full h-full object-cover" />
              ) : (
                <span className="flex items-center justify-center h-full font-black text-white text-xs">
                  {bowlingPlayer?.name?.slice(0, 2).toUpperCase() ?? "BOWL"}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-mono font-black uppercase text-stone-400 block">🎯 Bowling</span>
              <span className="block font-black text-sm sm:text-base truncate">
                {bowlingPlayer?.name ?? "Bowler"}
              </span>
            </div>
          </div>
          <div className="text-right flex-shrink-0 font-mono">
            <span className="block text-xs font-bold opacity-80">Figures</span>
            <span className="text-sm font-black text-amber-300">{wickets}/{runs} ({oversStr})</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 6. Rummy TV Spectator Table with Authentic In-Game Animations ──
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
  const declaredBy = (gameState?.declaredBy as string | undefined) ?? null;
  const invalidDeclare = (gameState?.invalidDeclare as boolean | undefined) ?? false;
  const winnerId = (gameState?.winnerId as string | null) ?? null;

  const [showDeclareFlourish, setShowDeclareFlourish] = useState<string | null>(null);
  const [showInvalidDeclare, setShowInvalidDeclare] = useState(false);
  const [showPureSequence, setShowPureSequence] = useState(false);

  useEffect(() => {
    if (declaredBy) {
      const pName = players.find((p) => p.id === declaredBy)?.name ?? "Player";
      setShowDeclareFlourish(pName);
    }
  }, [declaredBy, players]);

  useEffect(() => {
    if (invalidDeclare) {
      setShowInvalidDeclare(true);
    }
  }, [invalidDeclare]);

  const winnerName = players.find((p) => p.id === winnerId)?.name ?? "Champion";

  return (
    <div className="relative w-full max-w-5xl h-full flex flex-col md:flex-row items-center justify-center gap-5 p-4 sm:p-5 rounded-3xl bg-black/60 border-2 border-emerald-600/40 shadow-2xl backdrop-blur-md min-h-0 overflow-hidden">
      {/* In-Game Rummy Declare Flourish */}
      {showDeclareFlourish && (
        <RummyDeclareFlourish declarerName={showDeclareFlourish} onComplete={() => setShowDeclareFlourish(null)} />
      )}

      {/* Invalid Declare Overlay */}
      {showInvalidDeclare && (
        <RummyInvalidDeclareOverlay onComplete={() => setShowInvalidDeclare(false)} />
      )}

      {/* Pure Sequence Burst */}
      {showPureSequence && (
        <RummyPureSequenceBurst onComplete={() => setShowPureSequence(false)} />
      )}

      {/* Match Winner Celebration Overlay */}
      {winnerId && (
        <RummyWinnerCelebration winnerName={winnerName} />
      )}

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
      <div className="flex-1 grid grid-cols-2 gap-3 w-full max-h-[38vh] overflow-y-auto pr-1">
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

// ── 7. Word Building TV Stadium with Word Burst Animations ──
function WordBuildingTvBoard({
  gameState,
  players,
  activePlayerId,
}: {
  gameState: Record<string, unknown> | null;
  players: Player[];
  activePlayerId: string;
}) {
  const scoredWords = (gameState?.scoredWords as WordBuildingScoredWord[] | undefined) ?? [];
  const scores = (gameState?.scores as Record<string, number> | undefined) ?? {};
  const winnerId = (gameState?.winnerId as string | null) ?? null;

  const [activeWordBurst, setActiveWordBurst] = useState<{
    word: string;
    points: number;
    playerName: string;
  } | null>(null);

  const [comboBanner, setComboBanner] = useState<string | null>(null);
  const seenWordIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (seenWordIdsRef.current.size === 0 && scoredWords.length > 0) {
      for (const w of scoredWords) seenWordIdsRef.current.add(w.id);
      return;
    }
    const fresh = scoredWords.filter((w) => !seenWordIdsRef.current.has(w.id));
    if (fresh.length === 0) return;
    for (const w of fresh) seenWordIdsRef.current.add(w.id);

    const top = fresh.reduce((a, b) => (a.points >= b.points ? a : b));
    const pName = players.find((p) => p.id === top.scorerId)?.name ?? "Player";
    setActiveWordBurst({ word: top.word, points: top.points, playerName: pName });

    if (fresh.length > 1) {
      const totalPts = fresh.reduce((sum, w) => sum + w.points, 0);
      setComboBanner(`🔥 MULTI-WORD COMBO! (+${totalPts} PTS)`);
    } else if (top.points >= 5) {
      setComboBanner(`🌟 BRILLIANT WORD! (+${top.points} PTS)`);
    }

    const t = setTimeout(() => {
      setActiveWordBurst(null);
      setComboBanner(null);
    }, 1500);
    return () => clearTimeout(t);
  }, [scoredWords, players]);

  const winnerName = players.find((p) => p.id === winnerId)?.name ?? "Vocab Champion";

  return (
    <div className="relative w-full max-w-5xl h-full flex flex-col items-center justify-between gap-4 p-4 sm:p-5 rounded-3xl bg-black/70 border-2 border-blue-500/40 shadow-2xl backdrop-blur-md min-h-0 overflow-hidden">
      {/* Signature Word Valid Burst Animation */}
      {activeWordBurst && (
        <WordBuildingWordBurst
          word={activeWordBurst.word}
          points={activeWordBurst.points}
          playerName={activeWordBurst.playerName}
          penColor="#2563EB"
          onComplete={() => setActiveWordBurst(null)}
        />
      )}

      {/* Combo Banner */}
      {comboBanner && <WordBuildingComboBanner text={comboBanner} />}

      {/* Match Winner Celebration Overlay */}
      {winnerId && (
        <WordBuildingWinnerCelebration winnerName={winnerName} />
      )}

      <div className="w-full flex items-center justify-between border-b border-blue-900/40 pb-2.5">
        <span className="text-xs font-mono uppercase tracking-widest text-blue-400 font-black">
          Word Building Stadium Arena
        </span>
        <span className="text-xs font-mono text-amber-300 font-black">
          {scoredWords.length} Words Scored
        </span>
      </div>

      {/* Player Scores Grid */}
      <div className="flex-1 w-full grid grid-cols-2 sm:grid-cols-4 gap-3 my-auto py-2">
        {players.map((p) => {
          const score = scores[p.id] ?? 0;
          const isActive = p.id === activePlayerId;
          const avatarObj = p.avatar ? findAvatar(p.avatar) : null;
          return (
            <div
              key={p.id}
              className={`p-3.5 rounded-2xl border-2 flex flex-col items-center justify-center text-center transition-all ${
                isActive
                  ? "bg-blue-500/25 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.4)] scale-105"
                  : "bg-stone-900/70 border-stone-800"
              }`}
            >
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-blue-400/50 mb-1.5 shadow-md">
                {avatarObj?.src ? (
                  <img src={avatarObj.src} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="flex items-center justify-center h-full font-black text-white text-xs">
                    {p.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="font-black text-amber-100 text-sm truncate max-w-full">{p.name}</span>
              <span className="text-2xl font-black font-mono text-blue-400 mt-1">{score} pts</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 8. Dots & Boxes TV Stadium with Box Claim Animations ──
function DotsBoxesTvBoard({
  gameState,
  players,
  activePlayerId,
}: {
  gameState: Record<string, unknown> | null;
  players: Player[];
  activePlayerId: string;
}) {
  const claims = (gameState?.claims as Array<{ r: number; c: number; ownerId: string }> | undefined) ?? [];
  const scores = (gameState?.scores as Record<string, number> | undefined) ?? {};
  const winnerId = (gameState?.winnerId as string | null) ?? null;

  const [activeMineBurst, setActiveMineBurst] = useState<string | null>(null);
  const [comboBanner, setComboBanner] = useState<string | null>(null);
  const prevClaimsLen = useRef<number>(0);

  useEffect(() => {
    if (claims.length > prevClaimsLen.current) {
      const latest = claims[claims.length - 1];
      if (latest) {
        const pName = players.find((p) => p.id === latest.ownerId)?.name ?? "Player";
        setActiveMineBurst(pName);
        if (claims.length - prevClaimsLen.current > 1) {
          setComboBanner("DOUBLE BOX! 🔥");
        }
      }
      prevClaimsLen.current = claims.length;

      const t = setTimeout(() => {
        setActiveMineBurst(null);
        setComboBanner(null);
      }, 1400);
      return () => clearTimeout(t);
    }
  }, [claims, players]);

  const winnerName = players.find((p) => p.id === winnerId)?.name ?? "Box Master";

  return (
    <div className="relative w-full max-w-5xl h-full flex flex-col items-center justify-between gap-4 p-4 sm:p-5 rounded-3xl bg-black/70 border-2 border-amber-500/40 shadow-2xl backdrop-blur-md min-h-0 overflow-hidden">
      {/* Signature "MINE!" Box Capture Burst Animation */}
      {activeMineBurst && (
        <DotsBoxesMineBurst
          playerName={activeMineBurst}
          penColor="#2563EB"
          onComplete={() => setActiveMineBurst(null)}
        />
      )}

      {/* Combo Banner */}
      {comboBanner && (
        <div className="absolute top-3 z-30 px-5 py-1.5 rounded-full bg-amber-500 text-stone-950 font-black text-sm uppercase tracking-wider animate-bounce shadow-xl">
          {comboBanner}
        </div>
      )}

      {/* Match Winner Celebration Overlay */}
      {winnerId && (
        <DotsBoxesWinnerCelebration winnerName={winnerName} />
      )}

      <div className="w-full flex items-center justify-between border-b border-amber-900/40 pb-2.5">
        <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-black">
          Dots & Boxes Live Arena
        </span>
        <span className="text-xs font-mono text-amber-300 font-black">
          {claims.length} Boxes Claimed
        </span>
      </div>

      {/* Player Dominance Bars */}
      <div className="flex-1 w-full grid grid-cols-2 sm:grid-cols-4 gap-3 my-auto py-2">
        {players.map((p) => {
          const score = scores[p.id] ?? 0;
          const isActive = p.id === activePlayerId;
          const avatarObj = p.avatar ? findAvatar(p.avatar) : null;
          return (
            <div
              key={p.id}
              className={`p-3.5 rounded-2xl border-2 flex flex-col items-center justify-center text-center transition-all ${
                isActive
                  ? "bg-amber-500/25 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)] scale-105"
                  : "bg-stone-900/70 border-stone-800"
              }`}
            >
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-amber-400/50 mb-1.5 shadow-md">
                {avatarObj?.src ? (
                  <img src={avatarObj.src} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="flex items-center justify-center h-full font-black text-white text-xs">
                    {p.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="font-black text-amber-100 text-sm truncate max-w-full">{p.name}</span>
              <span className="text-2xl font-black font-mono text-amber-400 mt-1">{score} boxes</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 9. Star Game TV Stadium with Star Completed Animations ──
function StarTvBoard({
  gameState,
  players,
  activePlayerId,
}: {
  gameState: Record<string, unknown> | null;
  players: Player[];
  activePlayerId: string;
}) {
  const winnerId = (gameState?.winnerId as string | null) ?? null;
  const starClaimant = (gameState?.lastStarClaimant as string | null) ?? null;
  const [activeStarBurst, setActiveStarBurst] = useState<string | null>(null);

  useEffect(() => {
    if (starClaimant) {
      const pName = players.find((p) => p.id === starClaimant)?.name ?? "Player";
      setActiveStarBurst(pName);
      const t = setTimeout(() => setActiveStarBurst(null), 1400);
      return () => clearTimeout(t);
    }
  }, [starClaimant, players]);

  const winnerName = players.find((p) => p.id === winnerId)?.name ?? "Galactic Star Master";

  return (
    <div className="relative w-full max-w-5xl h-full flex flex-col items-center justify-between gap-4 p-4 sm:p-5 rounded-3xl bg-black/70 border-2 border-yellow-500/40 shadow-2xl backdrop-blur-md min-h-0 overflow-hidden">
      {/* Signature Star Completed Animation Overlay */}
      {activeStarBurst && (
        <StarBurstOverlay playerName={activeStarBurst} onComplete={() => setActiveStarBurst(null)} />
      )}

      {/* Match Winner Celebration Overlay */}
      {winnerId && (
        <StarWinnerCelebration winnerName={winnerName} />
      )}

      <div className="w-full flex items-center justify-between border-b border-yellow-900/40 pb-2.5">
        <span className="text-xs font-mono uppercase tracking-widest text-yellow-400 font-black">
          ⭐ Star Game Galactic Arena ⭐
        </span>
      </div>

      <div className="flex-1 w-full grid grid-cols-2 sm:grid-cols-4 gap-3 my-auto py-2">
        {players.map((p) => {
          const isActive = p.id === activePlayerId;
          const avatarObj = p.avatar ? findAvatar(p.avatar) : null;
          return (
            <div
              key={p.id}
              className={`p-3.5 rounded-2xl border-2 flex flex-col items-center justify-center text-center transition-all ${
                isActive
                  ? "bg-yellow-500/25 border-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.4)] scale-105"
                  : "bg-stone-900/70 border-stone-800"
              }`}
            >
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-yellow-400/50 mb-1.5 shadow-md">
                {avatarObj?.src ? (
                  <img src={avatarObj.src} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="flex items-center justify-center h-full font-black text-white text-xs">
                    {p.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="font-black text-amber-100 text-sm truncate max-w-full">{p.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 10. Bingo TV Stadium with 3D Ball Called Animations ──
function BingoTvBoard({
  gameState,
  players,
  activePlayerId,
}: {
  gameState: Record<string, unknown> | null;
  players: Player[];
  activePlayerId: string;
}) {
  const calledNumbers = (gameState?.calledNumbers as number[] | undefined) ?? [];
  const latestNumber = calledNumbers[calledNumbers.length - 1] ?? null;
  const winnerId = (gameState?.winnerId as string | null) ?? null;

  const [activeBall, setActiveBall] = useState<number | null>(null);
  const prevNumberRef = useRef<number | null>(null);

  useEffect(() => {
    if (latestNumber && latestNumber !== prevNumberRef.current) {
      prevNumberRef.current = latestNumber;
      setActiveBall(latestNumber);
      const t = setTimeout(() => setActiveBall(null), 1200);
      return () => clearTimeout(t);
    }
  }, [latestNumber]);

  const winnerName = players.find((p) => p.id === winnerId)?.name ?? "Bingo Champion";

  return (
    <div className="relative w-full max-w-5xl h-full flex flex-col items-center justify-between gap-4 p-4 sm:p-5 rounded-3xl bg-black/70 border-2 border-pink-500/40 shadow-2xl backdrop-blur-md min-h-0 overflow-hidden">
      {/* Signature 3D Ball Called Overlay Animation */}
      {activeBall && (
        <BingoBallCalledOverlay number={activeBall} onComplete={() => setActiveBall(null)} />
      )}

      {/* Match Winner Celebration Overlay */}
      {winnerId && (
        <BingoWinnerCelebration winnerName={winnerName} />
      )}

      <div className="w-full flex items-center justify-between border-b border-pink-900/40 pb-2.5">
        <span className="text-xs font-mono uppercase tracking-widest text-pink-400 font-black">
          🎱 Live Bingo Tumbler Stadium 🎱
        </span>
        <span className="text-xs font-mono text-amber-300 font-black">
          {calledNumbers.length} Balls Called
        </span>
      </div>

      {/* Center 3D Ball Indicator */}
      <div className="flex-1 flex flex-col items-center justify-center my-auto py-2">
        <div className="w-32 h-32 rounded-full border-4 border-amber-400 bg-gradient-to-br from-amber-200 via-amber-400 to-yellow-600 flex items-center justify-center shadow-[0_0_50px_rgba(245,158,11,0.5)]">
          <span className="text-5xl font-black font-mono text-stone-950">
            {latestNumber ?? "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── 11. Name Place Animal Thing TV Stadium with Letter Reveal Animations ──
function NpatTvBoard({
  gameState,
  players,
  activePlayerId: _activePlayerId,
}: {
  gameState: Record<string, unknown> | null;
  players: Player[];
  activePlayerId: string;
}) {
  const currentLetter = (gameState?.currentLetter as string | undefined) ?? null;
  const winnerId = (gameState?.winnerId as string | null) ?? null;

  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const prevLetterRef = useRef<string | null>(null);

  useEffect(() => {
    if (currentLetter && currentLetter !== prevLetterRef.current) {
      prevLetterRef.current = currentLetter;
      setActiveLetter(currentLetter);
      const t = setTimeout(() => setActiveLetter(null), 1300);
      return () => clearTimeout(t);
    }
  }, [currentLetter]);

  const winnerName = players.find((p) => p.id === winnerId)?.name ?? "Trivia Champion";

  return (
    <div className="relative w-full max-w-5xl h-full flex flex-col items-center justify-between gap-4 p-4 sm:p-5 rounded-3xl bg-black/70 border-2 border-purple-500/40 shadow-2xl backdrop-blur-md min-h-0 overflow-hidden">
      {/* Signature Letter Reveal Burst Animation */}
      {activeLetter && (
        <NpatLetterRevealBurst letter={activeLetter} onComplete={() => setActiveLetter(null)} />
      )}

      {/* Match Winner Celebration Overlay */}
      {winnerId && (
        <NpatWinnerCelebration winnerName={winnerName} />
      )}

      <div className="w-full flex items-center justify-between border-b border-purple-900/40 pb-2.5">
        <span className="text-xs font-mono uppercase tracking-widest text-purple-400 font-black">
          Name Place Animal Thing Live Arena
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center my-auto py-2">
        <div className="w-28 h-28 rounded-3xl border-4 border-amber-300 bg-gradient-to-br from-yellow-300 to-amber-500 flex items-center justify-center shadow-2xl">
          <span className="text-6xl font-black text-stone-950 font-mono">
            {currentLetter ?? "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── 12. Generic / Universal Fallback TV Board ──
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
