import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import type { Player, RoomPublicState } from "@shared/types";
import { getSocket } from "../lib/socket";

/**
 * Smart TV / Party Mode — the big-screen view of a room.
 *
 * Open `/tv/<CODE>` on a TV, console browser or laptop plugged into a
 * projector; phones stay the controllers. This screen takes no seat, so it
 * does not consume a player slot or stall a turn waiting for it to move.
 *
 * It receives PUBLIC state only (see RoomManager.broadcastGameState). That is
 * a security boundary, not a styling choice: a TV in a living room is the
 * least private surface in the app, and private state must never reach it.
 * Consequently this view shows the roster, scores, turn and room code — the
 * things a room wants shared — and never a hand.
 *
 * Everything is sized for three metres away: nothing here is smaller than
 * roughly 2vh, because the usual mobile type scale is unreadable across a room.
 */
export default function PartyScreen() {
  const { code } = useParams<{ code: string }>();
  const [room, setRoom] = useState<RoomPublicState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!code) return;
    const socket = getSocket();

    const attach = () => {
      socket.emit("room:spectate", code.toUpperCase(), (res) => {
        if (res.ok) {
          setConnected(true);
          setError(null);
        } else {
          setError(res.error ?? "Could not attach to that room");
        }
      });
    };

    const onRoomState = (state: RoomPublicState) => setRoom(state);

    socket.on("room:state", onRoomState);
    // Re-attach after a reconnect; the server forgets screens on disconnect.
    socket.on("connect", attach);
    attach();

    return () => {
      socket.off("room:state", onRoomState);
      socket.off("connect", attach);
      socket.emit("room:stopSpectate");
    };
  }, [code]);

  // A TV is left on for hours; a sleeping display defeats the point.
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = async () => {
      try {
        lock = await navigator.wakeLock?.request("screen");
      } catch {
        // Unsupported or denied — the screen may sleep, which is survivable.
      }
    };
    void request();
    const onVisible = () => {
      if (document.visibilityState === "visible" && !cancelled) void request();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => {});
    };
  }, []);

  const players: Player[] = useMemo(() => room?.players ?? [], [room]);

  if (error) {
    return (
      <Shell>
        <p className="text-[4vh] font-bold text-[#F6EDDB]">{error}</p>
        <p className="text-[2.4vh] text-[#C8A66B]">Check the room code and try again.</p>
      </Shell>
    );
  }

  if (!room) {
    return (
      <Shell>
        <p className="text-[3vh] text-[#C8A66B]">
          {connected ? "Waiting for the room…" : "Connecting…"}
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <header className="flex items-baseline justify-between gap-[3vw] w-full">
        <div>
          <h1 className="text-[6vh] leading-none font-black tracking-tight text-[#F6EDDB]">
            {room.name || "BHALYAM"}
          </h1>
          <p className="text-[2.4vh] uppercase tracking-[0.3em] text-[#C8A66B] mt-[1vh]">
            {room.game}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[2.2vh] uppercase tracking-[0.3em] text-[#C8A66B]">Join with code</p>
          {/* The single most important thing on a party screen: how to get in. */}
          <p className="text-[9vh] leading-none font-black tabular-nums tracking-[0.12em] text-[#E6A11E]">
            {room.code}
          </p>
        </div>
      </header>

      <div className="flex-1 w-full flex flex-col justify-center gap-[2vh]">
        <p className="text-[2.4vh] uppercase tracking-[0.3em] text-[#C8A66B]">
          {room.phase === "lobby"
            ? `Waiting to start · ${players.length}/${room.maxPlayers} seats`
            : room.phase === "finished"
            ? "Match over"
            : "In play"}
        </p>

        <ul className="grid grid-cols-2 gap-[2vh] w-full">
          {players.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-[2vw] rounded-[1.5vh] px-[2vw] py-[2vh]"
              style={{
                background: p.isConnected ? "rgba(246,237,219,0.10)" : "rgba(246,237,219,0.04)",
                border: `2px solid ${p.isConnected ? "#C8A66B" : "#5C4A38"}`,
              }}
            >
              <span className="text-[4.5vh] font-black text-[#F6EDDB] truncate flex-1">
                {p.name}
              </span>
              {p.isHost && (
                <span className="text-[2vh] font-bold uppercase tracking-widest text-[#E6A11E]">
                  Host
                </span>
              )}
              {p.isBot && (
                <span className="text-[2vh] font-bold uppercase tracking-widest text-[#8A7865]">
                  Bot
                </span>
              )}
              {!p.isConnected && (
                <span className="text-[2vh] font-bold uppercase tracking-widest text-[#B45309]">
                  Away
                </span>
              )}
              {room.phase === "lobby" && p.isReady && (
                <span className="text-[3vh]" aria-label="Ready">
                  ✓
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <footer className="w-full flex items-center justify-between text-[2vh] text-[#8A7865]">
        <span>Phones are the controllers — this screen is display only.</span>
        <span className="tabular-nums">
          {room.spectatorCount ?? 1} screen{(room.spectatorCount ?? 1) === 1 ? "" : "s"}
        </span>
      </footer>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center gap-[3vh] p-[4vh] overflow-hidden"
      style={{ background: "linear-gradient(160deg, #2B2118 0%, #17110C 100%)" }}
    >
      {children}
    </div>
  );
}
