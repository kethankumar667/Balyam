import type { HcState, Player } from "@shared/types";
import { getSocket } from "../../../lib/socket";
import { DD, DoordarshanScreen, DdButton, DdLabel } from "./doordarshan-kit";

/**
 * Toss mechanic (see server/src/games/handcricket/HandCricketEngine.ts
 * handleTossPick): both players secretly show 1-6 fingers, the sum decides
 * — even wins seat 0, odd wins seat 1.
 */
export function DoordarshanToss({ state, selfId, players }: { state: HcState; selfId: string; players: Player[] }) {
  const oppId = state.playerOrder.find((id) => id !== selfId) ?? "";
  const myPick = state.tossPicks[selfId];
  const oppLockedIn = state.tossPicks[oppId] != null;
  const oppName = players.find((p) => p.id === oppId)?.name ?? "Opponent";

  function pick(n: number) {
    getSocket().emit("game:move", { type: "tossPick", data: { pick: n } });
  }

  return (
    <DoordarshanScreen className="text-center space-y-4">
      <div className="font-typewriter text-[16px]" style={{ color: DD.ink }}>The toss — show your fingers</div>
      <div className="flex items-center justify-center gap-4">
        <div className="space-y-1">
          <DdLabel>YOU</DdLabel>
          <div className="w-14 h-14 rounded grid place-items-center font-crt text-[26px]" style={{ background: myPick != null ? "rgba(217,138,61,0.18)" : "rgba(232,198,140,0.05)", border: `2px solid ${myPick != null ? DD.amber : DD.line}`, color: DD.ink }}>
            {myPick ?? "?"}
          </div>
        </div>
        <div className="font-crt text-[13px]" style={{ color: DD.inkLo }}>VS</div>
        <div className="space-y-1">
          <DdLabel>{oppName.toUpperCase()}</DdLabel>
          <div className="w-14 h-14 rounded grid place-items-center font-crt text-[26px]" style={{ background: oppLockedIn ? "rgba(74,140,130,0.18)" : "rgba(232,198,140,0.05)", border: `2px solid ${oppLockedIn ? DD.teal : DD.line}`, color: DD.ink }}>
            {oppLockedIn ? "✓" : "?"}
          </div>
        </div>
      </div>

      {myPick == null ? (
        <div className="flex flex-wrap justify-center gap-2">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button key={n} onClick={() => pick(n)} className="w-11 h-11 rounded font-crt text-[20px] transition hover:brightness-125 active:scale-95" style={{ background: DD.screen, border: `1px solid ${DD.line}`, color: DD.ink }}>
              {n}
            </button>
          ))}
        </div>
      ) : (
        <div className="font-typewriter text-[13px]" style={{ color: DD.inkMid }}>
          {oppLockedIn ? "Rolling tape…" : `Standing by for ${oppName}…`}
        </div>
      )}
    </DoordarshanScreen>
  );
}

export function DoordarshanTossChoice({ state, selfId, players }: { state: HcState; selfId: string; players: Player[] }) {
  const winnerId = state.tossWinnerId;
  const winnerName = players.find((p) => p.id === winnerId)?.name ?? "Toss winner";
  const iWon = winnerId === selfId;

  function choose(choice: "bat" | "bowl") {
    getSocket().emit("game:move", { type: "tossChoice", data: { choice } });
  }

  return (
    <DoordarshanScreen className="text-center space-y-3">
      <div className="font-typewriter text-[15px]" style={{ color: DD.ink }}>
        {state.tossSum != null ? `${state.tossSum % 2 === 0 ? "Even" : "Odd"} — ${winnerName} wins the toss` : "Toss decided"}
      </div>
      {iWon ? (
        <>
          <div className="font-crt text-[13px] uppercase" style={{ color: DD.inkMid }}>Bat or bowl first?</div>
          <div className="flex justify-center gap-3">
            <DdButton variant="primary" onClick={() => choose("bat")}>Bat</DdButton>
            <DdButton variant="ghost" onClick={() => choose("bowl")}>Bowl</DdButton>
          </div>
        </>
      ) : (
        <div className="font-typewriter text-[13px]" style={{ color: DD.inkMid }}>Standing by for {winnerName}'s decision…</div>
      )}
    </DoordarshanScreen>
  );
}
