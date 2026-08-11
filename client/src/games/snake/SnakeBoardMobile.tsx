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
    /*
     * No `min-h-screen` here. It resolves to 100vh, which on a phone is the
     * toolbar-HIDDEN height — taller than the visible viewport — and this
     * board renders inside Room's padded container, so a full-viewport child
     * overflowed by exactly that padding. Snake is not a full-bleed game
     * (its desktop shell is a centred card), so it sizes to its content and
     * the page scrolls normally if a handset is short.
     */
    <div className={`flex min-h-0 flex-col gap-3 p-3 select-none transition-colors duration-500 rounded-3xl ${chrome.outerBg}`}>
      {/* Screen Container */}
      <div className={`flex flex-col gap-2 rounded-2xl p-3 shadow-xl backdrop-blur-md border ${chrome.panelBg} ${chrome.panelBorder}`}>
        <div className={`flex items-center justify-between border-b border-white/10 pb-2 text-[11px] font-black uppercase tracking-wide ${chrome.headerText}`}>
          <div className="flex items-center gap-2">
            <span className="text-base">🐍</span>
            <span className="font-extrabold">Snake</span>
            <button
              onClick={() => setShowRules(true)}
              className={`rounded-lg px-2 py-0.5 text-[10px] font-extrabold uppercase transition ${chrome.pillActive}`}
            >
              Rules
            </button>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="rounded-lg bg-amber-400/20 px-2 py-0.5 font-extrabold text-amber-300 border border-amber-400/30">
              LVL {state.level ?? 1}
            </span>
            <span className="opacity-80 font-bold">{state.wallMode === "wrap" ? "WRAP" : "SOLID"}</span>
          </div>
        </div>

        {/* `touch-none` is load-bearing: without it a downward swipe turns the
            snake AND scrolls the page, so steering fights the browser. */}
        <div className="touch-none" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <SnakeCanvas state={state} selfId={selfId} theme={activeTheme} onEat={onEat} onDeath={onDeath} />
        </div>

        <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
          {state.players.map((p) => (
            <div key={p.id} className="flex items-center gap-1.5 text-[11px] font-bold">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
              <span className={p.isAlive ? "" : "line-through opacity-50"}>
                {p.id === selfId ? "You" : p.name}
              </span>
              <span className={`font-black ${chrome.accentText}`}>{p.score}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Theme switcher */}
      <div className={`flex justify-center gap-2 rounded-2xl p-2 backdrop-blur-md border ${chrome.panelBg} ${chrome.panelBorder}`}>
        {SNAKE_THEMES.map((th) => (
          <button
            key={th}
            onClick={() => setActiveTheme(th)}
            className={`rounded-xl px-3 py-1.5 text-[10px] font-black uppercase transition ${
              activeTheme === th ? chrome.pillActive : chrome.pillInactive
            }`}
          >
            {THEME_LABELS[th]}
          </button>
        ))}
      </div>

      {/* D-pad */}
      <div className={`mt-auto flex flex-col items-center gap-2 rounded-3xl p-4 shadow-xl backdrop-blur-md border ${chrome.panelBg} ${chrome.panelBorder}`}>
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
      className={`h-12 w-16 rounded-2xl border text-xl font-bold shadow-md transition active:scale-95 ${chrome.dpadBtn}`}
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
