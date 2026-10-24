import { useEffect, useId, useState } from "react";
import { getWalletActivity } from "../../lib/economyApi";
import type { WalletActivity } from "@shared/walletActivity";
import { formatCoinString } from "./CoinAmount";

export function WalletActivityChart({ version, refreshKey }: { version: number; refreshKey: number }) {
  const [activity, setActivity] = useState<WalletActivity | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const gradient = useId().replace(/:/g, "");
  useEffect(() => {
    let active = true;
    setActivity(null);
    setError(false);
    void getWalletActivity().then((data) => {
      if (active) setActivity(data);
    }).catch(() => {
      if (active) setError(true);
    });
    return () => { active = false; };
  }, [version, refreshKey, attempt]);
  const days = activity?.days ?? [];
  const maximum = days.reduce((max, day) => BigInt(day.balance) > max ? BigInt(day.balance) : max, 1n);
  // Only dimensionless, bounded ratios become numbers; coin values remain exact decimal strings.
  const points = days.map((day, index) => `${8 + index * 10},${96 - Number(BigInt(day.balance) * 8000n / maximum) / 100}`).join(" ");
  return (
    <section aria-label="Wallet activity" className="rounded-2xl border border-amber-900/10 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
      <h3 className="text-sm font-extrabold">Wallet Activity <span className="text-[10px] font-medium text-stone-500 dark:text-stone-400">(Last 30 Days)</span></h3>
      <p className="mt-1 text-[10px] text-stone-600 dark:text-stone-400">Daily closing balance · UTC · today so far</p>
      {error ? <div role="status" className="py-4 text-xs text-red-700 dark:text-red-300">
        Activity could not be loaded.
        <button type="button" onClick={() => setAttempt((value) => value + 1)} className="ml-2 min-h-11 rounded-lg px-3 font-bold underline focus-visible:ring-2 focus-visible:ring-amber-600">Retry activity</button>
      </div> : !activity ? <p role="status" className="py-8 text-xs text-stone-500">Loading wallet activity…</p> : <>
        <svg viewBox="0 0 306 112" role="img" aria-label="Daily wallet balance chart; exact values available below" className="mt-3 w-full">
          <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#F5AD26" stopOpacity=".35" /><stop offset="1" stopColor="#F5AD26" stopOpacity="0" /></linearGradient></defs>
          {[24, 60, 96].map((y) => <path key={y} d={`M8 ${y}H298`} stroke="currentColor" opacity=".08" />)}
          <polygon points={`8,104 ${points} 298,104`} fill={`url(#${gradient})`} />
          <polyline points={points} fill="none" stroke="#B96F0B" strokeWidth="2.5" strokeLinejoin="round" />
        </svg>
        <div aria-hidden="true" className="flex justify-between text-[10px] text-stone-500 dark:text-stone-400"><span>{days[0].date.slice(5)}</span><span>{days[14].date.slice(5)}</span><span>{days[29].date.slice(5)}</span></div>
        <details className="mt-2 text-xs">
          <summary className="min-h-11 cursor-pointer py-3 font-semibold text-amber-800 focus-visible:ring-2 focus-visible:ring-amber-600 dark:text-amber-300">View daily activity</summary>
          <div className="max-h-64 overflow-auto">
            <table className="w-full text-right text-[10px] tabular-nums">
              <caption className="sr-only">Complete 30-day ledger activity in coins</caption>
              <thead><tr><th className="text-left">UTC date</th><th>In</th><th>Out</th><th>Balance</th></tr></thead>
              <tbody>{days.map((day) => <tr key={day.date} className="border-t border-stone-200 dark:border-white/10"><th className="py-2 text-left font-normal">{day.date.slice(5)}</th><td>{formatCoinString(day.credited)}</td><td>{formatCoinString(day.spent)}</td><td>{formatCoinString(day.balance)}</td></tr>)}</tbody>
            </table>
          </div>
        </details>
      </>}
    </section>
  );
}
