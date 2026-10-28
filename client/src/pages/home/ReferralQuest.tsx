import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Copy, Users } from "lucide-react";
import { NOSTALGIA_PACK, packEquipTargets, REFERRAL_BONUS_COINS } from "@shared/referrals";
import { useReferralProgress } from "../../hooks/useReferralProgress";
import { useCosmeticsStore } from "../../store/cosmeticsStore";
import { PackCollectible } from "./JourneyArtwork";
import { useAuthStore } from "../../store/authStore";

const BUTTON = "inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-journey-violet/60 bg-journey-violet/10 px-3 text-sm font-bold text-journey-violet transition motion-reduce:transition-none hover:bg-journey-violet/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journey-gold disabled:opacity-60";

export function ReferralQuest({ isMember }: { isMember: boolean }) {
  const { progress, loading, error, notice, retry } = useReferralProgress(isMember);
  const userId = useAuthStore(s => s.userId);
  const hasAdminPass = useAuthStore(s => s.capabilities.unlockAllFeatures);
  const [sharing, setSharing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [equipping, setEquipping] = useState(false);
  const canEquipPack = hasAdminPass || (progress?.rewardGranted && !error && !loading);
  const link = progress ? `${window.location.origin}/invite/${progress.shareCode ?? progress.inviteCode}` : "";
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
      for (const item of packEquipTargets()) {
        if (useAuthStore.getState().userId !== userId) return;
        const ok = await useCosmeticsStore.getState().equipItem(item.category, item.scope, item.id);
        if (useAuthStore.getState().userId !== userId) return;
        if (!ok) {
          setFeedback(useCosmeticsStore.getState().errorMessage ?? "One reward could not be equipped. Try again; already equipped rewards are kept.");
          return;
        }
      }
      if (useAuthStore.getState().userId === userId) setFeedback("Pack equipped. School Slate appears in Rummy, Ludo, Goli Jump, Bingo, Star Game and Sudoku; a host-selected world takes priority at the table.");
    } catch (error) {
      if (useAuthStore.getState().userId === userId) setFeedback(error instanceof Error ? error.message : "The pack could not be equipped. Please try again.");
    } finally { if (useAuthStore.getState().userId === userId) setEquipping(false); }
  }

  return <article className="relative flex min-w-0 flex-col rounded-2xl border border-journey-violet/40 bg-gradient-to-b from-journey-social-start/95 to-journey-social-end/95 p-5 sm:p-6">
    <span aria-hidden="true" className="absolute -left-[17px] top-7 h-2 w-2 rounded-full bg-journey-violet lg:hidden" />
    <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-journey-violet"><Users size={16} aria-hidden="true" /> Social quest</p>
    <h3 className="mt-4 font-display text-2xl">Bring your crew</h3>
    <p className="mt-2 text-xs leading-relaxed text-journey-detail">New memories are better together. When a friend you invite plays their first match with another person, you each get {REFERRAL_BONUS_COINS.toLocaleString("en-IN")} coins. Three friends earn the Nostalgia Pack.</p>
    <div className="my-5 rounded-xl border border-journey-gold/30 bg-journey-panel/70 p-3">
      <p className="mb-3 text-center text-[9px] font-bold uppercase tracking-[0.2em] text-journey-gold">The Nostalgia Pack</p>
      <ul className="grid grid-cols-3 gap-2">
        {NOSTALGIA_PACK.map((item, index) => <li key={item.id} className="min-w-0 text-center">
          <PackCollectible index={index} /><span className="mt-2 block text-[10px] font-semibold leading-relaxed text-journey-gold">{item.name}</span>
          <span className="block text-[9px] text-journey-soft">{index === 0 ? "Avatar aura" : index === 1 ? "Podium title" : "Theme · 6 games"}</span>
        </li>)}
      </ul>
    </div>
    {!isMember ? (
      <p className="mb-5 text-xs leading-relaxed text-journey-detail">Sign in to create your personal invitation link and track qualifying friends.</p>
    ) : loading ? (
      <p role="status" className="mb-5 text-sm text-journey-violet">Loading invitations...</p>
    ) : error ? (
      <div className="mb-5"><p role="alert" className="text-xs leading-relaxed text-journey-gold">{error}</p><button className="mt-2 min-h-[44px] rounded-lg px-2 text-xs font-bold text-journey-violet underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-journey-gold" onClick={retry}>Retry invitations</button></div>
    ) : progress ? (
      <>
        <p className="text-sm font-bold text-journey-violet">{progress.qualifiedFriends} / {progress.target} friends qualified</p>
        <ol aria-label="Qualifying friend progress" className="my-3 flex gap-2">
          {[1, 2, 3].map(n => <li key={n} className={`flex h-9 flex-1 items-center justify-center gap-1 rounded-lg border text-[10px] ${n <= progress.qualifiedFriends ? "border-journey-gold/70 bg-journey-gold/10 text-journey-gold" : "border-journey-soft/60 text-journey-detail"}`}>
            {n <= progress.qualifiedFriends ? <Check size={13} aria-hidden="true" /> : <Users size={12} aria-hidden="true" />} Friend {n}
          </li>)}
        </ol>
        <p className="mb-2 text-[11px] leading-relaxed text-journey-detail">Each friend needs a new verified account and a completed match with another human within 30 days of accepting.</p>
        {progress.pendingFriends > 0 && <p className="mb-2 text-[11px] text-journey-violet">{progress.pendingFriends} accepted; waiting for qualifying play.</p>}
        {progress.shareCode && <p className="mb-2 text-[11px] text-journey-detail">Your code <span className="font-mono font-bold text-journey-gold">{progress.shareCode}</span> · <Link to="/referrals" className="inline-flex min-h-[44px] items-center text-journey-violet underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-journey-gold">See who joined</Link></p>}
        <button type="button" onClick={retry} className="mb-1 min-h-[44px] self-start rounded-lg text-[11px] text-journey-violet underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-journey-gold">Refresh progress</button>
      </>
    ) : null}
    {notice && <p role="status" className="mb-3 text-xs leading-relaxed text-journey-gold">{notice}</p>}
    <div className="mt-auto pt-4">
      {canEquipPack && <>
        {hasAdminPass && <p className="mb-3 text-xs leading-relaxed text-journey-gold">Admin Pass gives access to all three items without completing referrals. This is not earned ownership.</p>}
        <button type="button" disabled={equipping} onClick={() => void equipPack()} className={`${BUTTON} mb-2`}>{equipping ? "Equipping..." : hasAdminPass ? "Equip pack · Admin Pass" : "Equip earned pack"}</button>
      </>}
      {!isMember ? <Link to="/login" className={BUTTON}>Sign in to invite <ArrowRight size={16} aria-hidden="true" /></Link>
        : progress && !error && !loading ? <>
          <button type="button" onClick={() => setSharing(s => !s)} aria-expanded={sharing} className={BUTTON}>Invite friends <ArrowRight size={16} aria-hidden="true" /></button>
          {sharing && <div className="mt-3 space-y-2 rounded-xl border border-journey-violet/40 bg-journey-panel p-3">
            <a href={`https://wa.me/?text=${encodeURIComponent(`Join me on BHALYAM. Accept my invitation before creating your account: ${link}`)}`} target="_blank" rel="noopener noreferrer" className="flex min-h-[44px] items-center justify-center rounded-lg border border-journey-mint/60 px-2 text-xs font-bold text-journey-mint focus-visible:ring-2 focus-visible:ring-journey-gold">Share using WhatsApp</a>
            <button type="button" onClick={() => void copyInvite()} className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-journey-soft/60 text-xs text-journey-ink focus-visible:ring-2 focus-visible:ring-journey-gold"><Copy size={14} aria-hidden="true" /> Copy invitation link</button>
            <label className="block text-[10px] text-journey-soft">Your invitation link<input readOnly value={link} onFocus={e => e.currentTarget.select()} className="mt-1 min-h-[44px] w-full rounded-lg border border-journey-soft/60 bg-journey-input px-2 text-xs text-journey-ink focus-visible:ring-2 focus-visible:ring-journey-gold" /></label>
          </div>}
        </> : null}
      {feedback && <p role="status" className="mt-3 text-xs leading-relaxed text-journey-gold">{feedback}</p>}
    </div>
  </article>;
}
