import React, { useReducer, useEffect, useRef } from "react";
import { gameReducer, createInitialGameState } from "./engine/gameReducer";
import { useFixedTimestepLoop } from "./hooks/useFixedTimestepLoop";
import { useKeyboardControls } from "./hooks/useKeyboardControls";
import { spaceAlienAudio } from "./services/AudioService";
import { SpaceAlienPersistenceService } from "./services/PersistenceService";
import { BrickSpaceAlienFrame } from "./components/BrickSpaceAlienFrame";
import { BrickSpaceAlienMatrix } from "./components/BrickSpaceAlienMatrix";
import { BrickSpaceAlienKeypad } from "./components/BrickSpaceAlienKeypad";
import { BrickSpaceAlienScoreboard } from "./components/BrickSpaceAlienScoreboard";
import { BrickSpaceAlienErrorBoundary } from "./components/ErrorBoundary";
import { BootScreen } from "./screens/BootScreen";
import { MenuScreen } from "./screens/MenuScreen";
import { InstructionsScreen } from "./screens/InstructionsScreen";
import { HighScoresScreen } from "./screens/HighScoresScreen";
import { PauseOverlay } from "./screens/PauseOverlay";
import { LifeLostOverlay } from "./screens/LifeLostOverlay";
import { WaveCompleteScreen } from "./screens/WaveCompleteScreen";
import { GameOverScreen } from "./screens/GameOverScreen";
import { BRICK_SPACE_ALIEN_CONFIG } from "./constants";

export interface BrickSpaceAlienGameProps {
  onExit?: () => void;
}

export const BrickSpaceAlienGame: React.FC<BrickSpaceAlienGameProps> = ({ onExit }) => {
  const initialSaved = SpaceAlienPersistenceService.load();
  const [state, dispatch] = useReducer(
    gameReducer,
    null,
    () => createInitialGameState(Date.now(), initialSaved.highScore, initialSaved.soundEnabled)
  );

  // Sync sound service
  useEffect(() => {
    spaceAlienAudio.setSoundEnabled(state.soundEnabled);
    SpaceAlienPersistenceService.save({ soundEnabled: state.soundEnabled });
  }, [state.soundEnabled]);

  // Audio & Persistence Reactions
  const prevStatusRef = useRef(state.status);
  const prevWaveRef = useRef(state.wave);
  const prevKillsRef = useRef(state.totalKills);
  const prevBulletsRef = useRef(state.projectiles.length);

  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    const curStatus = state.status;

    // Laser fire
    const playerBullets = state.projectiles.filter((p) => p.owner === "PLAYER");
    if (playerBullets.length > 0 && playerBullets.length > prevBulletsRef.current) {
      spaceAlienAudio.playLaser();
    }
    prevBulletsRef.current = playerBullets.length;

    // Alien kill sound
    if (state.totalKills > prevKillsRef.current) {
      spaceAlienAudio.playExplosion();
    }
    prevKillsRef.current = state.totalKills;

    // Wave Complete
    if (curStatus === "wave-complete" && prevStatus !== "wave-complete") {
      spaceAlienAudio.playWaveComplete();
    }

    // Life Lost
    if (curStatus === "life-lost" && prevStatus !== "life-lost") {
      spaceAlienAudio.playExplosion();
    }

    // Game Over
    if (curStatus === "game-over" && prevStatus !== "game-over") {
      spaceAlienAudio.playGameOver();
      SpaceAlienPersistenceService.recordGame(state.score, state.wave, state.totalKills);
    }

    prevStatusRef.current = curStatus;
    prevWaveRef.current = state.wave;
  }, [state.status, state.wave, state.totalKills, state.score, state.projectiles]);

  // Hooks
  useFixedTimestepLoop(state, dispatch);
  useKeyboardControls(state, dispatch);

  const isInvulnerable = Date.now() < state.player.invulnerableUntilMs;

  return (
    <BrickSpaceAlienErrorBoundary>
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-70px)] p-2 sm:p-4 text-zinc-100 font-sans select-none">
        <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 w-full max-w-4xl">
          
          {/* Retro Handheld Chassis */}
          <BrickSpaceAlienFrame>
            <div className="relative w-[220px] sm:w-[240px] aspect-[1/2] rounded-lg overflow-hidden shadow-inner flex items-center justify-center bg-[#9bbc0f]">
              {/* Active 10x20 Matrix Grid */}
              <BrickSpaceAlienMatrix
                playerCenterX={state.player.centerX}
                isInvulnerable={isInvulnerable}
                aliens={state.aliens}
                projectiles={state.projectiles}
              />

              {/* State Overlays */}
              {state.status === "boot" && <BootScreen />}
              {state.status === "menu" && (
                <MenuScreen
                  selectedIndex={state.selectedMenuIndex}
                  soundEnabled={state.soundEnabled}
                  onSelect={(idx) => {
                    spaceAlienAudio.playMenuClick();
                    if (idx === state.selectedMenuIndex) {
                      dispatch({ type: "CONFIRM_MENU" });
                    } else {
                      dispatch({ type: "NAV_MENU", direction: idx > state.selectedMenuIndex ? "DOWN" : "UP" });
                    }
                  }}
                />
              )}
              {state.status === "instructions" && (
                <InstructionsScreen onBack={() => dispatch({ type: "GO_TO_MENU" })} />
              )}
              {state.status === "high-scores" && (
                <HighScoresScreen onBack={() => dispatch({ type: "GO_TO_MENU" })} />
              )}
              {state.status === "paused" && (
                <PauseOverlay
                  onResume={() => dispatch({ type: "RESUME_GAME" })}
                  onQuit={() => dispatch({ type: "GO_TO_MENU" })}
                />
              )}
              {state.status === "life-lost" && <LifeLostOverlay lives={state.player.lives} />}
              {state.status === "wave-complete" && (
                <WaveCompleteScreen
                  wave={state.wave}
                  bonus={BRICK_SPACE_ALIEN_CONFIG.SCORE_WAVE_BONUS_BASE * state.wave}
                />
              )}
              {state.status === "game-over" && (
                <GameOverScreen
                  score={state.score}
                  highScore={state.highScore}
                  wave={state.wave}
                  onRestart={() => dispatch({ type: "RESTART_GAME" })}
                  onMenu={() => dispatch({ type: "GO_TO_MENU" })}
                />
              )}
            </div>

            {/* Handheld Keypad Controls */}
            <BrickSpaceAlienKeypad
              onMoveLeft={() => dispatch({ type: "MOVE_PLAYER", deltaX: -1, nowMs: Date.now() })}
              onMoveRight={() => dispatch({ type: "MOVE_PLAYER", deltaX: 1, nowMs: Date.now() })}
              onFire={() => dispatch({ type: "PLAYER_FIRE", nowMs: Date.now() })}
              onPause={() => dispatch({ type: "TOGGLE_PAUSE" })}
              onRestart={() => dispatch({ type: "RESTART_GAME" })}
              onConfirm={() => {
                if (state.status === "menu") dispatch({ type: "CONFIRM_MENU" });
                else if (state.status === "game-over") dispatch({ type: "RESTART_GAME" });
                else if (state.status === "instructions" || state.status === "high-scores") dispatch({ type: "GO_TO_MENU" });
              }}
            />
          </BrickSpaceAlienFrame>

          {/* Companion Telemetry & Instructions Guide */}
          <div className="flex flex-col gap-4 w-full max-w-[320px]">
            <BrickSpaceAlienScoreboard
              score={state.score}
              highScore={state.highScore}
              lives={state.player.lives}
              wave={state.wave}
              soundEnabled={state.soundEnabled}
              onToggleSound={() => dispatch({ type: "TOGGLE_SOUND" })}
            />

            <div className="bg-[#0b101c] border border-[#1f2a44] rounded-xl p-4 text-xs font-mono text-zinc-300 shadow-lg space-y-2">
              <h4 className="text-amber-400 font-bold text-sm flex items-center gap-1.5 uppercase">
                <span>👾</span> Mission Directives
              </h4>
              <p className="text-zinc-400 leading-relaxed text-[11px]">
                Defend Earth from descending waves of alien invaders on a 10×20 LCD matrix. Destroy the swarm before they reach defense row 19!
              </p>
              <div className="pt-2 border-t border-[#1f2a44] text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Controls:</span>
                  <span className="text-amber-300 font-bold">A / D / Space</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Pause:</span>
                  <span className="text-amber-300 font-bold">P / Esc</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Restart:</span>
                  <span className="text-amber-300 font-bold">R</span>
                </div>
              </div>
            </div>

            {onExit && (
              <button
                type="button"
                onClick={onExit}
                className="w-full py-2 bg-[#111827] hover:bg-[#1f2937] border border-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-mono font-bold transition cursor-pointer"
              >
                ◀ EXIT TO GAME LOUNGE
              </button>
            )}
          </div>

        </div>
      </div>
    </BrickSpaceAlienErrorBoundary>
  );
};

export default BrickSpaceAlienGame;
