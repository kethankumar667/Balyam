import React, { useEffect, useMemo, useState } from "react";
import { getSocket } from "../../lib/socket";
import { HapticsManager } from "../../services/HapticsManager";
import { connect4Audio } from "./connect4Audio";
import { getConnect4Theme, type Connect4ThemeId } from "./connect4Themes";
import { Connect4Grid } from "./Connect4Grid";
import type { Connect4BoardProps } from "./Connect4BoardProps";
import { useConnect4Move } from "./useConnect4Move";
import { describeConnect4Outcome } from "./connect4Outcome";
import Chat from "../../components/Chat";
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
  Shield,
  BookOpen,
  AlertTriangle,
  Trophy,
} from "lucide-react";

export default function Connect4BoardDesktop({
  state,
  players,
  selfId,
  messages,
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
      className={`relative w-full h-full flex flex-col overflow-hidden ${theme.envPatternClass} text-white font-sans transition-colors duration-500`}
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

      {/* Desktop Luxury Top Bar */}
      <header className="h-14 px-5 border-b border-white/10 flex-shrink-0 flex items-center justify-between z-20 bg-black/40 backdrop-blur-xl">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={onLeave}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
            aria-label="Leave match"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs font-semibold">Exit</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <h1 className="text-xs sm:text-sm font-bold tracking-wider uppercase text-white/95 leading-tight">
                {theme.venueTitle}
              </h1>
              <span className="text-[10px] text-white/40 font-mono tracking-tight leading-none mt-0.5">
                {theme.venueSubhead}
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/60 font-mono">
              ROOM: {roomCode}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Switcher Button */}
          <button
            type="button"
            onClick={() => setThemeModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 transition-all text-xs font-medium cursor-pointer shadow-xs"
            aria-label={`Current theme: ${theme.name}. Click to change theme.`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>{theme.name}</span>
          </button>

          {/* Tutorial Button */}
          <button
            type="button"
            onClick={() => setTutorialOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors text-xs font-medium cursor-pointer"
            aria-label="Open how to play tutorial"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Guide</span>
          </button>

          {/* Audio Toggle */}
          <button
            type="button"
            onClick={handleMuteToggle}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
            aria-label={isMuted ? "Unmute audio" : "Mute audio"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </header>

      {/* Main Two-Column Desktop Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left / Center: Arena */}
        <main className="flex-1 flex flex-col items-center justify-center p-3 sm:p-5 overflow-hidden min-h-0 z-10">
          {/* Table Felt Mat Shell */}
          <div className={`relative w-full max-w-[740px] rounded-2xl md:rounded-3xl p-3 sm:p-4 border transition-all duration-300 flex flex-col items-center shadow-2xl overflow-hidden ${theme.tableMat}`}>
            {/* Environmental Table Texture Overlay */}
            <div className={`absolute inset-0 pointer-events-none rounded-2xl md:rounded-3xl ${theme.tableTextureOverlay}`} />
            {/* Live Token Racks Header (Player 1 & Player 2 Battle Podiums) */}
            <div className="w-full grid grid-cols-2 gap-3 mb-2">
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

            {/* Tactical Threat Alert Beacon */}
            {threat && !isOver && (
              <div className="flex items-center gap-2 mb-1.5 px-3 py-0.5 rounded-full bg-rose-950/50 border border-rose-500/30 text-rose-300 text-[10px] font-mono tracking-wider uppercase shadow-sm">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Flank Threat Warning</span>
              </div>
            )}

            {/* Turn Timer Status Banner */}
            {!isOver && state.turnDeadline && !threat && (
              <div className="flex items-center gap-2 mb-1.5 px-3 py-0.5 rounded-full border border-white/10 bg-black/40 text-[10px] font-mono text-white/70">
                <span className={`w-1.5 h-1.5 rounded-full ${isMyTurn ? "bg-amber-400" : "bg-white/40"} ${isTimerCritical ? "bg-rose-400 animate-ping" : ""}`} />
                <span>
                  {isMyTurn ? "Your turn to drop" : "Waiting for opponent"}
                </span>
                <span className="text-white/30">·</span>
                <span className="font-bold tabular-nums text-white">{secondsLeft}s remaining</span>
              </div>
            )}

            {/* In-Table Rematch Action Banner when Game Over */}
            {isOver && (
              <div className="w-full flex items-center justify-between gap-3 mb-2 px-4 py-2 rounded-xl border border-white/15 bg-black/70 backdrop-blur-xl shadow-lg">
                <div className="flex items-center gap-2 text-white min-w-0">
                  <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs sm:text-sm font-bold tracking-wider uppercase truncate">
                    {outcome.headline}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleRematch}
                    className="min-h-[36px] py-1.5 px-4 rounded-lg bg-white hover:bg-white/90 text-slate-950 font-bold text-xs tracking-wide shadow-md flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Rematch
                  </button>
                  <button
                    type="button"
                    onClick={onLeave}
                    className="min-h-[36px] py-1.5 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-white/80 font-medium text-xs transition-colors cursor-pointer"
                  >
                    Exit
                  </button>
                </div>
              </div>
            )}

            {/* Main 3D Connect 4 Tournament Apparatus */}
            <div className="w-full flex items-center justify-center my-0.5">
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
          </div>
        </main>

        {/* Right Sidebar: Chat & Match Intelligence */}
        <aside className="w-72 lg:w-80 border-l border-white/10 bg-black/40 backdrop-blur-xl flex flex-col min-h-0 flex-shrink-0 z-20">
          <div className="p-3.5 border-b border-white/10 flex-shrink-0">
            <h2 className="text-[11px] font-mono tracking-wider uppercase text-white/50 mb-2.5 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-white/40" />
              Match Specs
            </h2>
            <div className="space-y-2 text-xs text-white/70 font-mono">
              <div className="flex justify-between">
                <span className="text-white/40">Apparatus</span>
                <span className="font-medium text-white/90">7 × 6 Monolith</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Turn Pace</span>
                <span className="font-medium text-white/90">{state.options.turnTimerSeconds}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Stones Placed</span>
                <span className="tabular-nums font-bold text-white">
                  {state.moveCount} <span className="text-white/30 font-normal">/ 42</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-2.5 dark">
            <Chat
              messages={messages}
              selfId={selfId}
              className="!bg-slate-900/75 !border-slate-800/80 backdrop-blur-md shadow-xl"
            />
          </div>
        </aside>
      </div>

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
