import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowRight, ShieldCheck, Users } from "lucide-react";
import { isReferralCode } from "@shared/referrals";
import { useAuthStore } from "../store/authStore";
import { useReferralProgress } from "../hooks/useReferralProgress";
import { pendingReferralIntent, referralRequest, REFERRAL_INTENT_KEY } from "../lib/referrals";

export default function InvitePage() {
  const { code = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const isMember = useAuthStore(s => s.isMember);
  const [valid, setValid] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const activeCode = useRef(code);
  activeCode.current = code;
  const complete = code === "complete";
  const referral = useReferralProgress(isMember && complete && accepted);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setLoading(true);
    setValid(false);
    setAccepted(false);
    if (complete) {
      const token = params.get("intent");
      try {
        if (token && token.length <= 512) {
          localStorage.setItem(REFERRAL_INTENT_KEY, token);
          setParams({}, { replace: true });
        }
        if (!pendingReferralIntent()) setError("No accepted invitation was found. Reopen your friend's invitation link.");
        else setAccepted(true);
      } catch { setError("Browser storage is blocked. Allow storage and reopen your invitation to connect it."); }
      setLoading(false);
      return;
    }
    if (!isReferralCode(code)) {
      setError("This invitation is no longer available.");
      setLoading(false);
      return;
    }
    void referralRequest<{ valid: boolean }>(`/invite/${code}`, undefined, true)
      .then(result => { if (!cancelled) setValid(result.valid); })
      .catch((err: unknown) => { if (!cancelled) setError(err instanceof Error ? err.message : "Could not load this invitation."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [code, complete, params, setParams, attempt]);

  async function accept() {
    setLoading(true);
    setError(null);
    try {
      const result = await referralRequest<{ token: string; expiresAt: number }>("/accept", { code }, true);
      if (activeCode.current !== code) return;
      localStorage.setItem(REFERRAL_INTENT_KEY, result.token);
      setAccepted(true);
    } catch (err) { if (activeCode.current === code) setError(err instanceof Error ? err.message : "Could not accept this invitation. Please try again."); }
    finally { if (activeCode.current === code) setLoading(false); }
  }

  return <main className="mx-auto my-12 max-w-lg px-4">
    <section className="rounded-[28px] border border-violet-300/40 bg-[#10213b] p-6 text-slate-50 shadow-xl sm:p-8">
      <Users className="mb-5 text-amber-200" size={40} aria-hidden="true" />
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-200">A place for your crew</p>
      <h1 className="mt-3 font-display text-3xl">{complete ? "Your invitation" : "Come play together"}</h1>
      <p className="mt-4 text-sm leading-relaxed text-slate-300">Your friend invited you to BHALYAM. Accept before creating an account, verify your email, then finish a match with another human within 30 days.</p>
      <p className="mt-3 text-xs leading-relaxed text-slate-300">Your friend earns a cosmetic pack after three friends qualify. Accepting does not award coins or XP. Only qualification counts are shared, not your email or private match details.</p>
      <p className="mt-4 flex items-center gap-2 text-xs text-emerald-200"><ShieldCheck size={16} aria-hidden="true" /> No contact upload or device tracking.</p>
      {loading && <p role="status" className="mt-6 text-sm">Checking invitation...</p>}
      {(error || referral.error) && <div className="mt-5"><p role="alert" className="text-sm text-amber-100">{error ?? referral.error}</p><button onClick={() => { setAttempt(n => n + 1); referral.retry(); }} className="mt-2 min-h-[44px] rounded-lg px-3 text-sm underline focus-visible:ring-2 focus-visible:ring-amber-300">Retry invitation</button></div>}
      {referral.notice && <p role="status" className="mt-5 text-sm text-amber-100">{referral.notice}</p>}
      {!loading && !error && !complete && valid && !accepted && !isMember && <button type="button" onClick={() => void accept()} className="mt-6 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-950 px-4 text-sm font-bold focus-visible:ring-2 focus-visible:ring-amber-300">Accept invitation <ArrowRight size={17} aria-hidden="true" /></button>}
      {accepted && !isMember && <div className="mt-6"><p role="status" className="mb-3 text-sm text-emerald-200">{complete ? "Your invitation is ready. Finish signing in to connect it." : "Invitation accepted. Create a new account to connect it."}</p><Link to={complete ? "/login" : "/signup"} className="flex min-h-[52px] items-center justify-center rounded-xl border border-violet-200 bg-violet-950 px-4 text-sm font-bold focus-visible:ring-2 focus-visible:ring-amber-300">{complete ? "Sign in" : "Create account"}</Link></div>}
      {isMember && !complete && <p className="mt-5 text-sm text-amber-100">You already have an account, so this new-member invitation cannot qualify. You can still play together.</p>}
      <Link to="/" className="mt-3 flex min-h-[44px] items-center justify-center rounded-xl text-sm text-violet-100 underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-amber-300">Back to BHALYAM</Link>
    </section>
  </main>;
}
