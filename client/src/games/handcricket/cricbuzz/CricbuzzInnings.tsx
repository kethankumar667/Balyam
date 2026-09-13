import { useState, useEffect, useRef } from "react";
import type { HcBall, HcState, Player } from "@shared/types";
import { HC_MAX_OVERS_PER_BOWLER } from "@shared/types";
import { getSocket } from "../../../lib/socket";
import { resolveTeamProfiles } from "../useHcSquad";
import {
  currentPartnership,
  economy,
  fallOfWickets,
  oversFromBalls,
  strikeRate,
} from "../hc-stats";
import {
  CricbuzzBallChip,
  CricbuzzButton,
  CricbuzzCard,
  CricbuzzChip,
  CricbuzzTabs,
  IconBall,
  IconBat,
  IconFlame,
} from "./cricbuzz-kit";
import { CricbuzzCommentaryFeed } from "./CricbuzzCommentary";
import { CricbuzzInningsScorecardTable } from "./CricbuzzScorecard";
import { HapticsManager } from "../../../services/HapticsManager";
import { TurnTimeWarning, useTurnSecondsLeft } from "../../../components/TurnTimeWarning";

function nameOf(players: Player[], id: string): string {
  return players.find((p) => p.id === id)?.name ?? "Player";
}

export function CricbuzzPowerplayRulesCard() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-4 rounded-xl border border-[#F59E0B]/40 bg-gradient-to-r from-[#FFFBEB] via-[#FEF3C7]/80 to-[#FFFBEB] p-3.5 text-left text-[#92400E] dark:border-[#78350F]/60 dark:from-[#1A160A] dark:via-[#261E0A] dark:to-[#1A160A] dark:text-[#FCD34D] shadow-xs">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded bg-[#F59E0B] px-2 py-0.5 text-[11px] font-black uppercase text-white shadow-xs">
            <IconFlame size={12} /> POWERPLAY & MYSTERY YORKER
          </span>
          <span className="text-[12px] font-extrabold hidden sm:inline">
            Know the rivalry rules before play starts!
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="text-[11px] font-black uppercase tracking-wider text-[#B45309] dark:text-[#FCD34D] hover:underline"
        >
          {expanded ? "Hide Rules ▲" : "View Rules ▼"}
        </button>
      </div>

      <p className="mt-2 text-[12px] font-semibold leading-relaxed">
        ⚡ <strong>Bowlers get 1 secret Mystery Yorker per Powerplay over.</strong> If the batter swings for a boundary (4, 5, or 6) against a Yorker, they are <strong>INSTANTLY CLEAN BOWLED</strong>! Batters must defend with 1, 2, or 3 to dig it out safely.
      </p>

      {expanded && (
        <div className="mt-3 border-t border-[#F59E0B]/30 pt-2.5 space-y-2 text-[11.5px] leading-normal">
          <div className="flex items-start gap-2">
            <span className="font-black text-[#D97706] shrink-0">🏏 Batter Advantage:</span>
            <span>On capped powerplay deliveries, bowlers are restricted to 1–3, leaving the field wide open for big boundaries.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-black text-[#D97706] shrink-0">⚡ Mystery Yorker Weapon:</span>
            <span>Bowlers can arm 1 Yorker per powerplay over (aimed at lines 1, 2, or 3). The batter doesn't know which ball it's coming on!</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-black text-[#D97706] shrink-0">🎯 The Counter Duel:</span>
            <span>
              • <strong>Batter plays 4, 5, 6 vs Yorker:</strong> OUT! Shattered stumps.<br />
              • <strong>Batter defends with 1, 2, 3:</strong> Dug out safely! Runs scored unless bowler matched the exact defensive number.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function CricbuzzPowerplayBanner({
  currentOver,
  totalPowerplayOvers,
  restrictedBalls,
  currentBallInOver,
  isRestrictedBall,
  isBowling,
  isBatting,
  yorkerUsed,
}: {
  currentOver: number;
  totalPowerplayOvers: number;
  restrictedBalls: number[];
  currentBallInOver: number;
  isRestrictedBall: boolean;
  isBowling: boolean;
  isBatting: boolean;
  yorkerUsed: boolean;
}) {
  return (
    <div className="mb-3 rounded-lg border border-[#F59E0B]/50 bg-gradient-to-r from-[#FFFBEB] via-[#FEF3C7] to-[#FFFBEB] p-3 text-left shadow-xs dark:border-[#78350F]/70 dark:from-[#1A160A] dark:via-[#261E0A] dark:to-[#1A160A]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded bg-[#F59E0B] px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-white shadow-xs">
            <IconFlame size={12} /> POWERPLAY
          </span>
          <span className="text-[12px] font-extrabold text-[#92400E] dark:text-[#FCD34D]">
            Over {currentOver} of {totalPowerplayOvers}
          </span>
          {yorkerUsed ? (
            <span className="rounded bg-[#E5E7EB] dark:bg-[#374151] px-1.5 py-0.5 text-[9.5px] font-bold uppercase text-[#6B7280] dark:text-[#9CA3AF]">
              Yorker: Spent
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 rounded bg-[#DC2626] px-1.5 py-0.5 text-[9.5px] font-black uppercase text-white shadow-xs animate-pulse">
              <IconFlame size={10} /> Yorker: Ready
            </span>
          )}
        </div>

        {/* 6-Ball Status Strip */}
        <div className="flex items-center gap-1">
          <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-[#92400E]/80 dark:text-[#FCD34D]/80">
            Over Balls:
          </span>
          {[1, 2, 3, 4, 5, 6].map((b) => {
            const isCapped = restrictedBalls.includes(b);
            const isCurrent = b === currentBallInOver;
            const isDelivered = b < currentBallInOver;

            return (
              <div
                key={b}
                title={
                  isCapped
                    ? `Ball ${b}: Bowler capped at 1–3`
                    : `Ball ${b}: Uncapped (1–6)`
                }
                className={`flex h-6 w-6 items-center justify-center rounded text-[11px] font-black tabular-nums transition-all ${
                  isCurrent
                    ? isCapped
                      ? "border-2 border-[#D97706] bg-[#F59E0B] text-white shadow-sm ring-2 ring-[#F59E0B]/50 scale-105"
                      : "border-2 border-[#009270] bg-[#009270] text-white shadow-sm ring-2 ring-[#009270]/50 scale-105"
                    : isCapped
                    ? "border border-[#F59E0B] bg-[#FDE68A] text-[#92400E] dark:bg-[#78350F]/70 dark:text-[#FDE68A]"
                    : "border border-[#D1D5DB] bg-white text-[#4B5563] dark:border-[#374151] dark:bg-[#1F2937] dark:text-[#9CA3AF]"
                } ${isDelivered ? "opacity-45" : ""}`}
              >
                {b}
              </div>
            );
          })}
        </div>
      </div>

      {/* Role-Specific Strategy Advice */}
      <div className="mt-2 flex flex-col gap-1 border-t border-[#F59E0B]/25 pt-1.5 text-[11.5px] font-bold">
        {isBowling ? (
          <div>
            {!yorkerUsed ? (
              <span className="text-[#D97706] dark:text-[#FCD34D] block">
                ⚡ <strong>Mystery Yorker Ready (1 left):</strong> Arm your Yorker to clean-bowl aggressive batters! (If batter plays 4, 5, or 6 ➔ <strong>OUT!</strong>)
              </span>
            ) : (
              <span className="text-[#6B7280] dark:text-[#9CA3AF] block">
                ✓ Mystery Yorker used for Over {currentOver}.
              </span>
            )}
            {isRestrictedBall ? (
              <span className="text-[#B45309] dark:text-[#FDE68A] block mt-0.5">
                ⚡ <strong>Delivery {currentBallInOver} is Capped:</strong> Bowler restricted to <strong>1, 2, or 3</strong>.
              </span>
            ) : (
              <span className="text-[#047857] dark:text-[#34D399] block mt-0.5">
                🎯 <strong>Delivery {currentBallInOver} is Uncapped:</strong> Full bowling range (1–6) available.
              </span>
            )}
          </div>
        ) : isBatting ? (
          <div>
            {!yorkerUsed ? (
              <span className="text-[#DC2626] dark:text-[#F87171] block">
                ⚠️ <strong>Mystery Yorker Threat:</strong> Bowler has 1 lethal Yorker! If you hit 4, 5, or 6 vs a Yorker ➔ <strong>CLEAN BOWLED</strong>! Defend with 1, 2, or 3 to dig it out safely.
              </span>
            ) : (
              <span className="text-[#047857] dark:text-[#34D399] block">
                ✓ Bowler spent their Mystery Yorker! {isRestrictedBall ? "Capped ball: your 4, 5, 6 is 100% safe!" : "Normal delivery (1-6)."}
              </span>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function CricbuzzDeliveryReveal({
  reveal,
  isBatting,
  myPick,
  oppLockedIn,
  oppName,
}: {
  reveal: HcBall | null;
  isBatting: boolean;
  myPick: number | null;
  oppLockedIn: boolean;
  oppName: string;
}) {
  if (reveal) {
    const myNum = isBatting ? reveal.batterPick : reveal.bowlerPick;
    const oppNum = isBatting ? reveal.bowlerPick : reveal.batterPick;
    const isWicket = reveal.wicket;
    const runs = reveal.runs;

    let bannerStyle = "bg-[#E8F5E9] border-[#009270]/40 text-[#00796B] dark:bg-[#10261E] dark:text-[#00B38A]";
    let headline = `${runs} RUN${runs === 1 ? "" : "S"}`;

    if (reveal.isYorker) {
      if (reveal.yorkerDismissal) {
        bannerStyle = "bg-[#7F1D1D] border-[#EF4444] text-white dark:bg-[#450A0A] dark:text-[#FCA5A5]";
        headline = isBatting
          ? "💥 CLEAN BOWLED! SUNK BY MYSTERY YORKER!"
          : "⚡ WICKET! MYSTERY YORKER SHATTERS STUMPS!";
      } else if (reveal.wicket) {
        bannerStyle = "bg-[#FEE2E2] border-[#EF4444]/40 text-[#DC2626] dark:bg-[#450A0A] dark:text-[#F87171]";
        headline = isBatting ? "OUT! BOWLED BY YORKER" : "⚡ WICKET! YORKER BREACHES DEFENSE";
      } else {
        bannerStyle = "bg-[#ECFDF5] border-[#10B981]/50 text-[#047857] dark:bg-[#064E3B] dark:text-[#A7F3D0]";
        headline = `🛡️ YORKER DUG OUT! · ${runs} RUN${runs === 1 ? "" : "S"}`;
      }
    } else if (isWicket) {
      bannerStyle = "bg-[#FEE2E2] border-[#EF4444]/40 text-[#DC2626] dark:bg-[#450A0A] dark:text-[#F87171]";
      headline = isBatting ? "OUT! WICKET DOWN" : "WICKET! BOWLED OUT";
    } else if (reveal.isBoundary) {
      if (runs === 6) {
        bannerStyle = "bg-[#FFEDD5] border-[#F97316]/40 text-[#EA580C] dark:bg-[#431407] dark:text-[#FB923C]";
        headline = "MAXIMUM! 6 RUNS";
      } else {
        bannerStyle = "bg-[#DBEAFE] border-[#3B82F6]/40 text-[#2563EB] dark:bg-[#172554] dark:text-[#60A5FA]";
        headline = "FOUR! BOUNDARY";
      }
    } else if (runs === 0) {
      bannerStyle = "bg-[#F3F4F6] border-[#D1D5DB] text-[#4B5563] dark:bg-[#1F2937] dark:text-[#9CA3AF]";
      headline = "DOT BALL · 0 RUNS";
    }

    return (
      <div className={`mb-3 rounded-xl border p-2.5 text-center transition-all ${bannerStyle}`}>
        <div className="flex items-center justify-center gap-5 mb-1">
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
              YOU ({isBatting ? "Shot" : "Ball"})
            </span>
            <span className="font-mono text-[22px] font-black">{myNum}</span>
          </div>
          <span className="text-[12px] font-black opacity-60">VS</span>
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 max-w-[100px] truncate">
              {oppName} ({isBatting ? "Ball" : "Shot"})
            </span>
            <span className="font-mono text-[22px] font-black">{oppNum}</span>
          </div>
        </div>
        <div className="text-[13px] font-black uppercase tracking-wider">
          {headline}
        </div>
      </div>
    );
  }

  // Pre-delivery face-off status (when someone has locked in)
  if (myPick != null || oppLockedIn) {
    return (
      <div className="mb-3 flex items-center justify-between rounded-lg border border-[#E3E6E8] bg-[#F5F7F8] px-3 py-2 text-[12px] dark:border-[#2C3533] dark:bg-[#151B19]">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[#222222] dark:text-white">You:</span>
          {myPick != null ? (
            <span className="font-mono font-bold text-[#009270] dark:text-[#00B38A]">
              Picked ({myPick}) ✓
            </span>
          ) : (
            <span className="text-[#888888]">Selecting…</span>
          )}
        </div>
        <span className="text-[10px] font-bold uppercase text-[#999999]">VS</span>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[#222222] dark:text-white">{oppName}:</span>
          {oppLockedIn ? (
            <span className="font-bold text-[#009270] dark:text-[#00B38A]">Ready ✓</span>
          ) : (
            <span className="animate-pulse text-[#888888]">Thinking…</span>
          )}
        </div>
      </div>
    );
  }

  return null;
}

export function CricbuzzInnings({
  state,
  selfId,
  players,
  compact = false,
  registerCardRef,
}: {
  state: HcState;
  selfId: string;
  players: Player[];
  compact?: boolean;
  registerCardRef?: (playerId: string) => (el: HTMLElement | null) => void;
}) {
  const [mobileTab, setMobileTab] = useState<"live" | "scorecard" | "commentary">("live");

  const innings = state.phase === "innings1" ? state.innings1 : state.innings2;

  // Delivery Reveal State (1.8s duration)
  const [reveal, setReveal] = useState<HcBall | null>(null);
  const lastBallCount = useRef(innings?.history.length ?? 0);
  useEffect(() => {
    if (!innings) return;
    if (innings.history.length > lastBallCount.current) {
      const last = innings.history[innings.history.length - 1];
      setReveal(last);
      lastBallCount.current = innings.history.length;
      const t = setTimeout(() => setReveal(null), 1800);
      return () => clearTimeout(t);
    }
    lastBallCount.current = innings.history.length;
  }, [innings?.history.length]);

  if (!innings) return null;

  const isBatting = innings.battingPlayerId === selfId;
  const isBowling = innings.bowlingPlayerId === selfId;
  const battingProfiles = resolveTeamProfiles(state, innings.battingPlayerId);
  const bowlingProfiles = resolveTeamProfiles(state, innings.bowlingPlayerId);
  const battingXiIds = state.teamSelections[innings.battingPlayerId]?.squadPlayerIds ?? [];
  const bowlingXiIds = state.teamSelections[innings.bowlingPlayerId]?.squadPlayerIds ?? [];

  const strikerId = battingXiIds[innings.strikerIdx];
  const nonStrikerId = battingXiIds[innings.nonStrikerIdx];
  const strikerName = strikerId ? battingProfiles.get(strikerId)?.name ?? "Batter" : "—";
  const nonStrikerName = nonStrikerId ? battingProfiles.get(nonStrikerId)?.name ?? "Batter" : "—";
  const strikerStats = strikerId ? innings.batterStats[strikerId] : undefined;
  const nonStrikerStats = nonStrikerId ? innings.batterStats[nonStrikerId] : undefined;

  const bowlerId = innings.currentBowlerId;
  const bowlerName = bowlerId ? bowlingProfiles.get(bowlerId)?.name ?? "Bowler" : "—";
  const bowlerStats = bowlerId ? innings.bowlerStats[bowlerId] : undefined;

  const target = state.phase === "innings2" && state.innings1 ? state.innings1.runs + 1 : null;
  const needRuns = target != null ? Math.max(0, target - innings.runs) : null;
  const ballsLeft = innings.overs * 6 - innings.balls;
  const currentOver = Math.floor(innings.balls / 6) + 1;
  const currentBallInOver = (innings.balls % 6) + 1;
  const isPowerplayOver = currentOver <= innings.powerplayOvers;
  const restrictedThisOver = innings.restrictedBallsByOver[currentOver] ?? [];
  const isRestrictedBall = restrictedThisOver.includes(currentBallInOver);
  const bowlerRestricted = isBowling && isRestrictedBall;
  const yorkerUsedThisOver = Boolean(innings.yorkerUsedByOver?.[currentOver]);
  const canBowlYorker = isBowling && isPowerplayOver && !yorkerUsedThisOver;
  const [isYorkerToggled, setIsYorkerToggled] = useState(false);
  const partnership = currentPartnership(innings);
  const recent = innings.history.slice(-12);

  // Turn inputs
  const myPick = state.pendingPicks[selfId];
  const oppId = state.playerOrder.find((id) => id !== selfId) ?? "";
  const oppLockedIn = state.pendingPicks[oppId] != null;
  const oppName = nameOf(players, oppId);

  useEffect(() => {
    if (myPick != null || yorkerUsedThisOver) {
      setIsYorkerToggled(false);
    }
  }, [myPick, yorkerUsedThisOver, currentOver]);

  // Current Run Rate (CRR) & Required Run Rate (RRR)
  const crr = innings.balls > 0 ? (innings.runs / (innings.balls / 6)).toFixed(2) : "0.00";
  const rrr =
    target != null && ballsLeft > 0 ? (needRuns! / (ballsLeft / 6)).toFixed(2) : null;

  function pickNumber(n: number, isYorker: boolean = false) {
    if (bowlerRestricted && n > 3) return;
    if (isYorker && n > 3) return;
    HapticsManager.trigger("subtle");
    getSocket().emit("game:move", {
      type: "pick",
      data: { pick: n, isYorker: isYorker || undefined },
    });
  }

  function pickBowler(playerId: string) {
    HapticsManager.trigger("subtle");
    getSocket().emit("game:move", { type: "selectBowler", data: { playerId } });
  }

  function pickNextBatter(profileId: string) {
    HapticsManager.trigger("subtle");
    getSocket().emit("game:move", { type: "selectNextBatter", data: { profileId } });
  }

  const activeInnings = innings;

  /* ── Interactive Play Area ─────────────────────────────────────────────── */
  function renderActionPanel() {
    if (activeInnings.currentBowlerId == null) {
      if (!isBowling) {
        const bowlingOppName = nameOf(players, activeInnings.bowlingPlayerId);
        return (
          <CricbuzzCard className="p-4 border-l-4 border-l-[#035A46] text-center">
            <span className="font-bold text-[13px] uppercase tracking-wider text-[#035A46] dark:text-[#A7F3D0] block mb-1">
              Over {currentOver}
            </span>
            <p className="text-[13px] text-[#555555] dark:text-[#A0A5A8]">
              {bowlingOppName} is choosing their bowler for Over {currentOver}…
            </p>
          </CricbuzzCard>
        );
      }

      const cap = HC_MAX_OVERS_PER_BOWLER[state.options.format] ?? 2;
      const bowlerCandidates = bowlingXiIds.filter((id) => {
        const p = bowlingProfiles.get(id);
        return p?.role === "bowler" || p?.role === "allrounder";
      });
      const displayBowlerIds = bowlerCandidates.length > 0 ? bowlerCandidates : bowlingXiIds;

      return (
        <CricbuzzCard className="p-4 border-l-4 border-l-[#009270]">
          <h3 className="font-bold text-[14px] uppercase tracking-wider text-[#222222] dark:text-white mb-2">
            Select Next Bowler
          </h3>
          <p className="text-[12px] text-[#666666] dark:text-[#A0A5A8] mb-3">
            Choose a bowler for Over {currentOver}. (Max {cap} overs per bowler, cannot bowl back-to-back overs).
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {displayBowlerIds.map((id) => {
              const p = bowlingProfiles.get(id);
              const s = activeInnings.bowlerStats[id];
              const balls = s?.balls ?? 0;
              const oversBowled = Math.floor(balls / 6);
              const isOverCap = oversBowled >= cap;
              const isLastBowler = id === activeInnings.lastBowlerId;
              const disabled = isOverCap || isLastBowler;

              return (
                <button
                  key={id}
                  type="button"
                  disabled={disabled}
                  onClick={() => pickBowler(id)}
                  className={`flex flex-col items-start p-2 rounded-md border text-left transition ${
                    disabled
                      ? "opacity-40 border-[#E3E6E8] bg-[#F5F7F8] dark:bg-[#151B19] cursor-not-allowed"
                      : "border-[#009270] bg-[#E8F5E9] hover:bg-[#009270] hover:text-white text-[#00796B] dark:bg-[#10261E] dark:text-[#00B38A] dark:hover:bg-[#009270] dark:hover:text-white"
                  }`}
                >
                  <span className="font-bold text-[13px] truncate w-full">{p?.name ?? "Bowler"}</span>
                  <span className="text-[11px] opacity-80">
                    {oversFromBalls(balls)} ov · {s?.wickets ?? 0}w {p?.role === "allrounder" ? "• AR" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </CricbuzzCard>
      );
    }

    if (activeInnings.needsNextBatterPick) {
      if (!isBatting) {
        const battingOppName = nameOf(players, activeInnings.battingPlayerId);
        return (
          <CricbuzzCard className="p-4 border-l-4 border-l-[#CB0606] text-center">
            <span className="font-bold text-[13px] uppercase tracking-wider text-[#CB0606] block mb-1">
              Wicket Down!
            </span>
            <p className="text-[13px] text-[#555555] dark:text-[#A0A5A8]">
              {battingOppName} is selecting their next batter to take guard…
            </p>
          </CricbuzzCard>
        );
      }

      // Find remaining batters who have not batted
      const unbattedIds = battingXiIds.filter((id) => !activeInnings.batterStats[id]?.isOut && id !== strikerId && id !== nonStrikerId);

      return (
        <CricbuzzCard className="p-4 border-l-4 border-l-[#CB0606]">
          <h3 className="font-bold text-[14px] uppercase tracking-wider text-[#CB0606] mb-2">
            Wicket Down! Select Next Batter
          </h3>
          <p className="text-[12px] text-[#666666] dark:text-[#A0A5A8] mb-3">
            Choose which batter comes out to the crease next.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {unbattedIds.map((id) => {
              const p = battingProfiles.get(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => pickNextBatter(id)}
                  className="flex flex-col items-start p-2.5 rounded-md border border-[#009270] bg-[#E8F5E9] hover:bg-[#009270] hover:text-white text-[#00796B] transition dark:bg-[#10261E] dark:text-[#00B38A]"
                >
                  <span className="font-bold text-[13px] truncate w-full">{p?.name ?? "Batter"}</span>
                  <span className="text-[10px] uppercase tracking-wider opacity-80">{p?.role}</span>
                </button>
              );
            })}
          </div>
        </CricbuzzCard>
      );
    }

    const secondsLeft = useTurnSecondsLeft(state.turnDeadline);
    const hasDeadline = state.turnDeadline != null;
    const timerTone = secondsLeft <= 2 ? "#CB0606" : secondsLeft <= 5 ? "#E65100" : "#009270";
    const timerProgressPct = Math.min(100, Math.max(0, (secondsLeft / 10) * 100));

    // Normal Delivery Action Pad (1 to 6)
    return (
      <CricbuzzCard className="p-4 bg-white dark:bg-[#1B2220] border-t-2 border-t-[#009270] relative overflow-hidden">
        <TurnTimeWarning deadline={state.turnDeadline} active={myPick == null && (isBatting || isBowling)} chipless />

        {/* 10-Second Countdown Bar at the top of the card */}
        {hasDeadline && myPick == null && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#E3E6E8] dark:bg-[#2C3533] overflow-hidden">
            <div
              className="h-full transition-all duration-300 ease-linear"
              style={{
                width: `${timerProgressPct}%`,
                backgroundColor: timerTone,
              }}
            />
          </div>
        )}

        {/* Dedicated 6-Ball Powerplay Status Strip */}
        {isPowerplayOver && (
          <CricbuzzPowerplayBanner
            currentOver={currentOver}
            totalPowerplayOvers={activeInnings.powerplayOvers}
            restrictedBalls={restrictedThisOver}
            currentBallInOver={currentBallInOver}
            isRestrictedBall={isRestrictedBall}
            isBowling={isBowling}
            isBatting={isBatting}
            yorkerUsed={yorkerUsedThisOver}
          />
        )}

        {/* Delivery Outcome Reveal Face-off */}
        <CricbuzzDeliveryReveal
          reveal={reveal}
          isBatting={isBatting}
          myPick={myPick}
          oppLockedIn={oppLockedIn}
          oppName={oppName}
        />

        {/* Bowler Mystery Yorker Arming Bar */}
        {canBowlYorker && myPick == null && (
          <div className="mb-3 flex items-center justify-between rounded-lg border border-[#F59E0B]/50 bg-gradient-to-r from-[#FEF3C7] via-[#FFFBEB] to-[#FEF3C7] px-3 py-2 dark:from-[#2A200B] dark:via-[#1A160A] dark:to-[#2A200B] dark:border-[#78350F]">
            <div className="flex flex-col">
              <span className="text-[12px] font-black uppercase text-[#92400E] dark:text-[#FCD34D] flex items-center gap-1">
                <IconFlame size={14} className="text-[#D97706]" /> Bowler's Secret Weapon
              </span>
              <span className="text-[10.5px] font-bold text-[#B45309] dark:text-[#FDE68A]">
                1 Mystery Yorker Available (4, 5, 6 = INSTANT OUT!)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsYorkerToggled(!isYorkerToggled)}
              className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 ${
                isYorkerToggled
                  ? "bg-[#DC2626] text-white shadow-md ring-2 ring-[#EF4444]/50 animate-pulse"
                  : "border border-[#D97706] bg-white text-[#92400E] hover:bg-[#FEF3C7] dark:bg-[#1F2937] dark:text-[#FCD34D]"
              }`}
            >
              <IconFlame size={13} /> {isYorkerToggled ? "⚡ YORKER ARMED" : "ARM YORKER"}
            </button>
          </div>
        )}

        {/* Batter Yorker Threat Warning */}
        {isBatting && isPowerplayOver && !yorkerUsedThisOver && myPick == null && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-[#EF4444]/40 bg-[#FEF2F2] p-2.5 text-[11px] font-bold text-[#991B1B] dark:bg-[#2B0E0E] dark:border-[#7F1D1D] dark:text-[#FCA5A5]">
            <IconFlame size={14} className="shrink-0 text-[#EF4444] mt-0.5" />
            <span>
              <strong>Yorker Alert:</strong> Bowler has 1 Mystery Yorker available! If they deliver a Yorker and you hit <strong>4, 5, or 6</strong>, you are <strong>CLEAN BOWLED</strong>! Defend with <strong>1, 2, or 3</strong> to dig it out safely!
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-[13px] uppercase tracking-wider text-[#222222] dark:text-white flex items-center gap-1.5">
              {isBatting ? <IconBat size={16} /> : <IconBall size={16} />}
              {isBatting ? "Your Shot (1-6 Runs)" : isYorkerToggled ? "Deliver Mystery Yorker" : "Your Delivery (1-6 Line/Pace)"}
            </span>
            {bowlerRestricted && !isYorkerToggled && (
              <span className="inline-flex items-center gap-1 rounded-md bg-[#FEF3C7] dark:bg-[#78350F]/40 px-2 py-0.5 text-[11px] font-extrabold uppercase text-[#B45309] dark:text-[#FCD34D] border border-[#F59E0B]/40">
                <span>⚡ Capped Ball: 1–3 Only</span>
              </span>
            )}
            {isYorkerToggled && (
              <span className="inline-flex items-center gap-1 rounded-md bg-[#DC2626] px-2 py-0.5 text-[11px] font-extrabold uppercase text-white shadow-xs animate-pulse">
                <span>⚡ Mystery Yorker: 1–3 Stumps Line</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasDeadline && myPick == null && (
              <span
                className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-mono font-bold tracking-tight shadow-xs transition-colors"
                style={{
                  backgroundColor: `${timerTone}18`,
                  color: timerTone,
                  border: `1px solid ${timerTone}40`,
                }}
              >
                <span>⏱</span>
                <span>{secondsLeft}s</span>
              </span>
            )}
            {myPick != null && (
              <span className="rounded bg-[#E8F5E9] px-2 py-0.5 text-[11px] font-bold text-[#00796B] dark:bg-[#10261E] dark:text-[#4DB6AC]">
                Locked: {myPick}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-6 gap-2">
          {[1, 2, 3, 4, 5, 6].map((n) => {
            const isCapped = (bowlerRestricted || isYorkerToggled) && n > 3;
            const isSelected = myPick === n;
            const isDisabled = myPick != null || isCapped;

            if (isCapped) {
              return (
                <button
                  key={n}
                  type="button"
                  disabled
                  title={
                    isYorkerToggled
                      ? "Mystery Yorker line must be 1, 2, or 3"
                      : "Bowler is restricted to 1, 2, 3 on capped powerplay deliveries"
                  }
                  className="flex h-14 flex-col items-center justify-center rounded-lg border border-dashed border-[#E3E6E8] bg-[#F5F7F8] text-[#999999] opacity-35 cursor-not-allowed dark:bg-[#151B19] dark:border-[#2C3533]"
                >
                  <span className="text-[17px] line-through font-mono">{n}</span>
                  <span className="text-[8px] font-sans font-extrabold uppercase tracking-tight text-[#B45309] dark:text-[#FCD34D]">
                    {isYorkerToggled ? "No Yorker" : "Capped"}
                  </span>
                </button>
              );
            }

            if (isYorkerToggled) {
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => pickNumber(n, true)}
                  disabled={isDisabled}
                  className="flex h-14 flex-col items-center justify-center rounded-lg border-2 border-[#DC2626] bg-[#FEF2F2] text-[#991B1B] hover:bg-[#DC2626] hover:text-white font-mono font-black transition-all active:scale-95 dark:bg-[#380E0E] dark:border-[#EF4444] dark:text-[#FCA5A5] shadow-xs"
                >
                  <span className="text-[20px]">{n}</span>
                  <span className="text-[8px] font-sans font-black uppercase tracking-tight text-[#DC2626] hover:text-white dark:text-[#FCA5A5]">
                    {n === 1 ? "Off Yorker" : n === 2 ? "Mid Yorker" : "Leg Yorker"}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={n}
                type="button"
                onClick={() => pickNumber(n, false)}
                disabled={isDisabled}
                className={`flex h-14 flex-col items-center justify-center rounded-lg border font-mono font-black transition-all active:scale-95 ${
                  isSelected
                    ? "border-[#009270] bg-[#009270] text-white shadow-md"
                    : myPick != null
                    ? "border-[#E3E6E8] bg-[#F5F7F8] text-[#999999] opacity-40 cursor-not-allowed dark:bg-[#151B19] dark:border-[#2C3533]"
                    : "border-[#D0D4D9] bg-white text-[#222222] hover:border-[#009270] hover:bg-[#E8F5E9] dark:bg-[#252F2C] dark:border-[#3A4744] dark:text-white dark:hover:bg-[#10261E]"
                }`}
              >
                <span className="text-[20px]">{n}</span>
                <span className="text-[9px] font-sans font-bold uppercase opacity-80">
                  {n === 4 ? "4s" : n === 6 ? "6s" : "Run"}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between text-[12px] text-[#666666] dark:text-[#A0A5A8]">
          <div className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${oppLockedIn ? "bg-[#009270]" : "animate-ping bg-[#FFC107]"}`} />
            <span>{oppLockedIn ? `${oppName} is ready` : `Waiting for ${oppName}...`}</span>
          </div>
          <span className="font-semibold">{myPick != null ? "Waiting for outcome..." : "Pick your number"}</span>
        </div>
      </CricbuzzCard>
    );
  }

  /* ── Desktop View (Side-by-side) ───────────────────────────────────────── */
  if (!compact) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 7 Columns: Live Scorecard & Action Pad */}
        <div className="lg:col-span-7 space-y-4">
          {/* Cricbuzz Match Centre Top Score Strip */}
          <CricbuzzCard className="p-4 border-t-4 border-t-[#009270]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E3E6E8] pb-3 dark:border-[#2C3533]">
              <div>
                <span className="text-[12px] font-bold uppercase tracking-wider text-[#666666] dark:text-[#A0A5A8] block">
                  {nameOf(players, innings.battingPlayerId)} BATTING
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-black text-[28px] text-[#222222] dark:text-white">
                    {innings.runs}/{innings.wickets}
                  </span>
                  <span className="text-[14px] font-semibold text-[#666666] dark:text-[#A0A5A8]">
                    ({oversFromBalls(innings.balls)} / {innings.overs} Ov)
                  </span>
                </div>
              </div>

              <div className="text-right">
                {target != null ? (
                  <div>
                    <span className="text-[12px] font-bold uppercase tracking-wider text-[#E65100] block">
                      Target: {target}
                    </span>
                    <span className="font-extrabold text-[15px] text-[#222222] dark:text-white">
                      Need {needRuns} off {ballsLeft} balls
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="text-[12px] font-bold uppercase tracking-wider text-[#009270] block">
                      Current Over: {currentOver}
                    </span>
                    <span className="font-semibold text-[13px] text-[#666666] dark:text-[#A0A5A8]">
                      CRR: {crr}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Situation & Partnership Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 text-[12px]">
              <div className="flex items-center gap-2">
                {isPowerplayOver && (
                  <CricbuzzChip tone="amber" size="sm">
                    <IconFlame size={12} /> Powerplay
                  </CricbuzzChip>
                )}
                <span className="font-semibold text-[#444444] dark:text-[#CCCCCC]">
                  Stand: <strong>{partnership.runs}</strong> ({partnership.balls})
                </span>
              </div>
              <div className="text-[#666666] dark:text-[#A0A5A8]">
                CRR: <strong className="text-[#222222] dark:text-white">{crr}</strong>
                {rrr && (
                  <span className="ml-2">
                    RRR: <strong className="text-[#E65100]">{rrr}</strong>
                  </span>
                )}
              </div>
            </div>
          </CricbuzzCard>

          {/* Batters & Bowler Duel Table */}
          <CricbuzzCard className="overflow-hidden">
            <div className="bg-[#035A46] px-4 py-2 text-[12px] font-bold uppercase tracking-wider text-white">
              Live Crease Duel
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[#E3E6E8] bg-[#F5F7F8] font-bold text-[#666666] dark:border-[#2C3533] dark:bg-[#151B19] dark:text-[#A0A5A8]">
                    <th className="py-2 px-3">Batter</th>
                    <th className="py-2 px-2 text-right">R</th>
                    <th className="py-2 px-2 text-right">B</th>
                    <th className="py-2 px-2 text-right">4s</th>
                    <th className="py-2 px-2 text-right">6s</th>
                    <th className="py-2 px-3 text-right">SR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3E6E8] dark:divide-[#2C3533]">
                  {/* Striker */}
                  <tr className="bg-[#E8F5E9]/50 dark:bg-[#10261E]/50 font-semibold">
                    <td className="py-2 px-3 text-[#00796B] dark:text-[#00B38A] flex items-center gap-1.5">
                      <IconBat size={14} />
                      <span>{strikerName} *</span>
                    </td>
                    <td className="py-2 px-2 text-right font-bold">{strikerStats?.runs ?? 0}</td>
                    <td className="py-2 px-2 text-right text-[#666666] dark:text-[#A0A5A8]">{strikerStats?.balls ?? 0}</td>
                    <td className="py-2 px-2 text-right text-[#0066CC]">{strikerStats?.fours ?? 0}</td>
                    <td className="py-2 px-2 text-right text-[#E65100]">{strikerStats?.sixes ?? 0}</td>
                    <td className="py-2 px-3 text-right font-mono text-[12px]">
                      {strikeRate(strikerStats?.runs ?? 0, strikerStats?.balls ?? 0)?.toFixed(1) ?? "—"}
                    </td>
                  </tr>
                  {/* Non-Striker */}
                  <tr>
                    <td className="py-2 px-3 text-[#444444] dark:text-[#CCCCCC]">
                      {nonStrikerName}
                    </td>
                    <td className="py-2 px-2 text-right font-bold">{nonStrikerStats?.runs ?? 0}</td>
                    <td className="py-2 px-2 text-right text-[#666666] dark:text-[#A0A5A8]">{nonStrikerStats?.balls ?? 0}</td>
                    <td className="py-2 px-2 text-right text-[#0066CC]">{nonStrikerStats?.fours ?? 0}</td>
                    <td className="py-2 px-2 text-right text-[#E65100]">{nonStrikerStats?.sixes ?? 0}</td>
                    <td className="py-2 px-3 text-right font-mono text-[12px]">
                      {strikeRate(nonStrikerStats?.runs ?? 0, nonStrikerStats?.balls ?? 0)?.toFixed(1) ?? "—"}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Bowler Row */}
              <div className="border-t border-[#E3E6E8] bg-[#F9FAFB] px-3 py-2 text-[12px] flex items-center justify-between dark:border-[#2C3533] dark:bg-[#151B19]">
                <div className="flex items-center gap-1.5 font-bold text-[#222222] dark:text-white">
                  <IconBall size={14} />
                  <span>Bowler: {bowlerName}</span>
                </div>
                <div className="font-mono text-[#666666] dark:text-[#A0A5A8]">
                  {oversFromBalls(bowlerStats?.balls ?? 0)}-{bowlerStats?.runs ?? 0}-{bowlerStats?.wickets ?? 0} · Eco: {economy(bowlerStats?.runs ?? 0, bowlerStats?.balls ?? 0)?.toFixed(1) ?? "—"}
                </div>
              </div>
            </div>
          </CricbuzzCard>

          {/* Recent Deliveries Strip */}
          <CricbuzzCard className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-[11px] uppercase tracking-wider text-[#666666] dark:text-[#A0A5A8]">
                Recent Deliveries
              </span>
              <span className="font-mono text-[11px] text-[#888888]">Last {recent.length} Balls</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {recent.map((ball, idx) => (
                <CricbuzzBallChip key={idx} value={ball.wicket ? "W" : ball.runs} isWicket={ball.wicket} size="md" />
              ))}
              {recent.length === 0 && (
                <span className="text-[12px] text-[#888888]">Over underway...</span>
              )}
            </div>
          </CricbuzzCard>

          {/* Action Console */}
          {renderActionPanel()}
        </div>

        {/* Right 5 Columns: Commentary Feed & Scorecard */}
        <div className="lg:col-span-5 space-y-4">
          <CricbuzzCard className="p-4 max-h-[600px] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E3E6E8] pb-2 mb-3 dark:border-[#2C3533]">
              <h3 className="font-bold text-[14px] uppercase tracking-wider text-[#222222] dark:text-white">
                Ball-by-Ball Commentary
              </h3>
              <CricbuzzChip tone="green" size="sm">LIVE FEED</CricbuzzChip>
            </div>
            <CricbuzzCommentaryFeed
              innings={innings}
              battingProfiles={battingProfiles}
              bowlingProfiles={bowlingProfiles}
            />
          </CricbuzzCard>
        </div>
      </div>
    );
  }

  /* ── Mobile Layout (Tabs + Sticky Keypad) ───────────────────────────────── */
  const mobileTabs = [
    { id: "live", label: "Live" },
    { id: "scorecard", label: "Scorecard" },
    { id: "commentary", label: "Commentary" },
  ] as const;

  return (
    <div className="space-y-3 pb-24">
      {/* Sticky Mobile Mini-Score Strip */}
      <CricbuzzCard className="p-3 border-t-2 border-t-[#009270]">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <div className="font-extrabold text-[18px] text-[#222222] dark:text-white leading-tight">
                {innings.runs}/{innings.wickets}
                <span className="ml-1 text-[13px] font-semibold text-[#666666] dark:text-[#A0A5A8]">
                  ({oversFromBalls(innings.balls)}/{innings.overs})
                </span>
              </div>
              {isPowerplayOver && (
                <span className="inline-flex items-center gap-0.5 rounded bg-[#FEF3C7] dark:bg-[#78350F]/50 px-1.5 py-0.5 text-[9.5px] font-black uppercase tracking-tight text-[#B45309] dark:text-[#FCD34D] border border-[#F59E0B]/40">
                  <IconFlame size={10} /> PP
                </span>
              )}
            </div>
            <span className="text-[11px] font-bold uppercase text-[#009270]">
              {nameOf(players, innings.battingPlayerId)}
            </span>
          </div>

          <div className="text-right text-[12px]">
            {target != null ? (
              <div>
                <span className="font-extrabold text-[#E65100]">Need {needRuns} in {ballsLeft}</span>
                <span className="block text-[10px] text-[#888888]">RRR: {rrr}</span>
              </div>
            ) : (
              <div>
                <span className="font-bold text-[#333333] dark:text-[#DDDDDD]">CRR: {crr}</span>
                <span className="block text-[10px] text-[#888888]">Over {currentOver}</span>
              </div>
            )}
          </div>
        </div>
      </CricbuzzCard>

      {/* Segmented Mobile Tabs */}
      <CricbuzzTabs
        tabs={mobileTabs}
        activeTab={mobileTab}
        onChange={(t) => setMobileTab(t as typeof mobileTab)}
      />

      {/* Tab 1: Live */}
      {mobileTab === "live" && (
        <div className="space-y-3">
          {/* Batters Mini-Table */}
          <CricbuzzCard className="p-3 space-y-2">
            <div className="flex items-center justify-between text-[13px] font-bold">
              <span className="text-[#00796B] dark:text-[#00B38A]">{strikerName} *</span>
              <span>
                {strikerStats?.runs ?? 0} <span className="text-[11px] font-normal text-[#666666]">({strikerStats?.balls ?? 0})</span>
              </span>
            </div>
            <div className="flex items-center justify-between text-[13px] text-[#555555] dark:text-[#AAAAAA]">
              <span>{nonStrikerName}</span>
              <span>
                {nonStrikerStats?.runs ?? 0} <span className="text-[11px] font-normal text-[#888888]">({nonStrikerStats?.balls ?? 0})</span>
              </span>
            </div>
            <div className="border-t border-[#E3E6E8] pt-2 text-[12px] flex items-center justify-between dark:border-[#2C3533]">
              <span className="font-bold text-[#333333] dark:text-white">Bowler: {bowlerName}</span>
              <span className="font-mono text-[11px] text-[#666666]">
                {oversFromBalls(bowlerStats?.balls ?? 0)}-{bowlerStats?.runs ?? 0}-{bowlerStats?.wickets ?? 0}
              </span>
            </div>
          </CricbuzzCard>

          {/* Recent Balls Strip */}
          <CricbuzzCard className="p-2.5">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[11px] font-bold uppercase text-[#666666] shrink-0 mr-1">
                Recent:
              </span>
              {recent.map((ball, idx) => (
                <CricbuzzBallChip key={idx} value={ball.wicket ? "W" : ball.runs} isWicket={ball.wicket} size="sm" />
              ))}
            </div>
          </CricbuzzCard>

          {/* Action Panel */}
          {renderActionPanel()}
        </div>
      )}

      {/* Tab 2: Scorecard */}
      {mobileTab === "scorecard" && (
        <CricbuzzInningsScorecardTable
          innings={innings}
          state={state}
          players={players}
          teamName={nameOf(players, innings.battingPlayerId)}
        />
      )}

      {/* Tab 3: Commentary */}
      {mobileTab === "commentary" && (
        <CricbuzzCard className="p-4">
          <CricbuzzCommentaryFeed
            innings={innings}
            battingProfiles={battingProfiles}
            bowlingProfiles={bowlingProfiles}
          />
        </CricbuzzCard>
      )}
    </div>
  );
}
