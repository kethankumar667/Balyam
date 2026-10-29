import { RefreshCw } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import MemberLockedGate from "../components/auth/MemberLockedGate";
import { useAuthStore } from "../store/authStore";
import { useReferralOverview } from "../hooks/useReferralOverview";
import { ReferredBySection } from "../features/referrals/ReferredBySection";
import { CrewHero } from "../features/referrals/crew/CrewHero";
import { CrewCodeCard } from "../features/referrals/crew/CrewCodeCard";
import { CrewPulse } from "../features/referrals/crew/CrewPulse";
import { InvitationJourney } from "../features/referrals/crew/InvitationJourney";
import { CrewList } from "../features/referrals/crew/CrewList";
import { NostalgiaVault } from "../features/referrals/crew/NostalgiaVault";
import { HowItWorksStrip, PrivacyPanel } from "../features/referrals/crew/CrewGuide";
import { AUTH_VARS, GHOST_BUTTON } from "../features/referrals/crew/crewStyles";
import { useTheme } from "../lib/useTheme";

function PageSkeleton() {
  const block = "animate-pulse rounded-2xl bg-slate-900/[0.06] ring-1 ring-slate-200 dark:bg-white/[0.06] dark:ring-white/10";
  return (
    <div role="status" aria-label="Loading your invitations" className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-12">
        <div className={`h-44 xl:col-span-7 ${block}`} />
        <div className={`h-44 xl:col-span-5 ${block}`} />
      </div>
      <div className={`h-40 ${block}`} />
      <div className={`h-64 ${block}`} />
    </div>
  );
}

/**
 * Crew Quest, at `/referrals`: the invitation as a journey. It follows the app's theme: navy glass by night, warm
 * paper by day (the hero stays a dark illustrated banner in both). The wrapper carries the matching `--auth-*` set for
 * the older referral pieces that read it, and the `dark:` utilities follow the page's own theme. The grid is twelve
 * columns from `xl`, not `lg`: at 1024px the app sidebar leaves the main area about 680px wide, too narrow for two
 * columns; below `xl` everything stacks in the order a member needs it: code, pulse, journey, crew, pack, rules.
 */
export default function ReferralsPage() {
  const canView = useAuthStore(state => state.capabilities.viewReferrals);
  const { overview, loading, error, retry, redeem, detach } = useReferralOverview(canView);
  const [theme] = useTheme();

  if (!canView) return <MemberLockedGate feature="referrals" />;

  return (
    <AppLayout>
      <div
        style={AUTH_VARS[theme]}
        className="min-h-[85vh] shrink-0 bg-[#FAF6EC] bg-[radial-gradient(ellipse_at_top,rgba(14,165,233,0.10),transparent_55%)] px-3 py-4 text-slate-900 dark:bg-[#07111f] dark:bg-[radial-gradient(ellipse_at_top,rgba(39,215,242,0.12),transparent_55%)] dark:text-slate-100 sm:px-6 sm:py-6"
      >
        {/* Not a second <main>: the app shell already provides the page's main landmark. */}
        <div id="crew-quest" className="mx-auto max-w-6xl space-y-4">
          <CrewHero />

          {loading && !overview && <PageSkeleton />}

          {error && !overview && (
            <div role="alert" className="rounded-2xl border border-rose-400/40 bg-white p-6 text-center dark:bg-[#0c1b30]">
              <p className="m-0 text-sm font-bold text-slate-900 dark:text-white">{error}</p>
              <button type="button" onClick={retry} className={`${GHOST_BUTTON} mt-4`}>
                <RefreshCw size={15} aria-hidden="true" /> Try again
              </button>
            </div>
          )}

          {overview && (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
              <div className="min-w-0 xl:col-span-7"><CrewCodeCard overview={overview} /></div>
              <div className="min-w-0 xl:col-span-5"><CrewPulse totals={overview.totals} /></div>
              <div className="min-w-0 empty:hidden xl:col-span-12">
                <ReferredBySection overview={overview} redeem={redeem} detach={detach} />
              </div>
              <div className="min-w-0 xl:col-span-12"><InvitationJourney totals={overview.totals} campaign={overview.campaign} /></div>
              <div className="min-w-0 xl:col-span-7"><CrewList friends={overview.friends} campaign={overview.campaign} serverNow={overview.serverNow} /></div>
              <div className="min-w-0 xl:col-span-5"><NostalgiaVault pack={overview.pack} /></div>
              <div className="min-w-0 xl:col-span-7"><HowItWorksStrip campaign={overview.campaign} /></div>
              <div className="min-w-0 xl:col-span-5"><PrivacyPanel /></div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
