import type { CoinColor, Player } from "@shared/types";
import { getSocket } from "../lib/socket";

export const COIN_COLOR_HEX: Record<CoinColor, { fill: string; dark: string; label: string }> = {
  red:     { fill: "#ef4444", dark: "#7f1d1d", label: "Red"     },
  blue:    { fill: "#3b82f6", dark: "#1e3a8a", label: "Blue"    },
  green:   { fill: "#22c55e", dark: "#14532d", label: "Green"   },
  yellow:  { fill: "#facc15", dark: "#713f12", label: "Yellow"  },
  purple:  { fill: "#a855f7", dark: "#581c87", label: "Purple"  },
  cyan:    { fill: "#06b6d4", dark: "#155e75", label: "Cyan"    },
  orange:  { fill: "#f97316", dark: "#7c2d12", label: "Orange"  },
  pink:    { fill: "#ec4899", dark: "#831843", label: "Pink"    },
  lime:    { fill: "#a3e635", dark: "#365314", label: "Lime"    },
  magenta: { fill: "#d946ef", dark: "#701a75", label: "Magenta" },
};

const ORDER: CoinColor[] = [
  "red", "blue", "green", "yellow", "purple",
  "cyan", "orange", "pink", "lime", "magenta",
];

export default function CoinColorPicker({
  players,
  selfId,
}: {
  players: Player[];
  selfId: string | null;
}) {
  const self = players.find((p) => p.id === selfId);
  function pick(color: CoinColor) {
    getSocket().emit("room:chooseCoinColor", color);
  }
  return (
    <div className="bg-slate-900/70 rounded-xl p-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm uppercase text-slate-400">Pick your coin color</h3>
        <span className="text-xs text-slate-500">first come, first served</span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {ORDER.map((c) => {
          const palette = COIN_COLOR_HEX[c];
          const owner = players.find((p) => p.coinColor === c);
          const isMe = owner?.id === selfId;
          const isOther = !!owner && !isMe;
          return (
            <button
              key={c}
              onClick={() => !isOther && pick(c)}
              disabled={isOther}
              className={`relative rounded-lg p-2 flex flex-col items-center gap-1 transition border-2 ${
                isMe
                  ? "border-white scale-105"
                  : isOther
                  ? "border-slate-700 opacity-40 cursor-not-allowed"
                  : "border-transparent hover:scale-105 hover:border-white"
              }`}
              style={{ background: palette.fill }}
              title={
                isMe ? "Your coin"
                : isOther ? `Taken by ${owner!.name}`
                : `Pick ${palette.label}`
              }
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold"
                style={{
                  background: "rgba(255,255,255,0.85)",
                  color: palette.dark,
                  boxShadow: `inset 0 -2px 0 ${palette.dark}`,
                }}
              >
                {isMe ? (self?.name.charAt(0).toUpperCase() ?? "?") : ""}
              </div>
              <div className="text-[10px] font-bold text-white drop-shadow">{palette.label}</div>
              {isOther && (
                <div className="absolute top-0.5 right-0.5 text-[9px] text-white bg-black/60 rounded px-1 truncate max-w-[80%]">
                  {owner!.name}
                </div>
              )}
            </button>
          );
        })}
      </div>
      <div className="text-xs text-slate-400">
        {self?.coinColor
          ? `You picked ${COIN_COLOR_HEX[self.coinColor].label}. Click another to switch.`
          : "Don't pick? You'll be auto-assigned when the game starts."}
      </div>
    </div>
  );
}
