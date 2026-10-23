import type { CSSProperties, ReactNode } from "react";
import { cn } from "../../../lib/cn";

/**
 * BHALYAM Live Score primitives. Legacy identifiers are retained for saved preferences.
 * Violet score panels and the BHALYAM masthead give this skin its own identity.
 */

export const CB = {
  // Live Score violet ramp
  green: "#6D28D9",         // Primary action accent
  greenLight: "#A78BFA",    // Lighter highlight green
  greenDeep: "#3B0764",     // Match bar subheaders, deep accents
  greenDark: "#24103F",     // Top app bar / header dark green
  greenBg: "#F3E8FF",       // Light green alert background
  greenBgDark: "#211638",   // Dark green alert background

  // Surfaces & Backdrops
  bg: "#F5F0FA",            // Light canvas
  bgDark: "#15101F",        // Dark canvas
  card: "#FFFFFF",          // White card surface
  cardDark: "#251C33",      // Dark mode card surface
  cardMuted: "#F5F7F8",     // Zebra row / sunken well surface
  cardMutedDark: "#1C1527", // Dark zebra row surface

  // Borders
  border: "#E3E6E8",        // Light card divider / border
  borderDark: "#43334F",    // Dark card divider / border
  borderStrong: "#CCD0D4",  // Crisp header border

  // Typography Colors
  text: "#222222",          // Primary body / headings
  textDark: "#FFFFFF",      // Dark mode primary text
  textSec: "#666666",       // Secondary text, overs, strike rates
  textSecDark: "#A0A5A8",   // Dark mode secondary text
  textMuted: "#888888",     // Muted labels, timestamps
  textMutedDark: "#6B7280", // Dark mode muted labels

  // Event Badges & Accents
  live: "#CB0606",          // Pulsing live red / Wicket red
  four: "#0066CC",          // 4s boundary blue
  six: "#E65100",           // 6s maximum vivid orange
  accent: "#FFC107",        // Amber / Star gold
  amberBg: "#FFF8E1",       // Amber alert background
} as const;

/* ── Icons (Pure SVG — Zero Lucide Sparkles) ──────────────────────────────── */

export function IconBat({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m14 7 3-3a1.5 1.5 0 0 1 2 2l-3 3" />
      <path d="m6.5 14.5 7.5-7.5" />
      <path d="M4 17a2.5 2.5 0 0 0 3.5 3.5L16 12 12 8 4 17z" />
      <path d="M2 22l3-3" />
    </svg>
  );
}

export function IconBall({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 5.6a9 9 0 0 1 12.8 12.8" />
      <path d="M7 17a9 9 0 0 1 10-10" />
    </svg>
  );
}

export function IconWicket({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M5 4v16" />
      <path d="M12 4v16" />
      <path d="M19 4v16" />
      <path d="M3 4h18" />
    </svg>
  );
}

export function IconTrophy({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.45 1-1 1H7v4h10v-4h-2c-.55 0-1-.45-1-1v-2.34" />
      <path d="M6 4h12v5a6 6 0 0 1-12 0V4z" />
    </svg>
  );
}

export function IconFlame({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

export function IconCoin({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" strokeDasharray="3 3" />
    </svg>
  );
}

/* ── Shell & Card Surfaces ────────────────────────────────────────────────── */

export function CricbuzzShell({
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
      className={cn(
        "flex flex-col gap-2 p-2 sm:gap-3 sm:p-3 bg-[#F5F0FA] text-[#222222] antialiased selection:bg-[#6D28D9] selection:text-white dark:bg-[#15101F] dark:text-[#EAEAEA]",
        className
      )}
      style={{ fontFamily: "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", ...style }}
    >
      {children}
    </div>
  );
}

export function CricbuzzCard({
  children,
  className = "",
  highlight = false,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  highlight?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-lg border bg-white shadow-xs transition-colors dark:bg-[#251C33]",
        highlight
          ? "border-[#6D28D9] ring-1 ring-[#6D28D9]"
          : "border-[#E3E6E8] dark:border-[#43334F]",
        onClick && "cursor-pointer hover:border-[#6D28D9] active:scale-[0.99]",
        className
      )}
    >
      {children}
    </div>
  );
}

/* ── Navigation Tabs ──────────────────────────────────────────────────────── */

export interface CricbuzzTabItem {
  id: string;
  label: string;
  badge?: string | number;
}

export function CricbuzzTabs({
  tabs,
  activeTab,
  onChange,
  className = "",
}: {
  tabs: readonly CricbuzzTabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex border-b border-[#E3E6E8] bg-white px-2 dark:border-[#43334F] dark:bg-[#251C33]", className)}>
      <div className="flex space-x-1 overflow-x-auto no-scrollbar py-1">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                "relative flex items-center gap-1.5 whitespace-nowrap px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider transition-colors",
                isActive
                  ? "text-[#6D28D9] dark:text-[#A78BFA]"
                  : "text-[#666666] hover:text-[#222222] dark:text-[#9E9E9E] dark:hover:text-white"
              )}
            >
              <span>{tab.label}</span>
              {tab.badge != null && (
                <span className={cn(
                  "rounded-full px-1.5 py-0.2 text-[10px] font-extrabold",
                  isActive
                    ? "bg-[#6D28D9] text-white"
                    : "bg-[#E0E0E0] text-[#444444] dark:bg-[#43334F] dark:text-[#CCCCCC]"
                )}>
                  {tab.badge}
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#6D28D9] rounded-t-sm" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Live Badge & Chips ───────────────────────────────────────────────────── */

export function CricbuzzLiveIndicator() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#CB0606] px-2 py-0.5 text-[11px] font-extrabold tracking-widest text-white uppercase shadow-xs">
      <span className="h-2 w-2 animate-ping rounded-full bg-white opacity-75" />
      <span>LIVE</span>
    </span>
  );
}

export function CricbuzzChip({
  children,
  tone = "neutral",
  size = "md",
}: {
  children: ReactNode;
  tone?: "neutral" | "green" | "red" | "blue" | "amber";
  size?: "sm" | "md";
}) {
  const toneClass = {
    neutral: "bg-[#F5F0FA] text-[#444444] dark:bg-[#242F2B] dark:text-[#D1D5DB]",
    green: "bg-[#F3E8FF] text-[#00796B] dark:bg-[#211638] dark:text-[#4DB6AC] border border-[#EDE9FE] dark:border-[#5B21B6]",
    red: "bg-[#FFEBEE] text-[#C62828] dark:bg-[#2D1618] dark:text-[#EF5350] border border-[#FECACA] dark:border-[#991B1B]",
    blue: "bg-[#E3F2FD] text-[#1565C0] dark:bg-[#13283E] dark:text-[#64B5F6] border border-[#BFDBFE] dark:border-[#1E40AF]",
    amber: "bg-[#FFF8E1] text-[#B78103] dark:bg-[#2E2512] dark:text-[#FBBF24] border border-[#FDE68A] dark:border-[#B45309]",
  }[tone];

  const sizeClass = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-[12px]";

  return (
    <span className={cn("inline-flex items-center gap-1 font-semibold rounded-md uppercase tracking-wider", toneClass, sizeClass)}>
      {children}
    </span>
  );
}

/* ── Ball-by-Ball Chip (0, 1, 2, 4, 6, W) ─────────────────────────────────── */

export function CricbuzzBallChip({
  value,
  isWicket = false,
  size = "md",
}: {
  value: number | string;
  isWicket?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const dims = size === "lg" ? "h-9 w-9 text-[15px]" : size === "md" ? "h-7 w-7 text-[13px]" : "h-6 w-6 text-[11px]";

  if (isWicket || value === "W" || value === "w") {
    return (
      <span className={cn("grid place-items-center rounded-full font-black text-white bg-[#CB0606] shadow-xs shrink-0", dims)}>
        W
      </span>
    );
  }

  const num = typeof value === "number" ? value : parseInt(String(value), 10);

  if (num === 4) {
    return (
      <span className={cn("grid place-items-center rounded-full font-black text-white bg-[#0066CC] shadow-xs shrink-0", dims)}>
        4
      </span>
    );
  }

  if (num === 6) {
    return (
      <span className={cn("grid place-items-center rounded-full font-black text-white bg-[#E65100] shadow-xs shrink-0", dims)}>
        6
      </span>
    );
  }

  if (num === 0 || value === "•" || value === ".") {
    return (
      <span className={cn("grid place-items-center rounded-full font-medium text-[#777777] bg-[#EEEEEE] border border-[#E0E0E0] dark:bg-[#43334F] dark:border-[#3D4744] dark:text-[#A0A5A8] shrink-0", dims)}>
        •
      </span>
    );
  }

  return (
    <span className={cn("grid place-items-center rounded-full font-bold text-[#222222] bg-white border border-[#D0D4D9] dark:bg-[#252F2C] dark:border-[#3A4744] dark:text-white shrink-0", dims)}>
      {value}
    </span>
  );
}

/* ── Team Short Badge ─────────────────────────────────────────────────────── */

export function CricbuzzTeamBadge({
  short,
  color,
  size = "md",
}: {
  short: string;
  color?: string;
  size?: "sm" | "md" | "lg";
}) {
  const dims = size === "lg" ? "w-12 h-8 text-[14px]" : size === "md" ? "w-10 h-7 text-[12px]" : "w-8 h-5 text-[10px]";
  const bgCol = color || "#6D28D9";

  return (
    <span
      className={cn("grid place-items-center rounded font-extrabold tracking-wider text-white shadow-xs shrink-0", dims)}
      style={{ backgroundColor: bgCol, textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}
    >
      {short}
    </span>
  );
}

/* ── Cricbuzz Button ──────────────────────────────────────────────────────── */

export function CricbuzzButton({
  children,
  onClick,
  disabled = false,
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
  type?: "button" | "submit";
}) {
  const baseClass = "inline-flex items-center justify-center font-bold uppercase tracking-wider rounded-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

  const variantClass = {
    primary: "bg-[#6D28D9] hover:bg-[#5B21B6] text-white shadow-xs",
    secondary: "bg-[#3B0764] hover:bg-[#24103F] text-white shadow-xs",
    danger: "bg-[#CB0606] hover:bg-[#A80505] text-white shadow-xs",
    outline: "border border-[#6D28D9] text-[#6D28D9] hover:bg-[#F3E8FF] dark:hover:bg-[#211638] dark:text-[#A78BFA] dark:border-[#A78BFA]",
  }[variant];

  const sizeClass = {
    sm: "px-3 py-1.5 text-[12px] min-h-[36px]",
    md: "px-4 py-2 text-[13px] min-h-[44px]",
    lg: "px-6 py-3 text-[15px] min-h-[50px]",
  }[size];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(baseClass, variantClass, sizeClass, className)}
    >
      {children}
    </button>
  );
}
