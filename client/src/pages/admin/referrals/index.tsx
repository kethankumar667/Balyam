import { useCallback, useEffect, useState } from "react";
import { Coins, Gift, RefreshCw, Users, UsersRound } from "lucide-react";
import AdminLayout from "../../../components/admin/admin-layout";
import PageHeader from "../../../components/admin/page-header";
import StatCard from "../../../components/admin/stat-card";
import type { ReferralCampaignPatch } from "@shared/referrals";
import { consoleErrorMessage, loadReferralConsole, saveCampaign, withdrawBonus, type ReferralConsoleData } from "./referralAdminApi";
import { percent } from "./referralAdminModel";
import { ReferralFunnel } from "./ReferralFunnel";
import { CampaignEditor } from "./CampaignEditor";
import { PendingBonuses } from "./PendingBonuses";
import { AdminEventsList } from "./AdminEventsList";
import { PRIMARY } from "./consoleStyles";

const coins = (amount: number): string => amount.toLocaleString("en-IN");

/**
 * Referrals: how many invitations turn into friends who play, the coins still waiting to be paid, the campaign
 * settings, and the one lever on a pending bonus (withdraw it). A view over `/api/admin/referrals`
 * (server/src/referrals/ReferralAdminController.ts); every rule stays on the server, which also takes the actor from the
 * verified credential and records each change. This page adds no rule of its own and invents no data: an empty list
 * means nothing is waiting.
 */
export default function AdminReferralsPage() {
  const [data, setData] = useState<ReferralConsoleData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await loadReferralConsole());
      setLoadError(null);
    } catch (err) {
      setLoadError(consoleErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const save = async (changes: ReferralCampaignPatch, note: string) => {
    await saveCampaign(changes, note);
    setMessage(null);
    await load();
  };

  const withdraw = async (rewardId: string, reason: string) => {
    const result = await withdrawBonus(rewardId, reason);
    setMessage(result.logged ? "Bonus withdrawn and recorded." : "Bonus withdrawn, but the record could not be written. Note it by hand.");
    await load();
  };

  const overview = data?.overview;

  return (
    <AdminLayout>
      <PageHeader
        title="Referrals"
        description="How many invitations turn into friends who play, the coins still waiting to be paid, and the campaign settings. Every change needs a written reason and is recorded with who made it."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Referrals" }]}
        actions={
          <button type="button" onClick={() => void load()} disabled={loading} className={PRIMARY}>
            <span className="inline-flex items-center gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
              {loading ? "Refreshing..." : "Refresh"}
            </span>
          </button>
        }
      />

      {loadError && (
        <div role="alert" className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-bold text-rose-600 dark:text-rose-400">
          Referral data unavailable: {loadError}
        </div>
      )}
      {message && <p role="status" className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-700 dark:text-emerald-400">{message}</p>}
      {!data && loading && <p role="status" className="text-xs text-[var(--chrome-ink-soft)]">Loading referral data…</p>}

      {overview && data && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
            <StatCard title="Friends joined" value={coins(overview.funnel.joined)} icon={<Users className="h-5 w-5 text-amber-500" />} subtitle={`${coins(overview.funnel.invitesCreated)} members have a code`} />
            <StatCard
              title="Played with another person"
              value={coins(overview.funnel.qualified)}
              icon={<UsersRound className="h-5 w-5 text-emerald-500" />}
              subtitle={percent(overview.funnel.qualified, overview.funnel.joined) === null ? "Nobody has joined yet" : `${percent(overview.funnel.qualified, overview.funnel.joined)}% of friends who joined`}
            />
            <StatCard title="Coins waiting" value={coins(overview.liability.pendingCoins)} icon={<Coins className="h-5 w-5 text-sky-500" />} subtitle={`${coins(overview.liability.pendingCount)} bonuses in their hold`} />
            <StatCard title="Coins paid" value={coins(overview.liability.releasedCoins)} icon={<Gift className="h-5 w-5 text-amber-500" />} subtitle={`${coins(overview.liability.voidedCoins)} withdrawn`} />
          </div>

          <ReferralFunnel funnel={overview.funnel} />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:items-start">
            <CampaignEditor campaign={overview.campaign} onSave={save} />
            <PendingBonuses rewards={data.pending} onWithdraw={withdraw} serverNow={overview.serverNow} />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:items-start">
            <section aria-labelledby="top-heading" className="rounded-2xl border border-[var(--chrome-border)] bg-[var(--chrome-panel)] p-4">
              <h2 id="top-heading" className="text-sm font-black text-[var(--chrome-ink)]">Most invitees</h2>
              <p className="mb-3 mt-1 text-xs text-[var(--chrome-ink-soft)]">A number to read, not a verdict. Many invitees who never play is worth a look; many who do is just a popular member.</p>
              {overview.topReferrers.length === 0 ? (
                <p className="text-xs text-[var(--chrome-ink-soft)]">Nobody has invited anyone yet.</p>
              ) : (
                <ol className="space-y-2">
                  {overview.topReferrers.map(row => (
                    <li key={row.playerId} className="rounded-xl border border-[var(--chrome-border)] p-3 text-xs">
                      <p className="font-bold text-[var(--chrome-ink)]">{row.displayName}</p>
                      <p className="mt-0.5 break-all font-mono text-[11px] text-[var(--chrome-ink-soft)]">{row.playerId}</p>
                      <p className="mt-0.5 text-[var(--chrome-ink)]">{row.joined} joined · {row.qualified} played with another person</p>
                    </li>
                  ))}
                </ol>
              )}
            </section>
            <AdminEventsList events={data.events} />
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
