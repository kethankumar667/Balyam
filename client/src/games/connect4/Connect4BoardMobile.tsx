import React, { useEffect, useMemo, useState } from "react";
import { getSocket } from "../../lib/socket";
import { HapticsManager } from "../../services/HapticsManager";
import { connect4Audio } from "./connect4Audio";
import { getConnect4Theme, type Connect4ThemeId } from "./connect4Themes";
import { Connect4Grid } from "./Connect4Grid";
import type { Connect4BoardProps } from "./Connect4BoardProps";
import { useConnect4Move } from "./useConnect4Move";
import { describeConnect4Outcome } from "./connect4Outcome";
import { TurnTimeWarning, useTurnSecondsLeft } from "../../components/TurnTimeWarning";
import { Connect4TutorialModal, hasSeenConnect4Tutorial } from "./Connect4TutorialModal";
import { Connect4ThemeModal } from "./Connect4ThemeModal";
import { Connect4TokenRack } from "./Connect4TokenRack";
import { detectConnect4Threat } from "./connect4Threats";
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  Palette,
  RotateCcw,
  BookOpen,
  AlertTriangle,
  Trophy,
} from "lucide-react";

export default function Connect4BoardMobile({
  state,
  players,
  selfId,
  roomCode,
  onLeave,
}: Connect4BoardProps) {
  const [themeId, setThemeId] = useState<Connect4ThemeId>(() => {
    try {
      const saved = localStorage.getItem("bhalyam.connect4.theme");
      if (
        saved === "royal_parlour" ||
        saved === "cyber_arcade" ||
        saved === "championship_lounge"
      ) {
        return saved;
      }
    } catch {
      // Ignore storage read error
    }
    return "royal_parlour";
  });

  const [isMuted, setIsMuted] = useState(connect4Audio.isMuted());
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [tutorialOpen, setTutorialOpen] = useState(() => !hasSeenConnect4Tutorial());
  const [themeModalOpen, setThemeModalOpen] = useState(false);

  const theme = useMemo(() => getConnect4Theme(themeId), [themeId]);

  const selfDisc = state.playerDiscs[selfId];
  const { isPending, isMyTurn, dropDisc } = useConnect4Move({ state, selfId });
  const isOver = state.phase === "finished";
  const outcome = useMemo(
    () => describeConnect4Outcome(state, selfId, players),
    [state, selfId, players]
  );
  const isSpectator = selfDisc === undefined;

  const p1 = players.find((p) => p.id === state.playerOrder[0]) ?? players[0];
  const p2 = players.find((p) => p.id === state.playerOrder[1]) ?? players[1];

  const p1Disc = state.playerDiscs[p1?.id ?? ""] ?? "R";
  const p2Disc = state.playerDiscs[p2?.id ?? ""] ?? "Y";

  const p1DiscsPlaced = state.discsPlaced[p1?.id ?? ""] ?? 0;
  const p2DiscsPlaced = state.discsPlaced[p2?.id ?? ""] ?? 0;

  const secondsLeft = useTurnSecondsLeft(state.turnDeadline);
  const isTimerCritical =
    state.phase === "playing" &&
    state.turnDeadline != null &&
    secondsLeft <= 5 &&
    secondsLeft > 0;

  // Active Tactical Threat
  const threat = useMemo(() => {
    if (isOver) return null;
    return detectConnect4Threat(state.grid);
  }, [state.grid, isOver]);

  // Sound triggers on game events with depth pitch modulation and environmental profile
  useEffect(() => {
    if (state.lastMove) {
      connect4Audio.playDiscDrop(state.lastMove.row, theme.soundProfile);
      HapticsManager.trigger("turn");
    }
  }, [state.moveCount, theme.soundProfile]);

  useEffect(() => {
    if (isSpectator) return;
    if (outcome.kind === "win") {
      connect4Audio.playVictoryFanfare(theme.soundProfile);
      HapticsManager.trigger("win");
    } else if (outcome.kind === "loss") {
      connect4Audio.playDefeatDrone();
      HapticsManager.trigger("subtle");
    }
  }, [outcome.kind, isSpectator, theme.soundProfile]);

  const handleSelectTheme = (nextThemeId: Connect4ThemeId) => {
    setThemeId(nextThemeId);
    try {
      localStorage.setItem("bhalyam.connect4.theme", nextThemeId);
    } catch {
      // Ignore storage write error
    }
  };

  const handleMuteToggle = () => {
    const next = connect4Audio.toggleMute();
    setIsMuted(next);
  };

  const handleRematch = () => {
    getSocket().emit("rematch:request");
  };

  return (
    <div
      className={`relative w-full h-[100dvh] flex flex-col justify-between overflow-hidden ${theme.envPatternClass} text-white font-sans transition-colors duration-500`}
    >
      {/* Environmental Atmospheric Lighting Cone from Above */}
      <div
        className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-700"
        style={{ background: theme.envLighting }}
      />

      <TurnTimeWarning deadline={state.turnDeadline} active={isMyTurn} />

      {/* Screen Reader Live Status Announcement */}
      <div role="status" aria-live="polite" className="sr-only">
        {isOver
          ? outcome.announcement
          : isMyTurn
          ? `Your turn. ${secondsLeft > 0 ? `${secondsLeft} seconds left.` : ""}`
          : `Opponent's turn.`}
      </div>

      {/* Top Mobile Bar */}
      <header className="flex items-center justify-between px-3 py-2 border-b border-white/10 z-20 bg-black/40 backdrop-blur-xl">
        <button
          type="button"
          onClick={onLeave}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
          aria-label="Leave match"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center min-w-0 px-2">
          <span className="text-xs font-bold tracking-wider uppercase text-white/95 truncate">
            {theme.venueTitle}
          </span>
          <span className="text-[10px] text-white/40 font-mono tracking-tight truncate">
            {theme.venueSubhead}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Theme Switcher Button */}
          <button
            type="button"
            onClick={() => setThemeModalOpen(true)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 transition-colors cursor-pointer"
            aria-label={`Current theme: ${theme.name}. Tap to change theme.`}
          >
            <Palette className="w-4 h-4" />
          </button>

          {/* Tutorial Button */}
          <button
            type="button"
            onClick={() => setTutorialOpen(true)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 transition-colors cursor-pointer"
            aria-label="Open how to play tutorial"
          >
            <BookOpen className="w-4 h-4" />
          </button>

          {/* Audio Mute Button */}
          <button
            type="button"
            onClick={handleMuteToggle}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 transition-colors cursor-pointer"
            aria-label={isMuted ? "Unmute audio" : "Mute audio"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </header>

      {/* Mobile Player Podiums & Live Token Racks */}
      <section className="px-3 py-1.5 z-10">
        <div className="grid grid-cols-2 gap-2 max-w-[500px] mx-auto">
          <Connect4TokenRack
            playerName={p1?.name ?? "Player 1"}
            isSelf={p1?.id === selfId}
            discColor={p1Disc}
            tokensPlaced={p1DiscsPlaced}
            isActiveTurn={state.turnPlayerId === p1?.id && !isOver}
            theme={theme}
          />
          <Connect4TokenRack
            playerName={p2?.name ?? "Player 2"}
            isSelf={p2?.id === selfId}
            discColor={p2Disc}
            tokensPlaced={p2DiscsPlaced}
            isActiveTurn={state.turnPlayerId === p2?.id && !isOver}
            theme={theme}
          />
        </div>

        {/* Threat Alert or Turn Status Pill */}
        {threat ? (
          <div className="flex items-center justify-center gap-1.5 mt-1.5 px-3 py-0.5 rounded-full bg-rose-950/50 border border-rose-500/30 text-rose-300 text-[10px] font-mono tracking-wider uppercase mx-auto w-fit">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span>Flank Threat Warning</span>
          </div>
        ) : !isOver && state.turnDeadline ? (
          <div className="flex items-center justify-center gap-1.5 mt-1.5 px-3 py-0.5 rounded-full bg-black/40 border border-white/10 text-white/70 text-[10px] font-mono mx-auto w-fit">
            <span className={`w-1.5 h-1.5 rounded-full ${isMyTurn ? "bg-amber-400" : "bg-white/40"} ${isTimerCritical ? "bg-rose-400 animate-ping" : ""}`} />
            <span>{isMyTurn ? "Your turn" : "Opponent thinking"}</span>
            <span className="text-white/30">·</span>
            <span className="font-bold tabular-nums text-white">{secondsLeft}s</span>
          </div>
        ) : null}
      </section>

      {/* Main Grid Area */}
      <main className="flex-1 flex items-center justify-center px-1.5 py-1 z-10 overflow-hidden">
        <div className={`relative w-full max-w-[min(98vw,480px)] rounded-2xl sm:rounded-3xl p-1.5 sm:p-2.5 border transition-all duration-300 overflow-hidden ${theme.tableMat}`}>
          {/* Environmental Table Texture Overlay */}
          <div className={`absolute inset-0 pointer-events-none rounded-2xl sm:rounded-3xl ${theme.tableTextureOverlay}`} />
          <Connect4Grid
            grid={state.grid}
            winningCells={state.winningCells}
            lastMove={state.lastMove}
            theme={theme}
            isMyTurn={isMyTurn}
            disabled={isPending || isOver}
            onDrop={(col) => dropDisc(col)}
            hoveredCol={hoveredCol}
            onHoverCol={setHoveredCol}
            myDisc={selfDisc ?? "R"}
          />
        </div>
      </main>

      {/* Outcome / Rematch Footer with Safe-Area Inset */}
      <footer className="px-4 py-3 border-t border-white/10 bg-black/60 backdrop-blur-xl z-20 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        {isOver ? (
          <div className="flex flex-col items-center gap-2.5 max-w-[420px] mx-auto">
            <div className="flex items-center gap-2 text-white">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-xs sm:text-sm font-bold tracking-wider uppercase">
                {outcome.headline}
              </span>
            </div>
            <div className="flex items-center gap-2 w-full">
              <button
                type="button"
                onClick={handleRematch}
                className="flex-1 min-h-[46px] py-2.5 px-4 rounded-xl bg-white hover:bg-white/90 text-slate-950 font-bold text-xs tracking-wide shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Rematch
              </button>
              <button
                type="button"
                onClick={onLeave}
                className="min-h-[46px] py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white/90 font-medium text-xs transition-colors cursor-pointer"
              >
                Leave
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center text-[11px] text-white/50 font-mono tracking-tight py-0.5">
            {isMyTurn ? "Tap any column to place your stone" : "Waiting for opponent move"}
          </div>
        )}
      </footer>

      {/* Theme Switcher Modal */}
      <Connect4ThemeModal
        isOpen={themeModalOpen}
        currentThemeId={themeId}
        onSelectTheme={handleSelectTheme}
        onClose={() => setThemeModalOpen(false)}
      />

      {/* Tutorial Modal */}
      <Connect4TutorialModal
        isOpen={tutorialOpen}
        theme={theme}
        onClose={() => setTutorialOpen(false)}
      />
    </div>
  );
}
