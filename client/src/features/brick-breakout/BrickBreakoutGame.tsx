import React, { useReducer, useEffect, useRef } from "react";
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

export const BrickBreakoutGame: React.FC = () => {
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

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] p-2 sm:p-4 text-zinc-100 font-sans">
      <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 w-full max-w-4xl">
        {/* Handheld Retro Console Body */}
        <div className="flex flex-col items-center bg-gradient-to-b from-[#3a4428] via-[#2c331e] to-[#1c2214] border-4 border-[#5a6a3e] rounded-3xl p-4 sm:p-6 shadow-2xl relative w-full max-w-[340px]">
          {/* Header Branded Ribbon */}
          <div className="flex items-center justify-between w-full mb-3 px-1">
            <span className="text-[11px] font-black tracking-widest text-[#9bbc0f] uppercase">
              BRICK BREAKOUT • 9999-in-1
            </span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span className="text-[10px] font-bold text-amber-400">LCD</span>
            </div>
          </div>

          {/* LCD Screen Housing with Bezel */}
          <div className="relative p-2 bg-[#121c0e] rounded-xl border-2 border-[#4b5a32] shadow-inner flex flex-col items-center w-full">
            <Scoreboard state={state} />

            <div className="relative mt-2 flex justify-center w-full">
              <BreakoutGrid state={state} />

              {/* State Overlays */}
              {state.status === "menu" && <MenuScreen state={state} dispatch={dispatch} />}
              {state.status === "instructions" && <InstructionsScreen dispatch={dispatch} />}
              {state.status === "paused" && <PauseScreen dispatch={dispatch} />}
              {state.status === "life-lost" && <LifeLostScreen state={state} />}
              {state.status === "level-complete" && (
                <LevelCompleteScreen state={state} dispatch={dispatch} />
              )}
              {state.status === "game-over" && <GameOverScreen state={state} dispatch={dispatch} />}
            </div>
          </div>

          {/* Controls Keypad */}
          <Keypad state={state} dispatch={dispatch} />
        </div>

        {/* Side Panel: Desktop Help & Lore Card */}
        <div className="flex flex-col gap-4 w-full max-w-[340px]">
          <ControlsHelp />

          <div className="bg-[#182618] border border-[#8bac0f]/30 rounded-xl p-4 text-xs font-mono text-zinc-300 shadow-lg">
            <h4 className="text-amber-400 font-bold text-sm mb-1.5">
              🧱 90s Nostalgia Brick Series
            </h4>
            <p className="text-zinc-400 leading-relaxed text-[11px]">
              Relive the iconic handheld brick game era. Demolish full rows, shatter reinforced blocks, avoid losing your lives, and push for maximum combo multipliers!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrickBreakoutGame;
