import type { Player } from "@shared/types";
import { getSocket } from "../lib/socket";

import type { LudoColor } from "@shared/types";

// Only the four cardinal colors render on the standard Ludo board. Earlier
// the picker also offered purple/cyan/orange/brown, but board-layout stubs
// those to red's coordinates, which meant picking one made your yard
// invisible and stacked your tokens under red's tokens. The polygon-board
// variant (5+ players) accepts more colors, but its UI lives elsewhere.
const COLORS: { id: LudoColor; label: string; hex: string }[] = [
  { id: "red", label: "Red", hex: "#ef4444" },
  { id: "green", label: "Green", hex: "#10b981" },
  { id: "yellow", label: "Yellow", hex: "#f59e0b" },
  { id: "blue", label: "Blue", hex: "#3b82f6" },
];

export default function LudoColorPicker({
  players,
  selfId,
}: {
  players: Player[];
  selfId: string | null;
}) {
  const self = players.find((p) => p.id === selfId);
  function pick(color: LudoColor) {
    getSocket().emit("room:chooseColor", color);
  }

  return (
    <div className="bg-slate-900/70 rounded-xl p-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm uppercase text-slate-400">Pick your color</h3>
        <span className="text-xs text-slate-500">first come, first served</span>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {COLORS.map((c) => {
          const owner = players.find((p) => p.chosenColor === c.id);
          const isMe = owner?.id === selfId;
          const isOther = owner && !isMe;
          const isAvailable = !owner;
          return (
            <button
              key={c.id}
              onClick={() => !isOther && pick(c.id)}
              disabled={!!isOther}
              className={`relative rounded-lg p-3 flex flex-col items-center gap-1.5 transition border-2 ${
                isMe
                  ? "border-white scale-105"
                  : isOther
                  ? "border-slate-700 opacity-40 cursor-not-allowed"
                  : "border-transparent hover:scale-105 hover:border-white"
              }`}
              style={{ background: c.hex }}
              title={
                isMe
                  ? "Your color"
                  : isOther
                  ? `Taken by ${owner.name}`
                  : `Pick ${c.label}`
              }
            >
              <div className="w-7 h-7 rounded-full bg-white/30 border border-white/60 shadow-inner" />
              <div className="text-xs font-bold text-white drop-shadow">
                {c.label}
              </div>
              {isMe && (
                <div className="absolute top-1 right-1 text-xs text-white bg-black/40 rounded px-1.5">
                  you
                </div>
              )}
              {isOther && (
                <div className="absolute top-1 right-1 text-[10px] text-white bg-black/60 rounded px-1.5 truncate max-w-[80%]">
                  {owner.name}
                </div>
              )}
            </button>
          );
        })}
      </div>
      <div className="text-xs text-slate-400">
        {self?.chosenColor
          ? `You picked ${self.chosenColor}. Click another to switch.`
          : "You'll auto-assign a color when the game starts if you don't pick."}
      </div>
    </div>
  );
}
