import { Coins, Gift, Hourglass, ShieldCheck, UserPlus, UsersRound } from "lucide-react";
import type { ReferralOverview } from "@shared/referrals";
import { formatCoins } from "./referralCopy";

const PANEL = "rounded-3xl border border-[var(--auth-card-edge)] bg-[var(--auth-card)] p-5 sm:p-6";

interface Tile {
  key: string;
  label: string;
  value: string;
  icon: typeof Coins;
  hint?: string;
}

export function StatTiles({ totals }: { totals: ReferralOverview["totals"] }) {
  const tiles: Tile[] = [
    { key: "joined", label: "Joined", value: String(totals.joined), icon: UserPlus },
    { key: "qualified", label: "Played together", value: String(totals.qualified), icon: UsersRound },
    { key: "waiting", label: "Waiting", value: String(totals.waiting), icon: Hourglass },
    { key: "earned", label: "Coins received", value: formatCoins(totals.bonusCredited), icon: Coins },
    { key: "pending", label: "Coins on the way", value: formatCoins(totals.bonusPending), icon: Coins, hint: "Held for a day, then paid" },
  ];
  return (
    <dl aria-label="Invitation totals" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map(({ key, label, value, icon: Icon, hint }) => (
        <div key={key} className="rounded-2xl border border-[var(--auth-card-edge)] bg-[var(--auth-card)] p-4">
          <Icon size={17} aria-hidden="true" className="text-amber-700 dark:text-amber-400" />
          <dd className="mt-2 font-mono text-2xl font-black text-[var(--auth-ink)]">{value}</dd>
          <dt className="mt-0.5 text-[11px] font-semibold text-[var(--auth-ink-soft)]">{label}</dt>
          {hint && <p className="mt-1 text-[10px] leading-snug text-[var(--auth-ink-soft)]">{hint}</p>}
        </div>
      ))}
    </dl>
  );
}

export function PackProgress({ pack }: { pack: ReferralOverview["pack"] }) {
  const shown = Math.min(pack.qualifiedFriends, pack.target);
  const percent = pack.target > 0 ? Math.round((shown / pack.target) * 100) : 0;
  return (
    <section aria-labelledby="pack-title" className={PANEL}>
      <h2 id="pack-title" className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--auth-ink-soft)]">
        <Gift size={15} aria-hidden="true" /> Nostalgia Pack
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--auth-ink-soft)]">
        {pack.granted
          ? "Unlocked. The Nostalgia Pack is in your collection."
          : "Three friends who play a match with another person unlock the Nostalgia Pack: a School Slate look for six games, plus a title and an aura."}
      </p>
      <div className="mt-3 flex items-center gap-3">
        <div
          role="progressbar"
          aria-label="Friends who qualified"
          aria-valuemin={0}
          aria-valuemax={pack.target}
          aria-valuenow={shown}
          className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--auth-field)] ring-1 ring-[var(--auth-field-edge)]"
        >
          <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300" style={{ width: `${percent}%` }} />
        </div>
        <p className="font-mono text-xs font-bold text-[var(--auth-ink)]">{shown}/{pack.target}</p>
      </div>
    </section>
  );
}

export function HowItWorks({ campaign }: { campaign: ReferralOverview["campaign"] }) {
  const rules = [
    `Share your code. A friend adds it when they sign up, or in their first ${campaign.codeWindowDays} days.`,
    `When they finish a match with another person, you get ${formatCoins(campaign.inviterBonus)} coins and they get ${formatCoins(campaign.inviteeBonus)}, on top of their usual welcome coins.`,
    "Bonuses are held for a day before they reach the wallet. Matches against bots do not count.",
    `Bonuses are paid for up to ${campaign.rollingCap} friends in any ${campaign.capWindowDays} days. Friends beyond that still count toward the Nostalgia Pack.`,
    `A friend has ${campaign.windowDays} days after joining to play their first match with another person.`,
  ];
  return (
    <section aria-labelledby="rules-title" className={PANEL}>
      <h2 id="rules-title" className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--auth-ink-soft)]">
        <ShieldCheck size={15} aria-hidden="true" /> How it works
      </h2>
      <ol className="mt-3 space-y-2.5">
        {rules.map((rule, index) => (
          <li key={rule} className="flex gap-3 text-sm leading-relaxed text-[var(--auth-ink-soft)]">
            <span aria-hidden="true" className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 font-mono text-[10px] font-black text-amber-800 dark:text-amber-300">{index + 1}</span>
            <span>{rule}</span>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-[11px] leading-relaxed text-[var(--auth-ink-soft)]">
        No contacts are uploaded and no device is tracked. Friends you invite see only your display name; you see only theirs, and whether they have played.
      </p>
    </section>
  );
}
