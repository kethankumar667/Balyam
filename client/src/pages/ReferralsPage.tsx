import { Gift, RefreshCw } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import MemberLockedGate from "../components/auth/MemberLockedGate";
import { useAuthStore } from "../store/authStore";
import { useReferralOverview } from "../hooks/useReferralOverview";
import { InviteCodeCard } from "../features/referrals/InviteCodeCard";
import { ReferredBySection } from "../features/referrals/ReferredBySection";
import { FriendsList } from "../features/referrals/FriendsList";
import { HowItWorks, PackProgress, StatTiles } from "../features/referrals/ReferralSummary";

function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading your invitations" className="space-y-5">
      <div className="h-56 animate-pulse rounded-3xl bg-[var(--auth-card)] ring-1 ring-[var(--auth-card-edge)]" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => <div key={index} className="h-24 animate-pulse rounded-2xl bg-[var(--auth-card)] ring-1 ring-[var(--auth-card-edge)]" />)}
      </div>
      <div className="h-48 animate-pulse rounded-3xl bg-[var(--auth-card)] ring-1 ring-[var(--auth-card-edge)]" />
    </div>
  );
}

export default function ReferralsPage() {
  const canView = useAuthStore(state => state.capabilities.viewReferrals);
  const { overview, loading, error, retry, redeem, detach } = useReferralOverview(canView);

  if (!canView) return <MemberLockedGate feature="referrals" />;

  return (
    <AppLayout>
      <div className="min-h-[85vh] bhalyam-paper auth-shell px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <main className="mx-auto max-w-6xl space-y-5">
          <header>
            <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">
              <Gift size={14} aria-hidden="true" /> Invite friends
            </p>
            <h1 className="mt-2 font-display text-3xl tracking-wide text-[var(--auth-ink)] sm:text-4xl">Your invitations</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--auth-ink-soft)]">
              Bring the people you already play with. See who joined, and where each bonus stands.
            </p>
          </header>

          {loading && !overview && <PageSkeleton />}

          {error && !overview && (
            <div role="alert" className="rounded-3xl border border-rose-500/40 bg-[var(--auth-card)] p-6 text-center">
              <p className="text-sm font-bold text-[var(--auth-ink)]">{error}</p>
              <button
                type="button"
                onClick={retry}
                className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[var(--auth-field-edge)] bg-[var(--auth-field)] px-5 text-xs font-bold text-[var(--auth-ink)] hover:bg-[var(--auth-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <RefreshCw size={15} aria-hidden="true" /> Try again
              </button>
            </div>
          )}

          {overview && (
            <>
              <InviteCodeCard overview={overview} />
              <StatTiles totals={overview.totals} />
              {/* grid-cols-1 is minmax(0,1fr): without it a long name or chip widens the track past the phone's width. */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
                <div className="min-w-0 lg:col-start-2 lg:row-start-1 empty:hidden">
                  <ReferredBySection overview={overview} redeem={redeem} detach={detach} />
                </div>
                <div className="min-w-0 lg:col-start-1 lg:row-span-3 lg:row-start-1">
                  <FriendsList friends={overview.friends} campaign={overview.campaign} serverNow={overview.serverNow} />
                </div>
                <div className="min-w-0 lg:col-start-2 lg:row-start-2"><PackProgress pack={overview.pack} /></div>
                <div className="min-w-0 lg:col-start-2 lg:row-start-3"><HowItWorks campaign={overview.campaign} /></div>
              </div>
            </>
          )}
        </main>
      </div>
    </AppLayout>
  );
}
