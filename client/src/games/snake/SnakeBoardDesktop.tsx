import { useState, useEffect, useCallback, useRef } from "react";
import type { SnakeTheme } from "@shared/types";
import SnakeCanvas from "./SnakeCanvas";
import { RulesModal, type SnakeBoardProps } from "./SnakeBoardMobile";
import { useHaptics } from "../../hooks/useHaptics";
import { SNAKE_THEME_CHROME, THEME_LABELS, SNAKE_THEMES } from "./snakeChrome";
import SeatAvatar from "../../components/profile/SeatAvatar";
import InlineRoomRail from "../../components/InlineRoomRail";
import FloatingReactionsLayer from "../../components/reactions/FloatingReactionsLayer";
import { useSeatReactions } from "../../components/reactions/useSeatReactions";
import SeatTargetReactionWheel from "../../components/reactions/SeatTargetReactionWheel";

export default function SnakeBoardDesktop({ state, selfId, onMove, players, messages, roomCode, roomPhase }: SnakeBoardProps) {
  const [showRules, setShowRules] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [activeTheme, setActiveTheme] = useState<SnakeTheme>(state.theme || "nokia-monochrome");
  const [elapsedSec, setElapsedSec] = useState(0);
  const haptics = useHaptics();
  const reactions = useSeatReactions(selfId);

  const [bestScore, setBestScore] = useState<number>(() => {
    return parseInt(localStorage.getItem("mpg.snake.best") || "0", 10);
  });

  useEffect(() => {
    if (state.theme) setActiveTheme(state.theme);
  }, [state.theme]);

  // Track match elapsed time
  useEffect(() => {
    if (state.isOver) return;
    const interval = setInterval(() => {
      setElapsedSec((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [state.isOver]);

  // Track best score
  const mySnake = state.snakes[selfId];
  const myPlayer = state.players.find((p) => p.id === selfId);
  const myScore = myPlayer?.score ?? 0;

  useEffect(() => {
    if (myScore > bestScore) {
      setBestScore(myScore);
      localStorage.setItem("mpg.snake.best", myScore.toString());
    }
  }, [myScore, bestScore]);

  // Keyboard controls & Pause shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      let dir: string | null = null;
      if (["ArrowUp", "w", "W", "8"].includes(e.key)) dir = "UP";
      else if (["ArrowDown", "s", "S", "2"].includes(e.key)) dir = "DOWN";
      else if (["ArrowLeft", "a", "A", "4"].includes(e.key)) dir = "LEFT";
      else if (["ArrowRight", "d", "D", "6"].includes(e.key)) dir = "RIGHT";

      if (dir) {
        e.preventDefault();
        onMove("turn", { dir });
      } else if (["p", "P", "Escape", " "].includes(e.key)) {
        e.preventDefault();
        onMove("togglePause");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onMove]);

  const handleDpadTurn = (dir: string) => {
    onMove("turn", { dir });
  };

  const chrome = SNAKE_THEME_CHROME[activeTheme];
  const onEat = useCallback(() => haptics.subtle(), [haptics]);
  const onDeath = useCallback(() => haptics.win(), [haptics]);

  // Haptic feedback on game over finish
  const prevOverRef = useRef(false);
  useEffect(() => {
    if (state.isOver && !prevOverRef.current) {
      haptics.win();
    }
    prevOverRef.current = !!state.isOver;
  }, [state.isOver, haptics]);

  // Avatar lookup: `state.players` is the engine's public DTO and has no
  // `avatar` field, so seats look their picture up from the full room roster.
  const avatarById = new Map<string, string | undefined>();
  for (const r of players) avatarById.set(r.id, r.avatar);

  // Rank calculation
  const sortedPlayers = [...state.players].sort((a, b) => b.score - a.score);
  const userRankIdx = sortedPlayers.findIndex((p) => p.id === selfId);
  const userRank = userRankIdx >= 0 ? userRankIdx + 1 : 1;

  const formatTime = (totalSec: number) => {
    const m = Math.floor(totalSec / 60).toString().padStart(2, "0");
    const s = (totalSec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className={`min-h-screen w-full p-4 transition-colors duration-500 ${chrome.outerBg}`}>
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-12 gap-5 items-start">
          
          {/* LEFT SIDEBAR: Header, Theme, Leaderboard, Stats, Actions */}
          <aside className={`col-span-4 space-y-4 rounded-3xl border p-5 backdrop-blur-md transition-all duration-300 ${chrome.panelBg} ${chrome.panelBorder}`}>
            
            {/* Mascot & Header */}
            <div className="flex items-center gap-3.5">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 border border-emerald-500/40 shadow-inner">
                <span className="text-3xl animate-bounce">🐍</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className={`text-2xl font-black tracking-wide uppercase ${chrome.headerText}`}>Snake</h1>
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold uppercase text-emerald-400 border border-emerald-500/30">
                    Live
                  </span>
                </div>
                <p className={`text-[11px] font-extrabold tracking-widest uppercase ${chrome.subText}`}>Arcade</p>
              </div>
            </div>

            {roomCode && (
              <InlineRoomRail
                code={roomCode}
                game="snake"
                phase={roomPhase ?? "playing"}
                players={players}
                selfId={selfId}
                messages={messages ?? []}
              />
            )}

            <p className={`text-xs leading-relaxed ${chrome.subText}`}>
              Steer your snake, eat food, grow longer and outlast your opponents!
            </p>

            {/* Theme Selector Pills */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider opacity-90">
                <span>🎨</span> <span>Theme</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {SNAKE_THEMES.map((th) => (
                  <button
                    key={th}
                    onClick={() => setActiveTheme(th)}
                    className={`rounded-xl px-2 py-2 text-[11px] transition-all duration-200 ${
                      activeTheme === th ? chrome.pillActive : chrome.pillInactive
                    }`}
                  >
                    {THEME_LABELS[th]}
                  </button>
                ))}
              </div>
            </div>

            {/* Leaderboard */}
            <div className="space-y-2 border-t border-white/10 pt-3">
              <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider opacity-90">
                <span>👑</span> <span>Leaderboard</span>
              </div>
              <div className="space-y-1.5">
                {sortedPlayers.map((p, idx) => {
                  const isSelf = p.id === selfId;
                  const isTargetActive = reactions.activeTargetId === p.id;
                  return (
                    <div
                      key={p.id}
                      ref={reactions.registerCardRef(p.id)}
                      className={`relative flex items-center justify-between rounded-xl px-3 py-2 text-xs border ${chrome.cardBg} ${!isSelf ? "cursor-pointer hover:border-emerald-400/60 active:scale-[0.99]" : ""}`}
                      onClick={!isSelf ? () => reactions.openTarget(p.id) : undefined}
                      title={!isSelf ? `Tap to react at ${p.name}` : undefined}
                    >
                      {isTargetActive && (
                        <SeatTargetReactionWheel
                          game="snake"
                          targetPlayerId={p.id}
                          targetPlayerName={p.name}
                          onClose={reactions.closeTarget}
                          position="left"
                        />
                      )}
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold">
                          {idx + 1}
                        </span>
                        <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: p.color }} />
                        <SeatAvatar avatar={avatarById.get(p.id)} name={p.name} className="w-6 h-6" textClassName="text-[9px]" />
                        <span className={`font-extrabold ${p.isAlive ? "" : "line-through opacity-50"}`}>
                          {isSelf ? "You" : p.name}
                        </span>
                      </div>
                      <span className={`font-black ${chrome.accentText}`}>{p.score}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3 Stats Boxes */}
            <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-3">
              <div className={`rounded-xl p-2.5 text-center border ${chrome.cardBg}`}>
                <div className="text-sm">🏆</div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-70">Score</div>
                <div className={`text-lg font-black ${chrome.accentText}`}>{myScore}</div>
              </div>
              <div className={`rounded-xl p-2.5 text-center border ${chrome.cardBg}`}>
                <div className="text-sm">🔆</div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-70">Best</div>
                <div className={`text-lg font-black ${chrome.accentText}`}>{bestScore}</div>
              </div>
              <div className={`rounded-xl p-2.5 text-center border ${chrome.cardBg}`}>
                <div className="text-sm">📊</div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-70">Rank</div>
                <div className={`text-lg font-black ${chrome.accentText}`}>#{userRank}</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => onMove("togglePause")}
                className={`w-full rounded-2xl py-3 text-xs font-black uppercase tracking-wider transition ${
                  state.isPaused ? chrome.btnPrimary : chrome.btnSecondary
                }`}
              >
                {state.isPaused ? "▶ Resume Game" : "⏸ Pause Game"}
              </button>
              <button
                onClick={() => setShowRules(true)}
                className={`w-full rounded-2xl py-2.5 text-xs font-extrabold uppercase tracking-wider transition ${chrome.btnSecondary}`}
              >
                ▶ How to Play
              </button>
            </div>
          </aside>

          {/* CENTER PLAYFIELD: Screen Canvas */}
          <div className="col-span-5 space-y-3">
            <div className={`rounded-3xl border-2 p-4 shadow-2xl backdrop-blur-md transition-all duration-300 ${chrome.panelBg} ${chrome.panelBorder}`}>
              
              {/* Header inside screen */}
              <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2.5 text-xs font-black uppercase tracking-wider">
                <span className={chrome.headerText}>
                  MATRIX {state.gridSize} × {state.gridSize}
                </span>
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-amber-400/20 px-2.5 py-1 text-[11px] font-black text-amber-300 border border-amber-400/30">
                    ⭐ LEVEL {state.level ?? 1}
                  </span>
                  <span className="rounded-lg bg-white/10 px-2.5 py-1 text-[10px] font-extrabold text-white/80">
                    {state.wallMode === "wrap" ? "WRAP" : "WALLS"}
                  </span>
                </div>
              </div>

              {/* Grid Canvas */}
              <div className={`relative overflow-hidden rounded-2xl border ${chrome.screenBorder}`}>
                <SnakeCanvas state={state} selfId={selfId} theme={activeTheme} onEat={onEat} onDeath={onDeath} />
                {state.isPaused && (
                  <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md p-4 text-center">
                    <div className="text-5xl animate-bounce">⏸️</div>
                    <h2 className="mt-3 text-2xl font-black uppercase tracking-wider text-amber-400">Game Paused</h2>
                    <p className="mt-1 text-xs text-white/70">Press P, Space, Esc, or click Resume to continue</p>
                    <button
                      onClick={() => onMove("resume")}
                      className="mt-5 rounded-2xl bg-gradient-to-r from-emerald-400 to-green-500 px-7 py-3 text-xs font-black uppercase text-black shadow-lg transition hover:brightness-110 active:scale-95"
                    >
                      ▶ Resume Game
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Tip Bar */}
            <div className={`rounded-2xl px-4 py-2.5 text-center text-xs font-semibold backdrop-blur-md border ${chrome.tipBg}`}>
              💡 <span className={chrome.tipText}>Tip: Plan your moves. Don't run into yourself!</span>
            </div>
          </div>

          {/* RIGHT SIDEBAR: D-Pad & Quick Stats */}
          <aside className="col-span-3 space-y-4">
            
            {/* DIRECTION D-Pad */}
            <div className={`rounded-3xl border p-5 backdrop-blur-md transition-all duration-300 ${chrome.panelBg} ${chrome.panelBorder}`}>
              <h3 className="mb-4 text-center text-xs font-black uppercase tracking-widest opacity-80">
                Direction
              </h3>
              <div className="mx-auto grid grid-cols-3 gap-2 max-w-[170px]">
                <div />
                <button
                  onClick={() => handleDpadTurn("UP")}
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-bold transition shadow-lg active:scale-95 ${chrome.dpadBtn}`}
                >
                  ↑
                </button>
                <div />
                <button
                  onClick={() => handleDpadTurn("LEFT")}
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-bold transition shadow-lg active:scale-95 ${chrome.dpadBtn}`}
                >
                  ←
                </button>
                <div />
                <button
                  onClick={() => handleDpadTurn("RIGHT")}
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-bold transition shadow-lg active:scale-95 ${chrome.dpadBtn}`}
                >
                  →
                </button>
                <div />
                <button
                  onClick={() => handleDpadTurn("DOWN")}
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-bold transition shadow-lg active:scale-95 ${chrome.dpadBtn}`}
                >
                  ↓
                </button>
                <div />
              </div>
            </div>

            {/* QUICK STATS */}
            <div className={`rounded-3xl border p-5 backdrop-blur-md transition-all duration-300 space-y-3 ${chrome.panelBg} ${chrome.panelBorder}`}>
              <h3 className="text-xs font-black uppercase tracking-widest opacity-80">
                Quick Stats
              </h3>
              <div className="space-y-2.5">
                <div className={`flex items-center justify-between rounded-xl px-3 py-2.5 border ${chrome.cardBg}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-base">🐍</span>
                    <span className="text-xs font-bold opacity-80">Length</span>
                  </div>
                  <span className={`text-sm font-black ${chrome.accentText}`}>
                    {mySnake?.body?.length ?? 3}
                  </span>
                </div>

                <div className={`flex items-center justify-between rounded-xl px-3 py-2.5 border ${chrome.cardBg}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-base">🍎</span>
                    <span className="text-xs font-bold opacity-80">Food Eaten</span>
                  </div>
                  <span className={`text-sm font-black ${chrome.accentText}`}>
                    {Math.floor(myScore / 2)}
                  </span>
                </div>

                <div className={`flex items-center justify-between rounded-xl px-3 py-2.5 border ${chrome.cardBg}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-base">⏱️</span>
                    <span className="text-xs font-bold opacity-80">Time</span>
                  </div>
                  <span className={`font-mono text-sm font-black ${chrome.accentText}`}>
                    {formatTime(elapsedSec)}
                  </span>
                </div>
              </div>
            </div>
          </aside>

        </div>
      </div>

      <RulesModal open={showRules} onClose={() => setShowRules(false)} />
      <FloatingReactionsLayer reactions={reactions.items} anchorOf={reactions.anchorOf} />
    </div>
  );
}
