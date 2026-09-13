import type { HcState, Player } from "@shared/types";
import { getSocket } from "../../../lib/socket";
import { DD, DoordarshanScreen, DdButton, DdLabel } from "./doordarshan-kit";

export function DoordarshanTossCall({ state, selfId, players }: { state: HcState; selfId: string; players: Player[] }) {
  const callerId = state.tossCallerId ?? state.playerOrder[0];
  const callerName = players.find((p) => p.id === callerId)?.name ?? "Player 1";
  const isCaller = callerId === selfId;

  function call(choice: "odd" | "even") {
    getSocket().emit("game:move", { type: "tossCall", data: { call: choice } });
  }

  return (
    <DoordarshanScreen className="text-center space-y-4">
      <div className="font-crt text-[11px] tracking-widest uppercase" style={{ color: DD.amber }}>
        STEP 1 OF 2 · THE CALL
      </div>
      <div className="font-typewriter text-[17px]" style={{ color: DD.ink }}>The Toss Call (Odd / Even)</div>
      <div className="font-crt text-[13px] max-w-sm mx-auto" style={{ color: DD.inkLo }}>
        {isCaller
          ? "Call ODD or EVEN. Next, both players reveal 1–6 fingers — the SUM determines who wins the toss!"
          : `Standing by for ${callerName} to call ODD or EVEN. You will both show fingers next.`}
      </div>

      <div className="font-crt text-[11px] rounded p-2 max-w-xs mx-auto" style={{ background: "rgba(232,198,140,0.06)", border: `1px solid ${DD.line}`, color: DD.inkMid }}>
        Formula: Your Number + Opponent Number = Total Sum
        <br />
        <span style={{ color: DD.ink }}>e.g. 3 + 4 = 7 (ODD)</span>
      </div>

      {isCaller ? (
        <div className="flex justify-center gap-4 pt-2">
          <DdButton onClick={() => call("odd")} variant="primary" className="min-w-[120px]">
            ODD (1,3,5,7,9,11)
          </DdButton>
          <DdButton onClick={() => call("even")} variant="ghost" className="min-w-[120px]">
            EVEN (2,4,6,8,10,12)
          </DdButton>
        </div>
      ) : (
        <div className="font-typewriter text-[13px] py-4" style={{ color: DD.inkMid }}>
          Awaiting toss call broadcast from {callerName}…
        </div>
      )}
    </DoordarshanScreen>
  );
}

/**
 * Toss mechanic (see server/src/games/handcricket/HandCricketEngine.ts
 * handleTossPick): both players secretly show 1-6 fingers, the sum decides
 * — matching the caller's odd/even call.
 */
export function DoordarshanToss({ state, selfId, players }: { state: HcState; selfId: string; players: Player[] }) {
  const oppId = state.playerOrder.find((id) => id !== selfId) ?? "";
  const myPick = state.tossPicks[selfId];
  const oppLockedIn = state.tossPicks[oppId] != null;
  const oppName = players.find((p) => p.id === oppId)?.name ?? "Opponent";

  const callerId = state.tossCallerId ?? state.playerOrder[0];
  const callerName = players.find((p) => p.id === callerId)?.name ?? "Player 1";
  const callerCall = state.tossCall ?? "even";
  const myCall = selfId === callerId ? callerCall : callerCall === "even" ? "odd" : "even";

  function pick(n: number) {
    getSocket().emit("game:move", { type: "tossPick", data: { pick: n } });
  }

  return (
    <DoordarshanScreen className="text-center space-y-4">
      <div className="font-crt text-[11px] tracking-widest uppercase" style={{ color: DD.amber }}>
        STEP 2 OF 2 · SHOW FINGERS
      </div>
      <div className="font-typewriter text-[16px]" style={{ color: DD.ink }}>The toss — show your fingers (1–6)</div>

      {/* Dynamic Stakes Banner */}
      <div className="font-crt text-[12px] rounded p-2 max-w-sm mx-auto" style={{ background: "rgba(74,140,130,0.12)", border: `1px solid ${DD.teal}`, color: DD.ink }}>
        {callerId === selfId ? "You called" : `${callerName} called`} <strong>{callerCall.toUpperCase()}</strong> · You win on <strong>{myCall.toUpperCase()}</strong> sum
      </div>

      <div className="flex items-center justify-center gap-4">
        <div className="space-y-1">
          <DdLabel>YOU</DdLabel>
          <div className="w-14 h-14 rounded grid place-items-center font-crt text-[26px]" style={{ background: myPick != null ? "rgba(217,138,61,0.18)" : "rgba(232,198,140,0.05)", border: `2px solid ${myPick != null ? DD.amber : DD.line}`, color: DD.ink }}>
            {myPick ?? "?"}
          </div>
        </div>
        <div className="font-crt text-[13px]" style={{ color: DD.inkLo }}>+ SUM</div>
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
          {oppLockedIn ? "Calculating total sum…" : `Standing by for ${oppName}…`}
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
