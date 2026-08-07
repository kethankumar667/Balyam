import type { Player } from "@shared/types";
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

  function nameOf(id: string): string {
    return players.find((p) => p.id === id)?.name ?? "?";
  }

  return (
    <div className="bg-[#F7EEDC] border border-[#E6D4B7] rounded-xl p-4 dark:bg-slate-900 dark:border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm uppercase text-[#7A6652] dark:text-slate-400">Voice</h3>
        {connected && <span className="text-xs text-emerald-400">● Live</span>}
      </div>

      {!connected ? (
        <button
          onClick={connectMic}
          disabled={busy}
          className="w-full bg-[#31A157] hover:bg-[#2A8B4B] text-white disabled:opacity-50 rounded py-2 text-sm font-semibold"
        >
          {busy ? "Requesting mic..." : "🎙 Connect mic"}
        </button>
      ) : (
        <div className="space-y-2">
          {/* The call keeps running when this panel closes, so say so once —
              players were re-clicking "Connect mic" because the old panel
              really did drop the call every time it was dismissed. */}
          <p className="text-[11px] text-[#8A7865] dark:text-slate-500">
            Voice stays on while you play. Use Leave to hang up.
          </p>

          {voice.audioBlocked && (
            <button
              onClick={voice.retryAudio}
              className="w-full bg-[#E6A11E] hover:bg-[#D89215] text-[#2B2118] rounded py-2 text-xs font-semibold"
            >
              🔈 Tap to enable sound
            </button>
          )}

          <div className="flex gap-2">
            <button
              onClick={voice.toggleMute}
              className={`flex-1 rounded py-2 text-sm font-semibold ${
                voice.muted
                  ? "bg-[#E6A11E] hover:bg-[#D89215] text-[#2B2118] dark:text-slate-300"
                  : "bg-[#E5D6BD] hover:bg-[#DBC8AA] text-[#3A3027] dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-100"
              }`}
            >
              {voice.muted ? "🔇 Muted" : "🎙 Mic on"}
            </button>
            <button
              onClick={voice.disconnect}
              className="bg-[#4A3F35] hover:bg-[#3F352C] text-[#FFF3E3] rounded px-3 text-sm"
              title="Leave voice"
            >
              Leave
            </button>
          </div>

          <ul className="space-y-1 text-xs">
            {voice.peers.length === 0 && (
              <li className="text-[#8A7865] dark:text-slate-500">
                {others.length === 0
                  ? "No one else in the room yet."
                  : "Waiting for others to connect mic…"}
              </li>
            )}
            {voice.peers.map((p) => (
              <li
                key={p.playerId}
                className="flex items-center gap-2 bg-[#F1E6D3] border border-[#E1CFB1] rounded px-2 py-1 dark:bg-slate-800 dark:border-slate-700"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    p.connectionState === "connected"
                      ? "bg-emerald-400"
                      : p.connectionState === "failed"
                      ? "bg-red-400"
                      : "bg-amber-400"
                  }`}
                />
                <span className="flex-1 truncate text-[#3A3027] dark:text-slate-200">
                  {nameOf(p.playerId)}
                </span>
                <span className="text-[#8A7865] dark:text-slate-500">
                  {p.connectionState === "connected" && !p.stream
                    ? "no audio"
                    : p.connectionState}
                </span>
              </li>
            ))}
          </ul>

          {anyFailed && voice.relayless && (
            // Mesh voice over STUN alone cannot cross two symmetric NATs.
            // Without a TURN relay configured this is unfixable from the
            // client, so name it rather than leaving a red dot unexplained.
            <p className="text-[11px] text-amber-600 dark:text-amber-400">
              Couldn't reach some players — their network needs a relay server.
            </p>
          )}
        </div>
      )}

      {voice.error && <div className="text-red-400 text-xs mt-2">{voice.error}</div>}
    </div>
  );
}
