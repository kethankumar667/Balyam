export interface WildDrawFourChallengePromptProps {
  playedByName: string;
  onAccept: () => void;
  onChallenge: () => void;
}

/**
 * Shown only to the player targeted by a Wild Draw Four, while
 * `state.pendingChallenge.challengerId === selfId`. Every other player just
 * sees the existing `UnoActionToast` surface the engine's own
 * `lastAction` ("Wild Draw Four! Waiting for {target} to accept or
 * challenge.") — no separate "someone else is deciding" banner needed.
 *
 * Deliberately doesn't reveal whether the play was legal — the server
 * (`UnoEngine.pendingChallenge.wasLegal`) never puts that on the wire, so
 * there is nothing here that could leak it even by omission.
 */
export function WildDrawFourChallengePrompt({
  playedByName,
  onAccept,
  onChallenge,
}: WildDrawFourChallengePromptProps) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Wild Draw Four decision"
    >
      <div
        className="w-full max-w-sm rounded-2xl p-5 space-y-4 shadow-2xl"
        style={{ background: "#FFF9F0", border: "2px solid #17181d" }}
      >
        <div className="text-center space-y-1">
          <div className="text-3xl">🌈4️⃣</div>
          <h2 className="text-lg font-black text-[#2B2118]">Wild Draw Four!</h2>
          <p className="text-sm text-[#6E5E4D]">
            <span className="font-bold">{playedByName}</span> played a Wild Draw Four on you.
            Accept the 4 cards, or challenge it if you think they had another card they could
            have played instead.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={onChallenge}
            className="w-full rounded-lg py-3 font-bold text-white transition-all active:scale-95"
            style={{ background: "#DC2626" }}
          >
            Challenge!
          </button>
          <button
            onClick={onAccept}
            className="w-full rounded-lg py-3 font-bold text-[#2B2118] transition-all active:scale-95"
            style={{ background: "#F0E1D0", border: "1px solid #E8D8BE" }}
          >
            Accept — Draw 4
          </button>
        </div>
        <p className="text-center text-[10px] text-[#8B7355]">
          A failed challenge draws 6 instead of 4 — only challenge if you're fairly sure.
        </p>
      </div>
    </div>
  );
}
