import { useState, useEffect, useRef, useCallback } from "react";
import type { Player, SnakePublicState, SnakeTheme } from "@shared/types";
import { AnimatePresence, motion } from "framer-motion";
import SnakeCanvas from "./SnakeCanvas";
import QuadDPad, { type PadDir } from "../../components/QuadDPad";
import { useHaptics } from "../../hooks/useHaptics";
import { SNAKE_THEME_CHROME, THEME_LABELS, SNAKE_THEMES } from "./snakeChrome";

export interface SnakeBoardProps {
  state: SnakePublicState;
  selfId: string;
  onMove: (type: string, data?: unknown) => void;
  /** Full room roster (carries `avatar`), used to draw each seat's picture. */
  players: Player[];
}

export default function SnakeBoardMobile({ state, selfId, onMove }: SnakeBoardProps) {
  const [showRules, setShowRules] = useState(false);
  const [activeTheme, setActiveTheme] = useState<SnakeTheme>(state.theme || "nokia-monochrome");
  const [isMuted, setIsMuted] = useState(false);
  const swipeRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const haptics = useHaptics();

  useEffect(() => {
    if (state.theme) setActiveTheme(state.theme);
  }, [state.theme]);

  // `onMove` is a new closure on every broadcast; the pad and the swipe
  // handler both read it from here so neither can hold a stale one.
  const moveRef = useRef(onMove);
  moveRef.current = onMove;

  const handleTurn = useCallback(
    (dir: PadDir) => {
      moveRef.current("turn", { dir });
      haptics.subtle();
    },
    [haptics],
  );

  /**
   * Swiping the playfield, on pointer events rather than touch.
   *
   * Two things were wrong with the old version. It only decided on
   * `touchend`, so a turn landed when the finger LIFTED — at 8 steps a second
   * that is most of a cell too late, and it is why swiping felt like it was
   * ignoring you. And the 24px threshold meant a quick flick that travelled
   * 20px did nothing at all.
   *
   * Now the direction fires the moment the swipe is unambiguous, and the
   * origin resets so one continuous drag can round a corner: swipe right,
   * keep going down, and both turns queue.
   */
  const handleSwipeStart = (e: React.PointerEvent) => {
    swipeRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };

  const handleSwipeMove = (e: React.PointerEvent) => {
    const origin = swipeRef.current;
    if (!origin || origin.id !== e.pointerId) return;
    const dx = e.clientX - origin.x;
    const dy = e.clientY - origin.y;
    const THRESHOLD = 16;
    if (Math.abs(dx) < THRESHOLD && Math.abs(dy) < THRESHOLD) return;
    handleTurn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "RIGHT" : "LEFT") : dy > 0 ? "DOWN" : "UP");
    swipeRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };

  const handleSwipeEnd = () => {
    swipeRef.current = null;
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

  const me = state.players.find((p) => p.id === selfId);

  return (
    <div className="w-full h-full min-h-[calc(100vh-64px)] flex flex-col items-center justify-between bg-[#060810] text-white p-1.5 sm:p-2.5 select-none touch-none overflow-hidden">
      
      {/* CYBER ARCADE HANDHELD CONSOLE SHELL */}
      <div className="w-full max-w-[460px] h-full flex-1 flex flex-col justify-between items-center bg-gradient-to-b from-[#121526] via-[#181c33] to-[#0c0e1a] border-2 border-[#00ff88]/30 rounded-3xl p-2.5 sm:p-3.5 shadow-[0_0_30px_rgba(0,255,136,0.15)] gap-2 overflow-hidden">
        
        {/* TOP STATUS LED HEADER BAR */}
        <div className="w-full flex items-center justify-between px-1 text-[11px] font-mono shrink-0 h-[24px]">
          <div className="flex items-center gap-2">
            <span className="font-black text-[#00ff88] flex items-center gap-1.5 tracking-wider">
              <span className="text-sm">🐍</span> SNAKE
            </span>
            <button
              onClick={() => onMove("togglePause")}
              className="px-2 py-0.5 rounded-lg bg-[#2e1065] text-[#f0abfc] border border-[#7e22ce] text-[9px] font-black uppercase shadow-[0_0_8px_rgba(192,132,252,0.4)]"
            >
              {state.isPaused ? "▶ RESUME" : "⏸ PAUSE"}
            </button>
            <button
              onClick={() => setShowRules(true)}
              className="px-2 py-0.5 rounded-lg bg-[#181a28] text-[#8e9ab5] border border-[#2e344e] text-[9px] font-bold uppercase"
            >
              RULES
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black">
              LVL {state.level ?? 1}
            </span>
            <span className="font-extrabold text-[#00ff88] text-[10px] tabular-nums">
              SCORE {(me?.score ?? 0).toString().padStart(4, "0")}
            </span>
          </div>
        </div>

        {/* 1. TOP CARD: GAME SCREEN DISPLAY & HUD CHIPS (EXACT 50% FLEX SHARE) */}
        <div className="w-full flex-1 h-[48%] bg-[#080b14] border-2 border-[#00ff88]/20 rounded-2xl p-2 shadow-[inset_0_0_20px_rgba(0,0,0,0.9)] flex flex-col justify-between relative min-h-0">
          
          {/* CANVAS PLAYFIELD */}
          <div
            className="relative w-full flex-1 flex items-center justify-center overflow-hidden min-h-0"
            style={{ touchAction: "none" }}
            onPointerDown={handleSwipeStart}
            onPointerMove={handleSwipeMove}
            onPointerUp={handleSwipeEnd}
            onPointerCancel={handleSwipeEnd}
          >
            <SnakeCanvas state={state} selfId={selfId} theme={activeTheme} onEat={onEat} onDeath={onDeath} className="h-full max-h-full aspect-square" />
            {state.isPaused && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-4 text-center rounded-xl">
                <div className="text-3xl animate-bounce">⏸️</div>
                <h2 className="mt-2 text-lg font-black uppercase tracking-wider text-amber-400">Game Paused</h2>
                <button
                  onClick={() => onMove("resume")}
                  className="mt-3 rounded-xl bg-gradient-to-r from-emerald-400 to-green-500 px-5 py-2 text-xs font-black uppercase text-black shadow-lg active:scale-95"
                >
                  ▶ Resume Game
                </button>
              </div>
            )}
          </div>

          {/* BOTTOM STATS CHIPS ROW */}
          <div className="w-full grid grid-cols-3 gap-1.5 pt-1.5 border-t border-white/10 shrink-0 text-[10px]">
            <div className="bg-[#121626] border border-[#262c45] rounded-xl px-2 py-1 flex items-center gap-1.5">
              <span className="text-xs">❤️</span>
              <div>
                <div className="text-[8px] font-bold text-[#8e9ab5] uppercase">LIVES</div>
                <div className="font-extrabold text-pink-400 leading-none">3</div>
              </div>
            </div>

            <div className="bg-[#121626] border border-[#262c45] rounded-xl px-2 py-1 flex items-center gap-1.5">
              <span className="text-xs">🏆</span>
              <div>
                <div className="text-[8px] font-bold text-[#8e9ab5] uppercase">HIGH SCORE</div>
                <div className="font-extrabold text-amber-400 leading-none">1250</div>
              </div>
            </div>

            <div className="bg-[#121626] border border-[#262c45] rounded-xl px-2 py-1 flex items-center gap-1.5">
              <span className="text-xs">🟢</span>
              <div>
                <div className="text-[8px] font-bold text-[#8e9ab5] uppercase">YOU</div>
                <div className="font-extrabold text-[#00ff88] leading-none">{me?.score ?? 0}</div>
              </div>
            </div>
          </div>

        </div>

        {/* MIDDLE THEME SELECTOR PILLS */}
        <div className="w-full grid grid-cols-3 gap-1 px-1 shrink-0 h-[28px]">
          {SNAKE_THEMES.map((th) => (
            <button
              key={th}
              onClick={() => setActiveTheme(th)}
              className={`rounded-xl px-2 py-1 text-[9px] font-black uppercase transition flex items-center justify-center gap-1 ${
                activeTheme === th
                  ? "bg-[#00ff88] text-black shadow-[0_0_10px_#00ff88]"
                  : "bg-[#141728] text-[#8e9bb4] border border-[#242940] hover:text-white"
              }`}
            >
              {THEME_LABELS[th]}
            </button>
          ))}
        </div>

        {/* 2. BOTTOM CARD: 4-SECTOR DIVIDED CYBER D-PAD CONTROLLER DECK */}
        <div className="w-full flex-1 h-[48%] flex flex-col justify-between bg-gradient-to-b from-[#1a1e33] to-[#101222] border-2 border-[#2b324d] rounded-2xl p-2.5 sm:p-3 shadow-2xl min-h-0 overflow-hidden gap-2">
          
          {/* MAIN CONTROLLER AREA: FOUR-SECTOR WHEEL.
              Each quarter of the wheel IS the button — the capsules that used
              to sit inside them were the only live part of a control four
              times their size, so a thumb that landed anywhere else in the
              quarter turned nothing. Dragging between quarters steers too, so
              a corner is one motion instead of lift-aim-tap-lift-aim-tap. */}
          <div className="w-full flex-1 flex items-center justify-center min-h-0">
            <QuadDPad
              onPress={handleTurn}
              accent="#00ff88"
              divider="#ff2a5f"
              ariaLabel="Steering"
              disabled={!!state.isOver}
            />
          </div>

          {/* BOTTOM UTILITY BUTTONS ROW (4 RECTANGULAR ACTION BUTTONS) */}
          <div className="w-full grid grid-cols-4 gap-1.5 shrink-0 h-[36px]">
            {/* PAUSE */}
            <button
              onClick={() => onMove("togglePause")}
              className="bg-[#15192b] border border-[#2b3350] rounded-xl flex flex-col items-center justify-center text-[8px] font-black uppercase text-[#8e9ab5] hover:text-white"
            >
              <span>⏸</span>
              <span>PAUSE</span>
            </button>

            {/* SOUND */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="bg-[#15192b] border border-[#2b3350] rounded-xl flex flex-col items-center justify-center text-[8px] font-black uppercase text-[#8e9ab5] hover:text-white"
            >
              <span>{isMuted ? "🔇" : "🔊"}</span>
              <span>SOUND</span>
            </button>

            {/* SPECIAL */}
            <button
              onClick={() => onMove("special")}
              className="bg-[#2e1065] border border-[#7e22ce] rounded-xl flex flex-col items-center justify-center text-[8px] font-black uppercase text-[#f0abfc] relative shadow-[0_0_8px_rgba(192,132,252,0.4)]"
            >
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-pink-500 text-white font-black text-[8px] flex items-center justify-center">
                3
              </span>
              <span>🚀</span>
              <span>SPECIAL</span>
            </button>

            {/* RESTART */}
            <button
              onClick={() => onMove("restart")}
              className="bg-[#15192b] border border-[#2b3350] rounded-xl flex flex-col items-center justify-center text-[8px] font-black uppercase text-[#8e9ab5] hover:text-white"
            >
              <span>🔄</span>
              <span>RESTART</span>
            </button>
          </div>

        </div>

      </div>

      <RulesModal open={showRules} onClose={() => setShowRules(false)} />
    </div>
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
            className="w-full max-w-sm space-y-4 rounded-2xl border-2 border-emerald-400/60 bg-slate-900 p-6 text-slate-100 shadow-2xl"
          >
            <h3 className="font-mono text-lg font-bold text-emerald-400">How to Play Snake</h3>
            <div className="space-y-2 text-xs leading-relaxed text-slate-300">
              <p>
                Steer by pressing a quarter of the wheel — the whole quarter works, and you can
                slide between them without lifting. Swiping across the playfield turns too.
              </p>
              <p>Eat glowing food to score points and grow your snake.</p>
              <p>Avoid collisions with walls and snake bodies!</p>
            </div>
            <button
              onClick={onClose}
              className="w-full rounded-xl bg-emerald-400 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-950"
            >
              Got it
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
