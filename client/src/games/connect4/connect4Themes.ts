export type Connect4ThemeId =
  | "royal_parlour"
  | "cyber_arcade"
  | "championship_lounge"
  | "cyber_matrix"
  | "synthwave"
  | "obsidian_gold";

export interface Connect4ThemeConfig {
  id: "royal_parlour" | "cyber_arcade" | "championship_lounge";
  name: string;
  badge: string;
  description: string;
  bgGradient: string;
  tableMat: string;
  boardBg: string;
  gridBorder: string;
  pedestalBg: string;
  pillarBorder: string;
  slotBg: string;
  slotRim: string;
  slotInset: string;
  laserColor: string;
  // Environmental Atmosphere & World Building
  soundProfile: "wood" | "cyber" | "gold";
  venueTitle: string;
  venueSubhead: string;
  venueBadge: string;
  envLighting: string;
  envPatternClass: string;
  chassisRivets: "brass_screws" | "cyan_hex" | "gold_pyramids";
  pedestalHallmark: string;
  tableTextureOverlay: string;
  tableBorderAccent: string;
  // Player 1 (Red / Crimson / Ruby)
  rName: string;
  rColor: string;
  rGlow: string;
  rFill: string;
  rGradient: string;
  rSymbol: string;
  rBorder: string;
  rSpecular: string;
  // Player 2 (Gold / Ivory / Cyan)
  yName: string;
  yColor: string;
  yGlow: string;
  yFill: string;
  yGradient: string;
  ySymbol: string;
  yBorder: string;
  ySpecular: string;
  // HUD
  winningHighlight: string;
  accentText: string;
  accentBadge: string;
  hudBg: string;
  hudBorder: string;
}

export const MASTER_THEMES: ("royal_parlour" | "cyber_arcade" | "championship_lounge")[] = [
  "royal_parlour",
  "cyber_arcade",
  "championship_lounge",
];

export const CONNECT4_THEMES: Record<
  "royal_parlour" | "cyber_arcade" | "championship_lounge",
  Connect4ThemeConfig
> = {
  royal_parlour: {
    id: "royal_parlour",
    name: "Nordic Teak & Ceramic",
    badge: "TEAK & STONE",
    description: "Sculptural oiled teakwood monolith with matte terracotta and warm alabaster ceramic stones",
    soundProfile: "wood",
    venueTitle: "ATELIER TEAK & STONE",
    venueSubhead: "Copenhagen · Studio Edition · Handcrafted",
    venueBadge: "STUDIO CRAFT",
    envLighting: "radial-gradient(ellipse 95% 70% at 50% -5%, rgba(245,158,11,0.15) 0%, rgba(180,83,9,0.04) 50%, transparent 80%)",
    envPatternClass: "bg-[#140b06] bg-[radial-gradient(#d977060f_1px,transparent_1px)] [background-size:24px_24px]",
    chassisRivets: "brass_screws",
    pedestalHallmark: "ATELIER TEAKWOOD // N° 1892",
    tableTextureOverlay: "bg-[radial-gradient(#10b9810a_1px,transparent_1px)] [background-size:20px_20px] opacity-100",
    tableBorderAccent: "border-amber-900/40 shadow-2xl",
    bgGradient: "from-[#140b06] via-[#1e1009] to-[#0d0603]",
    tableMat: "bg-[#0b1713]/95 border border-emerald-900/40 shadow-[0_20px_60px_rgba(0,0,0,0.85)]",
    boardBg: "bg-gradient-to-b from-[#452310] via-[#2c160a] to-[#1a0c05]",
    gridBorder: "border-[#8c532b]/60 shadow-[0_30px_70px_-10px_rgba(0,0,0,0.95),inset_0_1px_2px_rgba(255,255,255,0.15)]",
    pedestalBg: "bg-gradient-to-r from-[#1a0c05] via-[#33170a] to-[#1a0c05] border-[#8c532b]/40",
    pillarBorder: "border-[#8c532b]/50",
    slotBg: "bg-[#100703]",
    slotRim: "ring-1 ring-[#8c532b]/30 border-2 border-black/85 shadow-[0_2px_4px_rgba(0,0,0,0.7),inset_0_1.5px_2px_rgba(255,255,255,0.08)]",
    slotInset: "shadow-[inset_0_6px_10px_rgba(0,0,0,0.95),inset_0_-2px_4px_rgba(255,255,255,0.04)]",
    laserColor: "#F59E0B",
    rName: "Nordic Terracotta",
    rColor: "text-rose-400",
    rGlow: "shadow-[0_4px_16px_rgba(225,29,72,0.4)]",
    rFill: "#c2410c",
    rGradient: "bg-gradient-to-b from-[#ea580c] via-[#c2410c] to-[#9a3412]",
    rSymbol: "",
    rBorder: "border-orange-300/40",
    rSpecular: "radial-gradient(ellipse at 34% 28%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.08) 45%, rgba(0,0,0,0.3) 100%)",
    yName: "Warm Alabaster",
    yColor: "text-stone-200",
    yGlow: "shadow-[0_4px_16px_rgba(250,250,249,0.35)]",
    yFill: "#f5f5f4",
    yGradient: "bg-gradient-to-b from-[#ffffff] via-[#f5f5f4] to-[#d6d3d1]",
    ySymbol: "",
    yBorder: "border-stone-200/60",
    ySpecular: "radial-gradient(ellipse at 34% 28%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.12) 45%, rgba(0,0,0,0.15) 100%)",
    winningHighlight: "ring-2 ring-white shadow-[0_0_24px_rgba(255,255,255,0.85)] animate-pulse",
    accentText: "text-amber-400",
    accentBadge: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    hudBg: "bg-[#1f1007]/80 backdrop-blur-xl",
    hudBorder: "border-amber-900/30",
  },
  cyber_arcade: {
    id: "cyber_arcade",
    name: "Titanium Cyber Monolith",
    badge: "TITANIUM & PRISM",
    description: "Precision-milled smoked titanium chassis with optical cyan conduits and smoked ruby crystal stones",
    soundProfile: "cyber",
    venueTitle: "TOKYO CYBER MONOLITH",
    venueSubhead: "Akihabara Design Lab // Precision Chasis",
    venueBadge: "CYBER LAB",
    envLighting: "radial-gradient(ellipse 95% 70% at 50% -5%, rgba(6,182,212,0.18) 0%, rgba(59,130,246,0.04) 50%, transparent 80%)",
    envPatternClass: "bg-[#030712] bg-[linear-gradient(to_right,#08334415_1px,transparent_1px),linear-gradient(to_bottom,#08334415_1px,transparent_1px)] [background-size:28px_28px]",
    chassisRivets: "cyan_hex",
    pedestalHallmark: "SYSTEM: TITANIUM_CORE // REV 4.2",
    tableTextureOverlay: "bg-[linear-gradient(to_right,#06b6d40f_1px,transparent_1px),linear-gradient(to_bottom,#06b6d40f_1px,transparent_1px)] [background-size:20px_20px] opacity-100",
    tableBorderAccent: "border-cyan-500/30 shadow-2xl",
    bgGradient: "from-[#020617] via-[#090d16] to-[#020617]",
    tableMat: "bg-[#020915]/95 border border-cyan-500/30 shadow-[0_20px_60px_rgba(0,0,0,0.85)]",
    boardBg: "bg-gradient-to-b from-[#111e2e] via-[#09121d] to-[#040910]",
    gridBorder: "border-cyan-500/50 shadow-[0_30px_70px_-10px_rgba(0,0,0,0.95),inset_0_1px_2px_rgba(255,255,255,0.15)]",
    pedestalBg: "bg-gradient-to-r from-[#030712] via-[#081829] to-[#030712] border-cyan-500/40",
    pillarBorder: "border-cyan-500/40",
    slotBg: "bg-[#02060f]",
    slotRim: "ring-1 ring-cyan-500/30 border-2 border-black/85 shadow-[0_2px_4px_rgba(0,0,0,0.7),inset_0_1.5px_2px_rgba(255,255,255,0.08)]",
    slotInset: "shadow-[inset_0_6px_10px_rgba(0,0,0,0.95),inset_0_-2px_4px_rgba(6,182,212,0.15)]",
    laserColor: "#00F2FE",
    rName: "Smoked Ruby",
    rColor: "text-rose-400",
    rGlow: "shadow-[0_4px_16px_rgba(244,63,94,0.45)]",
    rFill: "#e11d48",
    rGradient: "bg-gradient-to-b from-[#fb7185] via-[#e11d48] to-[#9f1239]",
    rSymbol: "",
    rBorder: "border-rose-400/50",
    rSpecular: "radial-gradient(ellipse at 34% 28%, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.1) 45%, rgba(0,0,0,0.3) 100%)",
    yName: "Electric Cyan",
    yColor: "text-cyan-300",
    yGlow: "shadow-[0_4px_16px_rgba(6,182,212,0.45)]",
    yFill: "#06b6d4",
    yGradient: "bg-gradient-to-b from-[#67e8f9] via-[#06b6d4] to-[#0e7490]",
    ySymbol: "",
    yBorder: "border-cyan-300/50",
    ySpecular: "radial-gradient(ellipse at 34% 28%, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.12) 45%, rgba(0,0,0,0.2) 100%)",
    winningHighlight: "ring-2 ring-cyan-200 shadow-[0_0_24px_rgba(6,182,212,0.85)] animate-pulse",
    accentText: "text-cyan-400",
    accentBadge: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
    hudBg: "bg-slate-900/80 backdrop-blur-xl",
    hudBorder: "border-cyan-500/25",
  },
  championship_lounge: {
    id: "championship_lounge",
    name: "Obsidian & 24K Gold",
    badge: "OBSIDIAN & 24K",
    description: "Carbon obsidian monolithic chassis bound with brushed 24k gold, deep crimson jade and solid bullion coins",
    soundProfile: "gold",
    venueTitle: "MONACO SALON PRIVÉ",
    venueSubhead: "Monte Carlo · High-Roller Penthouse · 24K Edition",
    venueBadge: "HIGH LUXURY",
    envLighting: "radial-gradient(ellipse 95% 70% at 50% -5%, rgba(250,204,21,0.16) 0%, rgba(217,119,6,0.04) 50%, transparent 80%)",
    envPatternClass: "bg-[#090a0d] bg-[radial-gradient(#ca8a040d_1px,transparent_1px)] [background-size:24px_24px]",
    chassisRivets: "gold_pyramids",
    pedestalHallmark: "MONACO MONOLITH · 24K GOLD",
    tableTextureOverlay: "bg-[radial-gradient(#eab3080a_1px,transparent_1px)] [background-size:24px_24px] opacity-100",
    tableBorderAccent: "border-amber-500/30 shadow-2xl",
    bgGradient: "from-[#08080a] via-[#101216] to-[#08080a]",
    tableMat: "bg-[#07090d]/95 border border-amber-500/30 shadow-[0_20px_60px_rgba(0,0,0,0.85)]",
    boardBg: "bg-gradient-to-b from-[#1f2229] via-[#13151a] to-[#0a0b0e]",
    gridBorder: "border-amber-500/50 shadow-[0_30px_70px_-10px_rgba(0,0,0,0.95),inset_0_1px_2px_rgba(255,255,255,0.15)]",
    pedestalBg: "bg-gradient-to-r from-[#08080a] via-[#1a1d24] to-[#08080a] border-amber-500/40",
    pillarBorder: "border-amber-500/40",
    slotBg: "bg-[#050608]",
    slotRim: "ring-1 ring-amber-500/30 border-2 border-black/85 shadow-[0_2px_4px_rgba(0,0,0,0.7),inset_0_1.5px_2px_rgba(255,255,255,0.08)]",
    slotInset: "shadow-[inset_0_6px_10px_rgba(0,0,0,0.95),inset_0_-2px_4px_rgba(245,158,11,0.15)]",
    laserColor: "#FFD700",
    rName: "Lacquered Crimson",
    rColor: "text-rose-500",
    rGlow: "shadow-[0_4px_16px_rgba(225,29,72,0.45)]",
    rFill: "#be123c",
    rGradient: "bg-gradient-to-b from-[#fb7185] via-[#be123c] to-[#881337]",
    rSymbol: "",
    rBorder: "border-amber-300/50",
    rSpecular: "radial-gradient(ellipse at 34% 28%, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.1) 45%, rgba(0,0,0,0.3) 100%)",
    yName: "24K Champagne Gold",
    yColor: "text-yellow-400",
    yGlow: "shadow-[0_4px_16px_rgba(234,179,8,0.45)]",
    yFill: "#eab308",
    yGradient: "bg-gradient-to-b from-[#fde047] via-[#eab308] to-[#a16207]",
    ySymbol: "",
    yBorder: "border-yellow-200/60",
    ySpecular: "radial-gradient(ellipse at 34% 28%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.15) 45%, rgba(0,0,0,0.2) 100%)",
    winningHighlight: "ring-2 ring-yellow-200 shadow-[0_0_24px_rgba(250,204,21,0.85)] animate-pulse",
    accentText: "text-amber-400",
    accentBadge: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    hudBg: "bg-zinc-900/80 backdrop-blur-xl",
    hudBorder: "border-amber-500/25",
  },
};

export function getConnect4Theme(themeId?: string | null): Connect4ThemeConfig {
  if (!themeId) return CONNECT4_THEMES.royal_parlour;
  if (themeId === "cyber_matrix" || themeId === "synthwave" || themeId === "cyber_arcade") {
    return CONNECT4_THEMES.cyber_arcade;
  }
  if (themeId === "obsidian_gold" || themeId === "championship_lounge") {
    return CONNECT4_THEMES.championship_lounge;
  }
  if (themeId === "royal_parlour") {
    return CONNECT4_THEMES.royal_parlour;
  }
  return CONNECT4_THEMES.royal_parlour;
}
