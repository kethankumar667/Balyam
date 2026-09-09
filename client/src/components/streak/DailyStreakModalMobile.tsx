import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  ArrowLeft,
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
  const { state, isClaiming, claimToday } = useStreakStore();

  const isClaimable = state?.isClaimableToday ?? false;
  const activeDay = state?.activeDayInCycle ?? 1;
  const schedule = state?.schedule ?? [];

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
              <h2 className="text-base font-black tracking-tight bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 bg-clip-text text-transparent">
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

      {/* 3. The Adventure Quest Road (Map Layout) */}
      <div className="relative flex-1 p-3.5 flex flex-col justify-between gap-3 overflow-hidden">
        {/* Top 3 Connected Milestones: Bronze (D7), Silver (D14), Gold (D21) */}
        <div className="relative">
          {/* Progress conduit running under nodes */}
          <div className="absolute top-[68px] left-[10%] right-[10%] h-2.5 rounded-full bg-slate-950/90 border border-white/15 shadow-inner pointer-events-none z-0 overflow-hidden p-0.5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.round((completedDays / 21) * 100))}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
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
                  className={`min-h-[44px] p-2.5 rounded-2xl border-2 flex flex-col items-center justify-between text-center cursor-pointer transition-all shadow-md backdrop-blur-md ${
                    isPassed
                      ? "bg-slate-900/90 border-emerald-500/50"
                      : isNext
                      ? "bg-gradient-to-b from-[#2a1708] to-slate-900/95 border-[#CD7F32] shadow-[0_0_18px_rgba(205,127,50,0.35)] ring-2 ring-[#CD7F32]/50 scale-102"
                      : "bg-slate-900/85 border-white/15 opacity-80"
                  }`}
                >
                  <span
                    className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                      isNext
                        ? "bg-[#CD7F32] text-white"
                        : "bg-white/10 text-slate-300 border border-white/10"
                    }`}
                  >
                    DAY 7
                  </span>

                  <div className="my-1">
                    <StreakHeroArtwork type="bronze" size={50} />
                  </div>

                  <div className="w-full">
                    <div className="font-black text-[11px] text-white truncate">
                      {chest.title}
                    </div>
                    <div className="text-[10px] font-black font-mono text-[#f59e0b]">
                      +{chest.coins.toLocaleString()}
                    </div>
                    <div className="text-[9px] font-black mt-0.5">
                      {isPassed ? (
                        <span className="text-emerald-400 flex items-center justify-center gap-0.5">
                          <Check className="w-2.5 h-2.5 stroke-[3]" /> Claimed
                        </span>
                      ) : isNext ? (
                        <span className="text-amber-300 font-bold">
                          {daysToNextMilestone}d away
                        </span>
                      ) : (
                        <span className="text-slate-400">Locked</span>
                      )}
                    </div>
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
                  className={`min-h-[44px] p-2.5 rounded-2xl border-2 flex flex-col items-center justify-between text-center cursor-pointer transition-all shadow-md backdrop-blur-md ${
                    isPassed
                      ? "bg-slate-900/90 border-emerald-500/50"
                      : isNext
                      ? "bg-gradient-to-b from-slate-800 to-slate-900/95 border-slate-300 shadow-[0_0_18px_rgba(203,213,225,0.35)] ring-2 ring-slate-300/50 scale-102"
                      : "bg-slate-900/85 border-white/15 opacity-75"
                  }`}
                >
                  <span
                    className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                      isNext
                        ? "bg-slate-200 text-slate-950 font-black"
                        : "bg-white/10 text-slate-300 border border-white/10"
                    }`}
                  >
                    DAY 14
                  </span>

                  <div className="my-1">
                    <StreakHeroArtwork type="silver" size={50} />
                  </div>

                  <div className="w-full">
                    <div className="font-black text-[11px] text-white truncate">
                      {chest.title}
                    </div>
                    <div className="text-[10px] font-black font-mono text-slate-200">
                      +{chest.coins.toLocaleString()}
                    </div>
                    <div className="text-[9px] font-black mt-0.5">
                      {isPassed ? (
                        <span className="text-emerald-400 flex items-center justify-center gap-0.5">
                          <Check className="w-2.5 h-2.5 stroke-[3]" /> Claimed
                        </span>
                      ) : isNext ? (
                        <span className="text-amber-300 font-bold">
                          {daysToNextMilestone}d away
                        </span>
                      ) : (
                        <span className="text-slate-400">Locked</span>
                      )}
                    </div>
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
                  className={`min-h-[44px] p-2.5 rounded-2xl border-2 flex flex-col items-center justify-between text-center cursor-pointer transition-all shadow-md backdrop-blur-md ${
                    isPassed
                      ? "bg-slate-900/90 border-emerald-500/50"
                      : isNext
                      ? "bg-gradient-to-b from-[#2e2008] to-slate-900/95 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.4)] ring-2 ring-yellow-400/50 scale-102"
                      : "bg-slate-900/85 border-white/15 opacity-75"
                  }`}
                >
                  <span
                    className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                      isNext
                        ? "bg-yellow-400 text-slate-950 font-black"
                        : "bg-white/10 text-slate-300 border border-white/10"
                    }`}
                  >
                    DAY 21
                  </span>

                  <div className="my-1">
                    <StreakHeroArtwork type="gold" size={52} />
                  </div>

                  <div className="w-full">
                    <div className="font-black text-[11px] text-white truncate">
                      {chest.title}
                    </div>
                    <div className="text-[10px] font-black font-mono text-yellow-300">
                      +{chest.coins.toLocaleString()}
                    </div>
                    <div className="text-[9px] font-black mt-0.5">
                      {isPassed ? (
                        <span className="text-emerald-400 flex items-center justify-center gap-0.5">
                          <Check className="w-2.5 h-2.5 stroke-[3]" /> Claimed
                        </span>
                      ) : isNext ? (
                        <span className="text-amber-300 font-bold">
                          {daysToNextMilestone}d away
                        </span>
                      ) : (
                        <span className="text-slate-400">Locked</span>
                      )}
                    </div>
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
                  <div className="text-base font-black font-mono bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-400 bg-clip-text text-transparent drop-shadow-sm mt-0.5">
                    10,000 COINS
                  </div>
                  <div className="text-[10px] font-bold text-cyan-200">
                    Monthly Champion Crown + Shield
                  </div>
                  <div className="text-[9px] font-black text-amber-200 mt-0.5 flex items-center gap-1">
                    <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                    <span>35,800 Total Coins Available</span>
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
          <button
            type="button"
            onClick={handleBack}
            className="w-full min-h-[48px] py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider
                       bg-white/10 hover:bg-white/20 text-white border border-white/15
                       shadow-sm cursor-pointer flex items-center justify-center gap-2
                       focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <ArrowLeft className="w-4 h-4 text-amber-300" />
            <span>Back to Today's Reward</span>
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default DailyStreakModalMobile;


