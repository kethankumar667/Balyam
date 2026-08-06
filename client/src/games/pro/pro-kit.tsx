import type { CSSProperties, ReactNode } from "react";

/**
 * BROADCAST KIT — the shared visual language for the "professional" skin.
 *
 * The reference is a live sports broadcast overlay: a dark stadium backdrop,
 * hairline-bordered panels floating on it, wide-tracked uppercase micro-labels,
 * and big tabular numerals that never reflow as a score ticks. Hand Cricket and
 * RPS both build on this so they read as two events on one network rather than
 * two unrelated apps.
 *
 * DARK IN BOTH THEMES, on purpose. A broadcast overlay is dark because the
 * pitch behind it is; a light variant would not read as one. This matches the
 * precedent already in the codebase — UNO's stadium chrome is dark maroon
 * regardless of theme. Only the surrounding app chrome follows light/dark.
 *
 * No emoji anywhere. Every glyph here is a stroked SVG so weight and colour
 * stay under our control and nothing renders as a different picture per OS.
 */

/* ── tokens ──────────────────────────────────────────────────────────────── */

export const PRO = {
  /** Backdrop ladder — deepest first. */
  bg0: "#070F1C",
  bg1: "#0B1728",
  /** Panel surfaces. */
  panel: "#101F35",
  panelHi: "#16294380",
  /** Hairlines. */
  line: "rgba(255,255,255,0.09)",
  lineStrong: "rgba(255,255,255,0.16)",
  /** Ink. */
  ink: "#F2F6FC",
  inkMid: "#A7B6CC",
  inkLo: "#6F829B",
  /** Broadcast gold — primary emphasis. */
  gold: "#F5C451",
  goldDeep: "#C89227",
  /** Semantic. */
  live: "#FF3B3B",
  win: "#34D399",
  loss: "#F87171",
  info: "#5AA9F0",
} as const;

/** Per-side team accents. Index 0 = "you", 1 = opponent, then extras. */
export const PRO_SIDES = [
  { light: "#7FD4FF", base: "#2E9BE0", deep: "#14567F" },
  { light: "#FFAE8F", base: "#E0592E", deep: "#8A2E14" },
  { light: "#C9A0F5", base: "#9B5FE0", deep: "#5A2E96" },
  { light: "#8FE6B0", base: "#2FA96B", deep: "#166B41" },
] as const;

export type ProSide = (typeof PRO_SIDES)[number];

export function sideFor(index: number): ProSide {
  return PRO_SIDES[index % PRO_SIDES.length];
}

/* ── shell ───────────────────────────────────────────────────────────────── */

/**
 * Full-bleed stadium backdrop.
 *
 * Three stacked layers, cheapest first: a vertical base ramp, one warm pool of
 * light where the action sits (the "floodlight"), and a vignette that keeps the
 * corners from competing with the panels. All CSS gradients — no raster, so it
 * costs nothing to ship and scales to any viewport.
 */
export function ProShell({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`relative flex flex-col overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(180deg, ${PRO.bg1} 0%, ${PRO.bg0} 100%)`,
        color: PRO.ink,
        ...style,
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 30%, rgba(90,150,220,0.16), transparent 68%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 120% 80% at 50% 50%, transparent 45%, rgba(3,8,16,0.72) 100%)",
        }}
      />
      <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

/* ── surfaces ────────────────────────────────────────────────────────────── */

export function ProPanel({
  children,
  className = "",
  style,
  glow = false,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Gold rim + bloom — reserve for the one panel that currently matters. */
  glow?: boolean;
  padded?: boolean;
}) {
  return (
    <div
      className={`relative rounded-2xl ${padded ? "p-4" : ""} ${className}`}
      style={{
        background: `linear-gradient(168deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015)), ${PRO.panel}`,
        border: `1px solid ${glow ? "rgba(245,196,81,0.55)" : PRO.line}`,
        boxShadow: glow
          ? "0 8px 30px rgba(0,0,0,0.45), 0 0 26px rgba(245,196,81,0.20)"
          : "0 6px 22px rgba(0,0,0,0.38)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Wide-tracked uppercase micro-label. The broadcast tell. */
export function ProLabel({
  children,
  className = "",
  color = PRO.inkLo,
}: {
  children: ReactNode;
  className?: string;
  color?: string;
}) {
  return (
    <div
      className={`text-[10px] font-extrabold uppercase leading-none ${className}`}
      style={{ letterSpacing: "0.16em", color }}
    >
      {children}
    </div>
  );
}

/**
 * Label-over-value stat block.
 *
 * `tabular-nums` is load-bearing, not decoration: a score that ticks 9 → 10
 * must not shift the blocks beside it, and proportional digits do exactly that.
 */
export function ProStat({
  label,
  value,
  sub,
  accent = PRO.ink,
  size = "md",
  align = "left",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: string;
  size?: "sm" | "md" | "lg" | "xl";
  align?: "left" | "center" | "right";
}) {
  const valueSize =
    size === "xl" ? "text-[38px]" : size === "lg" ? "text-[27px]" : size === "md" ? "text-[19px]" : "text-[15px]";
  return (
    <div style={{ textAlign: align }}>
      <ProLabel className="mb-1.5">{label}</ProLabel>
      <div
        className={`${valueSize} font-black leading-none tabular-nums`}
        style={{ color: accent }}
      >
        {value}
      </div>
      {sub != null && (
        <div className="mt-1 text-[11px] font-semibold" style={{ color: PRO.inkLo }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export function ProChip({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "neutral" | "gold" | "live" | "win" | "loss" | "info";
  className?: string;
}) {
  const tones: Record<string, { bg: string; fg: string; bd: string }> = {
    neutral: { bg: "rgba(255,255,255,0.07)", fg: PRO.inkMid, bd: PRO.line },
    gold: { bg: "rgba(245,196,81,0.14)", fg: PRO.gold, bd: "rgba(245,196,81,0.42)" },
    live: { bg: "rgba(255,59,59,0.16)", fg: "#FF8A8A", bd: "rgba(255,59,59,0.45)" },
    win: { bg: "rgba(52,211,153,0.15)", fg: PRO.win, bd: "rgba(52,211,153,0.42)" },
    loss: { bg: "rgba(248,113,113,0.15)", fg: PRO.loss, bd: "rgba(248,113,113,0.42)" },
    info: { bg: "rgba(90,169,240,0.15)", fg: PRO.info, bd: "rgba(90,169,240,0.42)" },
  };
  const t = tones[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase leading-none ${className}`}
      style={{ background: t.bg, color: t.fg, border: `1px solid ${t.bd}`, letterSpacing: "0.12em" }}
    >
      {children}
    </span>
  );
}

/** Pulsing red dot + LIVE. Respects prefers-reduced-motion via index.css. */
export function ProLive({ label = "Live" }: { label?: string }) {
  return (
    <ProChip tone="live">
      <span className="relative flex h-1.5 w-1.5">
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
          style={{ background: PRO.live }}
        />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: PRO.live }} />
      </span>
      {label}
    </ProChip>
  );
}

/* ── controls ────────────────────────────────────────────────────────────── */

export function ProButton({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  className = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  const styles: Record<string, CSSProperties> = {
    primary: {
      background: `linear-gradient(168deg, ${PRO.gold}, ${PRO.goldDeep})`,
      color: "#2A1D05",
      border: "1px solid rgba(255,235,180,0.55)",
      boxShadow: "0 4px 14px rgba(245,196,81,0.28)",
    },
    ghost: {
      background: "rgba(255,255,255,0.06)",
      color: PRO.ink,
      border: `1px solid ${PRO.lineStrong}`,
    },
    danger: {
      background: "rgba(248,113,113,0.14)",
      color: "#FCA5A5",
      border: "1px solid rgba(248,113,113,0.42)",
    },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-4 py-2.5 text-[12px] font-extrabold uppercase transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      style={{ letterSpacing: "0.12em", ...styles[variant] }}
    >
      {children}
    </button>
  );
}

export function ProIconButton({
  children,
  onClick,
  title,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  title: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`grid h-8 w-8 place-items-center rounded-lg transition hover:bg-white/10 active:scale-95 ${className}`}
      style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${PRO.line}`, color: PRO.inkMid }}
    >
      {children}
    </button>
  );
}

/* ── identity ────────────────────────────────────────────────────────────── */

/** Gradient initial disc. Falls back to "?" so a missing name never renders empty. */
export function ProAvatar({
  name,
  side,
  size = 40,
  ring = false,
}: {
  name: string;
  side: ProSide;
  size?: number;
  /** Gold ring — marks whose turn it is. */
  ring?: boolean;
}) {
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full font-black"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: `linear-gradient(168deg, ${side.light}, ${side.deep})`,
        color: "#08111F",
        border: ring ? `2px solid ${PRO.gold}` : "2px solid rgba(255,255,255,0.5)",
        boxShadow: ring
          ? `0 0 0 3px rgba(245,196,81,0.25), 0 4px 12px rgba(0,0,0,0.5)`
          : "0 4px 12px rgba(0,0,0,0.45)",
      }}
    >
      {initial}
    </div>
  );
}

/* ── meters ──────────────────────────────────────────────────────────────── */

/** Segmented progress — reads as "3 of 5" at a glance, unlike a bare bar. */
export function ProPips({
  total,
  filled,
  accent = PRO.gold,
  size = 8,
}: {
  total: number;
  filled: number;
  accent?: string;
  size?: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: Math.max(0, total) }, (_, i) => (
        <span
          key={i}
          className="rounded-full transition-all"
          style={{
            width: size,
            height: size,
            background: i < filled ? accent : "rgba(255,255,255,0.14)",
            boxShadow: i < filled ? `0 0 8px ${accent}66` : "none",
          }}
        />
      ))}
    </div>
  );
}

export function ProMeter({
  value,
  max,
  accent = PRO.gold,
  height = 6,
}: {
  value: number;
  max: number;
  accent?: string;
  height?: number;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      className="w-full overflow-hidden rounded-full"
      style={{ height, background: "rgba(255,255,255,0.10)" }}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${accent}, ${accent}CC)` }}
      />
    </div>
  );
}

export function ProDivider({ className = "" }: { className?: string }) {
  return <div className={className} style={{ height: 1, background: PRO.line }} />;
}

/* ── icons (stroked, currentColor) ───────────────────────────────────────── */

const ico = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconClose({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...ico} aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function IconHelp({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...ico} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.8-.9 1.4v.4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function IconTrophy({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...ico} aria-hidden>
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M17 5h2.5a2.5 2.5 0 0 1-2.5 4.5M7 5H4.5A2.5 2.5 0 0 0 7 9.5" />
      <path d="M12 14v3M9 20h6M10 17h4" />
    </svg>
  );
}

export function IconClock({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...ico} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function IconFlame({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...ico} aria-hidden>
      <path d="M12 3s4.5 4 4.5 8a4.5 4.5 0 0 1-9 0c0-1.2.4-2.3 1-3.2.4 1 1.1 1.7 2 2 0-2.6.8-5 1.5-6.8Z" />
    </svg>
  );
}

export function IconSkin({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...ico} aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h10" />
      <circle cx="18" cy="17" r="2.5" />
    </svg>
  );
}

export function IconBat({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...ico} aria-hidden>
      <path d="M14.5 3.5 20 9l-7.5 7.5-5.5-5.5L14.5 3.5Z" />
      <path d="M7 11.5 4.5 14a2.1 2.1 0 0 0 0 3l2.5 2.5a2.1 2.1 0 0 0 3 0L12.5 17" />
    </svg>
  );
}

export function IconBall({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...ico} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M7 4.8c1.6 2.2 2.4 4.6 2.4 7.2S8.6 17 7 19.2M17 4.8c-1.6 2.2-2.4 4.6-2.4 7.2s.8 5 2.4 7.2" />
    </svg>
  );
}

export function IconWicket({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...ico} aria-hidden>
      <path d="M8 8v12M12 8v12M16 8v12" />
      <path d="M6.5 6.5h11" />
    </svg>
  );
}
