import { useState } from "react";
import { ArrowRight, Check, Gamepad2, Gift, Route, Send, ShieldCheck, UserPlus, type LucideIcon } from "lucide-react";
import type { ReferralOverview } from "@shared/referrals";
import { journeyStages, type JourneyStageKey, type StepState } from "./crewProgress";
import { GHOST_BUTTON, HEADING, MUTED, PANEL } from "./crewStyles";
import { RulesDialog } from "./RulesDialog";

const ICONS: Record<JourneyStageKey, LucideIcon> = { invited: Send, joined: UserPlus, played: Gamepad2, verified: ShieldCheck, rewarded: Gift };

const NODE: Record<StepState, string> = {
  done: "border-emerald-400 bg-emerald-400/15 text-emerald-700 dark:text-emerald-300",
  current: "border-[#ffb800] bg-[#ffb800]/15 text-amber-700 dark:text-[#ffd76a] shadow-[0_0_18px_rgba(255,184,0,0.45)]",
  upcoming: "border-slate-500/60 bg-slate-500/10 text-slate-500",
  ended: "border-slate-500/40 bg-slate-500/10 text-slate-500",
};
const LINE: Record<StepState, string> = {
  done: "border-emerald-400/70",
  current: "border-[#ffb800]/50",
  upcoming: "border-slate-500/50",
  ended: "border-slate-500/40",
};
/** Colour is never the only signal: each stage also says its state in words, for a screen reader. */
const STATE_WORD: Record<StepState, string> = { done: "Completed", current: "In progress", upcoming: "Not started yet", ended: "Ended" };

/**
 * From invite to reward in five stages, so "3 joined but 0 paid" explains itself: the gold stage is where the member
 * is now. Horizontal from tablet up; a vertical timeline on a phone, where five columns would be too narrow to read.
 */
export function InvitationJourney({ totals, campaign }: { totals: ReferralOverview["totals"]; campaign: ReferralOverview["campaign"] }) {
  const [rulesOpen, setRulesOpen] = useState(false);
  const stages = journeyStages(totals, campaign);
  return (
    <section aria-labelledby="crew-journey-title" className={PANEL}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="crew-journey-title" className={HEADING}>
            <Route size={15} aria-hidden="true" className="text-amber-600 dark:text-[#ffb800]" /> The invitation journey
          </h2>
          <p className={`m-0 mt-1 text-xs ${MUTED}`}>From invite to rewards — here&apos;s how it works.</p>
        </div>
        <button type="button" onClick={() => setRulesOpen(true)} className={GHOST_BUTTON}>
          View Full Rules <ArrowRight size={15} aria-hidden="true" />
        </button>
      </div>

      <ol className="m-0 mt-5 grid list-none p-0 md:grid-cols-5">
        {stages.map((stage, index) => {
          const Icon = ICONS[stage.key];
          const isLast = index === stages.length - 1;
          return (
            <li key={stage.key} aria-current={stage.state === "current" ? "step" : undefined} className="relative flex items-start gap-3 pb-6 last:pb-0 md:flex-col md:items-center md:gap-2 md:pb-0 md:text-center">
              <span aria-hidden="true" className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 ${NODE[stage.state]}`}>
                {stage.state === "done" ? <Check size={22} /> : <Icon size={22} />}
              </span>
              {!isLast && (
                <>
                  <span aria-hidden="true" className={`absolute bottom-0 left-6 top-12 border-l-2 border-dashed md:hidden ${LINE[stage.state]}`} />
                  <span aria-hidden="true" className={`absolute left-[calc(50%+30px)] top-6 hidden w-[calc(100%-60px)] border-t-2 border-dashed md:block ${LINE[stage.state]}`} />
                </>
              )}
              <div className="min-w-0 pt-1 md:pt-0">
                <p className="m-0 text-sm font-black text-slate-900 dark:text-white">
                  <span className="sr-only">{STATE_WORD[stage.state]}: </span>
                  {stage.label}
                </p>
                <p className={`m-0 mt-0.5 text-xs leading-snug ${MUTED}`}>{stage.hint}</p>
              </div>
            </li>
          );
        })}
      </ol>
      <RulesDialog open={rulesOpen} onClose={() => setRulesOpen(false)} campaign={campaign} />
    </section>
  );
}
