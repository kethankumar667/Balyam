import { useState, useEffect, useRef, useCallback } from "react";
import type { SnakePublicState, SnakeTheme } from "@shared/types";
import { AnimatePresence, motion } from "framer-motion";
import SnakeCanvas from "./SnakeCanvas";
import { useHaptics } from "../../hooks/useHaptics";
import { SNAKE_THEME_CHROME, THEME_LABELS, SNAKE_THEMES } from "./snakeChrome";

export interface SnakeBoardProps {
  state: SnakePublicState;
  selfId: string;
  onMove: (type: string, data?: unknown) => void;
}

export default function SnakeBoardMobile({ state, selfId, onMove }: SnakeBoardProps) {
  const [showRules, setShowRules] = useState(false);
  const [activeTheme, setActiveTheme] = useState<SnakeTheme>(state.theme || "nokia-monochrome");
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const haptics = useHaptics();

  useEffect(() => {
    if (state.theme) setActiveTheme(state.theme);
  }, [state.theme]);

  const handleTurn = useCallback(
    (dir: string) => {
      onMove("turn", { dir });
      haptics.turn();
    },
    [onMove, haptics],
  );

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) handleTurn(dx > 0 ? "RIGHT" : "LEFT");
    else handleTurn(dy > 0 ? "DOWN" : "UP");
  };

  const chrome = SNAKE_THEME_CHROME[activeTheme];
  const onEat = useCallback(() => haptics.subtle(), [haptics]);
  const onDeath = useCallback(() => haptics.win(), [haptics]);

  return (
    <div className={`flex flex-col h-full min-h-screen gap-3 p-3 select-none ${chrome.outer}`}>
      {/* Screen */}
      <div className={`flex flex-col gap-2 rounded-2xl p-3 shadow-xl ${chrome.screen}`}>
        <div className={`flex items-center justify-between border-b pb-1.5 text-[11px] font-bold uppercase tracking-wide ${chrome.header}`}>
          <div className="flex items-center gap-2">
            <span className={chrome.title}>Snake</span>
            <button
              onClick={() => setShowRules(true)}
              className={`rounded px-2 py-0.5 text-[10px] font-bold ${chrome.pill}`}
            >
              Rules
            </button>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className={`rounded px-1.5 py-0.5 font-extrabold ${chrome.badge}`}>LVL {state.level ?? 1}</span>
            <span>{state.wallMode === "wrap" ? "WRAP" : "SOLID"}</span>
          </div>
        </div>

        <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <SnakeCanvas state={state} selfId={selfId} theme={activeTheme} onEat={onEat} onDeath={onDeath} />
        </div>

        <div className="flex items-center justify-between gap-2 pt-0.5">
          {state.players.map((p) => (
            <div key={p.id} className="flex items-center gap-1.5 text-[11px] font-bold">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
              <span className={p.isAlive ? "" : "line-through opacity-50"}>
                {p.id === selfId ? "You" : p.id.slice(0, 4)}
              </span>
              <span className="font-extrabold">{p.score}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Theme switcher */}
      <div className="flex justify-center gap-2 rounded-xl border border-white/10 bg-black/20 p-2">
        {SNAKE_THEMES.map((th) => (
          <button
            key={th}
            onClick={() => setActiveTheme(th)}
            className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase transition ${
              activeTheme === th ? "bg-amber-400 text-black shadow" : "bg-black/40 text-white/70"
            }`}
          >
            {THEME_LABELS[th]}
          </button>
        ))}
      </div>

      {/* D-pad */}
      <div className={`mt-auto flex flex-col items-center gap-2 rounded-3xl p-3 shadow-xl ${chrome.keypad}`}>
        <DPadButton chrome={chrome} label="Up" glyph="▲" onClick={() => handleTurn("UP")} />
        <div className="flex gap-4">
          <DPadButton chrome={chrome} label="Left" glyph="◄" onClick={() => handleTurn("LEFT")} />
          <DPadButton chrome={chrome} label="Down" glyph="▼" onClick={() => handleTurn("DOWN")} />
          <DPadButton chrome={chrome} label="Right" glyph="►" onClick={() => handleTurn("RIGHT")} />
        </div>
      </div>

      <RulesModal open={showRules} onClose={() => setShowRules(false)} />
    </div>
  );
}

function DPadButton({
  chrome,
  label,
  glyph,
  onClick,
}: {
  chrome: (typeof SNAKE_THEME_CHROME)[SnakeTheme];
  label: string;
  glyph: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`h-12 w-16 rounded-xl border-2 text-xl font-bold shadow active:scale-95 ${chrome.keyBtn}`}
    >
      {glyph}
    </button>
  );
}

export function RulesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm space-y-4 rounded-2xl border-2 border-amber-400/60 bg-slate-900 p-6 text-slate-100 shadow-2xl"
          >
            <h3 className="font-mono text-lg font-bold text-amber-400">How to Play</h3>
            <div className="space-y-2 text-xs leading-relaxed text-slate-300">
              <p>Steer with the D-pad or by swiping across the screen.</p>
              <p>Eat glowing food to score and grow longer.</p>
              <p>Avoid obstacles and snake bodies. In Solid mode, walls are deadly; in Wrap mode you pass through edges.</p>
              <p>Outlast your opponents to win the match.</p>
            </div>
            <button
              onClick={onClose}
              className="w-full rounded-xl bg-amber-400 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-950"
            >
              Got it
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
