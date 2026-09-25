import { useState, useEffect } from "react";
import { Tv, Volume2, VolumeX, Maximize2, Minimize2, Radio } from "lucide-react";
import type { GameKind, RoomPhase } from "@shared/types";

export interface TvHeaderProps {
  roomCode: string;
  game: GameKind;
  roomName: string | null;
  phase: RoomPhase;
  spectatorCount?: number;
  isAudioUnlocked: boolean;
  isMuted: boolean;
  onToggleAudio: () => void;
}

export function TvHeader({
  roomCode,
  game,
  roomName,
  phase,
  spectatorCount = 1,
  isAudioUnlocked,
  isMuted,
  onToggleAudio,
}: TvHeaderProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen().catch(() => {});
    } else {
      void document.exitFullscreen().catch(() => {});
    }
  };

  const phaseLabel =
    phase === "lobby"
      ? "LOBBY"
      : phase === "playing"
      ? "IN PLAY"
      : "MATCH OVER";

  const phaseColor =
    phase === "lobby"
      ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
      : phase === "playing"
      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse"
      : "bg-purple-500/20 text-purple-300 border-purple-500/40";

  return (
    <header className="w-full flex items-center justify-between gap-4 px-6 py-4 bg-black/40 backdrop-blur-md border-b border-amber-900/30 rounded-2xl shrink-0 select-none">
      {/* Left: TV Lounge Title & Game */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 flex items-center justify-center shadow-lg">
          <Tv className="w-6 h-6 text-amber-400" />
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-amber-100 tracking-tight leading-tight">
              {roomName || "BHALYAM LOUNGE"}
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-black tracking-widest border uppercase ${phaseColor}`}
            >
              {phaseLabel}
            </span>
          </div>
          <p className="text-xs sm:text-sm font-bold tracking-widest uppercase text-amber-400/80">
            {game} • Big Screen Stadium
          </p>
        </div>
      </div>

      {/* Right: Controls & Code Badge */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* TV Stadium Audio Button */}
        <button
          type="button"
          onClick={onToggleAudio}
          title={isMuted || !isAudioUnlocked ? "Unmute TV Audio (Space)" : "Mute TV Audio (Space)"}
          aria-label={isMuted || !isAudioUnlocked ? "Unmute TV Audio" : "Mute TV Audio"}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition active:scale-95 cursor-pointer ${
            !isAudioUnlocked || isMuted
              ? "bg-rose-500/20 border-rose-500/40 text-rose-300 hover:bg-rose-500/30"
              : "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
          }`}
        >
          {!isAudioUnlocked || isMuted ? (
            <>
              <VolumeX className="w-4 h-4 text-rose-400" />
              <span className="hidden md:inline">Audio: OFF</span>
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline">Stadium Audio: ON</span>
            </>
          )}
        </button>

        {/* Fullscreen Button */}
        <button
          type="button"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen (F)"}
          aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          className="p-2.5 rounded-xl bg-stone-900/60 hover:bg-stone-800 border border-amber-900/40 text-amber-200 transition active:scale-95 cursor-pointer"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Spectator Count Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900/60 border border-amber-900/30 text-amber-200/80 text-xs font-mono font-bold">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>
            {spectatorCount} {spectatorCount === 1 ? "Screen" : "Screens"}
          </span>
        </div>

        {/* Room Code Chip */}
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/50 shadow-inner">
          <span className="text-[11px] font-bold text-amber-400/80 uppercase tracking-widest hidden md:inline">
            Room Code
          </span>
          <span className="text-xl sm:text-2xl font-black font-mono tracking-widest text-amber-300">
            {roomCode}
          </span>
        </div>
      </div>
    </header>
  );
}
