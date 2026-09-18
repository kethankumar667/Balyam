/**
 * Immersive Gaming Themes for Sudoku
 * 3 Radically Unique Worlds:
 * 1. The Daily Chronicle (Classic Sunday Newspaper & Coffeehouse)
 * 2. Cyber-Matrix Quantum HUD (Sci-Fi Holographic Terminal)
 * 3. Retro Arcade 1984 (80s Coin-Op Synthwave Cabinet)
 */

export type SudokuThemeId =
  | "chronicle"
  | "cyber"
  | "arcade"
  // Legacy aliases for backward compatibility
  | "paper"
  | "obsidian"
  | "quantum"
  | "terminal"
  | "midnight";

export type SudokuSoundProfile = "marimba" | "cyber" | "arcade";

export function isLightTheme(themeId: SudokuThemeId): boolean {
  return themeId === "chronicle" || themeId === "paper";
}

export interface SudokuTheme {
  id: SudokuThemeId;
  name: string;
  tagline: string;
  masthead: {
    title: string;
    subtitle: string;
    style: string;
  };
  fontFamily: string;
  soundProfile: SudokuSoundProfile;
  /** Primary page background */
  bg: string;
  /** Inner matrix card background */
  boardBg: string;
  /** Board framing outer shell */
  boardFrame: string;
  /** Subtle 3x3 sector demarcation lines */
  majorBorder: string;
  /** Inner 1x1 cell border */
  minorBorder: string;
  /** Static given initial clues */
  givenText: string;
  /** Player placed valid digits */
  userText: string;
  /** Currently selected cell background */
  selectedCellBg: string;
  /** Currently selected cell border glow */
  selectedCellBorder: string;
  /** Crosshair (intersecting row, col, 3x3 box) highlight */
  crosshairBg: string;
  /** Cells holding the same digit as active selection */
  matchingDigitBg: string;
  /** Conflict error cell background & text */
  errorBg: string;
  errorText: string;
  /** Mini candidate notes text */
  noteText: string;
  /** Keypad button background & text */
  keypadBg: string;
  keypadText: string;
  keypadBorder: string;
  keypadActiveBg: string;
  /** Keypad button completed state */
  keypadCompletedBg: string;
  keypadCompletedText: string;
  /** Accent glow color (hex/rgba) */
  accentGlow: string;
  accentText: string;
  badgeBg: string;
}

const CHRONICLE_THEME: SudokuTheme = {
  id: "chronicle",
  name: "The Daily Chronicle",
  tagline: "Vintage newsprint, editorial serif print & coffeehouse morning",
  masthead: {
    title: "THE DAILY CHRONICLE",
    subtitle: "VOL. XCIV · NO. 34,102 · MORNING EDITION",
    style: "border-b-2 border-slate-800 pb-1 mb-1 text-slate-800 font-serif font-black tracking-widest",
  },
  fontFamily: "font-serif",
  soundProfile: "marimba",
  bg: "bg-[#F5F2EB]",
  boardBg: "bg-[#FAF8F5]",
  boardFrame: "bg-[#FAF8F5] border-2 border-slate-800 shadow-[0_12px_30px_rgba(40,30,20,0.14)] ring-1 ring-slate-900/15",
  majorBorder: "border-slate-800",
  minorBorder: "border-stone-300",
  givenText: "text-[#111827] font-serif font-black",
  userText: "text-[#1E40AF] font-serif font-extrabold italic",
  selectedCellBg: "bg-[#BAE6FD]/90",
  selectedCellBorder: "ring-2 ring-[#0284C7] shadow-[0_0_12px_rgba(2,132,199,0.35)]",
  crosshairBg: "bg-[#E0F2FE]/70",
  matchingDigitBg: "bg-[#DBEAFE] text-[#1E3A8A]",
  errorBg: "bg-[#FFE4E6]",
  errorText: "text-[#E11D48] font-serif font-black animate-pulse",
  noteText: "text-stone-600 font-sans italic",
  keypadBg: "bg-[#FFFDF9] hover:bg-[#F3EFE6]",
  keypadText: "text-[#1F2937] font-serif font-bold",
  keypadBorder: "border-stone-300 shadow-xs",
  keypadActiveBg: "bg-[#1E40AF] text-white font-serif font-black shadow-md",
  keypadCompletedBg: "bg-stone-200/70 text-stone-400 border-stone-300",
  keypadCompletedText: "text-stone-400",
  accentGlow: "rgba(30, 64, 175, 0.3)",
  accentText: "text-[#1E40AF]",
  badgeBg: "bg-[#FFFDF9] border border-stone-400 text-slate-800 shadow-xs font-serif",
};

const CYBER_THEME: SudokuTheme = {
  id: "cyber",
  name: "Cyber-Matrix HUD",
  tagline: "Holographic quantum HUD, laser telemetry & encrypted neural terminal",
  masthead: {
    title: "// QUANTUM MATRIX v4.2",
    subtitle: "NEURAL LINK ACTIVE · ENCRYPTED DEEP STREAM",
    style: "border-b border-cyan-500/50 pb-1 mb-1 text-cyan-400 font-mono font-black tracking-widest",
  },
  fontFamily: "font-mono",
  soundProfile: "cyber",
  bg: "bg-[#030712]",
  boardBg: "bg-[#070d1e]/95",
  boardFrame: "bg-[#070d1e]/90 border border-cyan-500/50 shadow-[0_0_40px_rgba(6,182,212,0.25)] backdrop-blur-xl ring-1 ring-cyan-400/20",
  majorBorder: "border-cyan-400/60",
  minorBorder: "border-cyan-900/40",
  givenText: "text-cyan-300 font-mono font-black drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]",
  userText: "text-fuchsia-400 font-mono font-black drop-shadow-[0_0_8px_rgba(232,121,249,0.7)]",
  selectedCellBg: "bg-cyan-500/25",
  selectedCellBorder: "ring-2 ring-cyan-400 shadow-[0_0_16px_rgba(6,182,212,0.8)]",
  crosshairBg: "bg-cyan-950/40",
  matchingDigitBg: "bg-fuchsia-950/50 text-fuchsia-300",
  errorBg: "bg-rose-950/80",
  errorText: "text-rose-400 font-mono font-black animate-pulse drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]",
  noteText: "text-emerald-300 font-mono",
  keypadBg: "bg-[#0b1329]/90 hover:bg-[#121e3d]",
  keypadText: "text-cyan-200 font-mono",
  keypadBorder: "border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.15)]",
  keypadActiveBg: "bg-cyan-400 text-black font-mono font-black shadow-[0_0_20px_rgba(6,182,212,0.9)]",
  keypadCompletedBg: "bg-cyan-950/30 text-cyan-800/40 border-cyan-900/30",
  keypadCompletedText: "text-cyan-800/40",
  accentGlow: "rgba(6, 182, 212, 0.4)",
  accentText: "text-cyan-400",
  badgeBg: "bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono",
};

const ARCADE_THEME: SudokuTheme = {
  id: "arcade",
  name: "Retro Arcade 1984",
  tagline: "Vibrant 80s neon CRT cabinet, synthwave grid & coin-op glory",
  masthead: {
    title: "★ 1UP HIGH SCORE ★",
    subtitle: "INSERT COIN · READY PLAYER ONE",
    style: "border-b-2 border-yellow-400/50 pb-1 mb-1 text-yellow-300 font-black tracking-widest uppercase",
  },
  fontFamily: "font-sans",
  soundProfile: "arcade",
  bg: "bg-[#0c021e]",
  boardBg: "bg-[#160636]/95",
  boardFrame: "bg-[#160636]/95 border-2 border-fuchsia-500 shadow-[0_0_40px_rgba(217,70,239,0.35)] backdrop-blur-xl ring-2 ring-yellow-400/30",
  majorBorder: "border-fuchsia-500",
  minorBorder: "border-purple-900/50",
  givenText: "text-[#FACC15] font-black tracking-wider drop-shadow-[0_2px_0_#854D0E]",
  userText: "text-[#FF2E93] font-black tracking-wider drop-shadow-[0_2px_0_#99004A]",
  selectedCellBg: "bg-yellow-400/25",
  selectedCellBorder: "ring-2 ring-yellow-300 shadow-[0_0_16px_rgba(250,204,21,0.9)]",
  crosshairBg: "bg-purple-950/50",
  matchingDigitBg: "bg-fuchsia-950/60 text-yellow-300",
  errorBg: "bg-red-950/80",
  errorText: "text-red-400 font-black animate-pulse drop-shadow-[0_0_10px_rgba(239,68,68,0.9)]",
  noteText: "text-[#00F5D4] font-mono font-bold",
  keypadBg: "bg-[#250954]/90 hover:bg-[#380e7d]",
  keypadText: "text-yellow-300 font-black",
  keypadBorder: "border-fuchsia-500/50 shadow-[0_0_12px_rgba(217,70,239,0.2)]",
  keypadActiveBg: "bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-black shadow-[0_0_20px_rgba(250,204,21,0.9)]",
  keypadCompletedBg: "bg-purple-950/30 text-purple-800/40 border-purple-900/30",
  keypadCompletedText: "text-purple-800/40",
  accentGlow: "rgba(217, 70, 239, 0.4)",
  accentText: "text-fuchsia-400",
  badgeBg: "bg-purple-950/80 border border-fuchsia-500/50 text-yellow-300",
};

export const SUDOKU_THEMES: Record<SudokuThemeId, SudokuTheme> = {
  chronicle: CHRONICLE_THEME,
  cyber: CYBER_THEME,
  arcade: ARCADE_THEME,
  // Backward compatibility aliases
  paper: { ...CHRONICLE_THEME, id: "paper" },
  obsidian: { ...CYBER_THEME, id: "obsidian" },
  quantum: { ...CYBER_THEME, id: "quantum" },
  terminal: { ...CYBER_THEME, id: "terminal" },
  midnight: { ...ARCADE_THEME, id: "midnight" },
};

export const THEME_CYCLE: SudokuThemeId[] = ["chronicle", "cyber", "arcade"];
