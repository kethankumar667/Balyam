export interface TileVisualMeta {
  bg: string;
  text: string;
  border: string;
  aura?: string;
  shadow: string;
  title: string;
  tier: "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic" | "sovereign";
}

export const TILE_PALETTE: Record<number, TileVisualMeta> = {
  2: {
    bg: "linear-gradient(135deg, #F9F5F0 0%, #EAE0D5 100%)",
    text: "#4A3B32",
    border: "rgba(180, 160, 140, 0.4)",
    shadow: "0 4px 8px rgba(74, 59, 50, 0.12), inset 0 1px 1px rgba(255, 255, 255, 0.9)",
    title: "Ember",
    tier: "common",
  },
  4: {
    bg: "linear-gradient(135deg, #F4ECE1 0%, #E6D8C3 100%)",
    text: "#4A3B32",
    border: "rgba(180, 160, 130, 0.5)",
    shadow: "0 4px 8px rgba(74, 59, 50, 0.14), inset 0 1px 1px rgba(255, 255, 255, 0.9)",
    title: "Spark",
    tier: "common",
  },
  8: {
    bg: "linear-gradient(135deg, #F5B888 0%, #E89552 100%)",
    text: "#FFFFFF",
    border: "rgba(232, 149, 82, 0.6)",
    aura: "rgba(232, 149, 82, 0.35)",
    shadow: "0 6px 14px rgba(232, 149, 82, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.6)",
    title: "Flame",
    tier: "uncommon",
  },
  16: {
    bg: "linear-gradient(135deg, #F79C6E 0%, #EA7A40 100%)",
    text: "#FFFFFF",
    border: "rgba(234, 122, 64, 0.7)",
    aura: "rgba(234, 122, 64, 0.4)",
    shadow: "0 6px 16px rgba(234, 122, 64, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.6)",
    title: "Blaze",
    tier: "uncommon",
  },
  32: {
    bg: "linear-gradient(135deg, #F88165 0%, #E85B3A 100%)",
    text: "#FFFFFF",
    border: "rgba(232, 91, 58, 0.75)",
    aura: "rgba(232, 91, 58, 0.45)",
    shadow: "0 8px 18px rgba(232, 91, 58, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.5)",
    title: "Pulse",
    tier: "rare",
  },
  64: {
    bg: "linear-gradient(135deg, #F86743 0%, #DC3D18 100%)",
    text: "#FFFFFF",
    border: "rgba(220, 61, 24, 0.8)",
    aura: "rgba(220, 61, 24, 0.5)",
    shadow: "0 8px 20px rgba(220, 61, 24, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.5)",
    title: "Surge",
    tier: "rare",
  },
  128: {
    bg: "linear-gradient(135deg, #F3D97F 0%, #E5BE4A 100%)",
    text: "#FFFFFF",
    border: "rgba(229, 190, 74, 0.8)",
    aura: "rgba(243, 217, 127, 0.6)",
    shadow: "0 10px 22px rgba(229, 190, 74, 0.55), inset 0 1px 2px rgba(255, 255, 255, 0.8)",
    title: "Solar",
    tier: "epic",
  },
  256: {
    bg: "linear-gradient(135deg, #F2D368 0%, #DDB334 100%)",
    text: "#FFFFFF",
    border: "rgba(221, 179, 52, 0.85)",
    aura: "rgba(242, 211, 104, 0.65)",
    shadow: "0 10px 24px rgba(221, 179, 52, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.8)",
    title: "Supernova",
    tier: "epic",
  },
  512: {
    bg: "linear-gradient(135deg, #F1CC52 0%, #D4A320 100%)",
    text: "#FFFFFF",
    border: "rgba(212, 163, 32, 0.9)",
    aura: "rgba(241, 204, 82, 0.7)",
    shadow: "0 12px 26px rgba(212, 163, 32, 0.65), inset 0 1px 2px rgba(255, 255, 255, 0.8)",
    title: "Nebula",
    tier: "legendary",
  },
  1024: {
    bg: "linear-gradient(135deg, #F0C43D 0%, #C99110 100%)",
    text: "#FFFFFF",
    border: "rgba(201, 145, 16, 0.95)",
    aura: "rgba(240, 196, 61, 0.8)",
    shadow: "0 14px 28px rgba(201, 145, 16, 0.7), inset 0 2px 3px rgba(255, 255, 255, 0.9)",
    title: "Zenith",
    tier: "mythic",
  },
  2048: {
    bg: "linear-gradient(135deg, #FFD700 0%, #E5A800 50%, #B8860B 100%)",
    text: "#FFFFFF",
    border: "rgba(255, 215, 0, 1)",
    aura: "rgba(255, 215, 0, 0.95)",
    shadow: "0 16px 36px rgba(255, 215, 0, 0.85), inset 0 2px 4px rgba(255, 255, 255, 0.95)",
    title: "Sovereign Crown",
    tier: "sovereign",
  },
};

export function getTileVisual(value: number): TileVisualMeta {
  if (TILE_PALETTE[value]) {
    return TILE_PALETTE[value];
  }
  // Beyond 2048: Transcendent celestial obsidian
  return {
    bg: "linear-gradient(135deg, #3B1B54 0%, #1F0E30 100%)",
    text: "#F5E8FF",
    border: "rgba(168, 85, 247, 0.9)",
    aura: "rgba(168, 85, 247, 0.85)",
    shadow: "0 16px 36px rgba(168, 85, 247, 0.7), inset 0 2px 4px rgba(255, 255, 255, 0.7)",
    title: "Ascendant",
    tier: "sovereign",
  };
}
