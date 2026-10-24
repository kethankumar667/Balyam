import type { Card, CoachHint, Rank } from "@shared/types";
import { HintAnalysis, KIND_ICON } from "../../components/CoachHintButton";
import { hasPlan, type HintPlan } from "./hintPlan";
import { classifyMeld } from "./meldCheck";

/**
 * The coach's answer, shown over the Rummy table for the player to read and, if they want, approve.
 *
 * Both boards (phone and desktop) use this one banner and differ only in size, so the advice reads the same
 * on either. Nothing here touches the hand: approving is a button the player presses, and the board does the
 * rearranging. A hint is the coach's reasoning too ("Why this move"), folded away until asked for.
 */

interface Props {
  hint: CoachHint | null;
  /** The coach is working out its answer. */
  loading: boolean;
  error: string | null;
  /** What approving would do; null until there is a hint. */
  plan: HintPlan | null;
  wildRank: Rank;
  /** Phone sizing: tighter padding and type. */
  compact: boolean;
  onApprove: () => void;
  onDismiss: () => void;
}

const SUIT_MARK: Record<string, string> = { S: "♠", H: "♥", D: "♦", C: "♣" };

function cardText(card: Card): string {
  if (card.isPrintedJoker) return "🃏";
  return `${card.rank === "T" ? "10" : card.rank}${SUIT_MARK[card.suit] ?? card.suit}`;
}

function Chip({ tone, label, cards, compact }: { tone: "good" | "partial" | "new" | "discard"; label: string; cards: string; compact: boolean }) {
  const palette = {
    good: { bg: "rgba(16,185,129,0.22)", border: "#10b981", text: "#a7f3d0", label: "#34d399" },
    partial: { bg: "rgba(245,158,11,0.22)", border: "#f59e0b", text: "#fef08a", label: "#fcd34d" },
    new: { bg: "rgba(56,189,248,0.18)", border: "#38bdf8", text: "#bae6fd", label: "#7dd3fc" },
    discard: { bg: "rgba(244,63,94,0.18)", border: "#f43f5e", text: "#fecdd3", label: "#fb7185" },
  }[tone];
  return (
    <div
      className={`rounded-lg font-bold flex items-center flex-wrap ${compact ? "px-2 py-1 gap-1.5 text-[11px]" : "px-2.5 py-1 gap-2 text-xs"}`}
      style={{ background: palette.bg, border: `1px solid ${palette.border}`, color: palette.text }}
    >
      <span className={`font-extrabold uppercase tracking-wide ${compact ? "text-[10px]" : "text-xs"}`} style={{ color: palette.label }}>
        {label}
      </span>
      <span className="font-mono tracking-wider text-white font-black text-xs">{cards}</span>
    </div>
  );
}

export default function RummyHintBanner({ hint, loading, error, plan, wildRank, compact, onApprove, onDismiss }: Props) {
  if (!hint && !loading && !error) return null;

  const shellSize = compact ? "bottom-16 w-[94%] max-w-sm p-3 gap-2" : "bottom-24 w-[90%] max-w-md p-4 gap-3";
  const canApply = Boolean(plan && hasPlan(plan));

  return (
    <section
      aria-label="Coach hint"
      aria-live="polite"
      className={`fixed left-1/2 -translate-x-1/2 z-[50] max-h-[75dvh] overflow-y-auto rounded-2xl flex flex-col shadow-2xl [&>*]:shrink-0 ${shellSize}`}
      style={{
        background: "linear-gradient(145deg, #1e1b18 0%, #2d261e 100%)",
        border: "2px solid #f59e0b",
        boxShadow: "0 10px 30px rgba(0,0,0,0.85), 0 0 20px rgba(245,158,11,0.35)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-1.5 font-black text-amber-400 uppercase tracking-wider ${compact ? "text-[11px]" : "text-xs"}`}>
          <span aria-hidden>{hint ? (KIND_ICON[hint.kind] ?? "💡") : "💡"}</span>
          <span>{loading ? "Coach is thinking" : error ? "Coach" : "Coach says"}</span>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Close hint"
          className="min-h-[44px] min-w-[44px] -my-2 -mr-2 text-white/60 hover:text-white text-sm cursor-pointer"
        >
          ✕
        </button>
      </div>

      {loading && <p className="text-xs text-white/70">Counting the cards still in play…</p>}
      {error && !loading && <p className="text-xs text-rose-200">{error}</p>}

      {hint && !loading && (
        <>
          <div>
            <p className={`font-extrabold text-white ${compact ? "text-sm" : "text-base"}`}>{hint.headline}</p>
            <p className={`mt-0.5 text-white/80 ${compact ? "text-xs" : "text-sm"}`}>{hint.detail}</p>
          </div>

          {plan && !plan.stale && (plan.groups.length > 0 || plan.openPickup || plan.discard) && (
            <div className="flex items-center flex-wrap gap-1.5">
              {plan.groups.map((group) => {
                const classification = classifyMeld(group, wildRank);
                const name = classification.valid ? classification.label.replace(/\s*✓\s*$/, "") : `${group.length} Cards`;
                return (
                  <Chip
                    key={group.map((c) => c.id).join("+")}
                    tone={classification.counts ? "good" : "partial"}
                    label={`${classification.counts ? "✓ " : "• "}${name}:`}
                    cards={group.map(cardText).join(" ")}
                    compact={compact}
                  />
                );
              })}
              {plan.openPickup && <Chip tone="new" label="🆕 Just drawn (kept separate):" cards={cardText(plan.openPickup)} compact={compact} />}
              {plan.discard && <Chip tone="discard" label="🗑 Throw:" cards={cardText(plan.discard)} compact={compact} />}
            </div>
          )}

          {plan?.pickupInGroup && (
            <p className="text-[11px] text-sky-200">The card you just took from the open pile is part of these groups.</p>
          )}

          {hint.analysis && <HintAnalysis analysis={hint.analysis} tone="dark" />}

          <div className="flex items-center gap-2 pt-1">
            {canApply && (
              <button
                type="button"
                onClick={onApprove}
                className={`flex-1 min-h-[44px] rounded-xl font-black uppercase tracking-wider transition active:scale-[0.98] cursor-pointer ${compact ? "text-[11px]" : "text-xs"}`}
                style={{
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  color: "#ffffff",
                  border: "1px solid #34d399",
                  boxShadow: "0 4px 14px rgba(16,185,129,0.45)",
                }}
              >
                ✓ Approve & Rearrange
              </button>
            )}
            <button
              type="button"
              onClick={onDismiss}
              className={`min-h-[44px] px-4 rounded-xl font-extrabold uppercase tracking-wider text-white/80 hover:text-white cursor-pointer ${compact ? "text-[11px]" : "text-xs"} ${canApply ? "" : "flex-1"}`}
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
            >
              {canApply ? "Cancel" : "Got it"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
