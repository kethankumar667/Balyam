/**
 * Premium player avatar: initials on a deterministic gradient with optional
 * countdown ring, dealer badge, and score pill. Used for both the opponent
 * strip at the top of the table and the player strip at the bottom.
 */

const PALETTES: Array<[string, string]> = [
  ["#f59e0b", "#b45309"], // amber
  ["#10b981", "#047857"], // emerald
  ["#3b82f6", "#1d4ed8"], // blue
  ["#a855f7", "#6d28d9"], // purple
  ["#ec4899", "#9d174d"], // pink
  ["#06b6d4", "#0e7490"], // cyan
  ["#ef4444", "#991b1b"], // red
  ["#84cc16", "#3f6212"], // lime
];

function paletteFor(seed: string): [string, string] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return PALETTES[Math.abs(h) % PALETTES.length];
}

function initialsOf(name: string): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Colour the ring based on how much time is left.
 * < 5s = red, < 10s = yellow/amber, otherwise green.
 */
function ringColor(secondsLeft: number): string {
  if (secondsLeft <= 5) return "#ef4444";
  if (secondsLeft <= 10) return "#f59e0b";
  return "#10b981";
}

export interface AvatarProps {
  name: string;
  /** Diameter in px. Defaults to 56. */
  size?: number;
  /** Show a countdown ring around the avatar. */
  countdown?: {
    /** Whole seconds remaining (already clamped >= 0). */
    secondsLeft: number;
    /** Original turn duration in seconds; used to compute the ring fill. */
    totalSeconds: number;
  };
  /** Numeric badge shown on the avatar (e.g. cumulative round score). */
  scoreBadge?: number | string;
  /** Show a 🎲 "dealer" marker on the avatar. */
  isDealer?: boolean;
  /** Greyed out (e.g. a dropped or eliminated player). */
  dimmed?: boolean;
}

export default function Avatar({
  name,
  size = 56,
  countdown,
  scoreBadge,
  isDealer,
  dimmed,
}: AvatarProps) {
  const initials = initialsOf(name);
  const [start, end] = paletteFor(name);
  const ringStroke = 4;
  // SVG ring sits inside a slightly larger box than the avatar diameter so it
  // doesn't get clipped by the circle's border.
  const ringBox = size + ringStroke * 2;
  const ringR = (ringBox - ringStroke) / 2;
  const ringC = 2 * Math.PI * ringR;
  const pct = countdown
    ? Math.max(0, Math.min(1, countdown.secondsLeft / Math.max(1, countdown.totalSeconds)))
    : 0;
  const dashOffset = ringC * (1 - pct);
  const color = countdown ? ringColor(countdown.secondsLeft) : "transparent";

  return (
    <div
      className="relative inline-block flex-shrink-0"
      style={{ width: ringBox, height: ringBox }}
    >
      {/* Countdown ring — rendered behind the avatar */}
      {countdown && (
        <svg
          className="absolute inset-0 -rotate-90"
          width={ringBox}
          height={ringBox}
          viewBox={`0 0 ${ringBox} ${ringBox}`}
          aria-hidden
        >
          <circle
            cx={ringBox / 2}
            cy={ringBox / 2}
            r={ringR}
            stroke="rgba(0,0,0,0.35)"
            strokeWidth={ringStroke}
            fill="none"
          />
          <circle
            cx={ringBox / 2}
            cy={ringBox / 2}
            r={ringR}
            stroke={color}
            strokeWidth={ringStroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={ringC}
            strokeDashoffset={dashOffset}
            style={{
              transition: "stroke-dashoffset 250ms linear, stroke 250ms",
              filter: `drop-shadow(0 0 4px ${color}88)`,
            }}
          />
        </svg>
      )}

      {/* Avatar disk with initials */}
      <div
        className="absolute flex items-center justify-center font-extrabold select-none rounded-full"
        style={{
          left: ringStroke,
          top: ringStroke,
          width: size,
          height: size,
          background: `linear-gradient(135deg, ${start} 0%, ${end} 100%)`,
          color: "#fff",
          fontSize: size * 0.4,
          textShadow: "0 1px 2px rgba(0,0,0,0.5)",
          border: "2px solid rgba(255,255,255,0.25)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(0,0,0,0.2)",
          opacity: dimmed ? 0.45 : 1,
        }}
      >
        {initials}
      </div>

      {/* Countdown number — sits on top of the ring at top-right */}
      {countdown && countdown.secondsLeft > 0 && (
        <div
          className="absolute -top-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold tabular-nums"
          style={{
            background: color,
            color: "#0f172a",
            boxShadow: `0 0 8px ${color}aa`,
            minWidth: 22,
            textAlign: "center",
          }}
        >
          {countdown.secondsLeft}
        </div>
      )}

      {/* Score badge — bottom-left */}
      {scoreBadge !== undefined && (
        <div
          className="absolute -bottom-1 -left-1 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold tabular-nums"
          style={{
            background: "rgba(15,23,42,0.92)",
            color: "#fde68a",
            border: "1px solid rgba(251,191,36,0.6)",
            boxShadow: "0 2px 4px rgba(0,0,0,0.4)",
            minWidth: 22,
            textAlign: "center",
          }}
        >
          {scoreBadge}
        </div>
      )}

      {/* Dealer marker — bottom-right */}
      {isDealer && (
        <div
          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold"
          style={{
            background: "linear-gradient(135deg, #fbbf24, #b45309)",
            color: "#0f172a",
            border: "1.5px solid #fff",
            boxShadow: "0 2px 4px rgba(0,0,0,0.4)",
          }}
          title="Dealer"
        >
          D
        </div>
      )}
    </div>
  );
}
