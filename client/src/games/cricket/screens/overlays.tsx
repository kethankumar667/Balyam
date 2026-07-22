import {
  AchievementSticker,
  BallResultStamp,
  CenterOverlay,
  OverStrip,
  StampBadge,
  StickyNote,
} from "../components";
import type { BallOutcome } from "../types";

/**
 * Gameplay callout overlays. Each is presentational and focus-managed via
 * CenterOverlay; the parent (GameplayPage) owns the queue and auto-dismiss.
 * Overlays never block for long and are always dismissible.
 */

export interface PowerplayOverlayProps {
  overs: number;
  onDismiss: () => void;
}

export function PowerplayOverlay({ overs, onDismiss }: PowerplayOverlayProps) {
  return (
    <CenterOverlay onDismiss={onDismiss} labelId="pp-title" className="text-center">
      <p className="text-4xl" aria-hidden>⚡</p>
      <h2 id="pp-title" className="mt-1 font-display text-3xl text-[#C0392B]">Powerplay</h2>
      <p className="mt-1 text-sm font-semibold text-[#6D4323]">Overs 1–{overs}</p>
      <p className="mt-3 text-sm text-[#3A2210]">Safe batting window — swing freely, no wickets can fall!</p>
      <button
        type="button"
        onClick={onDismiss}
        className="mt-5 w-full rounded-2xl bg-[#2E7D32] py-3 font-black text-white active:scale-95"
      >
        Got it!
      </button>
    </CenterOverlay>
  );
}

export interface BallResultOverlayProps {
  outcome: BallOutcome;
  onDismiss: () => void;
}

export function BallResultOverlay({ outcome, onDismiss }: BallResultOverlayProps) {
  return (
    <CenterOverlay onDismiss={onDismiss} labelId="ball-title" className="text-center">
      <h2 id="ball-title" className="sr-only">Ball result</h2>
      <BallResultStamp outcome={outcome} className="ck-anim-stamp" />
    </CenterOverlay>
  );
}

export interface WicketScreenProps {
  batterName: string;
  runs: number;
  balls: number;
  onDismiss: () => void;
}

export function WicketScreen({ batterName, runs, balls, onDismiss }: WicketScreenProps) {
  return (
    <CenterOverlay onDismiss={onDismiss} labelId="wkt-title" className="text-center">
      <StampBadge label="Wicket" tone="red" className="ck-anim-stamp" />
      <h2 id="wkt-title" className="mt-3 font-display text-4xl text-[#C0392B]">OUT!</h2>
      <p className="mt-2 text-lg font-black text-[#3A2210]">{batterName}</p>
      <p className="text-sm text-[#6D4323]/80">
        {runs} {runs === 1 ? "run" : "runs"} · {balls} {balls === 1 ? "ball" : "balls"}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className="mt-5 w-full rounded-2xl bg-[#C0392B] py-3 font-black text-white active:scale-95"
      >
        Continue
      </button>
    </CenterOverlay>
  );
}

export interface MilestoneOverlayProps {
  batterName: string;
  milestone: 50 | 100;
  onDismiss: () => void;
}

export function MilestoneOverlay({ batterName, milestone, onDismiss }: MilestoneOverlayProps) {
  return (
    <CenterOverlay onDismiss={onDismiss} labelId="ms-title" className="text-center">
      <StampBadge label={milestone === 100 ? "Century" : "Half Century"} tone="gold" className="ck-anim-stamp" />
      <h2 id="ms-title" className="mt-3 font-display text-6xl text-[#9A6E1A]">{milestone}</h2>
      <div className="mt-3 flex justify-center">
        <StickyNote tone="amber" rotate={-2}>
          <p className="text-sm font-bold text-[#6D4323]">
            {batterName} brings up a {milestone === 100 ? "hundred" : "fifty"}!
          </p>
        </StickyNote>
      </div>
    </CenterOverlay>
  );
}

export interface AchievementOverlayProps {
  title: string;
  description: string;
  onDismiss: () => void;
}

export function AchievementOverlay({ title, description, onDismiss }: AchievementOverlayProps) {
  return (
    <CenterOverlay onDismiss={onDismiss} labelId="ach-title" className="text-center">
      <h2 id="ach-title" className="mb-2 text-[11px] font-bold uppercase tracking-[0.25em] text-[#9A6E1A]">Achievement unlocked</h2>
      <AchievementSticker title={title} description={description} glyph="💥" className="ck-anim-stamp" />
      <button
        type="button"
        onClick={onDismiss}
        className="mt-4 w-full rounded-2xl bg-[#2E7D32] py-3 font-black text-white active:scale-95"
      >
        Nice!
      </button>
    </CenterOverlay>
  );
}

export interface OverSummaryOverlayProps {
  over: number;
  balls: BallOutcome[];
  runsInOver: number;
  scoreLine: string;
  onDismiss: () => void;
}

export function OverSummaryOverlay({ over, balls, runsInOver, scoreLine, onDismiss }: OverSummaryOverlayProps) {
  return (
    <CenterOverlay onDismiss={onDismiss} labelId="os-title" className="text-center">
      <h2 id="os-title" className="font-display text-3xl text-[#3A2210]">Over {over}</h2>
      <div className="mt-3 flex justify-center">
        <OverStrip balls={balls} />
      </div>
      <p className="mt-4 font-display text-2xl text-[#2E7D32]">{runsInOver} {runsInOver === 1 ? "run" : "runs"} this over</p>
      <p className="mt-1 text-sm font-semibold text-[#6D4323]">{scoreLine}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="mt-5 w-full rounded-2xl bg-[#2E7D32] py-3 font-black text-white active:scale-95"
      >
        Continue
      </button>
    </CenterOverlay>
  );
}
