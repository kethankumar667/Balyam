import type { CSSProperties, ElementType, KeyboardEvent as ReactKeyboardEvent } from "react";
import type { Card as CardType, Rank } from "@shared/types";

const SUIT_GLYPHS: Record<string, string> = { S: "♠", H: "♥", D: "♦", C: "♣" };

/**
 * Playing card.
 *
 * Visual goals: read as a real, professional Rummy card at a glance, even
 * at the tiny "small" size used inside the scorecard's meld groups.
 *   - Crisp ivory/white cardstock gradient with a real double-line border
 *     (solid outer hairline + inset highlight) for depth
 *   - Tall, condensed corner rank using a serif so the "10" reads cleanly,
 *     mirrored top-left / bottom-right per standard card convention
 *   - Number cards (2–10) and the Ace show one big centred suit pip — the
 *     same convention real-money Rummy apps use (full historical pip
 *     counts don't survive being shrunk to phone-card size)
 *   - Face cards (J/Q/K) get a slim suit-coloured frame holding the rank
 *     letter between two mirrored pips — reads as a "court card" without
 *     needing portrait artwork, and avoids relying on inconsistent
 *     system chess glyphs (♚/♛/♞ render very differently across devices)
 *   - Printed jokers get a richer purple gradient with a fan-shaped JOKER
 *     ribbon that's visible at small sizes
 *   - Selected state lifts the card with a warm glow; hover gives a smaller
 *     lift handled in the shell CSS so the inner styles never disagree
 */
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
  const rankSize = small ? "text-[13px]" : "text-[13px] sm:text-[15px]";
  const suitCornerSize = small ? "text-[11px]" : "text-[10px] sm:text-[12px]";
  const isAce = !card.isPrintedJoker && card.rank === "A";
  // Ace's single pip reads as the "big" card in the suit, same as a real
  // deck — sized up a notch from the plain 2–10 centre pip.
  const centerSize = isAce
    ? small ? "text-[28px]" : "text-[26px] sm:text-[32px]"
    : small ? "text-[24px]" : "text-[22px] sm:text-[28px]";
  const isCourt =
    !card.isPrintedJoker &&
    (card.rank === "J" || card.rank === "Q" || card.rank === "K");
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
  const touchActionStyle: CSSProperties = draggable
    ? { touchAction: "none" }
    : {};

  // Printed joker — bolder gradient with a fan motif behind the JOKER ribbon.
  if (card.isPrintedJoker) {
    return (
      <Tag
        draggable={draggable}
        {...ariaProps}
        className={`rummy-playing-card relative ${sizeCls} rounded-[7px] flex-shrink-0 transition transform select-none overflow-hidden
          ${selected ? "-translate-y-3 ring-2 ring-amber-400 shadow-2xl" : ""}
          ${dimmed ? "opacity-50" : ""}
          ${onClick ? "hover:-translate-y-1 cursor-pointer" : "cursor-default"}`}
        style={{
          ...touchActionStyle,
          background:
            "linear-gradient(140deg, #6d28d9 0%, #4c1d95 55%, #2e1065 100%)",
          border: "1px solid #1e0843",
          boxShadow: selected
            ? "0 12px 24px rgba(245,158,11,0.45), inset 0 0 0 1px rgba(251,191,36,0.5), 0 2px 4px rgba(0,0,0,0.3)"
            : "0 3px 6px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(251,191,36,0.35)",
        }}
        title="Printed Joker"
      >
        {/* Diagonal sheen */}
        <span
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(115deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 35%, rgba(255,255,255,0) 65%, rgba(255,255,255,0.10) 100%)",
          }}
        />
        {/* Star burst */}
        <span
          aria-hidden
          className="absolute inset-0 flex items-center justify-center"
          style={{
            background:
              "radial-gradient(circle at 50% 45%, rgba(251,191,36,0.32) 0%, rgba(251,191,36,0) 55%)",
          }}
        />
        {/* Centre ribbon */}
        <span
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 mx-1 py-0.5 text-center font-black tracking-[0.2em] text-[8px] sm:text-[9px]"
          style={{
            color: "#fef3c7",
            background:
              "linear-gradient(90deg, rgba(0,0,0,0.0), rgba(0,0,0,0.45), rgba(0,0,0,0.0))",
            borderTop: "1px solid rgba(251,191,36,0.55)",
            borderBottom: "1px solid rgba(251,191,36,0.55)",
            textShadow: "0 1px 2px rgba(0,0,0,0.6)",
          }}
        >
          JOKER
        </span>
        {/* Corner mini-stars hinting "wild" */}
        <span className="absolute top-0.5 left-1 text-[9px] text-amber-200/85" aria-hidden>★</span>
        <span className="absolute bottom-0.5 right-1 text-[9px] text-amber-200/85 rotate-180" aria-hidden>★</span>
      </Tag>
    );
  }

  return (
    <Tag
      draggable={draggable}
      {...ariaProps}
      className={`rummy-playing-card relative ${sizeCls} rounded-[7px] flex-shrink-0 transition transform select-none overflow-hidden
        ${selected ? "-translate-y-3 ring-2 ring-amber-400 shadow-2xl" : ""}
        ${dimmed ? "opacity-50" : ""}
        ${onClick ? "hover:-translate-y-1 cursor-pointer" : "cursor-default"}`}
      style={{
        ...touchActionStyle,
        // Warm ivory for court cards, crisp white cardstock for numerics/Ace.
        background: isCourt
          ? "linear-gradient(168deg, #fff8e6 0%, #fff1cf 55%, #ffe7ad 100%)"
          : "linear-gradient(168deg, #ffffff 0%, #f7fafd 60%, #e9eef5 100%)",
        border: isCourt ? "1.5px solid #a8793a" : "1.5px solid #8b97a8",
        boxShadow: selected
          ? "0 14px 26px rgba(245,158,11,0.5), 0 2px 4px rgba(0,0,0,0.2), inset 0 0 0 1px rgba(252,211,77,0.7)"
          : isCourt
          ? "0 4px 9px rgba(0,0,0,0.30), 0 1px 0 rgba(255,255,255,0.7) inset, inset 0 0 0 2px rgba(184,137,80,0.32)"
          : "0 4px 9px rgba(0,0,0,0.30), 0 1px 0 rgba(255,255,255,0.85) inset, inset 0 0 0 2px rgba(154,166,181,0.28)",
      }}
    >
      {/* Top glossy sheen */}
      <div
        className="absolute inset-x-1 top-0.5 h-4 rounded-t-[5px] opacity-55"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0))",
        }}
        aria-hidden
      />
      {/* Top-left corner — rank above suit, larger rank for legibility */}
      <div
        className={`absolute top-[1px] left-[3px] leading-[0.92] font-black ${rankSize}`}
        style={{
          color: red ? "#b91c1c" : "#0b1220",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        <div>{rankLabel(card.rank)}</div>
        <div
          className={`${suitCornerSize} leading-none mt-[1px]`}
          style={{ color: red ? "#dc2626" : "#1e293b" }}
        >
          {SUIT_GLYPHS[card.suit]}
        </div>
      </div>

      {/* Centre — court cards (J/Q/K) get a slim suit-coloured frame with
          the rank letter sandwiched between two mirrored pips, reading as
          a real "court card" indicator without portrait artwork. Number
          cards and the Ace share one big centred pip (Ace sized up a
          notch) — the same fast-recognition convention real-money Rummy
          apps use; full historical pip layouts don't survive shrinking
          to phone-card size. */}
      {isCourt ? (
        <FaceCardCenter
          rank={card.rank as "J" | "Q" | "K"}
          suit={card.suit}
          red={red}
          small={small}
        />
      ) : (
        <div
          className={`absolute inset-0 flex items-center justify-center font-black ${centerSize}`}
          style={{
            color: red ? "#dc2626" : "#0f172a",
            textShadow: red
              ? "0 1px 1px rgba(127,29,29,0.18)"
              : "0 1px 1px rgba(15,23,42,0.15)",
          }}
        >
          {SUIT_GLYPHS[card.suit]}
        </div>
      )}

      {/* Bottom-right mirror corner */}
      <div
        className={`absolute bottom-[1px] right-[3px] leading-[0.92] font-black rotate-180 ${rankSize}`}
        style={{
          color: red ? "#b91c1c" : "#0b1220",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        <div>{rankLabel(card.rank)}</div>
        <div
          className={`${suitCornerSize} leading-none mt-[1px]`}
          style={{ color: red ? "#dc2626" : "#1e293b" }}
        >
          {SUIT_GLYPHS[card.suit]}
        </div>
      </div>

      {/* Wild-rank-match joker badges — top-right AND bottom-left so the
          card reads as a joker regardless of how it's fanned/overlapped in
          the player's hand. A card behind a sibling on its right is
          covered on the right edge; one behind a sibling on its left is
          covered on the left edge. Duplicating the marker into the
          opposite corners means at least one is always visible. */}
      {isWildJoker && (
        <>
          <div
            className="absolute top-[1px] right-[1px] w-[14px] h-[14px] rounded-full flex items-center justify-center text-[8px] font-black"
            style={{
              background: "linear-gradient(135deg, #fbbf24, #ea580c)",
              color: "#1f1300",
              boxShadow:
                "0 0 0 1px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.45)",
            }}
            title="Wild Joker"
          >
            J
          </div>
          <div
            className="absolute bottom-[1px] left-[1px] w-[14px] h-[14px] rounded-full flex items-center justify-center text-[8px] font-black"
            style={{
              background: "linear-gradient(135deg, #fbbf24, #ea580c)",
              color: "#1f1300",
              boxShadow:
                "0 0 0 1px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.45)",
              transform: "rotate(180deg)",
            }}
            title="Wild Joker"
            aria-hidden
          >
            J
          </div>
        </>
      )}
    </Tag>
  );
}

/**
 * Centre artwork for court cards (J / Q / K). A slim suit-coloured frame
 * holds the rank letter sandwiched between two mirrored pips — reads
 * unambiguously as a "court card" without needing portrait artwork, and
 * renders identically on every device (unlike chess-piece glyphs, whose
 * font coverage and stroke weight vary wildly across platforms — the
 * previous design's biggest weakness).
 */
function FaceCardCenter({
  rank,
  suit,
  red,
  small,
}: {
  rank: "J" | "Q" | "K";
  suit: string;
  red: boolean;
  small: boolean;
}) {
  const tone = red ? "#9b1c1c" : "#1c2733";
  const frameW = small ? 28 : 34;
  const frameH = small ? 38 : 46;
  const letterSize = small ? 21 : 26;
  const pipSize = small ? 8 : 9;

  return (
    <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
      <div
        className="flex flex-col items-center justify-center gap-0.5 rounded-[3px]"
        style={{
          width: frameW,
          height: frameH,
          border: `1.5px solid ${tone}`,
          boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.85)",
          background: `linear-gradient(180deg, ${
            red ? "rgba(185,28,28,0.07)" : "rgba(30,41,59,0.06)"
          }, transparent)`,
        }}
      >
        <span style={{ color: tone, fontSize: pipSize, lineHeight: 1 }}>
          {SUIT_GLYPHS[suit]}
        </span>
        <span
          className="font-black leading-none"
          style={{
            color: tone,
            fontSize: letterSize,
            fontFamily: "Georgia, 'Times New Roman', serif",
            textShadow: "0 1px 1px rgba(0,0,0,0.15)",
          }}
        >
          {rank}
        </span>
        <span
          style={{
            color: tone,
            fontSize: pipSize,
            lineHeight: 1,
            transform: "rotate(180deg)",
          }}
        >
          {SUIT_GLYPHS[suit]}
        </span>
      </div>
    </div>
  );
}

/**
 * Card back used for the closed deck and other face-down piles.
 *
 * Diamond lattice over a deep crimson gradient, with a gold inner border
 * and a centred "B" monogram (BHALYAM). The pattern is pure CSS so it
 * scales crisply at all card sizes.
 */
export function FaceDownCard({ small = false }: { small?: boolean }) {
  const sizeCls = small ? "w-9 h-[3.25rem]" : "w-10 h-14 sm:w-12 sm:h-16";
  return (
    <div
      className={`${sizeCls} rounded-[7px] flex-shrink-0 relative overflow-hidden`}
      style={{
        background: "linear-gradient(140deg, #7f1d1d 0%, #991b1b 60%, #4c0519 100%)",
        border: "1.5px solid #2c0507",
        boxShadow:
          "0 4px 9px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(251,191,36,0.55)",
      }}
    >
      {/* Diamond lattice */}
      <div
        aria-hidden
        className="absolute inset-1 rounded-[4px]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(251,191,36,0.18) 0 1.5px, transparent 1.5px 9px), repeating-linear-gradient(-45deg, rgba(251,191,36,0.18) 0 1.5px, transparent 1.5px 9px)",
          border: "1px solid rgba(251,191,36,0.4)",
        }}
      />
      {/* Centre monogram */}
      <div
        aria-hidden
        className="absolute inset-0 flex items-center justify-center"
      >
        <span
          className="inline-flex items-center justify-center rounded-full font-black"
          style={{
            width: small ? 18 : 22,
            height: small ? 18 : 22,
            background: "radial-gradient(circle, #fbbf24 0%, #d97706 100%)",
            color: "#3a1f00",
            fontSize: small ? 10 : 12,
            boxShadow:
              "0 1px 2px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.55)",
            fontFamily: "Georgia, 'Times New Roman', serif",
          }}
        >
          B
        </span>
      </div>
      {/* Subtle glossy sheen */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-3 opacity-25"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.8), rgba(255,255,255,0))",
        }}
      />
    </div>
  );
}

export function FinishSlot({ small = false }: { small?: boolean }) {
  const sizeCls = small ? "w-9 h-[3.25rem]" : "w-10 h-14 sm:w-12 sm:h-16";
  return (
    <div
      className={`${sizeCls} rounded-[7px] flex-shrink-0 flex items-center justify-center text-[8px] uppercase tracking-widest font-black text-emerald-200`}
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
