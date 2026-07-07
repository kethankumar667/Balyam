import type { Player } from "@shared/types";

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
    <div className="bg-[#F7EEDC] border border-[#E6D4B7] rounded-xl p-4 dark:bg-slate-900 dark:border-slate-700">
      <h3 className="text-sm uppercase text-[#796651] mb-3 dark:text-slate-400">Players ({players.length})</h3>
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
            className={`flex items-center gap-2 bg-[#F1E6D3] border border-[#E1CFB1] rounded-lg px-3 py-2 dark:bg-slate-800 dark:border-slate-700 ${
              p.id !== selfId && onTapPlayer ? "cursor-pointer hover:bg-[#EAD9BC] active:scale-[0.99] transition" : ""
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                p.isConnected ? "bg-emerald-400" : "bg-amber-400"
              }`}
              title={p.isConnected ? "Online" : "Reconnecting..."}
            />
            <span className="flex-1 truncate text-[#332A22] dark:text-slate-100">
              {p.name}
              {p.id === selfId && <span className="text-[#8C7A67] text-xs ml-1 dark:text-slate-500">(you)</span>}
            </span>
            {p.isHost && (
              <span className="text-xs bg-[#2E476E] text-white rounded px-1.5 py-0.5">HOST</span>
            )}
            {p.isReady ? (
              <span className="text-xs text-emerald-400">READY</span>
            ) : (
              <span className="text-xs text-[#8C7A67] dark:text-slate-500">…</span>
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
