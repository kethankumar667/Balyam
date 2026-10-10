import { useEffect, useState } from "react";
import { FAUCET_AMOUNT_COINS, FAUCET_COOLDOWN_MS, type FaucetClaimResult } from "@shared/faucet";
import { useFaucetStore } from "../store/faucetStore";
import { FaucetClaimModal } from "../components/faucet/FaucetClaimModal";
import MatchPayoutBanner from "../components/economy/MatchPayoutBanner";
import { useCarryOverStore } from "../store/carryOverStore";
import { useMandaliJoyStore } from "../store/mandaliJoyStore";
import { CoinFountain } from "../components/faucet/CoinCelebrations";
import { useLevelUpStore } from "../store/levelUpStore";
import SeatAvatar from "../components/profile/SeatAvatar";
import { AVATARS } from "../lib/avatars";

/**
 * Development only: the free-coins claim dialog with a stub server, so the dialog and the coin rain
 * can be looked at at real phone and desktop sizes without a signed-in account. Not registered in
 * production builds.
 *
 *   /preview/faucet?theme=light|dark&view=faucet|payout|carryover|avatars|fountain|joy|joysent|levelup
 */
export default function PreviewFaucet() {
  const view = new URLSearchParams(window.location.search).get("view") ?? "faucet";
  // ?arm=1 waits for a tap on "Play it" before starting, so a measurement can load and throttle the page first.
  const armed = new URLSearchParams(window.location.search).get("arm") === "1";
  const [started, setStarted] = useState(!armed);

  useEffect(() => {
    if (!started) return undefined;
    if (view === "joy" || view === "joysent") {
      document.documentElement.setAttribute("data-theme", new URLSearchParams(window.location.search).get("theme") === "light" ? "light" : "dark");
      useMandaliJoyStore.getState().show(view === "joy" ? "received" : "sent", 1500, view === "joy" ? "Bala" : "Kethan");
      return () => useMandaliJoyStore.getState().clear();
    }
    if (view === "levelup") {
      const q = new URLSearchParams(window.location.search);
      document.documentElement.setAttribute("data-theme", q.get("theme") === "light" ? "light" : "dark");
      // ?from=13&to=14&xp=1340 (defaults shown). The real app gets these from the player's profile.
      useLevelUpStore.getState().show(Number(q.get("from") ?? 13), Number(q.get("to") ?? 14), Number(q.get("xp") ?? 1340));
      return () => useLevelUpStore.getState().clear();
    }
    if (view === "fountain") {
      document.documentElement.setAttribute("data-theme", new URLSearchParams(window.location.search).get("theme") === "light" ? "light" : "dark");
      return undefined;
    }
    if (view === "avatars") {
      document.documentElement.setAttribute("data-theme", "light");
      return undefined;
    }
    if (view === "carryover") {
      useCarryOverStore.getState().setArrival({ amount: 3000, vestingUntil: Date.now() + 86_400_000 });
      document.documentElement.setAttribute("data-theme", new URLSearchParams(window.location.search).get("theme") === "light" ? "light" : "dark");
      return () => useCarryOverStore.getState().reset();
    }
    if (view === "payout") {
      document.documentElement.setAttribute("data-theme", new URLSearchParams(window.location.search).get("theme") === "light" ? "light" : "dark");
      return undefined;
    }
    const theme = new URLSearchParams(window.location.search).get("theme") === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", theme);

    const now = Date.now();
    const claim = async (): Promise<FaucetClaimResult> => {
      const serverNow = Date.now();
      const nextClaimAt = serverNow + FAUCET_COOLDOWN_MS;
      useFaucetStore.setState((s) => ({
        justClaimed: FAUCET_AMOUNT_COINS,
        status: s.status && { ...s.status, serverNow, nextClaimAt, canClaim: false },
      }));
      return { ok: true, amount: FAUCET_AMOUNT_COINS, nextClaimAt, paidNow: true, vestingUntil: null, serverNow };
    };
    useFaucetStore.setState({
      status: { eligible: true, amount: FAUCET_AMOUNT_COINS, cooldownMs: FAUCET_COOLDOWN_MS, nextClaimAt: null, serverNow: now, canClaim: true },
      clockOffsetMs: 0,
      claim,
      isClaimModalOpen: true,
    });
    return () => useFaucetStore.getState().reset();
  }, [view, started]);

  if (view === "avatars") {
    // Every avatar, sized the way the lobby seat card sizes it (`w-full h-full` inside a fixed box).
    return (
      <div className="flex flex-wrap gap-4 bg-white p-6">
        {AVATARS.map((a) => (
          <div key={a.id} data-avatar-box className="h-14 w-14 rounded-full p-0.5 sm:h-16 sm:w-16">
            <SeatAvatar avatar={a.id} name={a.id} className="w-full h-full rounded-full object-cover" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-dvh items-center justify-center bg-[#0f172a] p-6 text-center text-slate-300">
      <button
        type="button"
        onClick={() => useFaucetStore.getState().openClaimModal()}
        className="min-h-[44px] rounded-full bg-amber-500 px-6 font-black text-amber-950"
      >
        Open the claim dialog
      </button>
      {armed && !started && (
        <button type="button" onClick={() => setStarted(true)} className="ml-3 min-h-[44px] rounded-full bg-white px-6 font-black text-slate-900">
          Play it
        </button>
      )}
      {view === "faucet" && <FaucetClaimModal />}
      {view === "fountain" && started && <CoinFountain />}
      {/* The carry-over dialog is mounted once by App; this page only has to give it something to show. */}
      {view === "payout" && <MatchPayoutBanner payout={{ matchId: "preview_1", kind: "prize", amount: "1600" }} onDismiss={() => undefined} />}
    </div>
  );
}
