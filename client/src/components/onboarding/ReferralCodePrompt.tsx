import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Gift } from "lucide-react";
import Modal from "../Modal";
import { ReferralCodeField, useReferralCodeCheck } from "../../features/referrals/ReferralCodeField";
import {
  clearMetadataReferralCode,
  fetchReferralOverview,
  forgetReferralCode,
  metadataReferralCode,
  pendingReferralCode,
  redeemReferralCode,
  REFERRAL_REFUSAL_COPY,
} from "../../lib/referrals";
import { getMemberWelcomeStatus } from "../../lib/economyApi";
import { useAuthStore } from "../../store/authStore";
import { formatCoins } from "../../features/referrals/referralCopy";

const MODAL_Z = 60;
const PRIMARY =
  "min-h-[52px] w-full cursor-pointer rounded-2xl bg-amber-500 px-6 text-base font-black text-amber-950 shadow-lg shadow-amber-900/25 transition-colors hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";
const QUIET =
  "min-h-[44px] w-full cursor-pointer rounded-2xl px-6 text-sm font-bold text-[var(--auth-ink-soft)] underline underline-offset-4 hover:text-[var(--auth-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600";

/**
 * Members this visit's prompt is finished with. The layout that mounts onboarding re-mounts on every page,
 * and each mount would otherwise ask the server again. Held in memory on purpose: a stored flag would be a
 * new browser-storage key for the privacy inventory, and "ask again next visit" is acceptable because the
 * form only opens while the welcome is still owed, and the code field closes the moment the first match is played.
 */
const settledThisVisit = new Set<string>();

useAuthStore.subscribe((state, previous) => {
  if (state.userId !== previous.userId) settledThisVisit.clear();
});

/** Test hook: forget every settled member so each test starts from a fresh visit. */
export function resetReferralPromptMemo(): void {
  settledThisVisit.clear();
}

type Phase = "checking" | "form" | "added" | "gone";

/**
 * The first-run chance to add a friend's referral code, for members who did not type one at sign-up
 * (Google sign-in has no such field). It sits between the profile questions and the welcome.
 *
 * It asks the server whether this member may still add a code (new account, none attached, no match with
 * another person yet) and shows nothing otherwise. A code remembered from sign-up or from a shared link is
 * applied straight away, because the member already chose it; a refused code is dropped and the form opens
 * so they can correct it. Everything here is skippable, and a failure to ask is never a reason to interrupt.
 */
export default function ReferralCodePrompt({ onFinished }: { onFinished?: () => void } = {}) {
  const userId = useAuthStore((s) => s.userId);
  const isMember = useAuthStore((s) => s.isMember);
  const titleId = useId();
  const continueRef = useRef<HTMLButtonElement>(null);
  const finishedRef = useRef(false);
  const [phase, setPhase] = useState<Phase>("checking");
  const [bonus, setBonus] = useState(0);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const { check, code } = useReferralCodeCheck(typed);

  function finish() {
    if (userId) settledThisVisit.add(userId);
    setPhase("gone");
    if (!finishedRef.current) {
      finishedRef.current = true;
      onFinished?.();
    }
  }

  useEffect(() => {
    if (!isMember || !userId || settledThisVisit.has(userId)) {
      finish();
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const overview = await fetchReferralOverview();
        if (cancelled) return;
        setBonus(overview.campaign.inviteeBonus);
        if (!overview.canEnterCode) { finish(); return; }

        const remembered = pendingReferralCode() ?? await metadataReferralCode();
        if (cancelled) return;
        if (remembered) {
          const result = await redeemReferralCode(remembered);
          if (cancelled) return;
          forgetReferralCode();
          void clearMetadataReferralCode();
          if (result.ok) { setPhase("added"); return; }
          setProblem(REFERRAL_REFUSAL_COPY[result.code]);
          setTyped(remembered);
        }

        // Only a brand-new member is asked; someone mid-way through their first week is not nagged on every visit.
        const welcome = await getMemberWelcomeStatus().catch(() => null);
        if (cancelled) return;
        if (welcome?.pending || remembered) setPhase("form");
        else finish();
      } catch {
        // Not knowing is not a reason to interrupt. The Referrals page still has the field.
        if (!cancelled) finish();
      }
    })();
    return () => { cancelled = true; };
    // finish() reads only stable refs and the props captured on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMember, userId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!code || busy) return;
    setBusy(true);
    setProblem(null);
    try {
      const result = await redeemReferralCode(code);
      if (result.ok) setPhase("added");
      else setProblem(REFERRAL_REFUSAL_COPY[result.code]);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "That did not go through. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (phase === "checking" || phase === "gone") return null;

  return (
    <Modal
      open
      ariaLabelledBy={titleId}
      mobileSheet
      zIndex={MODAL_Z}
      closeOnBackdropClick={false}
      onClose={finish}
      initialFocusRef={phase === "added" ? continueRef : undefined}
      panelClassName="w-full max-w-md"
    >
      <form
        onSubmit={submit}
        className="auth-shell max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-3xl border border-[var(--auth-card-edge)] bg-[var(--auth-card)] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-6 shadow-2xl md:rounded-3xl md:px-6"
      >
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-800 dark:text-amber-300"><Gift size={22} /></span>
          <h2 id={titleId} className="text-xl font-black text-[var(--auth-ink)]">
            {phase === "added" ? "Code added" : "Did a friend invite you?"}
          </h2>
        </div>

        {phase === "added" ? (
          <>
            <p className="mt-4 text-sm leading-relaxed text-[var(--auth-ink-soft)]">
              You and your friend each get {formatCoins(bonus)} coins once you finish a match with another person. Your usual welcome coins are yours either way.
            </p>
            <button ref={continueRef} type="button" onClick={finish} className={`${PRIMARY} mt-5`}>Continue</button>
          </>
        ) : (
          <>
            <p className="mt-4 text-sm leading-relaxed text-[var(--auth-ink-soft)]">
              Add their code now and you each get {formatCoins(bonus)} coins after your first match with another person. It is optional, and you can add it later from Invite friends while you are still new.
            </p>
            <div className="mt-4"><ReferralCodeField value={typed} onChange={setTyped} check={check} label="Your friend's code" disabled={busy} /></div>
            {problem && <p role="alert" className="mt-2 text-xs font-semibold text-rose-700 dark:text-rose-300">{problem}</p>}
            <div className="mt-5 space-y-2">
              <button type="submit" disabled={busy || !code || check === "invalid"} className={PRIMARY}>{busy ? "Adding…" : "Add code"}</button>
              <button type="button" onClick={() => { forgetReferralCode(); finish(); }} className={QUIET}>Not now</button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
