import type { SnakeTheme } from "@shared/types";

/**
 * Tailwind class sets for the DOM chrome around the canvas (panels, headers,
 * keypad). The canvas playfield itself is themed separately in snakeRender.ts;
 * these keep the surrounding shell consistent with each retro skin.
 */
export interface SnakeChrome {
  outerBg: string;
  panelBg: string;
  panelBorder: string;
  headerText: string;
  subText: string;
  pillActive: string;
  pillInactive: string;
  btnPrimary: string;
  btnSecondary: string;
  screenBg: string;
  screenBorder: string;
  cardBg: string;
  accentText: string;
  dpadBtn: string;
  tipBg: string;
  tipText: string;
}

export const SNAKE_THEMES: SnakeTheme[] = ["nokia-monochrome", "nokia-color", "neon-modern"];

export const THEME_LABELS: Record<SnakeTheme, string> = {
  "nokia-monochrome": "3310 LCD",
  "nokia-color": "6110 Color",
  "neon-modern": "Neon",
};

export const SNAKE_THEME_CHROME: Record<SnakeTheme, SnakeChrome> = {
  "nokia-monochrome": {
    outerBg: "bg-gradient-to-br from-[#0a150b] via-[#122414] to-[#070e08] text-[#dcfce7]",
    panelBg: "bg-[#112213]/90 border-[#234526]",
    panelBorder: "border-[#234526]",
    headerText: "text-[#86efac]",
    subText: "text-[#86efac]/70",
    pillActive: "bg-[#22c55e] text-[#052e16] font-extrabold shadow-[0_0_12px_rgba(34,197,94,0.4)]",
    pillInactive: "bg-[#18331b] text-[#86efac]/80 hover:bg-[#214725]",
    btnPrimary: "bg-gradient-to-r from-[#4ade80] to-[#22c55e] text-[#052e16] font-black hover:brightness-110 shadow-[0_4px_16px_rgba(34,197,94,0.35)]",
    btnSecondary: "bg-[#162e19] text-[#86efac] border border-[#22c55e]/40 hover:bg-[#1f4224]",
    screenBg: "bg-[#09140a]",
    screenBorder: "border-[#22c55e]/40 shadow-[0_0_30px_rgba(34,197,94,0.15)]",
    cardBg: "bg-[#0f1f11]/80 border border-[#22c55e]/20",
    accentText: "text-[#4ade80]",
    dpadBtn: "bg-[#17331b] text-[#86efac] border border-[#22c55e]/30 hover:bg-[#22c55e] hover:text-[#052e16]",
    tipBg: "bg-[#0f2112]/90 border border-[#22c55e]/30 text-[#a3e635]",
    tipText: "text-[#a3e635]",
  },
  "nokia-color": {
    outerBg: "bg-gradient-to-br from-[#061224] via-[#0c1f3d] to-[#040a17] text-[#e0f2fe]",
    panelBg: "bg-[#0a1a33]/90 border-[#1d4ed8]",
    panelBorder: "border-[#1d4ed8]",
    headerText: "text-[#7dd3fc]",
    subText: "text-[#7dd3fc]/70",
    pillActive: "bg-[#0284c7] text-white font-extrabold shadow-[0_0_12px_rgba(2,132,199,0.4)]",
    pillInactive: "bg-[#0e274c] text-[#7dd3fc]/80 hover:bg-[#15376a]",
    btnPrimary: "bg-gradient-to-r from-[#38bdf8] to-[#0284c7] text-[#031930] font-black hover:brightness-110 shadow-[0_4px_16px_rgba(56,189,248,0.35)]",
    btnSecondary: "bg-[#0c2447] text-[#7dd3fc] border border-[#38bdf8]/40 hover:bg-[#123363]",
    screenBg: "bg-[#051124]",
    screenBorder: "border-[#38bdf8]/40 shadow-[0_0_30px_rgba(56,189,248,0.15)]",
    cardBg: "bg-[#0b1e3b]/80 border border-[#38bdf8]/20",
    accentText: "text-[#38bdf8]",
    dpadBtn: "bg-[#0e284f] text-[#7dd3fc] border border-[#38bdf8]/30 hover:bg-[#38bdf8] hover:text-[#031930]",
    tipBg: "bg-[#0a1d3a]/90 border border-[#38bdf8]/30 text-[#7dd3fc]",
    tipText: "text-[#7dd3fc]",
  },
  "neon-modern": {
    outerBg: "bg-gradient-to-br from-[#120724] via-[#1e0a3b] to-[#090314] text-[#fae8ff]",
    panelBg: "bg-[#1b0a36]/90 border-[#7e22ce]",
    panelBorder: "border-[#7e22ce]",
    headerText: "text-[#f0abfc]",
    subText: "text-[#f0abfc]/70",
    pillActive: "bg-[#c084fc] text-[#2e1065] font-extrabold shadow-[0_0_12px_rgba(192,132,252,0.5)]",
    pillInactive: "bg-[#290e52] text-[#f0abfc]/80 hover:bg-[#3a1475]",
    btnPrimary: "bg-gradient-to-r from-[#e879f9] to-[#c084fc] text-[#2e1065] font-black hover:brightness-110 shadow-[0_4px_16px_rgba(232,121,249,0.4)]",
    btnSecondary: "bg-[#280c4f] text-[#f0abfc] border border-[#c084fc]/40 hover:bg-[#391270]",
    screenBg: "bg-[#0d041a]",
    screenBorder: "border-[#c084fc]/40 shadow-[0_0_30px_rgba(192,132,252,0.2)]",
    cardBg: "bg-[#180930]/80 border border-[#c084fc]/20",
    accentText: "text-[#f0abfc]",
    dpadBtn: "bg-[#250b4a] text-[#f0abfc] border border-[#c084fc]/30 hover:bg-[#c084fc] hover:text-[#2e1065]",
    tipBg: "bg-[#1a0833]/90 border border-[#c084fc]/30 text-[#f0abfc]",
    tipText: "text-[#f0abfc]",
  },
};
