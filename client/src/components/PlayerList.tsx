import type { Player } from "@shared/types";
import SeatAvatar from "./profile/SeatAvatar";

export default function PlayerList({
  players,
  selfId,
  onTapPlayer,
}: {
  players: Player[];
  selfId: string | null;
  onTapPlayer?: (id: string) => void;
}) {
  return (
    <div className="bg-[var(--room-panel)] border border-[var(--room-panel-edge)] rounded-xl p-4">
      <h3 className="text-sm uppercase text-[var(--room-ink-soft)] mb-3">Players ({players.length})</h3>
      {/* Cap the visible list to ~3 rows; the rest scroll. Keeps the lobby
          card compact instead of growing tall with a 6-player table. */}
      <ul
        className="space-y-2 overflow-y-auto pr-1 rummy-scroll-soft"
        style={{ maxHeight: "13.5rem" }}
      >
        {players.map((p) => (
          <li
            key={p.id}
            onClick={p.id !== selfId && onTapPlayer ? () => onTapPlayer(p.id) : undefined}
            role={p.id !== selfId && onTapPlayer ? "button" : undefined}
            tabIndex={p.id !== selfId && onTapPlayer ? 0 : undefined}
            className={`flex items-center gap-2 bg-[var(--room-inset)] border border-[var(--room-inset-edge)] rounded-lg px-3 py-2 ${
              p.id !== selfId && onTapPlayer ? "cursor-pointer hover:bg-[#EAD9BC] active:scale-[0.99] transition" : ""
            }`}
          >
            {/* Face, then presence dot, then name. The dot moves onto the
                avatar's corner so the row gains a portrait without gaining a
                column — these rows are capped at ~3 visible and every pixel of
                width is already spoken for. */}
            <span className="relative flex-shrink-0">
              <SeatAvatar avatar={p.avatar} name={p.name} className="w-8 h-8" />
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full
                            ring-2 ring-[var(--room-inset)] ${
                              p.isConnected ? "bg-emerald-400" : "bg-amber-400"
                            }`}
                title={p.isConnected ? "Online" : "Reconnecting..."}
              />
            </span>
            <span className="flex-1 truncate text-[var(--room-ink)]">
              {p.name}
              {p.id === selfId && <span className="text-[var(--room-ink-mute)] text-xs ml-1">(you)</span>}
            </span>
            {/* The server is holding this seat. Said explicitly because the
                amber dot alone reads as "flaky", not as "their turns are
                being played for them" — and the table needs to know why moves
                are happening without them. The reason matters: one ends when
                they reconnect, the other the moment they play. */}
            {p.isAutoPlaying && (
              <span
                className="text-[10px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 bg-amber-500/20 text-amber-700 dark:text-amber-300"
                title={
                  p.autoPlayReason === "idle"
                    ? `${p.name} isn't responding — the table is playing their turns. Any move takes the seat back.`
                    : `${p.name} lost connection — the table is playing their turns until they return.`
                }
              >
                Auto
              </span>
            )}
            {p.isHost && (
              <span className="text-xs bg-[#2E476E] text-white rounded px-1.5 py-0.5">HOST</span>
            )}
            {p.isReady ? (
              <span className="text-xs text-emerald-400">READY</span>
            ) : (
              <span className="text-xs text-[var(--room-ink-mute)]">…</span>
            )}
            {p.id !== selfId && onTapPlayer && (
              <span className="text-sm" title={`React at ${p.name}`}>🎯</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
