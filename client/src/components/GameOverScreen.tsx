import { useEffect, useState } from "react";
import type { Player } from "@shared/types";
import RematchPanel from "./RematchPanel";

/**
 * Full-viewport end-of-session screen — game-agnostic.
 *
 * Works for every game (RPS, Ludo, SnL, UNO, WordBuilding, DotsBoxes,
 * MemoryMatch, StarGame, HandCricket, Rummy). No card-table metaphor; the
 * design centres on a golden trophy that is universally understood as "winner".
 *
 * Props:
 *   winnerName  — optional name of the session winner; shows a "🏆 X won!"
 *                 badge. Omit when the winner isn't known (draw / disconnect).
 *   gameName    — optional friendly name of the game (e.g. "Ludo"); shown as
 *                 a small label under the headline.
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
  winnerName,
  gameName,
}: {
  players: Player[];
  selfId: string | null;
  onLeave: () => void;
  /** Unix-ms timestamp when auto-leave fires. Set once when the screen first mounts. */
  deadlineMs: number;
  /** Name of the player who won (null = draw / no winner yet). */
  winnerName?: string | null;
  /** Friendly name of the game being played. */
  gameName?: string;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadlineMs]);

  // Circular progress: full at 100 s → empty at 0 s
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * (secondsLeft / total);

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-4 overflow-y-auto py-6 px-4"
      style={{
        background:
          "radial-gradient(ellipse 90% 70% at 50% 0%, #1a1040 0%, #0d0820 50%, #06030f 100%)",
      }}
    >
      {/* Top radial glow — brand brand-gold halo behind trophy */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-64 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 100% at 50% 0%, rgba(228,177,40,0.22) 0%, transparent 70%)",
        }}
      />

      {/* Trophy illustration — fully generic */}
      <TrophyIllustration />

      {/* Headline + game label */}
      <div className="text-center z-10">
        <div
          className="font-display font-black uppercase tracking-wide"
          style={{
            fontSize: "clamp(34px, 6.5vw, 80px)",
            background:
              "linear-gradient(180deg, #FFF7C2 0%, #E4B128 45%, #92660A 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            filter: "drop-shadow(0 4px 20px rgba(228,177,40,0.45))",
            lineHeight: 1.05,
          }}
        >
          Game Over
        </div>
        {gameName && (
          <div
            className="mt-1 text-xs uppercase tracking-[0.25em] font-bold"
            style={{ color: "rgba(255,247,194,0.40)" }}
          >
            {gameName}
          </div>
        )}
      </div>

      {/* Winner badge — shown only when there is a clear winner */}
      {winnerName ? (
        <div
          className="flex items-center gap-2.5 px-5 py-2.5 rounded-full z-10"
          style={{
            background:
              "linear-gradient(135deg, rgba(228,177,40,0.25) 0%, rgba(146,102,10,0.35) 100%)",
            border: "1.5px solid rgba(228,177,40,0.50)",
            boxShadow: "0 0 20px rgba(228,177,40,0.25)",
          }}
        >
          <span className="text-xl" aria-hidden>🏆</span>
          <span
            className="font-black text-base tracking-wide"
            style={{ color: "#FFF7C2" }}
          >
            {winnerName} won!
          </span>
        </div>
      ) : (
        <div
          className="text-sm font-semibold z-10"
          style={{ color: "rgba(255,247,194,0.40)" }}
        >
          Session ended
        </div>
      )}

      {/* Countdown ring */}
      <div className="flex flex-col items-center gap-1 z-10">
        <div className="relative" style={{ width: 88, height: 88 }}>
          <svg
            viewBox="0 0 96 96"
            width={88}
            height={88}
            className="absolute inset-0"
            style={{ transform: "rotate(-90deg)" }}
            aria-hidden
          >
            <circle
              cx={48}
              cy={48}
              r={radius}
              fill="none"
              stroke="rgba(228,177,40,0.12)"
              strokeWidth={6}
            />
            <circle
              cx={48}
              cy={48}
              r={radius}
              fill="none"
              stroke={
                secondsLeft <= 10
                  ? "#ef4444"
                  : secondsLeft <= 30
                  ? "#f97316"
                  : "#E4B128"
              }
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
                fontSize: secondsLeft >= 100 ? 24 : 28,
                color: secondsLeft <= 10 ? "#ef4444" : "#FFF7C2",
              }}
            >
              {secondsLeft}
            </span>
            <span
              className="uppercase tracking-widest font-bold"
              style={{ fontSize: 8, color: "rgba(255,247,194,0.40)" }}
            >
              sec
            </span>
          </div>
        </div>
        <p
          className="text-center text-xs font-medium"
          style={{ color: "rgba(255,247,194,0.35)" }}
        >
          Room closes automatically
        </p>
      </div>

      {/* Primary CTA — Leave Room */}
      <LeaveButton onLeave={onLeave} urgent={secondsLeft <= 15} />

      {/* Rematch / play-again panel */}
      <div
        className="rounded-2xl px-5 py-4 w-full max-w-sm z-10"
        style={{
          background: "rgba(255,247,194,0.05)",
          border: "1px solid rgba(255,247,194,0.10)",
        }}
      >
        <div
          className="text-center text-xs uppercase tracking-[0.2em] font-bold mb-3"
          style={{ color: "rgba(255,247,194,0.30)" }}
        >
          Or play again
        </div>
        <RematchPanel players={players} selfId={selfId} />
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
      className="relative group focus:outline-none z-10"
      aria-label="Leave Room"
    >
      {/* Glow halo */}
      <div
        className="absolute -inset-2 rounded-2xl blur-lg opacity-60 group-hover:opacity-95 transition-opacity duration-200"
        style={{
          background: urgent
            ? "linear-gradient(135deg, #ef4444, #991b1b)"
            : "linear-gradient(135deg, #E4B128, #FF8F00)",
        }}
      />
      {/* Face */}
      <div
        className="relative flex items-center gap-3 px-10 py-4 rounded-xl font-black text-xl uppercase tracking-wider select-none transition-transform duration-150 active:scale-[0.97]"
        style={{
          background: urgent
            ? "linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)"
            : "linear-gradient(135deg, #E4B128 0%, #B38918 100%)",
          color: urgent ? "#fee2e2" : "#1a0e00",
          boxShadow: urgent
            ? "0 8px 28px rgba(220,38,38,0.45), inset 0 1px 0 rgba(255,255,255,0.10)"
            : "0 8px 28px rgba(228,177,40,0.40), inset 0 1px 0 rgba(255,255,255,0.22)",
        }}
      >
        <DoorIcon urgent={urgent} />
        Leave Room
      </div>
    </button>
  );
}

function DoorIcon({ urgent }: { urgent: boolean }) {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="flex-shrink-0"
      style={{ color: urgent ? "#fca5a5" : "#1a0e00" }}
    >
      <rect
        x={3} y={2} width={13} height={20} rx={2}
        stroke="currentColor" strokeWidth={2} strokeLinejoin="round"
      />
      <path
        d="M16 8 L21 12 L16 16"
        stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
      <line
        x1={21} y1={12} x2={9} y2={12}
        stroke="currentColor" strokeWidth={2} strokeLinecap="round"
      />
    </svg>
  );
}

/* ── Trophy illustration — no card-game elements ── */
function TrophyIllustration() {
  return (
    <svg
      width={220}
      height={200}
      viewBox="0 0 220 200"
      fill="none"
      aria-hidden
      className="z-10 max-w-[60vw]"
    >
      {/* Radial glow behind trophy */}
      <defs>
        <radialGradient id="tg-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#E4B128" stopOpacity={0.35} />
          <stop offset="100%" stopColor="#E4B128" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="cup-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF7C2" />
          <stop offset="40%" stopColor="#E4B128" />
          <stop offset="100%" stopColor="#7A5C0E" />
        </radialGradient>
        <linearGradient id="cup-grad-lin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF7C2" />
          <stop offset="35%" stopColor="#E4B128" />
          <stop offset="100%" stopColor="#7A5C0E" />
        </linearGradient>
      </defs>

      {/* Background glow circle */}
      <ellipse cx={110} cy={105} rx={80} ry={70} fill="url(#tg-glow)" />

      {/* Confetti dots scattered */}
      {([
        [28, 38, "#E4B128"], [192, 42, "#FF8F00"], [15, 120, "#7C3AED"],
        [200, 130, "#10B981"], [45, 175, "#3B82F6"], [175, 170, "#E4B128"],
        [70, 20, "#ef4444"], [155, 18, "#10B981"], [95, 185, "#FF8F00"],
        [130, 188, "#7C3AED"], [8, 68, "#3B82F6"], [210, 85, "#ef4444"],
      ] as const).map(([x, y, fill], i) => (
        <rect
          key={i}
          x={x - 4}
          y={y - 4}
          width={i % 3 === 0 ? 8 : 6}
          height={i % 3 === 0 ? 6 : 8}
          rx={1.5}
          fill={fill}
          opacity={0.75}
          transform={`rotate(${(i * 37) % 60 - 30} ${x} ${y})`}
        />
      ))}

      {/* Stars radiating around trophy */}
      {([
        [110, 20, 7, 1.0],
        [44, 55, 5, 0.85],
        [176, 52, 5, 0.85],
        [22, 100, 4, 0.65],
        [198, 100, 4, 0.65],
        [58, 158, 4, 0.60],
        [162, 158, 4, 0.60],
      ] as const).map(([cx, cy, r, op], i) => (
        <Star key={i} cx={cx} cy={cy} r={r} opacity={op} />
      ))}

      {/* Burst lines emanating from trophy centre */}
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i * 30 * Math.PI) / 180;
        const x1 = 110 + Math.cos(angle) * 50;
        const y1 = 95 + Math.sin(angle) * 50;
        const x2 = 110 + Math.cos(angle) * 68;
        const y2 = 95 + Math.sin(angle) * 68;
        return (
          <line
            key={i}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="#E4B128"
            strokeWidth={i % 2 === 0 ? 1.5 : 1}
            strokeLinecap="round"
            opacity={0.35}
          />
        );
      })}

      {/* ─── Trophy cup ─── */}
      {/* Base plate */}
      <rect x={80} y={164} width={60} height={8} rx={4} fill="url(#cup-grad-lin)" />
      {/* Stem */}
      <rect x={100} y={148} width={20} height={18} rx={3} fill="url(#cup-grad-lin)" />
      {/* Stem connector */}
      <ellipse cx={110} cy={148} rx={24} ry={5} fill="url(#cup-grad-lin)" />
      {/* Cup body */}
      <path
        d="M70 80 Q68 130 110 148 Q152 130 150 80 Z"
        fill="url(#cup-grad-lin)"
      />
      {/* Cup rim */}
      <ellipse cx={110} cy={80} rx={40} ry={9} fill="#FFF7C2" opacity={0.9} />
      {/* Left handle */}
      <path
        d="M70 88 Q44 88 44 110 Q44 132 70 132"
        stroke="url(#cup-grad-lin)"
        strokeWidth={7}
        strokeLinecap="round"
        fill="none"
      />
      {/* Right handle */}
      <path
        d="M150 88 Q176 88 176 110 Q176 132 150 132"
        stroke="url(#cup-grad-lin)"
        strokeWidth={7}
        strokeLinecap="round"
        fill="none"
      />
      {/* Cup shine highlight */}
      <path
        d="M84 90 Q82 105 86 118"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
      />
      {/* Star inside cup */}
      <Star cx={110} cy={112} r={14} opacity={0.25} fill="#FFF7C2" />
    </svg>
  );
}

/** 5-point star primitive. */
function Star({
  cx,
  cy,
  r,
  opacity = 1,
  fill = "#E4B128",
}: {
  cx: number;
  cy: number;
  r: number;
  opacity?: number;
  fill?: string;
}) {
  const pts = Array.from({ length: 5 }, (_, i) => {
    const outer = ((i * 72 - 90) * Math.PI) / 180;
    const inner = (((i * 72 + 36) - 90) * Math.PI) / 180;
    const ox = cx + Math.cos(outer) * r;
    const oy = cy + Math.sin(outer) * r;
    const ix = cx + Math.cos(inner) * (r * 0.42);
    const iy = cy + Math.sin(inner) * (r * 0.42);
    return `${ox},${oy} ${ix},${iy}`;
  }).join(" ");
  return <polygon points={pts} fill={fill} opacity={opacity} />;
}
