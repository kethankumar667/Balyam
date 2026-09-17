export interface TileVisualMeta {
  bg: string;
  text: string;
  border: string;
  aura?: string;
  shadow: string;
  title: string;
  quantumDesignation: string;
  code: string;
  circuitColor: string;
  tier: "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic" | "sovereign";
}

export const TILE_PALETTE: Record<number, TileVisualMeta> = {
  2: {
    bg: "linear-gradient(135deg, rgba(238,242,255,0.95) 0%, rgba(200,215,245,0.85) 100%)",
    text: "#1E293B",
    border: "rgba(56, 189, 248, 0.6)",
    shadow: "0 4px 12px rgba(56, 189, 248, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.9)",
    title: "Ion Spark",
    quantumDesignation: "Ion Spark",
    code: "ION-02",
    circuitColor: "rgba(56, 189, 248, 0.4)",
    tier: "common",
  },
  4: {
    bg: "linear-gradient(135deg, rgba(224,242,254,0.95) 0%, rgba(186,230,253,0.85) 100%)",
    text: "#0F172A",
    border: "rgba(14, 165, 233, 0.7)",
    shadow: "0 4px 14px rgba(14, 165, 233, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.9)",
    title: "Flux Core",
    quantumDesignation: "Flux Core",
    code: "FLX-04",
    circuitColor: "rgba(14, 165, 233, 0.45)",
    tier: "common",
  },
  8: {
    bg: "linear-gradient(135deg, rgba(254,215,170,0.95) 0%, rgba(251,146,60,0.9) 100%)",
    text: "#FFFFFF",
    border: "rgba(249, 115, 22, 0.8)",
    aura: "rgba(249, 115, 22, 0.45)",
    shadow: "0 6px 16px rgba(249, 115, 22, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.8)",
    title: "Plasma Cell",
    quantumDesignation: "Plasma Cell",
    code: "PLS-08",
    circuitColor: "rgba(249, 115, 22, 0.5)",
    tier: "uncommon",
  },
  16: {
    bg: "linear-gradient(135deg, rgba(253,186,116,0.95) 0%, rgba(234,88,12,0.92) 100%)",
    text: "#FFFFFF",
    border: "rgba(234, 88, 12, 0.85)",
    aura: "rgba(234, 88, 12, 0.5)",
    shadow: "0 8px 18px rgba(234, 88, 12, 0.45), inset 0 1px 2px rgba(255, 255, 255, 0.8)",
    title: "Hyper-Drive",
    quantumDesignation: "Hyper-Drive",
    code: "HYP-16",
    circuitColor: "rgba(234, 88, 12, 0.6)",
    tier: "uncommon",
  },
  32: {
    bg: "linear-gradient(135deg, rgba(251,113,133,0.95) 0%, rgba(225,29,72,0.92) 100%)",
    text: "#FFFFFF",
    border: "rgba(244, 63, 94, 0.9)",
    aura: "rgba(244, 63, 94, 0.55)",
    shadow: "0 8px 20px rgba(225, 29, 72, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.75)",
    title: "Fusion Chamber",
    quantumDesignation: "Fusion Chamber",
    code: "FUS-32",
    circuitColor: "rgba(244, 63, 94, 0.65)",
    tier: "rare",
  },
  64: {
    bg: "linear-gradient(135deg, rgba(244,63,94,0.95) 0%, rgba(190,18,60,0.95) 100%)",
    text: "#FFFFFF",
    border: "rgba(225, 29, 72, 0.95)",
    aura: "rgba(225, 29, 72, 0.6)",
    shadow: "0 10px 24px rgba(190, 18, 60, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.75)",
    title: "Warp Node",
    quantumDesignation: "Warp Node",
    code: "WRP-64",
    circuitColor: "rgba(225, 29, 72, 0.7)",
    tier: "rare",
  },
  128: {
    bg: "linear-gradient(135deg, rgba(254,240,138,0.98) 0%, rgba(234,179,8,0.95) 100%)",
    text: "#1E293B",
    border: "rgba(234, 179, 8, 0.95)",
    aura: "rgba(250, 204, 21, 0.65)",
    shadow: "0 10px 26px rgba(234, 179, 8, 0.55), inset 0 1px 2px rgba(255, 255, 255, 0.9)",
    title: "Solar Matrix",
    quantumDesignation: "Solar Matrix",
    code: "SLR-128",
    circuitColor: "rgba(234, 179, 8, 0.75)",
    tier: "epic",
  },
  256: {
    bg: "linear-gradient(135deg, rgba(253,224,71,0.98) 0%, rgba(202,138,4,0.95) 100%)",
    text: "#1E293B",
    border: "rgba(202, 138, 4, 1)",
    aura: "rgba(234, 179, 8, 0.75)",
    shadow: "0 12px 28px rgba(202, 138, 4, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.9)",
    title: "Supernova Core",
    quantumDesignation: "Supernova Core",
    code: "SPN-256",
    circuitColor: "rgba(202, 138, 4, 0.8)",
    tier: "epic",
  },
  512: {
    bg: "linear-gradient(135deg, rgba(192,132,252,0.98) 0%, rgba(126,34,206,0.95) 100%)",
    text: "#FFFFFF",
    border: "rgba(168, 85, 247, 1)",
    aura: "rgba(168, 85, 247, 0.8)",
    shadow: "0 12px 30px rgba(126, 34, 206, 0.7), inset 0 1px 2px rgba(255, 255, 255, 0.85)",
    title: "Antimatter Reactor",
    quantumDesignation: "Antimatter Reactor",
    code: "ANT-512",
    circuitColor: "rgba(168, 85, 247, 0.85)",
    tier: "legendary",
  },
  1024: {
    bg: "linear-gradient(135deg, rgba(168,85,247,0.98) 0%, rgba(88,28,135,0.95) 50%, rgba(245,158,11,0.9) 100%)",
    text: "#FFFFFF",
    border: "rgba(234, 179, 8, 1)",
    aura: "rgba(245, 158, 11, 0.85)",
    shadow: "0 14px 34px rgba(245, 158, 11, 0.75), inset 0 2px 3px rgba(255, 255, 255, 0.9)",
    title: "Tesseract Engine",
    quantumDesignation: "Tesseract Engine",
    code: "TSR-1024",
    circuitColor: "rgba(245, 158, 11, 0.9)",
    tier: "mythic",
  },
  2048: {
    bg: "linear-gradient(135deg, #FFD700 0%, #FFB703 35%, #FB8500 70%, #9D0208 100%)",
    text: "#FFFFFF",
    border: "rgba(255, 215, 0, 1)",
    aura: "rgba(255, 215, 0, 0.95)",
    shadow: "0 16px 42px rgba(255, 215, 0, 0.9), inset 0 2px 4px rgba(255, 255, 255, 1)",
    title: "Quantum Singularity",
    quantumDesignation: "Quantum Singularity",
    code: "SNG-2048",
    circuitColor: "rgba(255, 215, 0, 1)",
    tier: "sovereign",
  },
};

export type TableTheme = "cyberpunk" | "obsidian" | "synthwave" | "zen";

export interface TileLore {
  value: number;
  code: string;
  title: string;
  designation: string;
  tier: "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic" | "sovereign";
  lore: string;
  synthesis: string;
}

export const QUANTUM_TIERS: TileLore[] = [
  {
    value: 2,
    code: "ION-02",
    title: "Ion Spark",
    designation: "Ion Spark",
    tier: "common",
    lore: "A microscopic particle of ionized energy, sparking the first ignition of the quantum lattice.",
    synthesis: "Ambient energy condensation (90% base spawn probability).",
  },
  {
    value: 4,
    code: "FLX-04",
    title: "Flux Core",
    designation: "Flux Core",
    tier: "common",
    lore: "Twin ion sparks locked in an electromagnetic flux cycle. Forms the bedrock of matrix stability.",
    synthesis: "2 + 2 fusion or 10% spontaneous atmospheric spawn.",
  },
  {
    value: 8,
    code: "PLS-08",
    title: "Plasma Cell",
    designation: "Plasma Cell",
    tier: "uncommon",
    lore: "Superheated gas trapped in a magnetic containment field. Radiates warm amber heat.",
    synthesis: "4 + 4 flux compression.",
  },
  {
    value: 16,
    code: "HYP-16",
    title: "Hyper-Drive",
    designation: "Hyper-Drive",
    tier: "uncommon",
    lore: "The quantum engine begins to spin. Micro-tachyon particles pierce local spacetime.",
    synthesis: "8 + 8 plasma acceleration.",
  },
  {
    value: 32,
    code: "FUS-32",
    title: "Fusion Chamber",
    designation: "Fusion Chamber",
    tier: "rare",
    lore: "A stabilized thermonuclear vortex that glows with vivid crimson resonance.",
    synthesis: "16 + 16 hyper-kinetic collapse.",
  },
  {
    value: 64,
    code: "WRP-64",
    title: "Warp Node",
    designation: "Warp Node",
    tier: "rare",
    lore: "Gravitational lensing becomes visible to the naked eye. Bends nearby vector corridors.",
    synthesis: "32 + 32 fusion harmonic.",
  },
  {
    value: 128,
    code: "SLR-128",
    title: "Solar Matrix",
    designation: "Solar Matrix",
    tier: "epic",
    lore: "Captures the incandescent radiance of a young yellow dwarf star. Emits piercing photon rays.",
    synthesis: "64 + 64 stellar condensation.",
  },
  {
    value: 256,
    code: "SPN-256",
    title: "Supernova Core",
    designation: "Supernova Core",
    tier: "epic",
    lore: "The runaway implosion of a massive star, frozen at the exact millisecond of peak luminescence.",
    synthesis: "128 + 128 cosmic collapse.",
  },
  {
    value: 512,
    code: "ANT-512",
    title: "Antimatter Reactor",
    designation: "Antimatter Reactor",
    tier: "legendary",
    lore: "Pure positron flux suspended in zero-point vacuum. Capable of powering entire lunar lounges.",
    synthesis: "256 + 256 annihilation containment.",
  },
  {
    value: 1024,
    code: "TSR-1024",
    title: "Tesseract Engine",
    designation: "Tesseract Engine",
    tier: "mythic",
    lore: "A 4-dimensional hypercube folding through real-space. Shadows cast by this tile reflect tomorrow.",
    synthesis: "512 + 512 spatial folding.",
  },
  {
    value: 2048,
    code: "SNG-2048",
    title: "Quantum Singularity",
    designation: "Quantum Singularity",
    tier: "sovereign",
    lore: "Infinite density at zero volume. The sovereign crown of BHALYAM fusion mastery. Warps the lounge into hyperspace.",
    synthesis: "1024 + 1024 hyper-dimensional ascension.",
  },
  {
    value: 4096,
    code: "CSM-4096",
    title: "Cosmic Horizon",
    designation: "Cosmic Horizon",
    tier: "sovereign",
    lore: "Transcends the boundaries of the known universe. An unbroken continuum of pure thought and starlight.",
    synthesis: "2048 + 2048 infinite horizon synthesis.",
  },
];

export const WILDCARD_VISUAL: TileVisualMeta = {
  bg: "linear-gradient(135deg, #FF007A 0%, #7928CA 50%, #00DFD8 100%)",
  text: "#FFFFFF",
  border: "rgba(255, 255, 255, 0.95)",
  aura: "rgba(255, 0, 122, 0.85)",
  shadow: "0 0 25px rgba(0, 223, 216, 0.7), inset 0 2px 4px rgba(255, 255, 255, 0.9)",
  title: "Prism Core",
  quantumDesignation: "Prism Core (Wildcard)",
  code: "PRSM-★",
  circuitColor: "rgba(255, 255, 255, 0.9)",
  tier: "mythic",
};

/** Theme-specific tile styling modifications */
export function getTileVisual(value: number, theme: TableTheme = "cyberpunk"): TileVisualMeta {
  const base = TILE_PALETTE[value] ?? {
    bg: "linear-gradient(135deg, #050515 0%, #2E0854 50%, #00F5D4 100%)",
    text: "#E0F2FE",
    border: "rgba(0, 245, 212, 0.95)",
    aura: "rgba(0, 245, 212, 0.9)",
    shadow: "0 16px 44px rgba(0, 245, 212, 0.8), inset 0 2px 4px rgba(255, 255, 255, 0.8)",
    title: "Cosmic Horizon",
    quantumDesignation: "Cosmic Horizon",
    code: "CSM-4096",
    circuitColor: "rgba(0, 245, 212, 0.95)",
    tier: "sovereign" as const,
  };

  if (theme === "obsidian") {
    // 24K Brushed Gold on Obsidian Slate
    const goldIntensity = Math.min(1, Math.log2(Math.max(2, value)) / 11);
    const goldBorder = `rgba(212, 175, 55, ${0.4 + goldIntensity * 0.6})`;
    return {
      ...base,
      bg: value >= 2048
        ? "linear-gradient(135deg, #D4AF37 0%, #AA771C 50%, #1A1A1A 100%)"
        : `linear-gradient(135deg, #1C1D21 0%, #0D0E12 ${100 - goldIntensity * 40}%, #2A2415 100%)`,
      text: value >= 2048 ? "#000000" : "#F5E6C8",
      border: goldBorder,
      shadow: `0 8px 24px rgba(0,0,0,0.8), 0 0 ${12 + goldIntensity * 20}px rgba(212, 175, 55, ${0.2 + goldIntensity * 0.5})`,
      circuitColor: "rgba(212, 175, 55, 0.4)",
    };
  }

  if (theme === "synthwave") {
    // 80s Neon Magenta & Cyan
    const isHigh = value >= 128;
    return {
      ...base,
      bg: isHigh
        ? "linear-gradient(135deg, #FF007F 0%, #7928CA 50%, #00F0FF 100%)"
        : "linear-gradient(135deg, #2D006B 0%, #170038 100%)",
      text: "#FFFFFF",
      border: isHigh ? "rgba(0, 240, 255, 0.9)" : "rgba(255, 0, 127, 0.7)",
      shadow: `0 6px 20px rgba(255, 0, 127, 0.5), 0 0 15px rgba(0, 240, 255, 0.4)`,
      circuitColor: "rgba(0, 240, 255, 0.5)",
    };
  }

  if (theme === "zen") {
    // Minimalist Washi Paper & Natural Stone
    const isHigh = value >= 128;
    return {
      ...base,
      bg: isHigh
        ? "linear-gradient(135deg, #3E5A44 0%, #2A3D2E 100%)"
        : "linear-gradient(135deg, #F5F1E8 0%, #E8E0D0 100%)",
      text: isHigh ? "#FFFFFF" : "#2C2A29",
      border: isHigh ? "rgba(110, 150, 120, 0.8)" : "rgba(190, 180, 165, 0.9)",
      shadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
      circuitColor: "rgba(100, 120, 105, 0.25)",
    };
  }

  return base;
}
