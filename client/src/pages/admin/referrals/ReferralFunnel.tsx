import type { ReferralAdminFunnel } from "@shared/referrals";
import { funnelStages } from "./referralAdminModel";

/**
 * Invited -> joined -> played with another person -> bonus issued, with each step's share of the one before. The bars
 * can only narrow because each stage is a subset of the last; the numbers are written out, so the bars add nothing
 * a screen reader would miss.
 */
export function ReferralFunnel({ funnel }: { funnel: ReferralAdminFunnel }) {
  const stages = funnelStages(funnel);
  const widest = Math.max(1, ...stages.map(stage => stage.count));
  return (
    <section aria-labelledby="funnel-heading" className="rounded-2xl border border-[var(--chrome-border)] bg-[var(--chrome-panel)] p-4">
      <h2 id="funnel-heading" className="mb-3 text-sm font-black text-[var(--chrome-ink)]">Funnel</h2>
      <ol className="space-y-3">
        {stages.map(stage => (
          <li key={stage.key}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs">
              <span className="font-bold text-[var(--chrome-ink)]">{stage.label}</span>
              <span className="font-mono text-[var(--chrome-ink)]">
                {stage.count.toLocaleString("en-IN")}
                {stage.percentOfPrevious !== null && <span className="ml-2 text-[var(--chrome-ink-soft)]">{stage.percentOfPrevious}% of the step before</span>}
              </span>
            </div>
            <div aria-hidden="true" className="mt-1 h-2.5 overflow-hidden rounded-full bg-[var(--chrome-control)]">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400" style={{ width: `${stage.count > 0 ? Math.max(3, (stage.count / widest) * 100) : 0}%` }} />
            </div>
          </li>
        ))}
      </ol>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-[var(--chrome-ink-soft)] sm:grid-cols-4">
        <div><dt className="inline">Joined by code: </dt><dd className="inline font-mono text-[var(--chrome-ink)]">{funnel.viaCode}</dd></div>
        <div><dt className="inline">By link: </dt><dd className="inline font-mono text-[var(--chrome-ink)]">{funnel.viaLink}</dd></div>
        <div><dt className="inline">Still waiting: </dt><dd className="inline font-mono text-[var(--chrome-ink)]">{funnel.waiting}</dd></div>
        <div><dt className="inline">Window ended: </dt><dd className="inline font-mono text-[var(--chrome-ink)]">{funnel.expired}</dd></div>
        <div><dt className="inline">Bonus reserved: </dt><dd className="inline font-mono text-[var(--chrome-ink)]">{funnel.bonusReserved}</dd></div>
        <div><dt className="inline">Held by the cap: </dt><dd className="inline font-mono text-[var(--chrome-ink)]">{funnel.bonusBlockedCap}</dd></div>
      </dl>
    </section>
  );
}
