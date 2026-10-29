import { Cog, ContactRound, EyeOff, ShieldCheck, UserLock, type LucideIcon } from "lucide-react";
import type { ReferralOverview } from "@shared/referrals";
import { formatCoins } from "../referralCopy";
import { HEADING, MUTED, PANEL } from "./crewStyles";

const STEP_TINT = ["bg-cyan-300 text-[#04202b]", "bg-emerald-300 text-[#052319]", "bg-[#ffb800] text-[#241700]", "bg-purple-300 text-[#210a3a]"] as const;

/** Four plain steps, worded from the live campaign. Matches against bots and the hold are in the full rules. */
export function HowItWorksStrip({ campaign }: { campaign: ReferralOverview["campaign"] }) {
  const reward =
    campaign.inviterBonus === campaign.inviteeBonus
      ? `You both receive ${formatCoins(campaign.inviterBonus)} coins.`
      : `You get ${formatCoins(campaign.inviterBonus)} coins and they get ${formatCoins(campaign.inviteeBonus)}.`;
  const steps = [
    { title: "Share", text: "Share your code with friends." },
    { title: "Join", text: `They sign up or add it in their first ${campaign.codeWindowDays} days.` },
    { title: "Play", text: "They complete a match with another person." },
    { title: "Get Rewards", text: reward },
  ];
  return (
    <section aria-labelledby="crew-how-title" className={PANEL}>
      <h2 id="crew-how-title" className={HEADING}>
        <Cog size={15} aria-hidden="true" className="text-sky-700 dark:text-cyan-300" /> How it works
      </h2>
      <p className={`m-0 mt-1 text-xs ${MUTED}`}>A simple 4-step journey to rewards.</p>
      <ol className="m-0 mt-4 grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-4">
        {steps.map((step, index) => (
          <li key={step.title} className="flex items-start gap-3">
            <span aria-hidden="true" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-sm font-black ${STEP_TINT[index]}`}>{index + 1}</span>
            <div className="min-w-0">
              <p className="m-0 text-sm font-black text-slate-900 dark:text-white">{step.title}</p>
              <p className="m-0 mt-0.5 text-xs leading-snug text-slate-600 dark:text-[#b6c4d8]">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="m-0 mt-4 text-[11px] leading-relaxed text-slate-600 dark:text-[#8aa0ba]">Rewards are in-app BHALYAM coins with no cash value. Matches against bots do not count.</p>
    </section>
  );
}

const PRIVACY: ReadonlyArray<{ title: string; text: string; icon: LucideIcon }> = [
  { title: "No contacts uploaded", text: "You choose who to invite.", icon: ContactRound },
  { title: "No device tracking", text: "Only invitation status.", icon: EyeOff },
  { title: "Privacy first", text: "Friends see only your display name.", icon: UserLock },
];

export function PrivacyPanel() {
  return (
    <section aria-labelledby="crew-privacy-title" className={PANEL}>
      <h2 id="crew-privacy-title" className={HEADING}>
        <ShieldCheck size={15} aria-hidden="true" className="text-emerald-700 dark:text-emerald-300" /> Your privacy matters
      </h2>
      <p className={`m-0 mt-1 text-xs ${MUTED}`}>We keep your data safe.</p>
      <ul className="m-0 mt-4 grid list-none gap-3 p-0 sm:grid-cols-3">
        {PRIVACY.map(({ title, text, icon: Icon }) => (
          <li key={title} className="rounded-xl border border-emerald-200 dark:border-emerald-300/25 bg-emerald-50 dark:bg-emerald-300/[0.06] p-3 text-center">
            <Icon size={22} aria-hidden="true" className="mx-auto text-emerald-700 dark:text-emerald-300" />
            <p className="m-0 mt-2 text-xs font-black text-slate-900 dark:text-white">{title}</p>
            <p className="m-0 mt-0.5 text-[11px] leading-snug text-slate-600 dark:text-[#b6c4d8]">{text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
