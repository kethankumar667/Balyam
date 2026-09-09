import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  X,
  ArrowLeft,
  Clock,
  Shield,
  Coins,
  Gift,
  Check,
  Crown,
  Trophy,
  Star,
  Sparkles,
} from "lucide-react";
import { useStreakStore } from "../../store/streakStore";
import { bhalyamSpring } from "../../lib/motion";
import { AudioManager } from "../../services/AudioManager";
import { AUDIO } from "../../constants/audio";
import { HapticsManager } from "../../services/HapticsManager";
import {
  STREAK_REWARDS_SCHEDULE,
  type StreakScheduledDay,
} from "@shared/streak-types";
import {
  MILESTONES_CATALOG,
  type MilestoneChestDetail,
} from "./DailyStreakModalDesktop";
import { StreakHeroArtwork } from "./StreakHeroArtwork";

interface DailyStreakModalMobileProps {
  onClose: () => void;
  onBack?: () => void;
}

export function DailyStreakModalMobile({ onClose, onBack }: DailyStreakModalMobileProps) {
  const { state, isClaiming, claimToday, timeUntilReset, updateTimeRemaining } = useStreakStore();
  const reduce = useReducedMotion();

  const isClaimable = state?.isClaimableToday ?? false;
  const activeDay = state?.activeDayInCycle ?? 1;
  const schedule = state?.schedule ?? [];
  const shieldsRemaining = state?.shieldsRemaining ?? 0;
  const longestStreak = state?.longestStreak ?? 0;

  useEffect(() => {
    const interval = setInterval(updateTimeRemaining, 1000);
    return () => clearInterval(interval);
  }, [updateTimeRemaining]);

  const todayDay = isClaimable ? activeDay : Math.min(activeDay, 30);
  const todayReward =
    schedule.find((s) => s.day === todayDay) ??
    (STREAK_REWARDS_SCHEDULE[todayDay - 1] as StreakScheduledDay) ?? {
      day: 1,
      coins: 100,
      description: "Day 1 Welcome Reward",
      status: "CLAIMABLE",
    };

  const completedDays = isClaimable ? Math.max(0, todayDay - 1) : todayDay;
  const progressPercent = Math.min(100, Math.round((completedDays / 30) * 100));

  const nextMilestone =
    MILESTONES_CATALOG.find((m) => m.day > completedDays) ?? MILESTONES_CATALOG[3];
  const daysToNextMilestone = Math.max(0, nextMilestone.day - completedDays);

  const [inspectMilestone, setInspectMilestone] = useState<MilestoneChestDetail | null>(null);

  // The next handful of individual daily rewards after today — same
  // "escalation curve" restore as the desktop journey screen, since the
  // 3+1 milestone tiles here hide the ~26 non-milestone days entirely.
  const upcomingDays = useMemo(() => {
    const days: StreakScheduledDay[] = [];
    for (let d = todayDay + 1; d <= 30 && days.length < 4; d++) {
      const found =
        schedule.find((s) => s.day === d) ?? (STREAK_REWARDS_SCHEDULE[d - 1] as StreakScheduledDay);
      if (found) days.push(found);
    }
    return days;
  }, [schedule, todayDay]);

  // Computed, not hand-typed, so it can never silently drift from the real
  // schedule the way the old hardcoded "35,800" total had (actual sum is
  // 36,800).
  const totalCoinsAvailable = useMemo(
    () => STREAK_REWARDS_SCHEDULE.reduce((sum, r) => sum + r.coins, 0),
    []
  );

  const handleClaim = () => {
    HapticsManager.trigger("reward");
    AudioManager.play(AUDIO.REWARD_COIN);
    void claimToday();
  };

  const handleBack = () => {
    AudioManager.play(AUDIO.UI_CLICK);
    if (onBack) {
      onBack();
    } else {
      onClose();
    }
  };

  const urgencyText =
    daysToNextMilestone === 0
      ? `🎉 ${nextMilestone.title} Unlocked!`
      : `${nextMilestone.title} Unlocks In ${daysToNextMilestone} ${daysToNextMilestone === 1 ? "Day" : "Days"}`;

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="30-Day Rewards Journey"
      drag="y"
      dragConstraints={{ top: 0 }}
      dragElastic={{ top: 0, bottom: 0.6 }}
      onDragEnd={(_e, info) => {
        if (info.offset.y > 100) {
          AudioManager.play(AUDIO.UI_POPUP_CLOSE);
          onClose();
        }
      }}
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={bhalyamSpring}
      className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] flex flex-col rounded-t-[32px]
                 bg-gradient-to-b from-[#0c101c] via-[#0f1629] to-[#070b14]
                 border-t border-amber-500/30
                 shadow-[0_-12px_48px_rgba(0,0,0,0.85)] overflow-hidden pb-safe select-none text-white"
    >
      {/* Drag Bar */}
      <div className="flex justify-center pt-2.5 pb-1 cursor-grab active:cursor-grabbing bg-white/5">
        <div className="w-12 h-1.5 rounded-full bg-white/30 hover:bg-white/50 transition-colors" />
      </div>

      {/* 1. Integrated Mobile Header */}
      <div className="relative px-4 pt-2 pb-3 flex items-center justify-between border-b border-white/10 z-10">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={handleBack}
              aria-label="Back to Today's Reward"
              className="min-h-[44px] min-w-[44px] rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5 text-amber-300" />
            </button>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black tracking-tight text-amber-200">
                Rewards Expedition
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-amber-500/20 text-amber-300 border border-amber-400/30 font-mono">
                Day {completedDays} / 30
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              4 Grand Milestone Chests along the way
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            AudioManager.play(AUDIO.UI_POPUP_CLOSE);
            onClose();
          }}
          aria-label="Close Streak Modal"
          className="min-h-[44px] min-w-[44px] rounded-full bg-white/10 hover:bg-white/20
                     text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 1b. Today's value + countdown + shields — a player checking this
          screen mid-week (between milestones) otherwise has no way to see
          what today itself pays, or that they're protected against missing
          a day, without leaving to Screen 1. */}
      <div className="px-4 py-2 bg-black/20 border-b border-white/10 flex items-center gap-2 flex-wrap">
        <span className="text-[11px] px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 font-black font-mono flex items-center gap-1">
          <Coins className="w-3 h-3" />
          {isClaimable ? "Today" : "Claimed"}: +{todayReward.coins.toLocaleString()}
        </span>
        <span className="text-[11px] px-2 py-1 rounded-lg bg-black/40 border border-white/10 text-slate-200 font-bold flex items-center gap-1">
          <Clock className="w-3 h-3 text-amber-300" />
          <span className="font-mono">{timeUntilReset}</span>
        </span>
        {shieldsRemaining > 0 && (
          <span className="text-[11px] px-2 py-1 rounded-lg bg-sky-500/15 border border-sky-400/30 text-sky-300 font-black flex items-center gap-1">
            <Shield className="w-3 h-3 fill-sky-400/20" />
            {shieldsRemaining}
          </span>
        )}
      </div>

      {/* 2. Urgency Progress Sub-header */}
      <div className="px-4 py-2 bg-black/30 border-b border-white/10 flex items-center justify-between">
        <span className="text-xs font-black text-slate-300 flex items-center gap-1.5 font-mono">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          Day {completedDays} of 30 ({progressPercent}%)
        </span>
        <span className="text-[11px] font-black text-amber-300 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          {urgencyText}
        </span>
      </div>

      {/* 3. The Adventure Quest Road (Open Landscape Layout) */}
      <div className="relative flex-1 p-3.5 flex flex-col justify-between gap-3 overflow-hidden">
        {/* Top 3 Connected Milestones: Bronze (D7), Silver (D14), Gold (D21) */}
        <div className="relative">
          {/* Progress highway running at the base across waypoint nodes */}
          <div className="absolute top-[148px] left-[8%] right-[8%] h-2 rounded-full bg-slate-950 border border-white/10 shadow-inner z-0 overflow-hidden p-0.5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.round((completedDays / 21) * 100))}%` }}
              transition={reduce ? { duration: 0 } : { duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-yellow-400 shadow-[0_0_12px_rgba(245,158,11,0.85)]"
            />
          </div>

          <div className="relative z-10 grid grid-cols-3 gap-2">
            {/* Bronze Chest (Day 7) */}
            {(() => {
              const chest = MILESTONES_CATALOG[0];
              const isPassed = completedDays >= chest.day;
              const isNext = nextMilestone.day === chest.day && !isPassed;

              return (
                <div
                  key={chest.day}
                  onClick={() => {
                    HapticsManager.trigger("subtle");
                    AudioManager.play(AUDIO.UI_CLICK);
                    setInspectMilestone(inspectMilestone?.day === chest.day ? null : chest);
                  }}
                  className={`min-h-[44px] p-2 rounded-2xl flex flex-col items-center justify-between text-center cursor-pointer transition-all ${
                    isNext
                      ? "bg-gradient-to-b from-amber-500/15 to-transparent border border-amber-400/40 shadow-[0_0_20px_rgba(205,127,50,0.25)]"
                      : isPassed
                      ? "bg-emerald-500/5"
                      : "opacity-75"
                  }`}
                >
                  <span
                    className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                      isNext
                        ? "bg-[#CD7F32] text-white shadow-xs"
                        : "bg-white/10 text-slate-300 border border-white/10"
                    }`}
                  >
                    DAY 7
                  </span>

                  {/* Free-floating chest unobstructed */}
                  <div className="h-[60px] flex items-center justify-center my-1">
                    <StreakHeroArtwork type="bronze" size={56} />
                  </div>

                  <div className="h-[32px] flex flex-col justify-center w-full">
                    <div className="font-black text-[11px] text-white truncate">
                      {chest.title}
                    </div>
                    <div className="text-[10px] font-black font-mono text-[#f59e0b]">
                      +{chest.coins.toLocaleString()}
                    </div>
                  </div>

                  {/* Base Waypoint Node */}
                  <div className="my-1 flex items-center justify-center z-10 relative">
                    {/* Opaque backing disc — masks the highway line behind this station */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-10 h-4 rounded-full bg-[#0f1629]" />
                    </div>
                    <div
                      className={`relative w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-md ${
                        isPassed
                          ? "bg-emerald-500 border-emerald-300 text-white"
                          : isNext
                          ? "bg-[#CD7F32] border-amber-300 text-white animate-pulse shadow-[0_0_10px_rgba(205,127,50,0.8)]"
                          : "bg-slate-900 border-white/20 text-slate-400"
                      }`}
                    >
                      {isPassed ? (
                        <Check className="w-3 h-3 stroke-[3]" />
                      ) : (
                        <span className="text-[9px] font-bold font-mono">7</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-0.5 text-[9px] font-black">
                    {isPassed ? (
                      <span className="text-emerald-400">Claimed</span>
                    ) : isNext ? (
                      <span className="text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded-full border border-amber-400/30">
                        {daysToNextMilestone}d away
                      </span>
                    ) : (
                      <span className="text-slate-400">Locked</span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Silver Chest (Day 14) */}
            {(() => {
              const chest = MILESTONES_CATALOG[1];
              const isPassed = completedDays >= chest.day;
              const isNext = nextMilestone.day === chest.day && !isPassed;

              return (
                <div
                  key={chest.day}
                  onClick={() => {
                    HapticsManager.trigger("subtle");
                    AudioManager.play(AUDIO.UI_CLICK);
                    setInspectMilestone(inspectMilestone?.day === chest.day ? null : chest);
                  }}
                  className={`min-h-[44px] p-2 rounded-2xl flex flex-col items-center justify-between text-center cursor-pointer transition-all ${
                    isNext
                      ? "bg-gradient-to-b from-slate-300/15 to-transparent border border-slate-300/40 shadow-[0_0_20px_rgba(203,213,225,0.25)]"
                      : isPassed
                      ? "bg-emerald-500/5"
                      : "opacity-75"
                  }`}
                >
                  <span
                    className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                      isNext
                        ? "bg-slate-200 text-slate-950 font-black shadow-xs"
                        : "bg-white/10 text-slate-300 border border-white/10"
                    }`}
                  >
                    DAY 14
                  </span>

                  {/* Free-floating chest unobstructed */}
                  <div className="h-[60px] flex items-center justify-center my-1">
                    <StreakHeroArtwork type="silver" size={56} />
                  </div>

                  <div className="h-[32px] flex flex-col justify-center w-full">
                    <div className="font-black text-[11px] text-white truncate">
                      {chest.title}
                    </div>
                    <div className="text-[10px] font-black font-mono text-slate-200">
                      +{chest.coins.toLocaleString()}
                    </div>
                  </div>

                  {/* Base Waypoint Node */}
                  <div className="my-1 flex items-center justify-center z-10 relative">
                    {/* Opaque backing disc — masks the highway line behind this station */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-10 h-4 rounded-full bg-[#0f1629]" />
                    </div>
                    <div
                      className={`relative w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-md ${
                        isPassed
                          ? "bg-emerald-500 border-emerald-300 text-white"
                          : isNext
                          ? "bg-slate-300 border-white text-slate-950 animate-pulse shadow-[0_0_10px_rgba(203,213,225,0.8)]"
                          : "bg-slate-900 border-white/20 text-slate-400"
                      }`}
                    >
                      {isPassed ? (
                        <Check className="w-3 h-3 stroke-[3]" />
                      ) : (
                        <span className="text-[9px] font-bold font-mono">14</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-0.5 text-[9px] font-black">
                    {isPassed ? (
                      <span className="text-emerald-400">Claimed</span>
                    ) : isNext ? (
                      <span className="text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded-full border border-amber-400/30">
                        {daysToNextMilestone}d away
                      </span>
                    ) : (
                      <span className="text-slate-400">Locked</span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Gold Chest (Day 21) */}
            {(() => {
              const chest = MILESTONES_CATALOG[2];
              const isPassed = completedDays >= chest.day;
              const isNext = nextMilestone.day === chest.day && !isPassed;

              return (
                <div
                  key={chest.day}
                  onClick={() => {
                    HapticsManager.trigger("subtle");
                    AudioManager.play(AUDIO.UI_CLICK);
                    setInspectMilestone(inspectMilestone?.day === chest.day ? null : chest);
                  }}
                  className={`min-h-[44px] p-2 rounded-2xl flex flex-col items-center justify-between text-center cursor-pointer transition-all ${
                    isNext
                      ? "bg-gradient-to-b from-yellow-500/15 to-transparent border border-yellow-400/40 shadow-[0_0_20px_rgba(250,204,21,0.3)]"
                      : isPassed
                      ? "bg-emerald-500/5"
                      : "opacity-75"
                  }`}
                >
                  <span
                    className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                      isNext
                        ? "bg-yellow-400 text-slate-950 font-black shadow-xs"
                        : "bg-white/10 text-slate-300 border border-white/10"
                    }`}
                  >
                    DAY 21
                  </span>

                  {/* Free-floating chest unobstructed */}
                  <div className="h-[60px] flex items-center justify-center my-1">
                    <StreakHeroArtwork type="gold" size={58} />
                  </div>

                  <div className="h-[32px] flex flex-col justify-center w-full">
                    <div className="font-black text-[11px] text-white truncate">
                      {chest.title}
                    </div>
                    <div className="text-[10px] font-black font-mono text-yellow-300">
                      +{chest.coins.toLocaleString()}
                    </div>
                  </div>

                  {/* Base Waypoint Node */}
                  <div className="my-1 flex items-center justify-center z-10 relative">
                    {/* Opaque backing disc — masks the highway line behind this station */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-10 h-4 rounded-full bg-[#0f1629]" />
                    </div>
                    <div
                      className={`relative w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-md ${
                        isPassed
                          ? "bg-emerald-500 border-emerald-300 text-white"
                          : isNext
                          ? "bg-yellow-400 border-amber-200 text-slate-950 animate-pulse shadow-[0_0_12px_rgba(250,204,21,0.85)]"
                          : "bg-slate-900 border-white/20 text-slate-400"
                      }`}
                    >
                      {isPassed ? (
                        <Check className="w-3 h-3 stroke-[3]" />
                      ) : (
                        <span className="text-[9px] font-bold font-mono">21</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-0.5 text-[9px] font-black">
                    {isPassed ? (
                      <span className="text-emerald-400">Claimed</span>
                    ) : isNext ? (
                      <span className="text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded-full border border-amber-400/30">
                        {daysToNextMilestone}d away
                      </span>
                    ) : (
                      <span className="text-slate-400">Locked</span>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Connecting Pathway downward to D30 Hero */}
        <div className="flex justify-center items-center py-0.5">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-400">
            <span>↓</span>
            <span>Final Quest Destination</span>
            <span>↓</span>
          </div>
        </div>

        {/* THE HERO — Diamond Crown (Day 30 Climax — 100% Width) */}
        {(() => {
          const chest = MILESTONES_CATALOG[3];
          const isPassed = completedDays >= chest.day;

          return (
            <div
              key={chest.day}
              onClick={() => {
                HapticsManager.trigger("subtle");
                AudioManager.play(AUDIO.UI_CLICK);
                setInspectMilestone(inspectMilestone?.day === chest.day ? null : chest);
              }}
              className="relative p-3 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all
                         bg-gradient-to-r from-[#101935] via-[#131b38] to-[#0c1020]
                         border-cyan-400/80 shadow-[0_0_24px_rgba(56,189,248,0.3)] ring-1 ring-cyan-300/40"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="shrink-0">
                  <StreakHeroArtwork type="diamond" size={64} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 flex items-center gap-0.5">
                      <Crown className="w-2.5 h-2.5 text-slate-950" />
                      GRAND FINALE
                    </span>
                    <span className="text-[9px] font-mono text-cyan-200 font-bold">
                      Day 30 {isPassed && "✓"}
                    </span>
                  </div>
                  <div className="text-base font-black font-mono text-yellow-300 drop-shadow-sm mt-0.5">
                    {chest.coins.toLocaleString()} COINS
                  </div>
                  <div className="text-[10px] font-bold text-cyan-200">
                    Monthly Champion Crown + Shield
                  </div>
                  <div className="text-[9px] font-black text-amber-200 mt-0.5 flex items-center gap-1 flex-wrap">
                    <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                    <span>{totalCoinsAvailable.toLocaleString()} Total Coins</span>
                    <span className="text-cyan-300/80 font-semibold normal-case">
                      (≈ {Math.floor(totalCoinsAvailable / 100)} room entries)
                    </span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 pl-2">
                <span className="text-[10px] px-2.5 py-1 rounded-xl font-black bg-white/15 text-white border border-white/20">
                  Tap Loot
                </span>
              </div>
            </div>
          );
        })()}

        {/* Floating Tap-To-Inspect Popover on Mobile */}
        <AnimatePresence>
          {inspectMilestone && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              className="absolute inset-x-3 bottom-3 z-30 p-3.5 rounded-2xl
                         bg-[#0e1424]/98 border-2 border-amber-400 text-white shadow-2xl backdrop-blur-xl"
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-white/15">
                <span className="text-xs font-black text-amber-300 flex items-center gap-1">
                  <Gift className="w-3.5 h-3.5 text-amber-400" />
                  {inspectMilestone.title} (Day {inspectMilestone.day})
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setInspectMilestone(null);
                  }}
                  className="min-h-[28px] min-w-[28px] rounded-full hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="py-2">
                <span className="text-[9px] uppercase font-black tracking-wider text-amber-300/80 block mb-1">
                  Guaranteed Loot Inside:
                </span>
                <ul className="space-y-1 text-xs font-medium">
                  {inspectMilestone.contains.map((item: string) => (
                    <li key={item} className="flex items-center gap-1.5 text-slate-200">
                      <Sparkles className="w-3 h-3 text-yellow-300 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setInspectMilestone(null)}
                  className="text-[11px] font-bold text-amber-300 hover:text-amber-200 underline cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 4. Bottom Seamless Action Area */}
      <div className="p-3 border-t border-white/10 bg-black/40">
        {/* Coming Up — restores the escalating daily curve the 3+1
            milestone tiles otherwise hide for non-milestone days. */}
        {upcomingDays.length > 0 && (
          <div className="mb-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 shrink-0">
              Next:
            </span>
            {upcomingDays.map((d) => (
              <span
                key={d.day}
                className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold ${
                  d.milestoneChest
                    ? "bg-violet-500/10 border-violet-400/40 text-violet-200"
                    : "bg-white/5 border-white/10 text-slate-300"
                }`}
              >
                <span className="text-slate-500">D{d.day}</span>
                <span className="font-mono">+{d.coins.toLocaleString()}</span>
              </span>
            ))}
            {longestStreak > 0 && (
              <span className="ml-auto shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-amber-200 text-[10px] font-bold">
                <Trophy className="w-3 h-3 text-amber-300" />
                Best {longestStreak}d
              </span>
            )}
          </div>
        )}

        {isClaimable ? (
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleClaim}
            disabled={isClaiming}
            className="w-full min-h-[48px] py-2.5 px-4 rounded-xl font-black text-sm
                       bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300
                       text-slate-950 shadow-[0_4px_16px_rgba(245,158,11,0.45)] cursor-pointer flex items-center justify-center gap-2
                       focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            {isClaiming ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                Claiming Reward…
              </span>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-slate-950/40 fill-slate-950/20" />
                <span>CLAIM TODAY (+{todayReward.coins.toLocaleString()} COINS)</span>
              </>
            )}
          </motion.button>
        ) : (
          // The header's back arrow (when `onBack` is provided) already
          // gets a player back to Screen 1 — this slot doesn't need to
          // duplicate it. It now shows the one thing that button doesn't:
          // exactly when tomorrow's reward opens.
          <div className="w-full min-h-[48px] py-2.5 px-4 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300 flex items-center justify-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
            <span>Claimed — next in</span>
            <span className="font-mono text-amber-300">{timeUntilReset}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default DailyStreakModalMobile;


