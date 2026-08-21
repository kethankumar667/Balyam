import type { Player } from "@shared/types";
import { Mic, MicOff, Volume2, LogOut } from "lucide-react";
import SeatAvatar from "./profile/SeatAvatar";
import { useVoiceSession } from "../lib/voice-session";
import {
  enterFullscreen,
  isFullscreenActive,
  isFullscreenSupported,
} from "../lib/fullscreen";

/**
 * View onto the room's voice session.
 *
 * This component owns no connection state. The mic, the peer mesh and the
 * remote audio elements belong to the module-level session in
 * lib/voice-session.ts, so closing this panel — or starting the game, or
 * switching to the chat tab — no longer ends the call.
 */
export default function VoicePanel({
  players,
  selfId,
  restoreOrientation = "any",
}: {
  players: Player[];
  selfId: string | null;
  /**
   * Orientation to re-lock after the mic-permission prompt closes
   * fullscreen. Pass "landscape" from Rummy, "portrait" from other
   * portrait-locked games. "any" (default) re-enters fullscreen
   * without re-locking, which is right for desktop / loose games.
   */
  restoreOrientation?: "landscape" | "portrait" | "any";
}) {
  const voice = useVoiceSession(selfId);
  const connected = voice.status === "live";
  const busy = voice.status === "connecting";

  // Someone else is in the room but not in the call yet. Used to tell
  // "nobody has joined voice" apart from "we cannot reach each other".
  const others = players.filter((p) => !p.isBot && !p.isLocal && p.id !== selfId);
  const anyFailed = voice.peers.some((p) => p.connectionState === "failed");

  async function connectMic() {
    if (!selfId || busy || connected) return;
    // Browsers exit fullscreen + drop the orientation lock when they show
    // the mic-permission prompt. Snapshot whether we were in fullscreen so
    // we can re-enter after the prompt resolves — otherwise opening the
    // voice panel mid-Rummy collapses the room out of landscape.
    const wasFullscreen = isFullscreenActive();
    await voice.connect();
    // Best-effort fullscreen restore. We're still inside a user gesture
    // (the Connect-mic click), so the browser's activation window is
    // usually still open. If it's been ≳5s (rare permission delays) the
    // call will silently fail — the in-game fullscreen toggle remains
    // the user's escape hatch in that case.
    if (wasFullscreen && !isFullscreenActive() && isFullscreenSupported()) {
      void enterFullscreen(restoreOrientation);
    }
  }

  function avatarOf(id: string): string | undefined {
    return players.find((p) => p.id === id)?.avatar;
  }

  function nameOf(id: string): string {
    return players.find((p) => p.id === id)?.name ?? "?";
  }

  return (
    <div className="bg-[#FFFDF8] dark:bg-[var(--surface-1)] border-2 border-[#EEDBCA] dark:border-slate-800 rounded-3xl p-3.5 sm:p-4 shadow-sm space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[#8A6D4B] dark:text-slate-400 flex items-center gap-1.5">
          <Mic size={14} className="shrink-0" aria-hidden />
          <span>Voice Chat</span>
        </h3>
        {connected && <span className="text-xs font-bold text-emerald-500">● Live</span>}
      </div>

      {!connected ? (
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={connectMic}
            disabled={busy}
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold py-2 sm:py-2.5 rounded-xl shadow-sm transition active:scale-95 flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer disabled:opacity-50"
          >
            <Mic size={16} aria-hidden />
            <span>{busy ? "Requesting mic..." : "Connect mic"}</span>
          </button>
          <p className="text-[11px] text-center text-[#8A6D4B] dark:text-slate-400 font-medium">
            Speak with your friends during the game.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          <p className="text-[11px] text-[#8A6D4B] dark:text-slate-400">
            Voice stays on while you play. Use Leave to hang up.
          </p>

          {voice.audioBlocked && (
            <button
              onClick={voice.retryAudio}
              className="w-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 rounded-xl py-2 text-xs font-bold shadow-sm flex items-center justify-center gap-2"
            >
              <Volume2 size={16} aria-hidden />
              <span>Tap to enable sound</span>
            </button>
          )}

          <div className="flex gap-2">
            <button
              onClick={voice.toggleMute}
              className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition shadow-sm flex items-center justify-center gap-2 ${
                voice.muted
                  ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950"
                  : "bg-[#FFF9EE] dark:bg-[#182234] border border-[#EEDBCA] dark:border-slate-700 hover:bg-[#FFF4E0] text-[#2B3550] dark:text-slate-100"
              }`}
            >
              {voice.muted ? (
                <>
                  <MicOff size={16} aria-hidden />
                  <span>Muted</span>
                </>
              ) : (
                <>
                  <Mic size={16} aria-hidden />
                  <span>Mic on</span>
                </>
              )}
            </button>
            <button
              onClick={voice.disconnect}
              className="bg-slate-200 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-950/50 hover:text-red-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl px-4 text-sm font-semibold transition flex items-center gap-1.5"
              title="Leave voice"
            >
              <LogOut size={14} aria-hidden />
              <span>Leave</span>
            </button>
          </div>

          <ul className="space-y-1.5 text-xs">
            {voice.peers.length === 0 && (
              <li className="text-[#8A6D4B] dark:text-slate-400 py-1">
                {others.length === 0
                  ? "No one else in the room yet."
                  : "Waiting for others to connect mic…"}
              </li>
            )}
            {voice.peers.map((p) => (
              <li
                key={p.playerId}
                className="flex items-center gap-2.5 bg-[#FFF9EE] dark:bg-[#182234] border border-[#EEDBCA] dark:border-slate-700/60 rounded-xl px-3 py-1.5"
              >
                <span className="relative flex-shrink-0">
                  <SeatAvatar
                    avatar={avatarOf(p.playerId)}
                    name={nameOf(p.playerId)}
                    className="w-6 h-6"
                    textClassName="text-[10px]"
                  />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-1 ring-white ${
                      p.connectionState === "connected"
                        ? "bg-emerald-400"
                        : p.connectionState === "failed"
                        ? "bg-red-400"
                        : "bg-amber-400"
                    }`}
                  />
                </span>
                <span className="flex-1 truncate text-[#2B3550] dark:text-slate-100 font-medium">
                  {nameOf(p.playerId)}
                </span>
                <span className="text-[#8A6D4B] dark:text-slate-400 text-[10px]">
                  {p.connectionState === "connected" && !p.stream
                    ? "no audio"
                    : p.connectionState}
                </span>
              </li>
            ))}
          </ul>

          {anyFailed && voice.relayless && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400">
              Couldn't reach some players — their network needs a relay server.
            </p>
          )}
        </div>
      )}

      {voice.error && <div className="text-red-500 text-xs mt-2">{voice.error}</div>}
    </div>
  );
}

