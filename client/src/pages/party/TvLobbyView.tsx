import { Crown, Bot, WifiOff, CheckCircle2, QrCode, Gamepad2, Volume2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { GameKind, Player } from "@shared/types";
import { findAvatar } from "../../lib/avatars";

export interface TvLobbyViewProps {
  roomCode: string;
  players: Player[];
  maxPlayers: number;
  game: GameKind;
  isAudioUnlocked: boolean;
  onUnlockAudio: () => void;
}

export function TvLobbyView({
  roomCode,
  players,
  maxPlayers,
  game,
  isAudioUnlocked,
  onUnlockAudio,
}: TvLobbyViewProps) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://bhalyam.com";
  const joinUrl = `${origin}/r/${roomCode}`;

  const readyCount = players.filter((p) => p.isReady).length;

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto flex flex-col justify-between gap-6 p-4 sm:p-6 select-none">
      {/* Audio Unlock Alert Banner if audio not yet engaged */}
      {!isAudioUnlocked && (
        <button
          type="button"
          onClick={onUnlockAudio}
          className="w-full py-3 px-5 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border-2 border-amber-500/40 text-amber-200 font-bold text-sm sm:text-base flex items-center justify-center gap-3 transition-transform active:scale-[0.99] cursor-pointer shadow-lg animate-pulse"
        >
          <Volume2 className="w-5 h-5 text-amber-400" />
          <span>Click anywhere or press Space to enable TV Stadium Sound & Countdowns</span>
        </button>
      )}

      {/* Main Split: Left = QR & Room Code, Right = Controllers Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column (5 cols): Instant QR + Giant Room Code */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center text-center p-6 sm:p-8 rounded-3xl bg-black/50 border border-amber-900/40 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2 mb-3 text-amber-400 text-xs sm:text-sm font-mono font-black uppercase tracking-widest">
            <QrCode className="w-4 h-4" />
            <span>Scan to Join Table</span>
          </div>

          {/* Crisp QR Code with Golden Frame */}
          <div className="p-4 rounded-2xl bg-white shadow-[0_0_40px_rgba(245,158,11,0.25)] border-4 border-amber-500/50 mb-6">
            <QRCodeSVG
              value={joinUrl}
              size={180}
              level="H"
              includeMargin={false}
              className="w-36 h-36 sm:w-44 sm:h-44"
            />
          </div>

          <p className="text-xs uppercase tracking-[0.25em] text-amber-300/70 font-bold mb-1">
            Or enter 6-character code
          </p>

          <div className="px-6 py-2 rounded-2xl bg-amber-500/10 border-2 border-amber-500/50 shadow-inner mb-4">
            <span className="text-5xl sm:text-6xl font-black font-mono tracking-widest text-amber-300">
              {roomCode}
            </span>
          </div>

          <p className="text-xs text-amber-200/60 max-w-xs">
            Open camera on any smartphone to turn your phone into a gamepad controller.
          </p>
        </div>

        {/* Right Column (7 cols): Connected Gamepads / Controller Grid */}
        <div className="lg:col-span-7 flex flex-col justify-center gap-4 p-6 sm:p-8 rounded-3xl bg-black/40 border border-amber-900/30 shadow-xl backdrop-blur-md">
          {/* Header row */}
          <div className="flex items-center justify-between border-b border-amber-900/40 pb-3">
            <div className="flex items-center gap-2.5">
              <Gamepad2 className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg sm:text-xl font-black text-amber-100 uppercase tracking-wider">
                Connected Controllers
              </h2>
            </div>
            <div className="text-xs sm:text-sm font-bold font-mono text-amber-400">
              {players.length} / {maxPlayers} Seats ({readyCount} Ready)
            </div>
          </div>

          {/* Player Controller Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[48vh] overflow-y-auto pr-1">
            {players.map((p) => {
              const avatarObj = p.avatar ? findAvatar(p.avatar) : null;
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all ${
                    p.isConnected
                      ? p.isReady
                        ? "bg-emerald-950/40 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                        : "bg-stone-900/70 border-amber-900/40"
                      : "bg-stone-950/40 border-stone-800 opacity-60"
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-amber-500/30 flex-shrink-0 bg-stone-900">
                    {avatarObj?.src ? (
                      <img src={avatarObj.src} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-black text-amber-200 text-sm">
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    {p.isHost && (
                      <div
                        className="absolute -top-1 -right-1 p-1 rounded-full bg-amber-500 text-stone-950 shadow"
                        title="Room Host"
                      >
                        <Crown className="w-3 h-3" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm sm:text-base font-black text-amber-100 truncate">
                        {p.name}
                      </span>
                      {p.isBot && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-stone-800 text-stone-400 border border-stone-700 flex items-center gap-0.5">
                          <Bot className="w-2.5 h-2.5" /> BOT
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs mt-0.5">
                      {!p.isConnected ? (
                        <span className="text-rose-400 font-bold flex items-center gap-1">
                          <WifiOff className="w-3 h-3" /> Reconnecting
                        </span>
                      ) : p.isReady ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Ready to Play
                        </span>
                      ) : (
                        <span className="text-amber-400/70 font-semibold">
                          Setting up...
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Empty Seat placeholders */}
            {Array.from({ length: Math.max(0, maxPlayers - players.length) }).map((_, idx) => (
              <div
                key={`empty-${idx}`}
                className="flex items-center justify-center p-3.5 rounded-2xl border-2 border-dashed border-stone-800 text-stone-600 font-mono text-xs uppercase tracking-widest select-none"
              >
                + Empty Seat
              </div>
            ))}
          </div>

          {/* Instructions note */}
          <div className="pt-2 text-center text-xs sm:text-sm text-amber-400/80 font-medium">
            Waiting for host to start the match from their phone...
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <footer className="w-full flex items-center justify-between text-xs sm:text-sm text-stone-400 pt-2 border-t border-amber-900/30">
        <span>🎮 Phones act as wireless gamepads — the TV screen acts as the public arcade board.</span>
        <span className="font-mono text-amber-400">Game: {game.toUpperCase()}</span>
      </footer>
    </div>
  );
}
