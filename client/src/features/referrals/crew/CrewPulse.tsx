import { Coins, Gamepad2, Hourglass, Radio, Users, type LucideIcon } from "lucide-react";
import type { ReferralOverview } from "@shared/referrals";
import { formatCoins } from "../referralCopy";
import { HEADING, MUTED, PANEL } from "./crewStyles";

interface Tile {
  key: string;
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tint: string;
}

/**
 * Four numbers, not five: what was received folds into the coins tile, so "2,000 on the way" and "0 received" read as
 * one story about the reward instead of two unrelated counters.
 */
export function CrewPulse({ totals }: { totals: ReferralOverview["totals"] }) {
  const tiles: Tile[] = [
    { key: "joined", label: "Joined", value: String(totals.joined), hint: "Friends who signed up", icon: Users, tint: "text-sky-700 dark:text-cyan-300" },
    { key: "played", label: "Played Together", value: String(totals.qualified), hint: "Completed a match", icon: Gamepad2, tint: "text-emerald-700 dark:text-emerald-300" },
    { key: "waiting", label: "Waiting", value: String(totals.waiting), hint: "Yet to play a match", icon: Hourglass, tint: "text-violet-700 dark:text-purple-300" },
    {
      key: "coins",
      label: "Coins on the way",
      value: formatCoins(totals.bonusPending),
      hint: totals.bonusCredited > 0 ? `${formatCoins(totals.bonusCredited)} received so far` : "Held for a day, then paid",
      icon: Coins,
      tint: "text-amber-600 dark:text-[#ffb800]",
    },
  ];
  return (
    <section aria-labelledby="crew-pulse-title" className={PANEL}>
      <h2 id="crew-pulse-title" className={HEADING}>
        <Radio size={15} aria-hidden="true" className="text-sky-700 dark:text-cyan-300" /> Your crew pulse
      </h2>
      <dl className="m-0 mt-4 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-4">
        {tiles.map(({ key, label, value, hint, icon: Icon, tint }) => (
          <div key={key} className="min-w-0 text-center sm:border-l sm:border-slate-200 sm:dark:border-white/10 sm:first:border-l-0">
            <Icon size={26} aria-hidden="true" className={`mx-auto ${tint}`} />
            <dd className="m-0 mt-1 font-mono text-3xl font-black text-slate-900 dark:text-white">{value}</dd>
            <dt className="mt-0.5 text-xs font-bold text-slate-700 dark:text-[#dbe7f5]">{label}</dt>
            <dd className={`m-0 mt-0.5 text-[11px] leading-snug ${MUTED}`}>{hint}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
