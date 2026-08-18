import type { Player } from "@shared/types";
import { getSocket } from "../lib/socket";

import type { LudoColor } from "@shared/types";
import { COLOR_HEX, PLAYER_COLORS_ORDER } from "../games/ludo/board-layout";

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// All 8 seats, in the same canonical order the server assigns colors in.
// The engine's pool is sized to the BOARD's wedge count, not the player
// count (LudoEngine.init -> `wedgeCountFor(players.length)`), so a 2-player
// game can still pick any of the cross board's four arms and KEEPS that
// pick — the two arms nobody took just stay empty. Rooms can grow to 8
// (Ludo max — see registry.ts / Room.tsx's MAX_PLAYERS_BY_GAME) and use the
// print-design polygon board, which has real coordinates for all 8.
// A pick outside the eventual board's pool is not a dead end: that player
// simply draws randomly from the free colors like anyone who never picked.
const COLORS: { id: LudoColor; label: string; hex: string }[] = PLAYER_COLORS_ORDER.map(
  (id) => ({ id, label: capitalize(id), hex: COLOR_HEX[id] })
);

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

  /**
   * Every color is pickable at every table size.
   *
   * This briefly enforced the board's arm count (only the first four on a
   * 2-4 player cross board), because picking purple in a 3-player room used
   * to be silently discarded at start. That restriction is gone: the board
   * ARM and the color a player is painted in are now separate (see
   * LudoState.playerArms), so purple sits on whichever wedge is free and is
   * still drawn purple — tokens, yard, home lane and name plate.
   */

  return (
    <div className="bg-slate-900/70 rounded-xl p-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm uppercase text-slate-400">Pick your color</h3>
        <span className="text-xs text-slate-500">first come, first served</span>
      </div>
      <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
        {COLORS.map((c) => {
          const owner = players.find((p) => p.chosenColor === c.id);
          const isMe = owner?.id === selfId;
          const isOther = owner && !isMe;
          const isAvailable = !owner;
          const blocked = !!isOther;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => !blocked && pick(c.id)}
              disabled={blocked}
              aria-label={
                isMe
                  ? `Your color, ${c.label}`
                  : isOther
                  ? `${c.label} color, taken by ${owner.name}`
                  : `Pick ${c.label} color`
              }
              className={`relative min-h-[44px] min-w-[44px] rounded-lg p-3 flex flex-col items-center justify-center gap-1.5 transition border-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                isMe
                  ? "border-white scale-105"
                  : isOther
                    ? "border-slate-700 opacity-40 !cursor-not-allowed"
                    : "border-transparent hover:scale-105 hover:border-white"
              }`}
              style={{ background: c.hex }}
              title={
                isMe ? "Your color" : isOther ? `Taken by ${owner.name}` : `Pick ${c.label}`
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
          : "You'll be given a random color when the game starts if you don't pick."}
      </div>

    </div>
  );
}
