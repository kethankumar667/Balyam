export type TicTacToeThemeId = "neo_tokyo" | "quantum_matrix" | "solar_flare";

export interface TicTacToeThemeConfig {
  id: TicTacToeThemeId;
  name: string;
  badge: string;
  description: string;
  bgGradient: string;
  boardBg: string;
  gridBorder: string;
  gridLine: string;
  cellBg: string;
  cellHover: string;
  xColor: string;
  xGlow: string;
  xStroke: string;
  oColor: string;
  oGlow: string;
  oStroke: string;
  warningGlow: string;
  warningBadge: string;
  accentText: string;
  accentBadge: string;
  hudBg: string;
  hudBorder: string;
}

export const TICTACTOE_THEMES: Record<TicTacToeThemeId, TicTacToeThemeConfig> = {
  neo_tokyo: {
    id: "neo_tokyo",
    name: "Neo Tokyo",
    badge: "CYBERPUNK",
    description: "Laser cyan & neon magenta across dark obsidian glass",
    bgGradient: "from-slate-950 via-cyan-950/20 to-slate-950",
    boardBg: "bg-slate-900/80 backdrop-blur-xl",
    gridBorder: "border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.25)]",
    gridLine: "border-cyan-500/30",
    cellBg: "bg-cyan-950/10 hover:bg-cyan-900/20",
    cellHover: "hover:shadow-[inset_0_0_15px_rgba(6,182,212,0.3)]",
    xColor: "text-cyan-400",
    xGlow: "drop-shadow-[0_0_12px_rgba(6,182,212,0.8)]",
    xStroke: "#00F0FF",
    oColor: "text-pink-500",
    oGlow: "drop-shadow-[0_0_12px_rgba(236,72,153,0.8)]",
    oStroke: "#EC4899",
    warningGlow: "animate-pulse ring-2 ring-amber-400/80 shadow-[0_0_16px_rgba(251,191,36,0.6)]",
    warningBadge: "bg-amber-500/20 border-amber-400 text-amber-300",
    accentText: "text-cyan-400",
    accentBadge: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
    hudBg: "bg-slate-900/70 backdrop-blur-md",
    hudBorder: "border-cyan-500/20",
  },
  quantum_matrix: {
    id: "quantum_matrix",
    name: "Quantum Matrix",
    badge: "NEURAL GRID",
    description: "Phosphor terminal green & circuit lines against carbon void",
    bgGradient: "from-black via-emerald-950/25 to-black",
    boardBg: "bg-emerald-950/30 backdrop-blur-xl",
    gridBorder: "border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.25)]",
    gridLine: "border-emerald-500/30",
    cellBg: "bg-emerald-950/20 hover:bg-emerald-900/30",
    cellHover: "hover:shadow-[inset_0_0_15px_rgba(16,185,129,0.3)]",
    xColor: "text-emerald-400",
    xGlow: "drop-shadow-[0_0_12px_rgba(52,211,153,0.8)]",
    xStroke: "#10B981",
    oColor: "text-lime-300",
    oGlow: "drop-shadow-[0_0_12px_rgba(190,242,100,0.8)]",
    oStroke: "#BEF264",
    warningGlow: "animate-pulse ring-2 ring-red-400/80 shadow-[0_0_16px_rgba(239,68,68,0.6)]",
    warningBadge: "bg-red-500/20 border-red-400 text-red-300",
    accentText: "text-emerald-400",
    accentBadge: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    hudBg: "bg-neutral-950/80 backdrop-blur-md",
    hudBorder: "border-emerald-500/20",
  },
  solar_flare: {
    id: "solar_flare",
    name: "Solar Flare",
    badge: "SYNTHWAVE",
    description: "Sunset incandescent amber & plasma violet cosmic grid",
    bgGradient: "from-indigo-950 via-purple-950/30 to-amber-950/20",
    boardBg: "bg-purple-950/40 backdrop-blur-xl",
    gridBorder: "border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.25)]",
    gridLine: "border-purple-500/30",
    cellBg: "bg-purple-900/10 hover:bg-purple-900/25",
    cellHover: "hover:shadow-[inset_0_0_15px_rgba(245,158,11,0.3)]",
    xColor: "text-amber-400",
    xGlow: "drop-shadow-[0_0_12px_rgba(245,158,11,0.8)]",
    xStroke: "#F59E0B",
    oColor: "text-violet-400",
    oGlow: "drop-shadow-[0_0_12px_rgba(167,139,250,0.8)]",
    oStroke: "#A78BFA",
    warningGlow: "animate-pulse ring-2 ring-rose-400/80 shadow-[0_0_16px_rgba(244,63,94,0.6)]",
    warningBadge: "bg-rose-500/20 border-rose-400 text-rose-300",
    accentText: "text-amber-400",
    accentBadge: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    hudBg: "bg-purple-950/70 backdrop-blur-md",
    hudBorder: "border-amber-500/20",
  },
};

export const DEFAULT_TICTACTOE_THEME: TicTacToeThemeId = "neo_tokyo";

export function getTicTacToeTheme(id?: string): TicTacToeThemeConfig {
  if (id && id in TICTACTOE_THEMES) {
    return TICTACTOE_THEMES[id as TicTacToeThemeId];
  }
  return TICTACTOE_THEMES[DEFAULT_TICTACTOE_THEME];
}
