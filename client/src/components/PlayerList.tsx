import type { Player } from "@shared/types";

export default function PlayerList({
  players,
  selfId,
}: {
  players: Player[];
  selfId: string | null;
}) {
  return (
    <div className="bg-[#F7EEDC] border border-[#E6D4B7] rounded-xl p-4">
      <h3 className="text-sm uppercase text-[#796651] mb-3">Players ({players.length})</h3>
      <ul className="space-y-2">
        {players.map((p) => (
          <li
            key={p.id}
            className="flex items-center gap-2 bg-[#F1E6D3] border border-[#E1CFB1] rounded-lg px-3 py-2"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                p.isConnected ? "bg-emerald-400" : "bg-amber-400"
              }`}
              title={p.isConnected ? "Online" : "Reconnecting..."}
            />
            <span className="flex-1 truncate text-[#332A22]">
              {p.name}
              {p.id === selfId && <span className="text-[#8C7A67] text-xs ml-1">(you)</span>}
            </span>
            {p.isHost && (
              <span className="text-xs bg-[#2E476E] text-white rounded px-1.5 py-0.5">HOST</span>
            )}
            {p.isReady ? (
              <span className="text-xs text-emerald-400">READY</span>
            ) : (
              <span className="text-xs text-[#8C7A67]">…</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
