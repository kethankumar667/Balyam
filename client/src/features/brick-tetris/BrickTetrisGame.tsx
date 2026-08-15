import React, { useReducer, useRef, useEffect } from "react";
import { gameReducer, createInitialState } from "./engine/gameReducer";
import { useGameLoop } from "./hooks/useGameLoop";
import { useKeyboardControls } from "./hooks/useKeyboardControls";
import { useTouchControls } from "./hooks/useTouchControls";
import { loadTetrisData } from "./services/storageService";
import { tetrisAudio } from "./services/audioService";
import { MatrixGrid } from "./components/MatrixGrid";
import { HeaderHud } from "./components/HeaderHud";
import { HoldPieceBox } from "./components/HoldPieceBox";
import { NextPieceBox } from "./components/NextPieceBox";
import { Keypad } from "./components/Keypad";
import { ConsoleFrame } from "./components/ConsoleFrame";
import { BootScreen } from "./screens/BootScreen";
import { MenuScreen } from "./screens/MenuScreen";
import { PausedOverlay } from "./screens/PausedOverlay";
import { GameOverScreen } from "./screens/GameOverScreen";
import { HighScoresScreen } from "./screens/HighScoresScreen";
import { InstructionsScreen } from "./screens/InstructionsScreen";
import { Volume2, VolumeX, Eye, EyeOff, RotateCcw, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const BrickTetrisGame: React.FC = () => {
  const navigate = useNavigate();
  const savedData = loadTetrisData();
  const [state, dispatch] = useReducer(
    gameReducer,
    savedData.bestClassicScore,
    (bestScore) => createInitialState(bestScore, "CLASSIC"),
  );

  const containerRef = useRef<HTMLDivElement>(null);

  // Core Game Hooks
  useGameLoop(state.status, dispatch);
  useKeyboardControls(state, dispatch);
  useTouchControls(state, dispatch, containerRef);

  useEffect(() => {
    tetrisAudio.setMuted(!state.settings.soundEnabled);
  }, [state.settings.soundEnabled]);

  return (
    <div className="min-h-screen bg-[#070B14] text-white flex flex-col items-center justify-between p-3 sm:p-6 select-none font-sans">
      {/* Top Navigation Bar */}
      <header className="w-full max-w-4xl flex items-center justify-between py-2 px-3 sm:px-4 bg-[#141B2D]/80 backdrop-blur border border-[#232D48] rounded-2xl mb-4">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-300 hover:text-white transition-colors"
        >
          <Home className="w-4 h-4 text-emerald-400" />
          <span>LOBBY</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-mono font-black tracking-wider">
            BRICK BLOCKS ({state.mode})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => dispatch({ type: "TOGGLE_GHOST" })}
            title="Toggle Ghost Piece"
            className="p-2 bg-[#1A233A] hover:bg-[#232F4E] text-zinc-300 hover:text-white rounded-lg border border-[#2E3C62] transition-colors"
          >
            {state.settings.ghostPieceEnabled ? (
              <Eye className="w-4 h-4 text-emerald-400" />
            ) : (
              <EyeOff className="w-4 h-4 text-zinc-500" />
            )}
          </button>

          <button
            onClick={() => dispatch({ type: "TOGGLE_SOUND" })}
            title="Toggle Audio"
            className="p-2 bg-[#1A233A] hover:bg-[#232F4E] text-zinc-300 hover:text-white rounded-lg border border-[#2E3C62] transition-colors"
          >
            {state.settings.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-amber-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-zinc-500" />
            )}
          </button>

          <button
            onClick={() => dispatch({ type: "RESTART_GAME" })}
            title="Restart Match"
            className="p-2 bg-[#1A233A] hover:bg-[#232F4E] text-zinc-300 hover:text-white rounded-lg border border-[#2E3C62] transition-colors"
          >
            <RotateCcw className="w-4 h-4 text-blue-400" />
          </button>
        </div>
      </header>

      {/* Main Responsive Arena */}
      <main className="w-full max-w-4xl flex-1 flex flex-col lg:flex-row items-center justify-center gap-6">
        {/* Left Side Panel (Desktop only): Hold Piece & Game Stats */}
        <aside className="hidden lg:flex flex-col gap-4 w-[200px]">
          <HoldPieceBox heldPiece={state.heldPiece} canHold={state.canHold} />

          <div className="flex flex-col gap-2 p-3 bg-[#141B2D] border border-[#232D48] rounded-xl font-mono text-xs">
            <span className="text-[10px] text-zinc-400 font-bold uppercase border-b border-[#232D48] pb-1">
              CONTROLS GUIDE
            </span>
            <div className="flex justify-between text-zinc-300">
              <span>MOVE:</span>
              <span className="font-bold text-amber-300">4 / 6 / A / D</span>
            </div>
            <div className="flex justify-between text-zinc-300">
              <span>ROTATE:</span>
              <span className="font-bold text-emerald-300">2 / W / UP</span>
            </div>
            <div className="flex justify-between text-zinc-300">
              <span>HARD DROP:</span>
              <span className="font-bold text-blue-300">SPACE</span>
            </div>
            <div className="flex justify-between text-zinc-300">
              <span>HOLD:</span>
              <span className="font-bold text-purple-300">0 / C / SHIFT</span>
            </div>
          </div>
        </aside>

        {/* Center: Handheld Game Console */}
        <div ref={containerRef} className="w-full max-w-[380px] sm:max-w-[420px]">
          <ConsoleFrame>
            {/* Top HUD */}
            <HeaderHud state={state} />

            {/* Matrix Board Display Area */}
            <div className="relative w-full my-2 flex justify-center">
              <div className="w-[180px] sm:w-[200px]">
                <MatrixGrid state={state} />
              </div>

              {/* Overlays */}
              {state.status === "boot" && <BootScreen dispatch={dispatch} />}
              {state.status === "menu" && <MenuScreen state={state} dispatch={dispatch} />}
              {state.status === "paused" && <PausedOverlay dispatch={dispatch} />}
              {state.status === "game-over" && <GameOverScreen state={state} dispatch={dispatch} />}
              {state.status === "high-scores" && <HighScoresScreen dispatch={dispatch} />}
              {state.status === "instructions" && <InstructionsScreen dispatch={dispatch} />}
            </div>

            {/* Tactile Keypad */}
            <Keypad state={state} dispatch={dispatch} />
          </ConsoleFrame>
        </div>

        {/* Right Side Panel (Desktop only): Next Queue & Match Records */}
        <aside className="hidden lg:flex flex-col gap-4 w-[200px]">
          <NextPieceBox nextQueue={state.nextQueue} />

          <div className="flex flex-col gap-2 p-3 bg-[#141B2D] border border-[#232D48] rounded-xl font-mono text-xs">
            <span className="text-[10px] text-zinc-400 font-bold uppercase border-b border-[#232D48] pb-1">
              CURRENT SESSION
            </span>
            <div className="flex justify-between text-zinc-300">
              <span>SCORE:</span>
              <span className="font-bold text-amber-300">{state.score}</span>
            </div>
            <div className="flex justify-between text-zinc-300">
              <span>LINES:</span>
              <span className="font-bold text-emerald-300">{state.linesCleared}</span>
            </div>
            <div className="flex justify-between text-zinc-300">
              <span>LEVEL:</span>
              <span className="font-bold text-blue-300">{state.level}</span>
            </div>
            <div className="flex justify-between text-zinc-300">
              <span>MODE:</span>
              <span className="font-bold text-purple-300">{state.mode}</span>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
};

export default BrickTetrisGame;
