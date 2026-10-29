import { useRef } from "react";
import { ShieldCheck, X } from "lucide-react";
import type { ReferralOverview } from "@shared/referrals";
import Modal from "../../../components/Modal";
import { formatCoins } from "../referralCopy";

/** The complete rules, in the order a friend meets them. Built from the live campaign, so it cannot drift from what is paid. */
export function referralRules(campaign: ReferralOverview["campaign"]): string[] {
  return [
    `Share your code. A friend adds it when they sign up, or in their first ${campaign.codeWindowDays} days.`,
    `When they finish a match with another person, you get ${formatCoins(campaign.inviterBonus)} coins and they get ${formatCoins(campaign.inviteeBonus)}, on top of their usual welcome coins.`,
    "Bonuses are held for a day before they reach the wallet. Matches against bots do not count.",
    `Bonuses are paid for up to ${campaign.rollingCap} friends in any ${campaign.capWindowDays} days. Friends beyond that still count toward the Nostalgia Pack.`,
    `A friend has ${campaign.windowDays} days after joining to play their first match with another person.`,
  ];
}

interface RulesDialogProps {
  open: boolean;
  onClose: () => void;
  campaign: ReferralOverview["campaign"];
}

export function RulesDialog({ open, onClose, campaign }: RulesDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  return (
    <Modal
      open={open}
      onClose={onClose}
      ariaLabelledBy="crew-rules-title"
      initialFocusRef={closeRef}
      panelClassName="w-full max-w-lg rounded-2xl border border-sky-300 dark:border-cyan-300/35 bg-white dark:bg-[#0c1b30] p-5 text-slate-900 dark:text-[#f8fafc] shadow-2xl sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id="crew-rules-title" className="m-0 flex items-center gap-2 text-base font-black">
          <ShieldCheck size={18} aria-hidden="true" className="text-emerald-700 dark:text-emerald-300" /> Complete reward rules
        </h2>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close rules"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-600 dark:text-[#b6c4d8] hover:bg-slate-100 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <ol className="m-0 mt-4 list-none space-y-3 p-0">
        {referralRules(campaign).map((rule, index) => (
          <li key={rule} className="flex gap-3 text-sm leading-relaxed text-slate-700 dark:text-[#dbe7f5]">
            <span aria-hidden="true" className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-100 dark:bg-cyan-300/15 font-mono text-[11px] font-black text-sky-700 dark:text-cyan-200">{index + 1}</span>
            <span>{rule}</span>
          </li>
        ))}
      </ol>
      <p className="m-0 mt-4 text-xs leading-relaxed text-slate-600 dark:text-[#b6c4d8]">
        Rewards are in-app BHALYAM coins. They have no cash value. No contacts are uploaded and no device is tracked. Friends you invite see only your display name; you see only theirs, and whether they have played.
      </p>
      <button type="button" onClick={onClose} className="mt-5 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#ffb800] to-[#ffd76a] text-sm font-black text-[#1a1203] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
        Got it
      </button>
    </Modal>
  );
}
