import { useEffect, useState } from "react";
import type { Player } from "@shared/types";
import RematchPanel from "./RematchPanel";

/**
 * Full-viewport end-of-session screen.
 *
 * Shown to every player immediately after a game finishes (non-Rummy games)
 * or after the Rummy scorecard modal is dismissed. It:
 *
 *  - Shows an illustrated SVG table-scene so the screen feels alive.
 *  - Displays a visible circular countdown (100 s) to auto-leave.
 *  - Has a very prominent "Leave Room" CTA as the primary action.
 *  - Embeds the shared RematchPanel so the host can still start another
 *    round without needing to navigate elsewhere.
 *
 * z-index 70 — above every board overlay (z-50), result modal (z-50),
 * deal overlay (z-55), and winner burst (z-60).
 */
export const AUTO_LEAVE_MS = 100_000; // 100 seconds

export default function GameOverScreen({
  players,
  selfId,
  onLeave,
  deadlineMs,
}: {
  players: Player[];
  selfId: string | null;
  onLeave: () => void;
  /** Unix-ms timestamp when auto-leave fires. Set once at component mount. */
  deadlineMs: number;
}) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000)),
  );
  const total = AUTO_LEAVE_MS / 1000; // 100

  useEffect(() => {
    const id = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        window.clearInterval(id);
        onLeave();
      }
    }, 200);
    return () => window.clearInterval(id);
    // onLeave is stable (leaveRoom from Room.tsx never changes identity)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadlineMs]);

  // Circular progress: 0 → full, 100 → empty
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * (secondsLeft / total);

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-5 overflow-y-auto"
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, #3a2010 0%, #1a0e07 55%, #0d0804 100%)",
      }}
    >
      {/* Decorative top glow */}
      <div
        className="absolute top-0 left-0 right-0 h-48 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 100% at 50% 0%, rgba(201,162,39,0.18) 0%, transparent 70%)",
        }}
      />

      {/* Illustration */}
      <GameOverIllustration />

      {/* Headline */}
      <div className="text-center px-4">
        <div
          className="font-display font-black uppercase tracking-wide"
          style={{
            fontSize: "clamp(36px, 7vw, 88px)",
            background:
              "linear-gradient(180deg,#FEF3C7 0%,#F59E0B 50%,#92400E 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            filter: "drop-shadow(0 4px 16px rgba(245,158,11,0.40))",
            lineHeight: 1.05,
          }}
        >
          Game Over
        </div>
        <div
          className="mt-2 text-sm font-medium"
          style={{ color: "rgba(245,233,201,0.55)" }}
        >
          This session has ended. Want to play another round?
        </div>
      </div>

      {/* Countdown ring */}
      <div className="flex flex-col items-center gap-1.5">
        <div className="relative" style={{ width: 96, height: 96 }}>
          <svg
            viewBox="0 0 96 96"
            width={96}
            height={96}
            className="absolute inset-0"
            style={{ transform: "rotate(-90deg)" }}
            aria-hidden
          >
            {/* Track */}
            <circle
              cx={48}
              cy={48}
              r={radius}
              fill="none"
              stroke="rgba(201,162,39,0.15)"
              strokeWidth={6}
            />
            {/* Progress */}
            <circle
              cx={48}
              cy={48}
              r={radius}
              fill="none"
              stroke={secondsLeft <= 10 ? "#ef4444" : secondsLeft <= 30 ? "#f97316" : "#F59E0B"}
              strokeWidth={6}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - dash}
              style={{ transition: "stroke-dashoffset 0.2s linear, stroke 0.4s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="font-black tabular-nums leading-none"
              style={{
                fontSize: secondsLeft >= 100 ? 26 : 30,
                color: secondsLeft <= 10 ? "#ef4444" : "#FEF3C7",
              }}
            >
              {secondsLeft}
            </span>
            <span
              className="uppercase tracking-widest font-bold"
              style={{ fontSize: 9, color: "rgba(245,233,201,0.45)" }}
            >
              sec
            </span>
          </div>
        </div>
        <p
          className="text-center text-xs font-medium"
          style={{ color: "rgba(245,233,201,0.40)" }}
        >
          Room closes automatically
        </p>
      </div>

      {/* Primary CTA — Leave Room */}
      <LeaveButton onLeave={onLeave} urgent={secondsLeft <= 15} />

      {/* Rematch panel — host sees "Play Again"; others see accept/decline */}
      <div
        className="rounded-2xl px-5 py-4 w-full max-w-sm mx-4"
        style={{
          background: "rgba(245,233,201,0.06)",
          border: "1px solid rgba(245,233,201,0.10)",
        }}
      >
        <div
          className="text-center text-xs uppercase tracking-widest font-bold mb-3"
          style={{ color: "rgba(245,233,201,0.35)" }}
        >
          Or play again
        </div>
        <RematchPanel players={players} selfId={selfId} />
      </div>

      {/* Suit strip — decorative */}
      <div
        className="flex gap-5 text-2xl pointer-events-none select-none"
        style={{ color: "rgba(245,233,201,0.12)" }}
        aria-hidden
      >
        <span>♠</span>
        <span>♥</span>
        <span>♦</span>
        <span>♣</span>
      </div>
    </div>
  );
}

/* ── Leave button ── */
function LeaveButton({
  onLeave,
  urgent,
}: {
  onLeave: () => void;
  urgent: boolean;
}) {
  return (
    <button
      onClick={onLeave}
      className="relative group focus:outline-none"
      aria-label="Leave Room"
    >
      {/* Glow halo */}
      <div
        className="absolute -inset-2 rounded-2xl blur-lg opacity-60 group-hover:opacity-90 transition-opacity"
        style={{
          background: urgent
            ? "linear-gradient(135deg,#ef4444,#b91c1c)"
            : "linear-gradient(135deg,#F59E0B,#EA5A1F)",
          animation: "rummy-glow 1.8s ease-in-out infinite",
        }}
      />
      {/* Button face */}
      <div
        className="relative flex items-center gap-3 px-10 py-4 rounded-xl font-black text-xl uppercase tracking-wider select-none"
        style={{
          background: urgent
            ? "linear-gradient(135deg,#dc2626 0%,#991b1b 100%)"
            : "linear-gradient(135deg,#F59E0B 0%,#D97706 100%)",
          color: urgent ? "#fee2e2" : "#1f1300",
          boxShadow: urgent
            ? "0 10px 32px rgba(220,38,38,0.45), inset 0 1px 0 rgba(255,255,255,0.15)"
            : "0 10px 32px rgba(245,158,11,0.45), inset 0 1px 0 rgba(255,255,255,0.25)",
        }}
      >
        <DoorIcon />
        Leave Room
      </div>
    </button>
  );
}

/* ── Door SVG icon ── */
function DoorIcon() {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="flex-shrink-0"
    >
      <rect
        x={3}
        y={2}
        width={13}
        height={20}
        rx={2}
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <path
        d="M16 8 L21 12 L16 16"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1={21}
        y1={12}
        x2={9}
        y2={12}
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <circle cx={14} cy={12} r={1.5} fill="currentColor" />
    </svg>
  );
}

/* ── Illustration ── */
function GameOverIllustration() {
  return (
    <svg
      width={300}
      height={180}
      viewBox="0 0 300 180"
      fill="none"
      aria-hidden
      className="max-w-[90vw]"
    >
      {/* Felt oval */}
      <ellipse cx={150} cy={115} rx={120} ry={54} fill="#082b18" opacity={0.9} />
      <ellipse
        cx={150}
        cy={115}
        rx={116}
        ry={50}
        fill="none"
        stroke="#155e3a"
        strokeWidth={1.5}
      />

      {/* Scattered face-down cards */}
      <CardBack x={35} y={78} rotate={-18} dark />
      <CardBack x={230} y={74} rotate={22} dark={false} />
      <CardBack x={100} y={68} rotate={-7} dark />
      <CardBack x={170} y={70} rotate={11} dark={false} />

      {/* Chip stack center-table */}
      {([
        ["#C9A227", 5],
        ["#1e2a5c", 4],
        ["#7f1d1d", 3],
        ["#C9A227", 2],
        ["#155e3a", 1],
      ] as const).map(([fill, layer], i) => (
        <ellipse
          key={i}
          cx={150}
          cy={122 - layer * 4}
          rx={16}
          ry={6}
          fill={fill}
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={0.6}
        />
      ))}

      {/* Crown */}
      <g transform="translate(119 8)">
        <path
          d="M0 30 L10 10 L31 24 L31 6 L52 10 L62 30 Z"
          fill="#C9A227"
          stroke="#8A6220"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        {/* Jewels */}
        <circle cx={0} cy={30} r={4} fill="#A8332B" />
        <circle cx={31} cy={6} r={5} fill="#A8332B" />
        <circle cx={62} cy={30} r={4} fill="#A8332B" />
        {/* Band */}
        <rect x={0} y={30} width={62} height={9} rx={2} fill="#C9A227" stroke="#8A6220" strokeWidth={1} />
        {/* Crown shine */}
        <path d="M14 18 L22 12 L26 18" stroke="rgba(255,255,255,0.35)" strokeWidth={1.5} strokeLinecap="round" fill="none" />
      </g>

      {/* Stars scattered */}
      {([
        [30, 22, 14, 0.75],
        [270, 18, 14, 0.70],
        [150, 9, 18, 0.90],
        [60, 50, 10, 0.55],
        [240, 48, 10, 0.55],
        [105, 30, 8, 0.45],
        [195, 28, 8, 0.45],
      ] as const).map(([x, y, size, op], i) => (
        <text
          key={i}
          x={x}
          y={y}
          fontSize={size}
          fill="#F59E0B"
          opacity={op}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          ★
        </text>
      ))}

      {/* Ground sparkle line */}
      <path
        d="M38 165 Q90 161 150 163 Q210 165 262 162"
        stroke="rgba(201,162,39,0.18)"
        strokeWidth={1}
        strokeLinecap="round"
      />
    </svg>
  );
}

function CardBack({
  x,
  y,
  rotate,
  dark,
}: {
  x: number;
  y: number;
  rotate: number;
  dark: boolean;
}) {
  const id = `cb-${x}-${dark}`;
  return (
    <g transform={`rotate(${rotate} ${x + 18} ${y + 25})`}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={dark ? "#7f1d1d" : "#1e2a5c"} />
          <stop offset="100%" stopColor={dark ? "#4c0519" : "#0d1530"} />
        </linearGradient>
      </defs>
      <rect
        x={x}
        y={y}
        width={36}
        height={50}
        rx={4}
        fill={`url(#${id})`}
        stroke="rgba(201,162,39,0.55)"
        strokeWidth={1.5}
      />
      <rect
        x={x + 3}
        y={y + 3}
        width={30}
        height={44}
        rx={2}
        fill="none"
        stroke="rgba(201,162,39,0.28)"
        strokeWidth={0.75}
      />
      <circle cx={x + 18} cy={y + 25} r={7} fill="rgba(201,162,39,0.85)" />
      <text
        x={x + 18}
        y={y + 28}
        textAnchor="middle"
        fontSize={8}
        fontWeight="700"
        fill={dark ? "#7f1d1d" : "#1e2a5c"}
        fontFamily="Georgia, serif"
      >
        B
      </text>
    </g>
  );
}
