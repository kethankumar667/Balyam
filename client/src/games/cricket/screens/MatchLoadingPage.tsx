import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "../../../lib/cn";
import { GamePageShell, NotebookSurface, PremiumCard, SketchAccent, TeamFlagCard } from "../components";
import { FUN_FACTS } from "../content";
import { getTeamRef } from "../data";
import { useCricketStore } from "../store";
import { usePrefersReducedMotion } from "../usePrefersReducedMotion";

/**
 * Match Loading — the opening screen. Both team flags, a hand-drawn stadium
 * sketch, a "Sharpening the pencils" progress line with a bouncing ball, and a
 * fun fact. Auto-advances to Team Selection when progress completes. Progress
 * is announced to screen readers and never relies on animation alone.
 */
export function MatchLoadingPage() {
  const navigate = useNavigate();
  const reduced = usePrefersReducedMotion();
  const homeTeamId = useCricketStore((s) => s.homeTeamId);
  const awayTeamId = useCricketStore((s) => s.awayTeamId);
  const loadingProgress = useCricketStore((s) => s.loadingProgress);
  const setLoadingProgress = useCricketStore((s) => s.setLoadingProgress);

  const [fact] = useState(() => FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)]);
  const doneRef = useRef(false);

  useEffect(() => {
    setLoadingProgress(0);
    const start = Date.now();
    const total = 2400;
    const timer = window.setInterval(() => {
      const pct = Math.min(100, Math.round(((Date.now() - start) / total) * 100));
      setLoadingProgress(pct);
      if (pct >= 100) window.clearInterval(timer);
    }, 90);
    return () => window.clearInterval(timer);
  }, [setLoadingProgress]);

  useEffect(() => {
    if (loadingProgress >= 100 && !doneRef.current) {
      doneRef.current = true;
      const t = window.setTimeout(() => navigate("/cricket/team-selection"), 400);
      return () => window.clearTimeout(t);
    }
  }, [loadingProgress, navigate]);

  const home = getTeamRef(homeTeamId);
  const away = getTeamRef(awayTeamId);

  return (
    <GamePageShell contentClassName="justify-center">
      <NotebookSurface withSpiral className="px-5 py-6">
        <div className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#9A6E1A]">Bhalyam Cricket</p>
          <h1 className="font-display text-3xl text-[#3A2210]">Match Loading</h1>
        </div>

        <div className="mt-5 flex items-center justify-center gap-4">
          <TeamFlagCard team={home} size="md" />
          <span className="font-display text-2xl text-[#9A6E1A]">vs</span>
          <TeamFlagCard team={away} size="md" />
        </div>

        <div className="relative mt-6 flex justify-center text-[#6D4323]/45" aria-hidden>
          <SketchAccent name="stadium" className="h-16 w-40" />
        </div>

        <div className="mt-4" role="status" aria-live="polite">
          <div className="flex items-center justify-between text-sm font-semibold text-[#6D4323]">
            <span className="flex items-center gap-2">
              <span className={cn("inline-block h-3 w-3 rounded-full bg-[#C0392B]", !reduced && "ck-anim-bounce")} aria-hidden />
              Sharpening the pencils…
            </span>
            <span className="tabular-nums">{loadingProgress}%</span>
          </div>
          <div
            className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[#E4D3AC]"
            role="progressbar"
            aria-valuenow={loadingProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Match loading progress"
          >
            <div className="h-full rounded-full bg-[#2E7D32] transition-[width] duration-150 ease-out" style={{ width: `${loadingProgress}%` }} />
          </div>
        </div>

        <PremiumCard className="mt-5 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#9A6E1A]">Fun fact</p>
          <p className="mt-0.5 text-sm text-[#3A2210]">{fact.text}</p>
        </PremiumCard>
      </NotebookSurface>
    </GamePageShell>
  );
}

export default MatchLoadingPage;
