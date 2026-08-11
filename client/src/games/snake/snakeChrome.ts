import type { SnakeTheme } from "@shared/types";

/**
 * Tailwind class sets for the DOM chrome around the canvas (panels, headers,
 * keypad). The canvas playfield itself is themed separately in snakeRender.ts;
 * these keep the surrounding shell consistent with each retro skin.
 */
export interface SnakeChrome {
  outer: string;
  screen: string;
  header: string;
  title: string;
  pill: string;
  badge: string;
  keypad: string;
  keyBtn: string;
  panel: string;
  panelTitle: string;
}

export const SNAKE_THEMES: SnakeTheme[] = ["nokia-monochrome", "nokia-color", "neon-modern"];

export const THEME_LABELS: Record<SnakeTheme, string> = {
  "nokia-monochrome": "3310 LCD",
  "nokia-color": "6110 Color",
  "neon-modern": "Neon",
};

export const SNAKE_THEME_CHROME: Record<SnakeTheme, SnakeChrome> = {
  "nokia-monochrome": {
    outer: "bg-[#8b9bb4] text-[#1c2415] font-mono",
    screen: "bg-[#9ebd9e] border-8 border-[#3b4731]",
    header: "text-[#1c2415] border-[#3b4731]",
    title: "text-[#1c2415]",
    pill: "bg-[#3b4731] text-[#9ebd9e]",
    badge: "bg-[#3b4731]/20 text-[#1c2415]",
    keypad: "bg-[#2d3725] border-4 border-[#1c2415]",
    keyBtn: "bg-[#536248] text-white border-[#8b9bb4]",
    panel: "bg-[#2d3725] border-4 border-[#1c2415] text-white",
    panelTitle: "text-[#9ebd9e]",
  },
  "nokia-color": {
    outer: "bg-[#0f172a] text-slate-100 font-sans",
    screen: "bg-[#1e293b] border-8 border-[#38bdf8]",
    header: "text-sky-300 border-sky-500/30",
    title: "text-sky-300",
    pill: "bg-sky-500 text-slate-900",
    badge: "bg-amber-400/20 text-amber-300",
    keypad: "bg-slate-900 border-4 border-sky-400",
    keyBtn: "bg-slate-800 text-sky-200 border-sky-500/40",
    panel: "bg-slate-900 border-4 border-sky-400 text-slate-100",
    panelTitle: "text-sky-300",
  },
  "neon-modern": {
    outer: "bg-[#090d16] text-purple-100 font-sans",
    screen: "bg-[#0d1322] border-8 border-[#8b5cf6] shadow-[0_0_40px_rgba(139,92,246,0.3)]",
    header: "text-purple-300 border-purple-500/30",
    title: "text-purple-300",
    pill: "bg-purple-500 text-white",
    badge: "bg-amber-400/20 text-amber-300",
    keypad: "bg-[#131b2e] border-4 border-purple-500",
    keyBtn: "bg-[#1e293b] text-purple-200 border-purple-500/40",
    panel: "bg-[#131b2e] border-4 border-purple-500 text-purple-100",
    panelTitle: "text-purple-300",
  },
};
