import { useState, useEffect, useCallback } from "react";
import type { SnakeTheme } from "@shared/types";
import SnakeCanvas from "./SnakeCanvas";
import { RulesModal, type SnakeBoardProps } from "./SnakeBoardMobile";
import { useHaptics } from "../../hooks/useHaptics";
import { SNAKE_THEME_CHROME, THEME_LABELS, SNAKE_THEMES } from "./snakeChrome";

export default function SnakeBoardDesktop({ state, selfId, onMove }: SnakeBoardProps) {
  const [showRules, setShowRules] = useState(false);
  const [activeTheme, setActiveTheme] = useState<SnakeTheme>(state.theme || "nokia-monochrome");
  const haptics = useHaptics();

  useEffect(() => {
    if (state.theme) setActiveTheme(state.theme);
  }, [state.theme]);

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
        haptics.turn();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onMove, haptics]);

  const chrome = SNAKE_THEME_CHROME[activeTheme];
  const onEat = useCallback(() => haptics.subtle(), [haptics]);
  const onDeath = useCallback(() => haptics.win(), [haptics]);

  return (
    <div className={`mx-auto my-4 max-w-5xl rounded-3xl p-6 shadow-2xl ${chrome.outer}`}>
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Side panel */}
        <aside className={`col-span-4 space-y-5 rounded-2xl border-2 p-5 ${chrome.panel}`}>
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className={`text-base font-bold tracking-wide ${chrome.panelTitle}`}>Snake Arcade</h2>
            <span className="rounded border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
              Live
            </span>
          </div>

          <p className="text-xs leading-relaxed opacity-80">
            Steer with Arrow keys, WASD, or Numpad. Eat food to grow and outlast your opponents.
          </p>

          <div className="space-y-2">
            <span className="block text-[11px] font-bold uppercase tracking-wider opacity-70">Arcade Theme</span>
            <div className="grid grid-cols-3 gap-1.5">
              {SNAKE_THEMES.map((th) => (
                <button
                  key={th}
                  onClick={() => setActiveTheme(th)}
                  className={`rounded-lg px-2 py-1.5 text-[10px] font-bold transition ${
                    activeTheme === th ? "bg-amber-400 text-black shadow" : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  {THEME_LABELS[th]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 border-t border-white/10 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">Leaderboard</h3>
            <div className="space-y-2">
              {[...state.players]
                .sort((a, b) => b.score - a.score)
                .map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 p-2.5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className={`font-bold ${p.isAlive ? "" : "line-through opacity-50"}`}>
                        {p.id === selfId ? "You" : `Player ${p.id.slice(0, 4)}`}
                      </span>
                    </div>
                    <span className="font-bold text-amber-300">{p.score}</span>
                  </div>
                ))}
            </div>
          </div>

          <button
            onClick={() => setShowRules(true)}
            className="w-full rounded-xl bg-amber-400 py-2.5 text-xs font-bold uppercase tracking-wider text-black shadow transition hover:bg-amber-300"
          >
            How to Play
          </button>
        </aside>

        {/* Playfield */}
        <div className={`col-span-8 space-y-4 rounded-2xl p-6 shadow-2xl ${chrome.screen}`}>
          <div className={`flex items-center justify-between border-b-2 pb-2 text-sm font-bold uppercase ${chrome.header}`}>
            <span>
              Matrix {state.gridSize}×{state.gridSize}
            </span>
            <div className="flex items-center gap-3 text-xs">
              <span className="rounded border border-amber-400/40 bg-amber-400/20 px-2 py-0.5 font-extrabold text-amber-300">
                Level {state.level ?? 1}
              </span>
              <span>{state.wallMode === "wrap" ? "Wrap" : "Solid Walls"}</span>
            </div>
          </div>

          <div className="mx-auto max-w-[520px]">
            <SnakeCanvas state={state} selfId={selfId} theme={activeTheme} onEat={onEat} onDeath={onDeath} />
          </div>
        </div>
      </div>

      <RulesModal open={showRules} onClose={() => setShowRules(false)} />
    </div>
  );
}
