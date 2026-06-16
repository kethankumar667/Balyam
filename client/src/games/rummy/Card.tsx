import type { CSSProperties, ElementType, KeyboardEvent as ReactKeyboardEvent } from "react";
import type { Card as CardType, Rank } from "@shared/types";

const SUIT_GLYPHS: Record<string, string> = { S: "♠", H: "♥", D: "♦", C: "♣" };

export function PlayingCard({
  card,
  isWildJoker = false,
  selected = false,
  dimmed = false,
  onClick,
  small = false,
  draggable,
}: {
  card: CardType;
  isWildJoker?: boolean;
  selected?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
  small?: boolean;
  // When set, the rendered element advertises itself as a drag source so HTML5
  // drag fires even though the card is a <button>. Without this, mousedown is
  // captured by the button and never bubbles up to a draggable wrapper.
  draggable?: boolean;
}) {
  const red = card.suit === "H" || card.suit === "D";
  const sizeCls = small ? "w-9 h-[3.25rem]" : "w-10 h-14 sm:w-12 sm:h-16";
  const rankSize = small ? "text-[13px]" : "text-xs sm:text-sm";
  const suitCornerSize = small ? "text-[11px]" : "text-[10px] sm:text-xs";
  const centerSize = small ? "text-2xl" : "text-xl sm:text-2xl";
  // Face cards (J/Q/K/A) get a special "premium" treatment — large stylized
  // letter in the center over a suit-symbol watermark, plus a gold-trim frame.
  // Avoids the OS-dependent Unicode emoji approach which renders poorly.
  const isFace =
    !card.isPrintedJoker &&
    (card.rank === "J" ||
      card.rank === "Q" ||
      card.rank === "K" ||
      card.rank === "A");
  const faceLetterSize = small ? "text-3xl" : "text-3xl sm:text-4xl";
  // Tag selection:
  //   - Draggable cards always render as <div role="button"> — mobile Safari
  //     and older Android Chrome silently ignore draggable=true on <button>,
  //     so the drag-drop-touch polyfill's _closestDraggable walk-up fails. A
  //     div sidesteps that quirk and still gets keyboard activation below.
  //   - Non-draggable clickable cards stay <button> for the implicit a11y.
  //   - Cards with no onClick (face-up pile previews etc.) stay <div> so they
  //     can sit safely inside an outer <button> without invalid nested-button
  //     HTML.
  const Tag: ElementType = draggable ? "div" : onClick ? "button" : "div";
  const ariaProps = draggable && onClick
    ? {
        role: "button" as const,
        tabIndex: 0,
        onKeyDown: (e: ReactKeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        },
        onClick,
      }
    : onClick && !draggable
    ? { onClick, disabled: false }
    : {};
  // Mobile only: stop the browser treating the touch as a scroll/pan gesture
  // before the polyfill can recognise it as a drag. Without this the user has
  // to long-press to start a drag on iOS.
  const touchActionStyle: CSSProperties = draggable
    ? { touchAction: "none" }
    : {};

  // Printed jokers render distinctly — no rank/suit, just a "JOKER" pattern
  // so the player can spot them at a glance.
  if (card.isPrintedJoker) {
    return (
      <Tag
        draggable={draggable}
        {...ariaProps}
        className={`rummy-playing-card relative ${sizeCls} rounded-lg flex-shrink-0 transition transform select-none overflow-hidden
          ${selected ? "-translate-y-3 ring-2 ring-amber-400 shadow-2xl" : "shadow-md"}
          ${dimmed ? "opacity-50" : ""}
          ${onClick ? "hover:-translate-y-1 cursor-pointer" : "cursor-default"}`}
        style={{
          ...touchActionStyle,
          background:
            "linear-gradient(135deg, #7c3aed 0%, #5b21b6 50%, #4c1d95 100%)",
          border: "1.5px solid #fbbf24",
          boxShadow: selected
            ? "0 12px 24px rgba(245,158,11,0.45), 0 2px 4px rgba(0,0,0,0.2)"
            : "0 2px 4px rgba(0,0,0,0.25)",
        }}
        title="Printed Joker"
      >
        {/* Big "J" backdrop */}
        <span
          className="absolute inset-0 flex items-center justify-center font-extrabold text-3xl sm:text-4xl"
          style={{ color: "rgba(251,191,36,0.18)" }}
          aria-hidden
        >
          J
        </span>
        {/* "JOKER" label down the card */}
        <span
          className="absolute inset-0 flex items-center justify-center font-extrabold tracking-widest text-[8px] sm:text-[9px]"
          style={{ color: "#fef3c7", textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
        >
          JOKER
        </span>
      </Tag>
    );
  }

  return (
    <Tag
      draggable={draggable}
      {...ariaProps}
      className={`rummy-playing-card relative ${sizeCls} rounded-lg flex-shrink-0 transition transform select-none overflow-hidden
        ${selected ? "-translate-y-3 ring-2 ring-amber-400 shadow-2xl" : "shadow-md"}
        ${dimmed ? "opacity-50" : ""}
        ${onClick ? "hover:-translate-y-1 cursor-pointer" : "cursor-default"}`}
      style={{
        ...touchActionStyle,
        // Face cards (J/Q/K) get a warmer cream gradient + gold border so they
        // read as "premium" at a glance, distinct from numerics.
        background: isFace
          ? "linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%)"
          : "linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)",
        border: isFace ? "1px solid #d4a574" : "1px solid #cbd5e1",
        boxShadow: selected
          ? "0 12px 24px rgba(245,158,11,0.45), 0 2px 4px rgba(0,0,0,0.2)"
          : isFace
          ? "0 4px 8px rgba(0,0,0,0.28), inset 0 0 0 1px rgba(212,165,116,0.4), inset -5px -6px 0 rgba(120,53,15,0.08)"
          : "0 4px 8px rgba(0,0,0,0.28), inset -5px -6px 0 rgba(15,23,42,0.06)",
      }}
    >
      <div
        className="absolute inset-x-1 top-1 h-5 rounded-full opacity-50"
        style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0))" }}
        aria-hidden
      />
      {/* Top-left corner rank + suit */}
      <div
        className={`absolute top-0.5 left-1 leading-none font-extrabold ${rankSize}`}
        style={{ color: red ? "#dc2626" : "#0f172a" }}
      >
        <div>{rankLabel(card.rank)}</div>
        <div className={`${suitCornerSize} -mt-0.5`}>{SUIT_GLYPHS[card.suit]}</div>
      </div>
      {/* Center — large stylized rank letter for face cards over a faint suit
          watermark; full suit symbol for numerics. */}
      {isFace ? (
        <>
          {/* Faint suit watermark */}
          <div
            className={`absolute inset-0 flex items-center justify-center font-extrabold ${centerSize}`}
            style={{ color: red ? "#dc2626" : "#0f172a", opacity: 0.12 }}
            aria-hidden
          >
            {SUIT_GLYPHS[card.suit]}
          </div>
          {/* Big rank letter on top, styled */}
          <div
            className={`absolute inset-0 flex items-center justify-center font-black tracking-tight ${faceLetterSize}`}
            style={{
              color: red ? "#dc2626" : "#0f172a",
              textShadow: "0 1px 0 rgba(212,165,116,0.4), 0 2px 4px rgba(0,0,0,0.15)",
              fontFamily: "Georgia, 'Times New Roman', serif",
            }}
          >
            {rankLabel(card.rank)}
          </div>
        </>
      ) : (
        <div
          className={`absolute inset-0 flex items-center justify-center font-extrabold ${centerSize}`}
          style={{ color: red ? "#dc2626" : "#0f172a", opacity: 0.85 }}
        >
          {SUIT_GLYPHS[card.suit]}
        </div>
      )}
      {/* Bottom-right corner rank + suit (rotated 180) */}
      <div
        className={`absolute bottom-0.5 right-1 leading-none font-extrabold rotate-180 ${rankSize}`}
        style={{ color: red ? "#dc2626" : "#0f172a" }}
      >
        <div>{rankLabel(card.rank)}</div>
        <div className={`${suitCornerSize} -mt-0.5`}>{SUIT_GLYPHS[card.suit]}</div>
      </div>
      {/* Wild-rank-match joker badge */}
      {isWildJoker && (
        <div
          className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-extrabold"
          style={{
            background: "linear-gradient(135deg, #fbbf24, #f97316)",
            color: "#0f172a",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.4)",
          }}
          title="Wild Joker"
        >
          J
        </div>
      )}
    </Tag>
  );
}

export function FaceDownCard({ small = false }: { small?: boolean }) {
  const sizeCls = small ? "w-9 h-[3.25rem]" : "w-10 h-14 sm:w-12 sm:h-16";
  return (
    <div
      className={`${sizeCls} rounded-lg flex-shrink-0 relative overflow-hidden`}
      style={{
        background:
          "repeating-linear-gradient(45deg, #7f1d1d 0 6px, #991b1b 6px 12px)",
        border: "1px solid #450a0a",
        boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
      }}
    >
      <div
        className="absolute inset-1 rounded"
        style={{
          background:
            "repeating-linear-gradient(-45deg, transparent 0 4px, rgba(254,202,202,0.25) 4px 5px)",
          border: "1px solid rgba(254,202,202,0.4)",
        }}
      />
    </div>
  );
}

export function FinishSlot({ small = false }: { small?: boolean }) {
  const sizeCls = small ? "w-9 h-[3.25rem]" : "w-10 h-14 sm:w-12 sm:h-16";
  return (
    <div
      className={`${sizeCls} rounded-md flex-shrink-0 flex items-center justify-center text-[8px] uppercase tracking-widest font-bold text-emerald-200`}
      style={{
        background: "rgba(6,78,59,0.5)",
        border: "2px dashed rgba(16,185,129,0.7)",
      }}
    >
      Finish
      <br />
      Slot
    </div>
  );
}

function rankLabel(r: Rank): string {
  return r === "T" ? "10" : r;
}
