import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { findAvatar } from "../../../lib/avatars";

/**
 * DOORDARSHAN KIT — the shared visual language for Hand Cricket's
 * "Doordarshan Rerun" theme.
 *
 * The reference is a worn recording of a 1983-World-Cup-era analog telecast:
 * sepia/amber grade, CRT scanlines, a boxy character-generator scorebug, a
 * rounded tube-TV bezel around the whole board. A cool, quiet ARTIFACT — a
 * recording, not a live event — which is what separates it from
 * `../pro/pro-kit.tsx`'s crisp, present-day broadcast chrome even though
 * both are technically "TV".
 *
 * FIXED LOOK regardless of the app's light/dark setting, same precedent as
 * the other two kits — an old tape doesn't get brighter in light mode.
 */

/* ── tokens ──────────────────────────────────────────────────────────────── */

export const DD = {
  /** Tube backdrop, deepest first. */
  bg0: "#120D08",
  bg1: "#1E140C",
  /** Screen/panel surface — warm CRT phosphor glow. */
  screen: "#2A1D10",
  screenHi: "#3A2814",
  /** TV bezel. */
  bezel: "#0A0705",
  /** Hairlines. */
  line: "rgba(232,198,140,0.16)",
  lineStrong: "rgba(232,198,140,0.28)",
  /** Phosphor ink ramp. */
  ink: "#F3E4C4",
  inkMid: "#C9AE80",
  inkLo: "#9C8460",
  /** Sepia/amber — primary emphasis, this theme's "gold". */
  amber: "#D98A3D",
  amberDeep: "#A85F1F",
  /** Muted period colour-bleed accent. */
  teal: "#4A8C82",
  /** Semantic — deliberately desaturated, period-appropriate. */
  live: "#C0392B",
  win: "#6FA36F",
  loss: "#C0392B",
  info: "#4A8C82",
} as const;

/** Per-side accent — two-colour-TV limited palette on purpose. */
export const DD_SIDES = [
  { light: "#E8B368", base: "#C1832F", deep: "#7A4F17" },
  { light: "#7FB0A8", base: "#4A8C82", deep: "#2A544D" },
  { light: "#C9A0D0", base: "#9B6EA3", deep: "#5E4064" },
  { light: "#A8C97F", base: "#7A9E4A", deep: "#4A6129" },
] as const;

export type DdSide = (typeof DD_SIDES)[number];

export function ddSideFor(index: number): DdSide {
  return DD_SIDES[index % DD_SIDES.length];
}

/* ── shell ───────────────────────────────────────────────────────────────── */

const DD_SURFACES = `
.dd-shell ::selection { background: ${DD.amber}55; color: ${DD.ink}; }
.dd-shell { caret-color: ${DD.amber}; scrollbar-color: ${DD.lineStrong} transparent; scrollbar-width: thin; }
.dd-shell ::-webkit-scrollbar { width: 10px; height: 10px; }
.dd-shell ::-webkit-scrollbar-track { background: transparent; }
.dd-shell ::-webkit-scrollbar-thumb {
  background: ${DD.lineStrong};
  border-radius: 99px;
  border: 3px solid transparent;
  background-clip: content-box;
}
.dd-shell *:focus-visible {
  outline: 2px solid ${DD.amber};
  outline-offset: 2px;
  box-shadow: none;
}
@keyframes dd-flicker {
  0%, 100% { opacity: 1; }
  92% { opacity: 1; }
  93% { opacity: 0.85; }
  94% { opacity: 1; }
}
@keyframes dd-scan {
  0% { background-position: 0 0; }
  100% { background-position: 0 8px; }
}
`;

/**
 * The tube-TV frame: a rounded bezel, a warm sepia backdrop, a moving
 * scanline overlay, and a vignette that darkens the corners the way a CRT's
 * own curvature does. All CSS — no raster asset.
 */
export function DoordarshanShell({
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
      className={`dd-shell relative flex flex-col overflow-hidden ${className}`}
      style={{
        background: `radial-gradient(ellipse 120% 90% at 50% 40%, ${DD.bg1} 0%, ${DD.bg0} 100%)`,
        color: DD.ink,
        animation: "dd-flicker 7s infinite",
        ...style,
      }}
    >
      <style>{DD_SURFACES}</style>
      {/* Scanlines — a slow-drifting repeating gradient. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.16) 0px, rgba(0,0,0,0.16) 1px, transparent 1px, transparent 3px)",
          animation: "dd-scan 0.4s linear infinite",
          mixBlendMode: "multiply",
          opacity: 0.5,
        }}
      />
      {/* Vignette — the tube's own darkened corners. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ boxShadow: "inset 0 0 140px 40px rgba(0,0,0,0.65)" }}
      />
      <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

/* ── surfaces ────────────────────────────────────────────────────────────── */

/** A panel of screen — the CRT phosphor surface everything sits on. */
export function DoordarshanScreen({
  children,
  className = "",
  style,
  glow = false,
  padded = true,
  dense = false,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  glow?: boolean;
  padded?: boolean;
  dense?: boolean;
}) {
  return (
    <div
      className={`relative rounded-md ${padded ? (dense ? "p-2.5" : "p-4") : ""} ${className}`}
      style={{
        background: `linear-gradient(165deg, ${DD.screenHi} 0%, ${DD.screen} 100%)`,
        border: `1px solid ${glow ? DD.amber : DD.line}`,
        boxShadow: glow ? `0 0 0 1px rgba(217,138,61,0.3), 0 6px 20px rgba(0,0,0,0.5)` : "0 5px 16px rgba(0,0,0,0.45)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Analog character-generator micro-label. */
export function DdLabel({ children, className = "", color = DD.inkLo }: { children: ReactNode; className?: string; color?: string }) {
  return (
    <div className={`font-crt text-[13px] uppercase leading-none ${className}`} style={{ letterSpacing: "0.1em", color }}>
      {children}
    </div>
  );
}

/** Label-over-value stat block — the value renders in the CRT terminal face. */
export function DdStat({
  label, value, sub, accent = DD.ink, size = "md", align = "left",
}: {
  label: string; value: ReactNode; sub?: ReactNode; accent?: string;
  size?: "sm" | "md" | "lg" | "xl"; align?: "left" | "center" | "right";
}) {
  const valueSize = size === "xl" ? "text-[46px]" : size === "lg" ? "text-[34px]" : size === "md" ? "text-[24px]" : "text-[18px]";
  return (
    <div style={{ textAlign: align }}>
      <DdLabel className="mb-0.5">{label}</DdLabel>
      <div className={`font-crt ${valueSize} leading-none tabular-nums`} style={{ color: accent }}>
        {value}
      </div>
      {sub != null && (
        <div className="mt-1 font-typewriter text-[10px]" style={{ color: DD.inkLo }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export function DdChip({ children, tone = "neutral", className = "" }: { children: ReactNode; tone?: "neutral" | "amber" | "live" | "win" | "loss" | "info"; className?: string }) {
  const tones: Record<string, { bg: string; fg: string; bd: string }> = {
    neutral: { bg: "rgba(232,198,140,0.08)", fg: DD.inkMid, bd: DD.line },
    amber: { bg: "rgba(217,138,61,0.16)", fg: DD.amber, bd: "rgba(217,138,61,0.45)" },
    live: { bg: "rgba(192,57,43,0.18)", fg: "#E08277", bd: "rgba(192,57,43,0.5)" },
    win: { bg: "rgba(111,163,111,0.16)", fg: DD.win, bd: "rgba(111,163,111,0.45)" },
    loss: { bg: "rgba(192,57,43,0.16)", fg: DD.loss, bd: "rgba(192,57,43,0.45)" },
    info: { bg: "rgba(74,140,130,0.16)", fg: DD.teal, bd: "rgba(74,140,130,0.45)" },
  };
  const t = tones[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded px-2 py-1 font-crt text-[13px] uppercase leading-none ${className}`}
      style={{ background: t.bg, color: t.fg, border: `1px solid ${t.bd}`, letterSpacing: "0.08em" }}
    >
      {children}
    </span>
  );
}

export function DdLive({ label = "ON AIR" }: { label?: string }) {
  return (
    <DdChip tone="live">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: DD.live }} />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: DD.live }} />
      </span>
      {label}
    </DdChip>
  );
}

/* ── controls ────────────────────────────────────────────────────────────── */

export function DdButton({
  children, onClick, variant = "primary", disabled = false, className = "", type = "button",
}: {
  children: ReactNode; onClick?: () => void; variant?: "primary" | "ghost" | "danger";
  disabled?: boolean; className?: string; type?: "button" | "submit";
}) {
  const styles: Record<string, CSSProperties> = {
    primary: {
      background: `linear-gradient(165deg, ${DD.amber}, ${DD.amberDeep})`,
      color: "#1A0F04",
      border: "1px solid rgba(243,228,196,0.4)",
      boxShadow: "0 4px 12px rgba(168,95,31,0.35)",
    },
    ghost: { background: "rgba(232,198,140,0.06)", color: DD.ink, border: `1px solid ${DD.lineStrong}` },
    danger: { background: "rgba(192,57,43,0.14)", color: "#E08277", border: "1px solid rgba(192,57,43,0.4)" },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded px-4 py-2.5 font-crt text-[15px] uppercase transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      style={{ letterSpacing: "0.1em", ...styles[variant] }}
    >
      {children}
    </button>
  );
}

export function DdIconButton({ children, onClick, title, className = "" }: { children: ReactNode; onClick?: () => void; title: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`grid h-8 w-8 place-items-center rounded transition hover:bg-white/5 active:scale-95 ${className}`}
      style={{ background: "rgba(232,198,140,0.05)", border: `1px solid ${DD.line}`, color: DD.inkMid }}
    >
      {children}
    </button>
  );
}

/* ── identity ────────────────────────────────────────────────────────────── */

export function DdAvatar({ name, avatar, side, size = 40, ring = false }: { name: string; avatar?: string; side: DdSide; size?: number; ring?: boolean }) {
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
  const option = findAvatar(avatar);
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => setImgFailed(false), [option?.src]);
  const showImage = !!option && !imgFailed;
  return (
    <div
      className="grid shrink-0 place-items-center overflow-hidden"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        borderRadius: 4,
        background: showImage ? undefined : `linear-gradient(165deg, ${side.light}, ${side.deep})`,
        color: "#140D06",
        fontFamily: "VT323, monospace",
        border: ring ? `2px solid ${DD.amber}` : `1px solid ${DD.lineStrong}`,
        filter: "sepia(0.35) contrast(1.05)",
      }}
    >
      {showImage ? (
        <img
          src={option!.src}
          alt=""
          aria-hidden
          className="w-full h-full object-cover scale-[1.25] origin-center"
          style={{ objectPosition: "50% 22%" }}
          onError={() => setImgFailed(true)}
          draggable={false}
        />
      ) : (
        initial
      )}
    </div>
  );
}

/* ── meters ──────────────────────────────────────────────────────────────── */

export function DdMeter({ value, max, accent = DD.amber, height = 6, label, valueText }: { value: number; max: number; accent?: string; height?: number; label?: string; valueText?: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      className="w-full overflow-hidden rounded-sm"
      style={{ height, background: "rgba(232,198,140,0.1)" }}
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuetext={valueText}
    >
      <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, background: accent }} />
    </div>
  );
}

export function DdDivider({ className = "" }: { className?: string }) {
  return <div className={className} style={{ height: 1, background: DD.line }} />;
}

/* ── icons (blocky, low-resolution silhouettes — a character generator's
   idea of a glyph, not a stroked-vector one) ────────────────────────────── */

export function IconClose({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <path d="M2 2h2v2h2v2h4V4h2V2h2v2h-2v2h-2v2h2v2h2v2h-2v-2h-2v-2H6v2H4v2H2v-2h2v-2h2V6H4V4H2V2Z" fill="currentColor" />
    </svg>
  );
}

export function IconHelp({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <rect x="1" y="1" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <rect x="6" y="4" width="4" height="2" fill="currentColor" />
      <rect x="8" y="6" width="2" height="3" fill="currentColor" />
      <rect x="6" y="11" width="4" height="2" fill="currentColor" />
    </svg>
  );
}

export function IconTrophy({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <rect x="4" y="2" width="8" height="5" fill="currentColor" />
      <rect x="2" y="3" width="2" height="3" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <rect x="12" y="3" width="2" height="3" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <rect x="7" y="7" width="2" height="4" fill="currentColor" />
      <rect x="5" y="12" width="6" height="2" fill="currentColor" />
    </svg>
  );
}

export function IconClock({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <rect x="1" y="1" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <rect x="7" y="4" width="2" height="5" fill="currentColor" />
      <rect x="8" y="8" width="3" height="2" fill="currentColor" />
    </svg>
  );
}

export function IconFlame({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <path d="M8 1c1 3 4 4 4 8a4 4 0 0 1-8 0c0-1 1-2 2-2 0 2 1 3 1 3-1-3 0-6 1-9Z" fill="currentColor" />
    </svg>
  );
}

export function IconSkin({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <rect x="1" y="2" width="14" height="2" fill="currentColor" />
      <rect x="1" y="7" width="14" height="2" fill="currentColor" />
      <rect x="1" y="12" width="9" height="2" fill="currentColor" />
      <circle cx="13" cy="13" r="2" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function IconBat({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <rect x="9" y="1" width="3" height="6" fill="currentColor" transform="rotate(35 10.5 4)" />
      <rect x="3" y="8" width="5" height="6" rx="1.5" fill="currentColor" transform="rotate(35 5.5 11)" />
    </svg>
  );
}

export function IconBall({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <circle cx="8" cy="8" r="6.5" fill="currentColor" opacity="0.85" />
      <rect x="7" y="1.5" width="2" height="13" fill={DD.bg0} opacity="0.5" />
    </svg>
  );
}

export function IconWicket({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <rect x="3" y="3" width="1.6" height="12" fill="currentColor" />
      <rect x="7.2" y="3" width="1.6" height="12" fill="currentColor" />
      <rect x="11.4" y="3" width="1.6" height="12" fill="currentColor" />
      <rect x="2" y="1.5" width="12" height="1.6" fill="currentColor" />
    </svg>
  );
}
