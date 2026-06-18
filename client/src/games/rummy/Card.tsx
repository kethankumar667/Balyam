import type { CSSProperties, ElementType, KeyboardEvent as ReactKeyboardEvent } from "react";
import type { Card as CardType, Rank } from "@shared/types";

const SUIT_GLYPHS: Record<string, string> = { S: "♠", H: "♥", D: "♦", C: "♣" };

/**
 * Playing card.
 *
 * Visual goals: looks like a casino-quality card without a heavy library.
 *   - Ivory paper gradient with a faint speckle so it isn't flat white
 *   - Crisp double border (outer dark, inner gold-tinged) for depth
 *   - Tall, condensed corner rank using a serif so the "10" reads cleanly
 *   - Face cards (J/Q/K/A) get a colored interior border + decorative
 *     centred crest using the suit glyph behind a stylised letter
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
  const centerSize = small ? "text-[24px]" : "text-[22px] sm:text-[28px]";
  const isFace =
    !card.isPrintedJoker &&
    (card.rank === "J" ||
      card.rank === "Q" ||
      card.rank === "K" ||
      card.rank === "A");
  const faceLetterSize = small ? "text-[28px]" : "text-[30px] sm:text-[36px]";
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
        // Subtle ivory gradient for face, cooler white for numerics.
        background: isFace
          ? "linear-gradient(168deg, #fff8e6 0%, #fff1cf 55%, #ffe7ad 100%)"
          : "linear-gradient(168deg, #ffffff 0%, #f7fafd 60%, #e9eef5 100%)",
        border: isFace ? "1px solid #b88950" : "1px solid #9aa6b5",
        boxShadow: selected
          ? "0 14px 26px rgba(245,158,11,0.5), 0 2px 4px rgba(0,0,0,0.2), inset 0 0 0 1px rgba(252,211,77,0.7)"
          : isFace
          ? "0 4px 9px rgba(0,0,0,0.30), 0 1px 0 rgba(255,255,255,0.7) inset, inset 0 0 0 1px rgba(184,137,80,0.4)"
          : "0 4px 9px rgba(0,0,0,0.30), 0 1px 0 rgba(255,255,255,0.85) inset, inset 0 0 0 1px rgba(154,166,181,0.35)",
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

      {/* Centre — face cards get a stylised letter with watermark suit + decorative
          crest framing. Numerics get a single large suit glyph. */}
      {isFace ? (
        <>
          {/* Inner ornamental frame for face cards */}
          <div
            aria-hidden
            className="absolute"
            style={{
              top: 9,
              bottom: 9,
              left: 4,
              right: 4,
              borderRadius: 4,
              border: `1px solid ${red ? "rgba(185,28,28,0.45)" : "rgba(15,23,42,0.4)"}`,
              boxShadow: `inset 0 0 0 1px ${red ? "rgba(220,38,38,0.18)" : "rgba(30,41,59,0.15)"}`,
            }}
          />
          {/* Watermark suit */}
          <div
            className={`absolute inset-0 flex items-center justify-center font-extrabold ${centerSize}`}
            style={{
              color: red ? "#b91c1c" : "#0b1220",
              opacity: 0.14,
            }}
            aria-hidden
          >
            {SUIT_GLYPHS[card.suit]}
          </div>
          {/* Big ornate letter */}
          <div
            className={`absolute inset-0 flex items-center justify-center font-black tracking-tight ${faceLetterSize}`}
            style={{
              color: red ? "#b91c1c" : "#0b1220",
              textShadow:
                "0 1px 0 rgba(212,165,116,0.5), 0 2px 4px rgba(0,0,0,0.18)",
              fontFamily: "Georgia, 'Times New Roman', serif",
            }}
          >
            {rankLabel(card.rank)}
          </div>
        </>
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

      {/* Wild-rank-match joker badge */}
      {isWildJoker && (
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
      )}
    </Tag>
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
        border: "1px solid #2c0507",
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
