import { useState } from "react";

/**
 * Scene chrome for the reference-match UNO board redesign (the polished
 * cartoon "wood table + red felt" look). Presentation-only, no game logic —
 * every value/handler is passed in by the shells. Split out of uno-table.tsx
 * (which owns the felt + seats + piles) so the two files stay focused: this
 * one is the furniture *around* the felt — the room-code plate, the tactile
 * corner buttons, the UNO! declare cluster, and the asset-placeholder slots
 * that the real polaroid/notebook art will drop into later.
 */

// ---------------------------------------------------------------------
// Ivory tactile control button — the round cream buttons in the reference's
// top corners (sound / fullscreen / help). `.uno-ivory-btn` (index.css)
// carries the dome + brass-ring material; this only owns shape + size.
// ---------------------------------------------------------------------

export function UnoIvoryButton({
  onClick,
  title,
  ariaLabel,
  children,
  shape = "round",
}: {
  onClick: () => void;
  title?: string;
  ariaLabel: string;
  children: React.ReactNode;
  /** "round" = the corner icon buttons; "pill" = the wider Leave control. */
  shape?: "round" | "pill";
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      className={`uno-ivory-btn flex items-center justify-center font-bold ${
        shape === "round"
          ? "w-10 h-10 rounded-full text-base"
          : "h-10 px-3 rounded-full text-sm gap-1"
      }`}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------
// Room-code plate — the engraved wooden nameplate at the top-left, with a
// copy-to-clipboard control. Matches the reference's "ROOM CODE / X7G4K2"
// plate + copy icon.
// ---------------------------------------------------------------------

export function UnoRoomCodePlate({ code, compact = false }: { code: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    try {
      void navigator.clipboard?.writeText(code);
    } catch {
      /* clipboard may be unavailable (insecure context) — the code is still
         visible on the plate, so this is a nice-to-have, not load-bearing. */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div
      className={`uno-wood-plate flex items-center gap-2 rounded-xl ${
        compact ? "px-2 py-1" : "px-3 py-1.5"
      }`}
    >
      <div className="flex flex-col leading-none">
        <span
          className={`font-bold uppercase text-[#E9C892] ${
            compact ? "text-[7px] tracking-[0.16em]" : "text-[8px] tracking-[0.2em]"
          }`}
        >
          Room Code
        </span>
        <span
          className={`font-mono font-black text-[#FCEFCB] tracking-wider ${
            compact ? "text-sm" : "text-lg"
          }`}
        >
          {code}
        </span>
      </div>
      <button
        onClick={copy}
        aria-label={copied ? "Room code copied" : "Copy room code"}
        title="Copy room code"
        className="flex items-center justify-center w-7 h-7 rounded-md text-[#FCEFCB] transition"
        style={{
          background: copied ? "#2F9E44" : "#1F6FD0",
          boxShadow: "0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.35)",
        }}
      >
        {copied ? (
          <span className="text-xs font-black">✓</span>
        ) : (
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden>
            <rect x="9" y="9" width="11" height="11" rx="2.5" fill="currentColor" opacity="0.95" />
            <rect
              x="4"
              y="4"
              width="11"
              height="11"
              rx="2.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              opacity="0.8"
            />
          </svg>
        )}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------
// House-rules badge — a small persistent indicator so anyone at the table
// (not just the host, who's the only one who ever sees the toggles, in
// GameRoomSheet.tsx's pre-creation sheet) can tell which non-official
// rules are live this match. Without this, a joining player has zero
// in-app way to learn Jump-In/Stacking/etc. exist before one fires —
// an out-of-turn play or a sudden full-hand swap otherwise reads as a
// bug. Renders nothing when every flag is off (the common case), same
// "off = official, no extra chrome" principle the toggles themselves use.
// ---------------------------------------------------------------------

const HOUSE_RULE_LABELS: Record<string, string> = {
  stackDrawCards: "Stack Draw Cards",
  jumpIn: "Jump-In",
  sevenSwap: "Seven Swap",
  zeroRotate: "Zero Rotate",
  keepDrawing: "Keep Drawing",
  forcePlay: "Force Play",
};

export function UnoHouseRulesBadge({
  rules,
  compact = false,
}: {
  rules: Record<string, boolean>;
  compact?: boolean;
}) {
  const active = Object.keys(HOUSE_RULE_LABELS).filter((k) => rules[k]);
  if (active.length === 0) return null;
  const names = active.map((k) => HOUSE_RULE_LABELS[k]).join(", ");
  return (
    <div
      className={`uno-wood-plate flex items-center gap-1 rounded-xl font-bold uppercase text-[#E9C892] whitespace-nowrap ${
        compact ? "px-2 py-1 text-[9px]" : "px-2.5 py-1 text-[10px]"
      }`}
      title={`House rules active: ${names}`}
      aria-label={`House rules active: ${names}`}
    >
      <span aria-hidden>🎲</span>
      {compact ? active.length : `${active.length} house rule${active.length === 1 ? "" : "s"}`}
    </div>
  );
}

// ---------------------------------------------------------------------
// UNO! declare cluster — the big red button (right-middle in the reference)
// with a "1 CARD LEFT!" tag beneath. Only rendered while the local player
// actually has one undeclared card (canDeclareUno), so the tag is always
// truthful. Wraps the existing UnoCallButton behaviour with the reference's
// framing rather than re-implementing the declare emit.
// ---------------------------------------------------------------------

export function UnoDeclareCluster({
  visible,
  onDeclare,
}: {
  visible: boolean;
  onDeclare: () => void;
}) {
  if (!visible) return null;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        onClick={onDeclare}
        aria-label="Declare UNO — you have one card left"
        className="relative flex items-center justify-center rounded-2xl font-black italic tracking-tight text-white animate-pulse"
        style={{
          width: "5.4rem",
          height: "3.4rem",
          fontSize: "1.6rem",
          background: "radial-gradient(circle at 38% 28%, #F97362 0%, #E23122 52%, #B01212 100%)",
          border: "3px solid #FFF6E4",
          boxShadow:
            "0 10px 22px rgba(176,18,18,0.5), inset 0 2px 3px rgba(255,255,255,0.4), inset 0 -3px 6px rgba(120,0,0,0.4)",
          textShadow: "0 2px 2px rgba(0,0,0,0.35)",
        }}
      >
        UNO!
      </button>
      <span
        className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide whitespace-nowrap"
        style={{
          background: "linear-gradient(180deg,#FBF0D4,#E9D3A6)",
          color: "#8A5A1E",
          border: "1px solid #C9A96A",
          boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
        }}
      >
        1 card left!
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------
// Asset-placeholder slots — exact-positioned framed boxes for the two
// illustrated props in the reference (a paper-clipped polaroid, a
// notebook-with-pencils). Muted dashed fill labels them clearly as "art
// goes here"; the shape/rotation/position match the reference so dropping
// real art in later needs no layout change. Each takes a `label` for the
// eventual asset and is aria-hidden (pure decoration).
// ---------------------------------------------------------------------

export function UnoPolaroidPlaceholder() {
  return (
    <div
      aria-hidden
      className="relative select-none"
      style={{ width: 128, transform: "rotate(4deg)" }}
    >
      {/* Paperclip */}
      <div
        className="absolute -top-3 left-6 z-10"
        style={{
          width: 16,
          height: 34,
          border: "3px solid #B8BFC7",
          borderRadius: 10,
          background: "transparent",
          transform: "rotate(-18deg)",
        }}
      />
      {/* Polaroid frame */}
      <div
        className="rounded-[3px] p-2 pb-6"
        style={{
          background: "#FBF7EE",
          boxShadow: "0 8px 18px rgba(0,0,0,0.4)",
          border: "1px solid #E6DCC7",
        }}
      >
        <div
          className="flex items-center justify-center rounded-[2px]"
          style={{
            height: 92,
            background:
              "repeating-linear-gradient(135deg,#E4E9EE 0 10px,#DBE1E8 10px 20px)",
            border: "1.5px dashed #AEB8C2",
            color: "#8A96A2",
          }}
        >
          <div className="flex flex-col items-center gap-0.5">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
              <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="8.5" cy="10" r="1.8" fill="currentColor" />
              <path d="M4 17l5-4 3 2 4-4 4 4" stroke="currentColor" strokeWidth="1.6" fill="none" />
            </svg>
            <span className="text-[7px] font-bold uppercase tracking-wider">Photo</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function UnoNotebookPlaceholder() {
  return (
    <div
      aria-hidden
      className="relative select-none"
      style={{ width: 118, transform: "rotate(-5deg)" }}
    >
      {/* Two pencils tucked behind the notebook */}
      <div
        className="absolute z-0"
        style={{ left: -16, top: 42, width: 96, height: 9, transform: "rotate(28deg)" }}
      >
        <div className="w-full h-full rounded-full" style={{ background: "linear-gradient(90deg,#E86A5B 0 78%,#F2C14E 78% 100%)" }} />
      </div>
      <div
        className="absolute z-0"
        style={{ left: -20, top: 54, width: 96, height: 9, transform: "rotate(22deg)" }}
      >
        <div className="w-full h-full rounded-full" style={{ background: "linear-gradient(90deg,#3E7CD0 0 78%,#F2C14E 78% 100%)" }} />
      </div>
      {/* Notebook cover */}
      <div
        className="relative z-[1] rounded-[4px] pl-5 pr-2 py-3"
        style={{
          background: "#FBF3DC",
          border: "1.5px dashed #C9A96A",
          boxShadow: "0 8px 16px rgba(0,0,0,0.4)",
        }}
      >
        {/* Spiral binding */}
        <div className="absolute left-1.5 top-0 bottom-0 flex flex-col justify-around py-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className="block rounded-full"
              style={{ width: 8, height: 4, border: "2px solid #C0A063", borderBottom: "none" }}
            />
          ))}
        </div>
        <div className="flex flex-col items-center justify-center gap-0.5 text-[#B39457]" style={{ height: 52 }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden>
            <path d="M4 20l3-1 9-9-2-2-9 9-1 3z" stroke="currentColor" strokeWidth="1.6" fill="none" />
            <path d="M14 6l2-2 2 2-2 2" stroke="currentColor" strokeWidth="1.6" fill="none" />
          </svg>
          <span className="text-[7px] font-bold uppercase tracking-wider">Notes</span>
        </div>
      </div>
    </div>
  );
}
