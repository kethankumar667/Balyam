import React from "react";
import type { DotsBoxesColor } from "@shared/types";

export type DotsBoxesSkin = "notebook" | "neon";

export interface DotsBoxesPlayerTheme {
  id: number;
  colorKey: DotsBoxesColor;
  name: string;
  primary: string;
  light: string;
  dark: string;
  fill: string;
  glow: string;
  border: string;
  textClass: string;
  bgClass: string;
  fontFamily?: string;
}

/**
 * 6 Distinct authentic student handwriting styles
 * Sourced via Google Fonts in index.html
 */
export const NOTEBOOK_HANDWRITING_FONTS = [
  "'Caveat', cursive",
  "'Kalam', cursive",
  "'Patrick Hand', cursive",
  "'Architects Daughter', cursive",
  "'Indie Flower', cursive",
  "'Gochi Hand', cursive",
] as const;

export function getHandwritingFont(index: number): string {
  const safeIdx = ((index % NOTEBOOK_HANDWRITING_FONTS.length) + NOTEBOOK_HANDWRITING_FONTS.length) % NOTEBOOK_HANDWRITING_FONTS.length;
  return NOTEBOOK_HANDWRITING_FONTS[safeIdx];
}

/**
 * 1. Neon Dark Arcade Theme Palettes (Vibrant & Bright)
 */
export const DOTSBOXES_NEON_THEMES: DotsBoxesPlayerTheme[] = [
  {
    id: 0,
    colorKey: "blue",
    name: "Blue",
    primary: "#3B82F6",
    light: "#60A5FA",
    dark: "#1D4ED8",
    fill: "rgba(59, 130, 246, 0.22)",
    glow: "rgba(59, 130, 246, 0.55)",
    border: "#3B82F6",
    textClass: "text-blue-400",
    bgClass: "bg-blue-500",
  },
  {
    id: 1,
    colorKey: "gold",
    name: "Orange",
    primary: "#F59E0B",
    light: "#FBBF24",
    dark: "#D97706",
    fill: "rgba(245, 158, 11, 0.22)",
    glow: "rgba(245, 158, 11, 0.55)",
    border: "#F59E0B",
    textClass: "text-amber-400",
    bgClass: "bg-amber-500",
  },
  {
    id: 2,
    colorKey: "purple",
    name: "Purple",
    primary: "#A855F7",
    light: "#C084FC",
    dark: "#7E22CE",
    fill: "rgba(168, 85, 247, 0.22)",
    glow: "rgba(168, 85, 247, 0.55)",
    border: "#A855F7",
    textClass: "text-purple-400",
    bgClass: "bg-purple-500",
  },
  {
    id: 3,
    colorKey: "green",
    name: "Green",
    primary: "#10B981",
    light: "#34D399",
    dark: "#047857",
    fill: "rgba(16, 185, 129, 0.22)",
    glow: "rgba(16, 185, 129, 0.55)",
    border: "#10B981",
    textClass: "text-emerald-400",
    bgClass: "bg-emerald-500",
  },
  {
    id: 4,
    colorKey: "pink",
    name: "Red",
    primary: "#EF4444",
    light: "#F87171",
    dark: "#B91C1C",
    fill: "rgba(239, 68, 68, 0.22)",
    glow: "rgba(239, 68, 68, 0.55)",
    border: "#EF4444",
    textClass: "text-red-400",
    bgClass: "bg-red-500",
  },
  {
    id: 5,
    colorKey: "cyan",
    name: "Cyan",
    primary: "#06B6D4",
    light: "#22D3EE",
    dark: "#0891B2",
    fill: "rgba(6, 182, 212, 0.22)",
    glow: "rgba(6, 182, 212, 0.55)",
    border: "#06B6D4",
    textClass: "text-cyan-400",
    bgClass: "bg-cyan-500",
  },
];

/**
 * 2. School Notebook Pen Themes (Bright, Crisp & Vivid on Paper)
 */
export const DOTSBOXES_NOTEBOOK_THEMES: DotsBoxesPlayerTheme[] = [
  {
    id: 0,
    colorKey: "blue",
    name: "Blue",
    primary: "#2563EB", // Bright Vivid Blue Pen
    light: "#60A5FA",
    dark: "#1D4ED8",
    fill: "rgba(37, 99, 235, 0.12)",
    glow: "rgba(37, 99, 235, 0.35)",
    border: "#2563EB",
    textClass: "text-blue-600",
    bgClass: "bg-blue-600",
    fontFamily: NOTEBOOK_HANDWRITING_FONTS[0],
  },
  {
    id: 1,
    colorKey: "gold",
    name: "Orange",
    primary: "#EA580C", // Bright Vivid Gel Orange
    light: "#FB923C",
    dark: "#C2410C",
    fill: "rgba(234, 88, 12, 0.12)",
    glow: "rgba(234, 88, 12, 0.35)",
    border: "#EA580C",
    textClass: "text-orange-600",
    bgClass: "bg-orange-600",
    fontFamily: NOTEBOOK_HANDWRITING_FONTS[1],
  },
  {
    id: 2,
    colorKey: "purple",
    name: "Purple",
    primary: "#9333EA", // Bright Electric Purple Gel
    light: "#C084FC",
    dark: "#7E22CE",
    fill: "rgba(147, 51, 234, 0.12)",
    glow: "rgba(147, 51, 234, 0.35)",
    border: "#9333EA",
    textClass: "text-purple-600",
    bgClass: "bg-purple-600",
    fontFamily: NOTEBOOK_HANDWRITING_FONTS[2],
  },
  {
    id: 3,
    colorKey: "green",
    name: "Green",
    primary: "#16A34A", // Bright Emerald Green
    light: "#4ADE80",
    dark: "#15803D",
    fill: "rgba(22, 163, 74, 0.12)",
    glow: "rgba(22, 163, 74, 0.35)",
    border: "#16A34A",
    textClass: "text-emerald-600",
    bgClass: "bg-emerald-600",
    fontFamily: NOTEBOOK_HANDWRITING_FONTS[3],
  },
  {
    id: 4,
    colorKey: "pink",
    name: "Red",
    primary: "#DC2626", // Bright Crimson Red Pen
    light: "#F87171",
    dark: "#B91C1C",
    fill: "rgba(220, 38, 38, 0.12)",
    glow: "rgba(220, 38, 38, 0.35)",
    border: "#DC2626",
    textClass: "text-red-600",
    bgClass: "bg-red-600",
    fontFamily: NOTEBOOK_HANDWRITING_FONTS[4],
  },
  {
    id: 5,
    colorKey: "cyan",
    name: "Cyan",
    primary: "#0284C7", // Bright Sky Blue / Cyan Pen
    light: "#38BDF8",
    dark: "#0369A1",
    fill: "rgba(2, 132, 199, 0.12)",
    glow: "rgba(2, 132, 199, 0.35)",
    border: "#0284C7",
    textClass: "text-sky-600",
    bgClass: "bg-sky-600",
    fontFamily: NOTEBOOK_HANDWRITING_FONTS[5],
  },
];

export const DOTSBOXES_THEMES = DOTSBOXES_NEON_THEMES;

export function getPlayerTheme(index: number, skin: DotsBoxesSkin = "neon"): DotsBoxesPlayerTheme {
  const list = skin === "notebook" ? DOTSBOXES_NOTEBOOK_THEMES : DOTSBOXES_NEON_THEMES;
  const safeIdx = ((index % list.length) + list.length) % list.length;
  return list[safeIdx];
}

export function getPlayerThemeByColor(
  color: DotsBoxesColor | string | undefined,
  skin: DotsBoxesSkin = "neon",
  seatIndex: number = 0
): DotsBoxesPlayerTheme | null {
  if (!color) return null;
  const list = skin === "notebook" ? DOTSBOXES_NOTEBOOK_THEMES : DOTSBOXES_NEON_THEMES;
  const found = list.find((t) => t.colorKey === color || t.name.toLowerCase().includes(color.toLowerCase()));
  if (!found) return null;
  if (skin === "notebook") {
    return {
      ...found,
      fontFamily: getHandwritingFont(seatIndex),
    };
  }
  return found;
}

/**
 * Derives player initials:
 * - Multi-word: 1st letter of first name + 1st letter of last name (e.g. "Kethan Kumar" -> "KK")
 * - Single word: 1st letter (e.g. "Monica" -> "M", "kethan" -> "K")
 */
export function getPlayerInitials(name: string): string {
  const trimmed = (name || "").trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0].charAt(0);
    const last = parts[parts.length - 1].charAt(0);
    return (first + last).toUpperCase();
  }
  return parts[0].charAt(0).toUpperCase();
}

/**
 * Branded Neon "DOTS & BOXES" Logo Badge (Arcade Mode)
 */
export function DotsBoxesNeonLogo({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative inline-flex items-center justify-center px-4 py-1.5 rounded-xl border border-sky-400/80 shadow-[0_0_15px_rgba(56,189,248,0.3)] bg-gradient-to-r from-blue-950/80 via-slate-900/90 to-indigo-950/80 ${className}`}
    >
      <span className="font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-white to-pink-300 text-lg md:text-xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
        DOTS &amp; BOXES
      </span>
      <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_8px_#EC4899]" />
      <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_#38BDF8]" />
    </div>
  );
}

/**
 * Branded Hand-Drawn Notebook "DOTS & BOXES" Title (School Nostalgia Mode)
 * Matches reference image with blue and red hatch sketched lettering
 */
export function DotsBoxesNotebookLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex flex-col items-center select-none font-['Architects_Daughter',cursive] ${className}`}>
      <div className="flex items-center gap-1.5">
        <span className="text-xl sm:text-2xl md:text-3xl font-black tracking-wider text-[#1E3A8A] drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)] underline decoration-wavy decoration-[#3B82F6]/60">
          DOTS
        </span>
        <span className="text-lg sm:text-xl md:text-2xl font-black text-[#8B5CF6]">
          &amp;
        </span>
        <span className="text-xl sm:text-2xl md:text-3xl font-black tracking-wider text-[#DC2626] drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)]">
          BOXES
        </span>
      </div>
      <div className="flex items-center gap-1 -mt-1 opacity-70">
        <span className="w-1.5 h-1.5 rounded-full bg-[#1E3A8A]" />
        <span className="w-8 h-0.5 bg-[#DC2626] rounded-full" />
        <span className="w-1.5 h-1.5 rounded-full bg-[#1E3A8A]" />
      </div>
    </div>
  );
}

/**
 * Realistic Spiral Wire Binder Rings (Desktop Left / Mobile Top)
 */
export function SpiralBinderRings({
  orientation = "vertical",
  count = 14,
  className = "",
}: {
  orientation?: "vertical" | "horizontal";
  count?: number;
  className?: string;
}) {
  if (orientation === "horizontal") {
    return (
      <div className={`flex items-center justify-between w-full px-4 py-2 pointer-events-none ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex flex-col items-center">
            {/* Ring Hole */}
            <div className="w-3 h-3 rounded-full bg-stone-900/60 shadow-inner border border-stone-700/50" />
            {/* Metal Ring */}
            <div className="w-2 h-6 -my-1 rounded-full bg-gradient-to-r from-slate-400 via-white to-slate-500 shadow-md border border-slate-600/60 z-10" />
            {/* Paper Shadow */}
            <div className="w-3 h-1 bg-black/20 blur-[1px] rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-between h-full py-4 px-2 pointer-events-none select-none ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="relative flex items-center justify-center my-1.5">
          {/* Hole punch */}
          <div className="w-3.5 h-3.5 rounded-full bg-[#3F3124] shadow-inner border border-stone-800/80" />
          {/* Silver wire spiral coil */}
          <div className="absolute -left-2 w-7 h-3 rounded-full bg-gradient-to-b from-slate-300 via-white to-slate-500 shadow-[2px_2px_4px_rgba(0,0,0,0.4)] border border-slate-600/70 z-20 rotate-[-12deg]" />
          {/* Ring shadow cast on paper */}
          <div className="absolute left-3 w-4 h-2 bg-black/25 blur-[1px] rounded-full" />
        </div>
      ))}
    </div>
  );
}

/**
 * ── Classroom Margin Doodle SVGs ──
 */

export function PaperAirplaneDoodle({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={`pointer-events-none select-none ${className}`} stroke="currentColor">
      {/* Dashed flight loop */}
      <path
        d="M6 50 C 14 56, 26 54, 28 42 C 30 30, 20 28, 22 20 C 24 14, 34 16, 40 18"
        stroke="#3B82F6"
        strokeWidth="1.5"
        strokeDasharray="3 3"
        strokeLinecap="round"
        opacity="0.6"
      />
      {/* Airplane wings */}
      <polygon points="40,16 60,8 48,32 44,22" fill="#E0F2FE" stroke="#0284C7" strokeWidth="1.8" strokeLinejoin="round" />
      <polygon points="44,22 60,8 36,26" fill="#BAE6FD" stroke="#0284C7" strokeWidth="1.8" strokeLinejoin="round" />
      <line x1="44" y1="22" x2="48" y2="32" stroke="#0284C7" strokeWidth="1.5" />
    </svg>
  );
}

export function DoodleCompass({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={`pointer-events-none select-none ${className}`} stroke="currentColor">
      {/* Top hinge knob */}
      <circle cx="24" cy="8" r="3" fill="#FDE047" stroke="#CA8A04" strokeWidth="1.5" />
      {/* Left leg (needle) */}
      <line x1="24" y1="10" x2="10" y2="40" stroke="#78716C" strokeWidth="2" strokeLinecap="round" />
      <circle cx="10" cy="40" r="1" fill="#44403C" />
      {/* Right leg (pencil) */}
      <line x1="24" y1="10" x2="38" y2="40" stroke="#EA580C" strokeWidth="2.5" strokeLinecap="round" />
      <polygon points="38,40 35,46 41,46" fill="#1E293B" stroke="#0F172A" strokeWidth="1" />
      {/* Arc curve */}
      <path d="M14 28 A 12 12 0 0 1 34 28" stroke="#94A3B8" strokeWidth="1.2" strokeDasharray="2 2" />
    </svg>
  );
}

export function DoodleStar({ className = "", color = "#F59E0B" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill={color} className={`pointer-events-none select-none ${className}`} stroke={color} strokeWidth="1.2" strokeLinejoin="round">
      <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" opacity="0.85" />
    </svg>
  );
}

export function PencilDoodle({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={`pointer-events-none select-none ${className}`}>
      {/* Pencil shaft */}
      <polygon points="12,36 34,14 38,18 16,40" fill="#FBBF24" stroke="#D97706" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Lead tip */}
      <polygon points="12,36 6,42 16,40" fill="#FDE68A" stroke="#D97706" strokeWidth="1.5" strokeLinejoin="round" />
      <polygon points="6,42 9,39 11,41" fill="#1E293B" />
      {/* Eraser */}
      <polygon points="34,14 38,18 42,14 38,10" fill="#F472B6" stroke="#DB2777" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Silver ferrule */}
      <line x1="33" y1="15" x2="37" y2="19" stroke="#94A3B8" strokeWidth="2" />
    </svg>
  );
}

export function TicTacToeDoodle({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 54 54" fill="none" className={`pointer-events-none select-none ${className}`} stroke="#3B82F6" strokeWidth="2" strokeLinecap="round">
      {/* 3x3 Grid lines */}
      <line x1="18" y1="6" x2="18" y2="48" opacity="0.75" />
      <line x1="36" y1="6" x2="36" y2="48" opacity="0.75" />
      <line x1="6" y1="18" x2="48" y2="18" opacity="0.75" />
      <line x1="6" y1="36" x2="48" y2="36" opacity="0.75" />
      {/* Hand-drawn X and O */}
      <line x1="9" y1="9" x2="15" y2="15" stroke="#DC2626" strokeWidth="2" />
      <line x1="15" y1="9" x2="9" y2="15" stroke="#DC2626" strokeWidth="2" />
      <circle cx="27" cy="27" r="4.5" stroke="#2563EB" strokeWidth="2" />
      <line x1="39" y1="39" x2="45" y2="45" stroke="#DC2626" strokeWidth="2" />
      <line x1="45" y1="39" x2="39" y2="45" stroke="#DC2626" strokeWidth="2" />
    </svg>
  );
}

export function MathNotesDoodle({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none select-none font-['Architects_Daughter',cursive] text-stone-600/70 text-[11px] leading-tight rotate-[-4deg] ${className}`}>
      <div>a² + b² = c² ✓</div>
      <div className="text-[10px] text-blue-600/70 font-bold">π ≈ 3.14159</div>
      <div className="text-[10px] text-rose-600/70">E = mc² ★</div>
    </div>
  );
}

export function SmileyDoodle({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 36" fill="none" className={`pointer-events-none select-none ${className}`} stroke="#EA580C" strokeWidth="2" strokeLinecap="round">
      <circle cx="18" cy="18" r="14" fill="#FEF08A" stroke="#CA8A04" strokeWidth="1.8" />
      {/* Eyes */}
      <circle cx="13" cy="14" r="1.5" fill="#78350F" stroke="none" />
      <circle cx="23" cy="14" r="1.5" fill="#78350F" stroke="none" />
      {/* Big smile */}
      <path d="M12 21 C 14 26, 22 26, 24 21" stroke="#78350F" strokeWidth="2" />
    </svg>
  );
}

export function PaperClipDoodle({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 48" fill="none" className={`pointer-events-none select-none ${className}`} stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 16 V 38 C 7 42 17 42 17 38 V 10 C 17 4 7 4 7 10 V 32 C 7 35 13 35 13 32 V 14" opacity="0.85" />
    </svg>
  );
}


