import { useId, useState, type FormEvent } from "react";
import { REFERRAL_ADMIN_NOTE_MAX, type ReferralAdminPendingReward } from "@shared/referrals";
import { BUTTON, FIELD, PRIMARY } from "./consoleStyles";

interface PendingBonusesProps {
  rewards: ReferralAdminPendingReward[];
  /** Withdraws one bonus. Rejects with a sentence the operator can read if the server refuses. */
  onWithdraw: (rewardId: string, reason: string) => Promise<void>;
  /** The server's clock, so "arrives in" does not depend on this machine's. */
  serverNow: number;
}

function arrives(vestingUntil: number, now: number): string {
  const hours = Math.max(0, Math.ceil((vestingUntil - now) / 3_600_000));
  return hours <= 1 ? "within the hour" : hours < 48 ? `in ${hours} hours` : `in ${Math.ceil(hours / 24)} days`;
}

function Row({ reward, serverNow, onWithdraw }: { reward: ReferralAdminPendingReward; serverNow: number; onWithdraw: PendingBonusesProps["onWithdraw"] }) {
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const reasonId = useId();

  async function confirm(event: FormEvent) {
    event.preventDefault();
    if (reason.trim() === "" || busy) return;
    setBusy(true);
    setProblem(null);
    try {
      await onWithdraw(reward.rewardId, reason.trim());
    } catch (err) {
      setProblem(err instanceof Error ? err.message : "That did not go through.");
      setBusy(false);
    }
  }

  return (
    <li className="rounded-xl border border-[var(--chrome-border)] p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-[var(--chrome-ink)]">
            {reward.amount.toLocaleString("en-IN")} coins to {reward.displayName}
            <span className="ml-2 font-normal text-[var(--chrome-ink-soft)]">({reward.side === "inviter" ? "as the inviter" : "as the invitee"})</span>
          </p>
          <p className="mt-0.5 break-all font-mono text-[11px] text-[var(--chrome-ink-soft)]">{reward.playerId}</p>
          <p className="mt-0.5 text-[var(--chrome-ink-soft)]">
            {reward.status === "RELEASING" ? "Being paid now" : `Reaches the wallet ${arrives(reward.vestingUntil, serverNow)}`}
          </p>
        </div>
        {reward.status === "PENDING" && !asking && (
          <button type="button" onClick={() => setAsking(true)} className={BUTTON} aria-label={`Withdraw ${reward.amount} coins for ${reward.displayName}`}>Withdraw</button>
        )}
      </div>
      {asking && (
        <form onSubmit={confirm} className="mt-3 space-y-2 border-t border-[var(--chrome-border)] pt-3">
          <label htmlFor={reasonId} className="block font-bold text-[var(--chrome-ink)]">Why is this bonus being withdrawn? (required, cannot be undone)</label>
          <input id={reasonId} value={reason} onChange={event => setReason(event.target.value)} maxLength={REFERRAL_ADMIN_NOTE_MAX} disabled={busy} className={FIELD} placeholder="For example: two accounts on one device" />
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy || reason.trim() === ""} className={PRIMARY}>{busy ? "Withdrawing…" : "Withdraw for good"}</button>
            <button type="button" disabled={busy} onClick={() => { setAsking(false); setReason(""); setProblem(null); }} className={BUTTON}>Keep it</button>
          </div>
          {problem && <p role="alert" className="font-bold text-rose-600 dark:text-rose-400">Not withdrawn: {problem}</p>}
        </form>
      )}
    </li>
  );
}

/**
 * Referral bonuses still in their hold, soonest first. A bonus that has started being paid can no longer be withdrawn,
 * so it has no button. Withdrawing asks for a reason first and says plainly that it cannot be undone.
 */
export function PendingBonuses({ rewards, onWithdraw, serverNow }: PendingBonusesProps) {
  return (
    <section aria-labelledby="pending-heading" className="rounded-2xl border border-[var(--chrome-border)] bg-[var(--chrome-panel)] p-4">
      <h2 id="pending-heading" className="mb-3 text-sm font-black text-[var(--chrome-ink)]">Bonuses in their hold</h2>
      {rewards.length === 0 ? (
        <p className="text-xs text-[var(--chrome-ink-soft)]">Nothing is waiting. Bonuses appear here for a day after a friend's first match, then reach the wallet.</p>
      ) : (
        <ul className="space-y-2">
          {rewards.map(reward => <Row key={reward.rewardId} reward={reward} serverNow={serverNow} onWithdraw={onWithdraw} />)}
        </ul>
      )}
    </section>
  );
}
