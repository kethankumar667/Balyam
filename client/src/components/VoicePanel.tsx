import { useEffect, useRef, useState } from "react";
import type { Player } from "@shared/types";
import { VoiceManager, type RemotePeerInfo } from "../lib/webrtc";
import { getSocket } from "../lib/socket";

export default function VoicePanel({
  players,
  selfId,
}: {
  players: Player[];
  selfId: string | null;
}) {
  const managerRef = useRef<VoiceManager | null>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [peers, setPeers] = useState<RemotePeerInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!managerRef.current || !connected) return;
    const remoteIds = players.map((p) => p.id);
    managerRef.current.syncPeers(remoteIds).catch((err) => {
      console.error("syncPeers failed:", err);
    });
  }, [players, connected]);

  useEffect(() => {
    return () => {
      managerRef.current?.destroy();
      managerRef.current = null;
    };
  }, []);

  useEffect(() => {
    for (const peer of peers) {
      const el = audioRefs.current.get(peer.playerId);
      if (el && peer.stream && el.srcObject !== peer.stream) {
        el.srcObject = peer.stream;
        el.play().catch(() => {
          // autoplay sometimes blocked; user click on the page unblocks
        });
      }
    }
  }, [peers]);

  async function connectMic() {
    if (!selfId || busy || connected) return;
    setBusy(true);
    setError(null);
    try {
      const socket = getSocket();
      const mgr = new VoiceManager(socket, selfId);
      await mgr.start();
      managerRef.current = mgr;
      mgr.subscribe(setPeers);
      setConnected(true);
      await mgr.syncPeers(players.map((p) => p.id));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to access microphone";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  function toggleMute() {
    if (!managerRef.current) return;
    setMuted(managerRef.current.toggleMute());
  }

  function disconnect() {
    managerRef.current?.destroy();
    managerRef.current = null;
    setConnected(false);
    setMuted(false);
    setPeers([]);
  }

  function nameOf(id: string): string {
    return players.find((p) => p.id === id)?.name ?? "?";
  }

  return (
    <div className="bg-[#F7EEDC] border border-[#E6D4B7] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm uppercase text-[#7A6652]">Voice</h3>
        {connected && (
          <span className="text-xs text-emerald-400">● Live</span>
        )}
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
          <div className="flex gap-2">
            <button
              onClick={toggleMute}
              className={`flex-1 rounded py-2 text-sm font-semibold ${
                muted
                  ? "bg-[#E6A11E] hover:bg-[#D89215] text-[#2B2118]"
                  : "bg-[#E5D6BD] hover:bg-[#DBC8AA] text-[#3A3027]"
              }`}
            >
              {muted ? "🔇 Muted" : "🎙 Mic on"}
            </button>
            <button
              onClick={disconnect}
              className="bg-[#4A3F35] hover:bg-[#3F352C] text-[#FFF3E3] rounded px-3 text-sm"
              title="Leave voice"
            >
              Leave
            </button>
          </div>
          <ul className="space-y-1 text-xs">
            {peers.length === 0 && (
              <li className="text-[#8A7865]">Waiting for others to connect mic…</li>
            )}
            {peers.map((p) => (
              <li
                key={p.playerId}
                className="flex items-center gap-2 bg-[#F1E6D3] border border-[#E1CFB1] rounded px-2 py-1"
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
                <span className="flex-1 truncate text-[#3A3027]">{nameOf(p.playerId)}</span>
                <span className="text-[#8A7865]">{p.connectionState}</span>
                <audio
                  autoPlay
                  playsInline
                  ref={(el) => {
                    if (el) audioRefs.current.set(p.playerId, el);
                    else audioRefs.current.delete(p.playerId);
                  }}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <div className="text-red-400 text-xs mt-2">{error}</div>}
    </div>
  );
}
