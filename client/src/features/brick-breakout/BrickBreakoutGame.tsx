import React, { useReducer, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Pause, Volume2, VolumeX, Trophy, Sparkles } from "lucide-react";
import {
  createInitialBreakoutState,
  breakoutGameReducer,
} from "./engine/gameReducer";
import { loadBreakoutData, saveBreakoutData } from "./services/storageService";
import { breakoutAudio } from "./services/audioService";
import { useGameLoop } from "./hooks/useGameLoop";
import { useKeyboardControls } from "./hooks/useKeyboardControls";
import { BreakoutGrid } from "./components/BreakoutGrid";
import { Scoreboard } from "./components/Scoreboard";
import { Keypad } from "./components/Keypad";
import { ControlsHelp } from "./components/ControlsHelp";
import { MenuScreen } from "./screens/MenuScreen";
import { InstructionsScreen } from "./screens/InstructionsScreen";
import { PauseScreen } from "./screens/PauseScreen";
import { LifeLostScreen } from "./screens/LifeLostScreen";
import { LevelCompleteScreen } from "./screens/LevelCompleteScreen";
import { GameOverScreen } from "./screens/GameOverScreen";

export interface BrickBreakoutGameProps {
  onExit?: () => void;
}

export const BrickBreakoutGame: React.FC<BrickBreakoutGameProps> = ({ onExit }) => {
  const savedData = loadBreakoutData();
  const [state, dispatch] = useReducer(
    breakoutGameReducer,
    createInitialBreakoutState(savedData.highScore, savedData.soundEnabled),
  );

  // Sound sync
  useEffect(() => {
    breakoutAudio.setMuted(!state.settings.soundEnabled);
  }, [state.settings.soundEnabled]);

  // Audio trigger reactions to state transitions
  const prevStatusRef = useRef(state.status);
  const prevLivesRef = useRef(state.lives);

  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    const currentStatus = state.status;

    if (prevStatus !== currentStatus) {
      if (currentStatus === "life-lost") {
        breakoutAudio.playLifeLost();
      } else if (currentStatus === "level-complete") {
        breakoutAudio.playLevelComplete();
      } else if (currentStatus === "game-over") {
        breakoutAudio.playGameOver();
      }
    }

    prevStatusRef.current = currentStatus;
    prevLivesRef.current = state.lives;
  }, [state.status, state.lives]);

  // High score & Settings Persistence
  useEffect(() => {
    if (state.score > state.highScore || state.status === "game-over") {
      saveBreakoutData({
        highScore: state.highScore,
        maxLevel: state.level,
        soundEnabled: state.settings.soundEnabled,
      });
    }
  }, [state.score, state.highScore, state.level, state.status, state.settings.soundEnabled]);

  // Hooks
  useGameLoop(state, dispatch);
  useKeyboardControls(state, dispatch);

  const toggleSound = () => {
    dispatch({ type: "TOGGLE_SOUND" });
  };

  const togglePause = () => {
    dispatch({ type: "PAUSE_TOGGLE" });
  };

  return (
    <div className="w-full min-h-screen bg-[#111827] text-white flex flex-col justify-between p-3 sm:p-4 lg:p-6 font-sans select-none">
      {/* Top Lounge Navigation Header */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between border-b border-white/10 pb-2.5 mb-3">
        <div className="flex items-center gap-3">
          {onExit ? (
            <button
              type="button"
              onClick={onExit}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-200 text-[12px] font-extrabold transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <Link
              to="/games"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-200 text-[12px] font-extrabold transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Games Lounge</span>
            </Link>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xl">🧱</span>
            <h1 className="bhalyam-display text-[18px] sm:text-[20px] text-amber-400 font-black tracking-tight">
              BRICK BREAKOUT 9999-IN-1
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePause}
            title="Pause Game (P / Esc)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-amber-300 text-[12px] font-bold transition cursor-pointer"
          >
            <Pause className="w-4 h-4" />
            <span>{state.status === "paused" ? "Resume" : "Pause (P)"}</span>
          </button>

          <button
            type="button"
            onClick={toggleSound}
            title="Toggle Sound (M / S)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 text-[12px] font-bold transition cursor-pointer"
          >
            {state.settings.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-red-400" />
            )}
            <span>{state.settings.soundEnabled ? "Sound ON" : "Muted"}</span>
          </button>
        </div>
      </header>

      {/* Main Responsive 3-Column Arena */}
      <main className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-center flex-1 my-auto">
        {/* Left Column: Live Telemetry & Career Records */}
        <aside className="hidden lg:block lg:col-span-3 space-y-4">
          <div className="p-4 rounded-3xl bg-[#1E293B] border border-white/10 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                Match Telemetry
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10.5px]">
                Level {state.level}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2.5 rounded-2xl bg-black/30 border border-white/5">
                <div className="text-[10px] text-zinc-400 font-bold uppercase">Score</div>
                <div className="text-xl font-black text-amber-400">{state.score}</div>
              </div>
              <div className="p-2.5 rounded-2xl bg-black/30 border border-white/5">
                <div className="text-[10px] text-zinc-400 font-bold uppercase">High Score</div>
                <div className="text-xl font-black text-emerald-400">{state.highScore}</div>
              </div>
              <div className="p-2.5 rounded-2xl bg-black/30 border border-white/5">
                <div className="text-[10px] text-zinc-400 font-bold uppercase">Lives</div>
                <div className="text-sm font-black text-rose-400 flex items-center justify-center gap-1">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <span
                      key={idx}
                      className={`inline-block w-2.5 h-2.5 rounded-full ${
                        idx < state.lives ? "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]" : "bg-zinc-700"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="p-2.5 rounded-2xl bg-black/30 border border-white/5">
                <div className="text-[10px] text-zinc-400 font-bold uppercase">Combo</div>
                <div className="text-xl font-black text-purple-400">{state.combo}&times;</div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-3xl bg-[#1E293B] border border-white/10 shadow-xl space-y-2">
            <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-black uppercase tracking-wider">
              <Trophy className="w-4 h-4" />
              <span>Career Records</span>
            </div>
            <div className="bg-white/5 p-2.5 rounded-xl border border-white/5 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">All-Time Best:</span>
                <span className="font-black text-amber-300">{state.highScore} Pts</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Bricks Remaining:</span>
                <span className="font-black text-emerald-300">{state.remainingBricks}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Center Column: Retro Handheld Console Chassis */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center">
          <div className="flex flex-col items-center bg-gradient-to-b from-[#3a4428] via-[#2c331e] to-[#1c2214] border-4 border-[#5a6a3e] rounded-3xl p-3 sm:p-4 shadow-2xl relative w-full max-w-[290px]">
            {/* Header Branded Ribbon */}
            <div className="flex items-center justify-between w-full mb-2 px-1">
              <span className="text-[10.5px] font-black tracking-widest text-[#9bbc0f] uppercase">
                BRICK BREAKOUT • 9999-in-1
              </span>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span className="text-[9.5px] font-bold text-amber-400">LCD</span>
              </div>
            </div>

            {/* LCD Screen Housing with Bezel */}
            <div className="relative p-1.5 bg-[#121c0e] rounded-xl border-2 border-[#4b5a32] shadow-inner flex flex-col items-center w-full">
              <Scoreboard state={state} />

              <div className="relative flex justify-center w-full mt-1">
                <BreakoutGrid state={state} />

                {/* State Overlays */}
                {state.status === "menu" && <MenuScreen state={state} dispatch={dispatch} />}
                {state.status === "instructions" && <InstructionsScreen dispatch={dispatch} />}
                {state.status === "paused" && <PauseScreen dispatch={dispatch} />}
                {state.status === "life-lost" && <LifeLostScreen state={state} />}
                {state.status === "level-complete" && (
                  <LevelCompleteScreen state={state} dispatch={dispatch} />
                )}
                {state.status === "game-over" && (
                  <GameOverScreen state={state} dispatch={dispatch} />
                )}
              </div>
            </div>

            {/* Controls Keypad */}
            <Keypad state={state} dispatch={dispatch} />
          </div>
        </div>

        {/* Right Column: Desktop Controls & Pro Secrets */}
        <aside className="hidden lg:block lg:col-span-3 space-y-4">
          <ControlsHelp />

          <div className="p-4 rounded-3xl bg-[#1E293B] border border-white/10 shadow-xl space-y-2">
            <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-black uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Angle Deflection Secrets</span>
            </div>
            <p className="text-[11.5px] text-zinc-300 leading-snug">
              Hit the ball with the outer edges of the paddle to create sharp diagonal angles and penetrate behind dense brick walls!
            </p>
          </div>
        </aside>
      </main>

      {/* Footer Branding */}
      <footer className="max-w-6xl w-full mx-auto text-center text-xs text-zinc-500 py-1 border-t border-white/5">
        BHALYAM Retro Brick Series &bull; Pure Nostalgia Gaming
      </footer>
    </div>
  );
};

export default BrickBreakoutGame;
