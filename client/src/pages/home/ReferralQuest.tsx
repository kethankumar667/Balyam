import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Copy, Users } from "lucide-react";
import { NOSTALGIA_PACK } from "@shared/referrals";
import { useReferralProgress } from "../../hooks/useReferralProgress";
import { useCosmeticsStore } from "../../store/cosmeticsStore";
import { PackCollectible } from "./JourneyArtwork";
import { useAuthStore } from "../../store/authStore";

const BUTTON = "inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-violet-200/60 bg-violet-950/50 px-3 text-sm font-bold text-violet-100 transition hover:bg-violet-900/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:opacity-60";

export function ReferralQuest({ isMember }: { isMember: boolean }) {
  const { progress, loading, error, notice, retry } = useReferralProgress(isMember);
  const userId = useAuthStore(s => s.userId);
  const [sharing, setSharing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [equipping, setEquipping] = useState(false);
  const link = progress ? `${window.location.origin}/invite/${progress.inviteCode}` : "";
  useEffect(() => { setSharing(false); setFeedback(null); setEquipping(false); }, [userId]);

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(link);
      setFeedback("Invitation link copied.");
    } catch { setFeedback("Copy was blocked. Select and copy the invitation link below."); }
  }
  async function equipPack() {
    setEquipping(true);
    setFeedback(null);
    try {
      await useCosmeticsStore.getState().fetchCosmetics();
      for (const item of NOSTALGIA_PACK) {
        if (useAuthStore.getState().userId !== userId) return;
        const ok = await useCosmeticsStore.getState().equipItem(item.category, item.scope, item.id);
        if (useAuthStore.getState().userId !== userId) return;
        if (!ok) {
          setFeedback(useCosmeticsStore.getState().errorMessage ?? "One reward could not be equipped. Try again; already equipped rewards are kept.");
          return;
        }
      }
      if (useAuthStore.getState().userId === userId) setFeedback("Pack equipped. School Slate appears on your classic Rummy table; host-selected worlds take priority.");
    } catch (error) {
      if (useAuthStore.getState().userId === userId) setFeedback(error instanceof Error ? error.message : "The pack could not be equipped. Please try again.");
    } finally { if (useAuthStore.getState().userId === userId) setEquipping(false); }
  }

  return <article className="relative flex min-w-0 flex-col rounded-2xl border border-violet-300/40 bg-gradient-to-b from-[#30223f]/95 to-[#1d2039]/95 p-5 sm:p-6">
    <span aria-hidden="true" className="absolute -left-[17px] top-7 h-2 w-2 rounded-full bg-violet-200 lg:hidden" />
    <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-200"><Users size={16} aria-hidden="true" /> Social quest</p>
    <h3 className="mt-4 font-display text-2xl">Bring your crew</h3>
    <p className="mt-2 text-xs leading-relaxed text-[#C5D1E2]">New memories are better together. Invite three friends to earn the Nostalgia Pack.</p>
    <div className="my-5 rounded-xl border border-amber-200/30 bg-[#181a30]/70 p-3">
      <p className="mb-3 text-center text-[9px] font-bold uppercase tracking-[0.2em] text-amber-200">The Nostalgia Pack</p>
      <ul className="grid grid-cols-3 gap-2">
        {NOSTALGIA_PACK.map((item, index) => <li key={item.id} className="min-w-0 text-center">
          <PackCollectible index={index} /><span className="mt-2 block text-[10px] font-semibold leading-relaxed text-amber-100">{item.name}</span>
          <span className="block text-[9px] text-[#B6C4D8]">{index === 0 ? "Avatar aura" : index === 1 ? "Podium title" : "Rummy theme"}</span>
        </li>)}
      </ul>
    </div>
    {!isMember ? (
      <p className="mb-5 text-xs leading-relaxed text-[#C5D1E2]">Sign in to create your personal invitation link and track qualifying friends.</p>
    ) : loading ? (
      <p role="status" className="mb-5 text-sm text-violet-100">Loading invitations...</p>
    ) : error ? (
      <div className="mb-5"><p role="alert" className="text-xs leading-relaxed text-amber-100">{error}</p><button className="mt-2 min-h-[44px] rounded-lg px-2 text-xs font-bold text-violet-100 underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-amber-300" onClick={retry}>Retry invitations</button></div>
    ) : progress ? (
      <>
        <p className="text-sm font-bold text-violet-100">{progress.qualifiedFriends} / {progress.target} friends qualified</p>
        <ol aria-label="Qualifying friend progress" className="my-3 flex gap-2">
          {[1, 2, 3].map(n => <li key={n} className={`flex h-9 flex-1 items-center justify-center gap-1 rounded-lg border text-[10px] ${n <= progress.qualifiedFriends ? "border-amber-200/70 bg-amber-300/10 text-amber-100" : "border-[#66738b] text-[#C5D1E2]"}`}>
            {n <= progress.qualifiedFriends ? <Check size={13} aria-hidden="true" /> : <Users size={12} aria-hidden="true" />} Friend {n}
          </li>)}
        </ol>
        <p className="mb-2 text-[11px] leading-relaxed text-[#C5D1E2]">Each friend needs a new verified account and a completed match with another human within 30 days of accepting.</p>
        {progress.pendingFriends > 0 && <p className="mb-2 text-[11px] text-violet-200">{progress.pendingFriends} accepted; waiting for qualifying play.</p>}
        <button type="button" onClick={retry} className="mb-1 min-h-[44px] self-start rounded-lg text-[11px] text-violet-100 underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-amber-300">Refresh progress</button>
      </>
    ) : null}
    {notice && <p role="status" className="mb-3 text-xs leading-relaxed text-amber-100">{notice}</p>}
    <div className="mt-auto pt-4">
      {!isMember ? <Link to="/login" className={BUTTON}>Sign in to invite <ArrowRight size={16} aria-hidden="true" /></Link>
        : progress && !error && !loading ? <>
          {progress.rewardGranted && <button type="button" disabled={equipping} onClick={() => void equipPack()} className={`${BUTTON} mb-2 border-amber-200/60 text-amber-100`}>{equipping ? "Equipping..." : "Equip earned pack"}</button>}
          <button type="button" onClick={() => setSharing(s => !s)} aria-expanded={sharing} className={BUTTON}>Invite friends <ArrowRight size={16} aria-hidden="true" /></button>
          {sharing && <div className="mt-3 space-y-2 rounded-xl border border-violet-200/40 bg-[#111b30] p-3">
            <a href={`https://wa.me/?text=${encodeURIComponent(`Join me on BHALYAM. Accept my invitation before creating your account: ${link}`)}`} target="_blank" rel="noopener noreferrer" className="flex min-h-[44px] items-center justify-center rounded-lg border border-emerald-200/50 px-2 text-xs font-bold text-emerald-100 focus-visible:ring-2 focus-visible:ring-amber-300">Share using WhatsApp</a>
            <button type="button" onClick={() => void copyInvite()} className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-slate-500 text-xs text-slate-100 focus-visible:ring-2 focus-visible:ring-amber-300"><Copy size={14} aria-hidden="true" /> Copy invitation link</button>
            <label className="block text-[10px] text-slate-300">Your invitation link<input readOnly value={link} onFocus={e => e.currentTarget.select()} className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-500 bg-[#0a1426] px-2 text-xs text-white focus-visible:ring-2 focus-visible:ring-amber-300" /></label>
          </div>}
        </> : null}
      {feedback && <p role="status" className="mt-3 text-xs leading-relaxed text-amber-100">{feedback}</p>}
    </div>
  </article>;
}
