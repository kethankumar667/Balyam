import type { Player, UnoState } from "@shared/types";
import { getSocket } from "../../lib/socket";

interface UnoBoardProps {
  state: UnoState;
  players: Player[];
  selfId: string | null;
}

export default function UnoBoard({ state, players, selfId }: UnoBoardProps) {
  const myTurn = selfId != null && state.turnPlayerId === selfId && state.phase === "playing";
  const me = players.find((p) => p.id === selfId) ?? null;

  function move(type: "playDemo" | "draw") {
    getSocket().emit("game:move", { type });
  }

  return (
    <section className="bg-[#F6EDDB] border border-[#E8D8BE] rounded-2xl p-4 sm:p-6 space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[22px] sm:text-[28px] font-black text-[#2A354D]">UNO (Scaffold)</h2>
        <span className="px-3 py-1 rounded-full bg-[#FCE7D8] text-[#7A2F12] text-xs sm:text-sm font-bold">
          {state.phase === "finished" ? "Finished" : "Playing"}
        </span>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Top Card" value={state.topCard} />
        <StatCard label="Draw Pile" value={String(state.drawPileCount)} />
        <StatCard
          label="Direction"
          value={state.direction === 1 ? "Clockwise" : "Counter-clockwise"}
        />
      </div>

      <div className="rounded-xl bg-[#F1E5D1] border border-[#E1CFB1] p-3 sm:p-4">
        <div className="text-sm text-[#6E5E4D] mb-2">
          Turn: <span className="font-bold text-[#2F3A54]">{playerNameById(players, state.turnPlayerId)}</span>
        </div>
        {state.winnerId && (
          <div className="text-sm font-bold text-[#1C6E39] mb-2">
            Winner: {playerNameById(players, state.winnerId)}
          </div>
        )}
        {state.lastAction && <div className="text-xs text-[#6E5E4D]">Last action: {state.lastAction}</div>}
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {state.playerOrder.map((id) => {
          const isTurn = id === state.turnPlayerId;
          const isSelf = id === selfId;
          return (
            <li
              key={id}
              className={`rounded-xl border px-3 py-2.5 flex items-center justify-between ${
                isTurn ? "bg-[#E8F6E2] border-[#98D58B]" : "bg-[#F8EFE0] border-[#E4D2B5]"
              }`}
            >
              <span className="font-semibold text-[#2F3A54]">
                {playerNameById(players, id)}{isSelf ? " (You)" : ""}
              </span>
              <span className="text-sm font-bold text-[#4A3F35]">{state.handSizes[id] ?? 0} cards</span>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={() => move("playDemo")}
          disabled={!myTurn}
          className="px-4 py-2 rounded-full bg-[#EA5A1F] hover:bg-[#D74F18] text-white font-bold disabled:opacity-40"
        >
          Play Demo Card
        </button>
        <button
          type="button"
          onClick={() => move("draw")}
          disabled={!myTurn}
          className="px-4 py-2 rounded-full bg-[#31A157] hover:bg-[#2A8B4B] text-white font-bold disabled:opacity-40"
        >
          Draw Card
        </button>
        {!myTurn && state.phase === "playing" && me && (
          <span className="px-3 py-2 text-xs rounded-full bg-[#EEDCC2] text-[#6E5E4D] font-semibold">
            Waiting for your turn
          </span>
        )}
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#F8EFE0] border border-[#E4D2B5] px-3 py-2.5">
      <div className="text-[11px] uppercase tracking-wider text-[#7A6A58] font-bold">{label}</div>
      <div className="text-[16px] sm:text-[18px] text-[#2F3A54] font-black mt-0.5">{value}</div>
    </div>
  );
}

function playerNameById(players: Player[], id: string | null): string {
  if (!id) return "-";
  return players.find((p) => p.id === id)?.name ?? id;
}
