/**
 * Claim-to-score UI (claimToScoreMode only). Three small, focused pieces:
 *
 *   ClaimBuilderBar  — shown to the claimant while identifying their word.
 *   ClaimVotePrompt  — full-screen accept/reject dialog for an opponent
 *                      with an outstanding vote.
 *   ClaimWaitingBadge — lightweight "waiting for opponents…" indicator for
 *                      the claimant during voting, and for an opponent who
 *                      already voted.
 *
 * v1 scope (see the feature plan): plain ordered taps, no axis-lock visual
 * highlighting on the grid itself — the server is the real authority and
 * rejects a bad path with a clear error toast via the existing game:error
 * pipe, so nothing here needs to pre-validate beyond what
 * useWordBuildingBoard's tapClaimCell already silently enforces.
 */

export interface ClaimBuilderBarProps {
  claimPath: Array<{ r: number; c: number }>;
  board: string[][];
  minWordLength: number;
  onSubmit: () => void;
  onUndo: () => void;
  onClear: () => void;
  onSkip: () => void;
  isNeon: boolean;
}

export function ClaimBuilderBar({
  claimPath,
  board,
  minWordLength,
  onSubmit,
  onUndo,
  onClear,
  onSkip,
  isNeon,
}: ClaimBuilderBarProps) {
  const letters = claimPath.map((cell) => board[cell.r]?.[cell.c] ?? "").join("");
  const canSubmit = claimPath.length >= minWordLength;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[env(safe-area-inset-bottom)]"
      role="region"
      aria-label="Identify your word"
    >
      <div
        className="w-full max-w-md rounded-t-2xl p-3.5 space-y-2.5 shadow-2xl"
        style={{
          background: isNeon ? "#0f172a" : "#4A3F35",
          border: isNeon ? "1px solid rgba(56,189,248,0.3)" : "1px solid #3a3028",
          color: isNeon ? "#e2e8f0" : "#FFF3E3",
        }}
      >
        <p className="text-xs font-semibold opacity-80">
          Tap the rest of your word — you placed the first letter.
        </p>
        <div
          className="min-h-[44px] rounded-xl flex items-center justify-center gap-1 px-3 font-black text-2xl tracking-[0.2em]"
          style={{
            background: isNeon ? "rgba(56,189,248,0.12)" : "rgba(255,255,255,0.08)",
            color: isNeon ? "#38bdf8" : "#E6A11E",
          }}
        >
          {letters || <span className="text-sm font-medium opacity-50">(tap adjacent letters)</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onUndo}
            disabled={claimPath.length === 0}
            className="flex-1 rounded-lg py-2.5 text-sm font-bold transition-all active:scale-95 disabled:opacity-40"
            style={{ background: "rgba(255,255,255,0.1)" }}
          >
            Undo
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={claimPath.length === 0}
            className="flex-1 rounded-lg py-2.5 text-sm font-bold transition-all active:scale-95 disabled:opacity-40"
            style={{ background: "rgba(255,255,255,0.1)" }}
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="flex-1 rounded-lg py-2.5 text-sm font-bold transition-all active:scale-95"
            style={{ background: "rgba(255,255,255,0.1)" }}
          >
            Not a word
          </button>
        </div>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className="w-full rounded-lg py-3 font-bold transition-all active:scale-95 disabled:opacity-40"
          style={{
            background: isNeon ? "#38bdf8" : "#E6A11E",
            color: isNeon ? "#0f172a" : "#2B2118",
          }}
        >
          {canSubmit ? `Claim "${letters}"` : `Need ${minWordLength}+ letters`}
        </button>
      </div>
    </div>
  );
}

export interface ClaimVotePromptProps {
  claimantName: string;
  word: string;
  onAccept: () => void;
  onReject: () => void;
  isNeon: boolean;
}

/**
 * Shown only to an opponent with an outstanding vote. Mirrors
 * `uno-challenge.tsx`'s WildDrawFourChallengePrompt shape — a full-screen
 * dialog is warranted here too since, unlike a routine toast, a claim vote
 * blocks the whole table until it resolves.
 */
export function ClaimVotePrompt({ claimantName, word, onAccept, onReject, isNeon }: ClaimVotePromptProps) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Word claim decision"
    >
      <div
        className="w-full max-w-sm rounded-2xl p-5 space-y-4 shadow-2xl"
        style={{
          background: isNeon ? "#0f172a" : "#FFF9F0",
          border: isNeon ? "1px solid rgba(56,189,248,0.3)" : "2px solid #17181d",
          color: isNeon ? "#e2e8f0" : "#2B2118",
        }}
      >
        <div className="text-center space-y-1">
          <div className="text-3xl">📝</div>
          <h2 className="text-lg font-black">{claimantName} claims a word</h2>
          <p
            className="text-3xl font-black tracking-[0.15em] py-2"
            style={{ color: isNeon ? "#38bdf8" : "#E6A11E" }}
          >
            {word}
          </p>
          <p className="text-sm opacity-70">Is this a real word? Any one of you accepting scores it.</p>
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onAccept}
            className="w-full rounded-lg py-3 font-bold text-white transition-all active:scale-95"
            style={{ background: "#16a34a" }}
          >
            Accept
          </button>
          <button
            type="button"
            onClick={onReject}
            className="w-full rounded-lg py-3 font-bold transition-all active:scale-95"
            style={{
              background: isNeon ? "rgba(255,255,255,0.08)" : "#F0E1D0",
              border: isNeon ? "1px solid rgba(255,255,255,0.15)" : "1px solid #E8D8BE",
            }}
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

export interface ClaimWaitingBadgeProps {
  label: string;
  isNeon: boolean;
}

export function ClaimWaitingBadge({ label, isNeon }: ClaimWaitingBadgeProps) {
  return (
    <div
      className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-3"
      role="status"
      aria-live="polite"
    >
      <div
        className="rounded-full px-4 py-2 text-xs font-bold shadow-lg"
        style={{
          background: isNeon ? "rgba(15,23,42,0.92)" : "rgba(74,63,53,0.92)",
          color: isNeon ? "#38bdf8" : "#FFF3E3",
        }}
      >
        {label}
      </div>
    </div>
  );
}
