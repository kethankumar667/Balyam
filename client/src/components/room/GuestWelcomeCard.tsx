import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Gift } from "lucide-react";
import { GUEST_IDLE_EXPIRY_DAYS } from "@shared/guestIdentity";
import { useAuthStore } from "../../store/authStore";
import { peekPlayerCredential } from "../../lib/playerIdentity";
import { claimGuestWelcome, getGuestWelcomeStatus, type GuestWelcomeStatus } from "../../lib/economyApi";
import { refreshCurrentWallet } from "../../hooks/useEconomy";
import { CoinAmount } from "../economy/CoinAmount";

type Phase = "hidden" | "offer" | "claiming" | "done";

/**
 * What a guest is asked once their first game is over.
 *
 * Their first game was paid for by BHALYAM (a new guest wallet holds only enough for one seat). Now
 * they choose: stay as a guest and have the rest of the welcome added, or sign in and take the coins
 * to an account. Nothing here is decided on the client: whether the welcome is still owed is read from
 * the server, and adding it is a server call that pays at most once.
 *
 * Renders nothing for a member, for someone with no identity yet (never creates one), or once the
 * welcome has been taken.
 */
export default function GuestWelcomeCard() {
  const isReady = useAuthStore((s) => s.ready);
  const isMember = useAuthStore((s) => s.isMember);
  const [status, setStatus] = useState<GuestWelcomeStatus | null>(null);
  const [phase, setPhase] = useState<Phase>("hidden");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady || isMember || !peekPlayerCredential()) return;
    let isCurrent = true;
    getGuestWelcomeStatus()
      .then((next) => {
        if (!isCurrent || !next.pending) return;
        setStatus(next);
        setPhase("offer");
      })
      .catch(() => undefined); // an offer we cannot confirm is simply not shown
    return () => {
      isCurrent = false;
    };
  }, [isReady, isMember]);

  const stayAsGuest = async () => {
    setPhase("claiming");
    setError(null);
    try {
      await claimGuestWelcome();
      void refreshCurrentWallet();
      setPhase("done");
    } catch {
      setError("We could not add your coins. Check your connection and try again.");
      setPhase("offer");
    }
  };

  if (phase === "hidden" || !status) return null;

  if (phase === "done") {
    return (
      <section
        aria-label="Guest coins added"
        className="w-full rounded-3xl border-2 border-emerald-400/70 bg-white p-4 text-center dark:bg-slate-900 sm:p-5"
      >
        <h2 className="m-0 text-base font-black text-stone-900 dark:text-white">Coins added</h2>
        <p className="m-0 mt-1.5 text-sm font-medium leading-relaxed text-stone-600 dark:text-slate-300">
          You&apos;re set as a guest. This account expires after {GUEST_IDLE_EXPIRY_DAYS} days without use, so
          sign in any time to keep your coins.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label="Your first game was on us"
      className="w-full rounded-3xl border-2 border-amber-300/90 bg-white p-4 text-center shadow-xs dark:border-amber-500/50 dark:bg-slate-900 sm:p-5"
    >
      <Gift className="mx-auto h-6 w-6 text-amber-600 dark:text-amber-300" aria-hidden="true" />
      <h2 className="m-0 mt-1 text-base font-black text-stone-900 dark:text-white">Your first game was on us</h2>
      <p className="m-0 mt-1.5 text-sm font-medium leading-relaxed text-stone-600 dark:text-slate-300">
        Stay as a guest and we&apos;ll add <CoinAmount amount={status.amount} size="sm" className="inline-flex align-middle" /> to
        your wallet, or sign in to keep your progress for good. A guest account expires after{" "}
        {GUEST_IDLE_EXPIRY_DAYS} days of not using it.
      </p>
      {error && (
        <p role="alert" className="m-0 mt-2 text-sm font-semibold text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={stayAsGuest}
        disabled={phase === "claiming"}
        className="mt-3 inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 text-sm font-black text-stone-950 transition hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 active:scale-[0.98] disabled:opacity-60"
      >
        {phase === "claiming" ? "Adding your coins…" : "Stay as a guest"}
      </button>
      <Link
        to="/signup?from=room"
        className="mt-2 inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl border-2 border-[#4A2D1B] px-5 text-sm font-black text-[#4A2D1B] transition hover:bg-[#4A2D1B]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 active:scale-[0.98] dark:border-amber-300 dark:text-amber-200"
      >
        Sign in to save my progress
      </Link>
    </section>
  );
}
