import type { GameSkin } from "../skin";

export interface HcThemeTokens {
  id: GameSkin;
  name: string;
  badge: string;
  isDark: boolean;
  fontHeading: string;
  fontBody: string;
  fontDigits: string;
  
  // Outer Container
  shellBg: string;
  shellPattern?: string;
  
  // Header
  headerBg: string;
  headerBorder: string;
  headerText: string;
  headerAccent: string;

  // Panels & Cards
  cardBg: string;
  cardBorder: string;
  cardShadow: string;
  cardRadius: string;
  cardInnerBg: string;

  // Score Bug
  scoreBg: string;
  scoreBorder: string;
  scoreTextPrimary: string;
  scoreTextSecondary: string;
  scoreAccent: string;
  scoreWicketColor: string;

  // Crease / Pitch Bar
  creaseBg: string;
  creaseBorder: string;
  strikerHighlight: string;
  bowlerHighlight: string;

  // Action / Pick Buttons (1-6)
  pickButton: (num: number, chosen: boolean, ok: boolean, restricted: boolean) => {
    bg: string;
    text: string;
    border: string;
    shadow?: string;
  };

  // Chips & Badges
  chipBg: string;
  chipText: string;
  chipBorder: string;
  chipGoldBg: string;
  chipGoldText: string;

  // Summary & Podium
  summaryHeroBg: (isWinner: boolean, isTie: boolean) => string;
  summaryHeroBorder: (isWinner: boolean, isTie: boolean) => string;
}

export const HC_THEMES: Record<GameSkin, HcThemeTokens> = {
  broadcast: {
    id: "broadcast",
    name: "Broadcast Pro",
    badge: "PRO",
    isDark: true,
    fontHeading: "ui-sans-serif, system-ui, sans-serif",
    fontBody: "ui-sans-serif, system-ui, sans-serif",
    fontDigits: "ui-sans-serif, system-ui, sans-serif",
    shellBg: "linear-gradient(175deg, #050B14 0%, #081220 50%, #0B1A2E 100%)",
    headerBg: "rgba(4, 10, 20, 0.75)",
    headerBorder: "rgba(255, 255, 255, 0.10)",
    headerText: "#F8FAFC",
    headerAccent: "#F5C451",
    cardBg: "linear-gradient(160deg, rgba(13, 23, 42, 0.85) 0%, rgba(8, 14, 26, 0.90) 100%)",
    cardBorder: "rgba(255, 255, 255, 0.08)",
    cardShadow: "0 8px 32px rgba(0, 0, 0, 0.45)",
    cardRadius: "16px",
    cardInnerBg: "rgba(255, 255, 255, 0.035)",
    scoreBg: "linear-gradient(135deg, rgba(16, 28, 52, 0.95) 0%, rgba(9, 16, 32, 0.95) 100%)",
    scoreBorder: "rgba(245, 196, 81, 0.25)",
    scoreTextPrimary: "#FFFFFF",
    scoreTextSecondary: "#94A3B8",
    scoreAccent: "#F5C451",
    scoreWicketColor: "#EF4444",
    creaseBg: "rgba(10, 18, 36, 0.70)",
    creaseBorder: "rgba(255, 255, 255, 0.08)",
    strikerHighlight: "rgba(34, 197, 94, 0.15)",
    bowlerHighlight: "rgba(239, 68, 68, 0.15)",
    pickButton: (num, chosen, ok, restricted) => {
      if (chosen) {
        return {
          bg: "linear-gradient(168deg, #F5C451, #D97706)",
          text: "#1E1404",
          border: "rgba(255, 235, 180, 0.80)",
          shadow: "0 4px 20px rgba(245, 196, 81, 0.45)",
        };
      }
      if (!ok) {
        return {
          bg: "rgba(255, 255, 255, 0.02)",
          text: "rgba(255, 255, 255, 0.25)",
          border: "rgba(255, 255, 255, 0.05)",
        };
      }
      const tint = num >= 6 ? "#F5C451" : num >= 4 ? "#FB923C" : "#22C55E";
      return {
        bg: `linear-gradient(168deg, ${tint}25, ${tint}0C)`,
        text: "#F8FAFC",
        border: `${tint}55`,
        shadow: `0 2px 8px ${tint}15`,
      };
    },
    chipBg: "rgba(255, 255, 255, 0.06)",
    chipText: "#94A3B8",
    chipBorder: "rgba(255, 255, 255, 0.10)",
    chipGoldBg: "rgba(245, 196, 81, 0.15)",
    chipGoldText: "#FCD34D",
    summaryHeroBg: (isWinner, isTie) =>
      isTie
        ? "linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)"
        : isWinner
        ? "linear-gradient(135deg, rgba(20, 83, 45, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)"
        : "linear-gradient(135deg, rgba(127, 29, 29, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)",
    summaryHeroBorder: (isWinner, isTie) =>
      isTie ? "rgba(148, 163, 184, 0.35)" : isWinner ? "rgba(34, 197, 94, 0.6)" : "rgba(239, 68, 68, 0.5)",
  },

  nostalgia: {
    id: "nostalgia",
    name: "Classic Notebook",
    badge: "CLASSIC",
    isDark: false,
    fontHeading: "'Patrick Hand', 'Comic Sans MS', cursive, sans-serif",
    fontBody: "'Kalam', cursive, sans-serif",
    fontDigits: "'Patrick Hand', cursive, sans-serif",
    shellBg: "#FAF6EA",
    shellPattern: "radial-gradient(#d6cbb0 0.8px, transparent 0.8px)",
    headerBg: "rgba(245, 233, 196, 0.92)",
    headerBorder: "rgba(46, 40, 25, 0.25)",
    headerText: "#1A2952",
    headerAccent: "#166534",
    cardBg: "#FFFDF7",
    cardBorder: "1.5px dashed rgba(46, 40, 25, 0.35)",
    cardShadow: "0 4px 16px rgba(46, 40, 25, 0.08)",
    cardRadius: "12px",
    cardInnerBg: "rgba(245, 233, 196, 0.45)",
    scoreBg: "linear-gradient(135deg, #F5E9C4 0%, #EFE1B3 100%)",
    scoreBorder: "rgba(46, 40, 25, 0.30)",
    scoreTextPrimary: "#1A2952",
    scoreTextSecondary: "#4A5A82",
    scoreAccent: "#166534",
    scoreWicketColor: "#991B1B",
    creaseBg: "rgba(245, 233, 196, 0.60)",
    creaseBorder: "1px dashed rgba(46, 40, 25, 0.30)",
    strikerHighlight: "rgba(22, 101, 52, 0.12)",
    bowlerHighlight: "rgba(153, 27, 27, 0.12)",
    pickButton: (_num, chosen, ok, _restricted) => {
      if (chosen) {
        return {
          bg: "#166534",
          text: "#FFFFFF",
          border: "2px solid #14532D",
          shadow: "0 3px 12px rgba(22, 101, 52, 0.35)",
        };
      }
      if (!ok) {
        return {
          bg: "rgba(46, 40, 25, 0.05)",
          text: "rgba(46, 40, 25, 0.25)",
          border: "1px dashed rgba(46, 40, 25, 0.15)",
        };
      }
      return {
        bg: "rgba(255, 255, 255, 0.90)",
        text: "#1A2952",
        border: "1.5px solid rgba(46, 40, 25, 0.30)",
        shadow: "0 2px 6px rgba(46, 40, 25, 0.08)",
      };
    },
    chipBg: "rgba(245, 233, 196, 0.70)",
    chipText: "#4A3525",
    chipBorder: "1px dashed rgba(46, 40, 25, 0.30)",
    chipGoldBg: "rgba(251, 191, 36, 0.25)",
    chipGoldText: "#92400E",
    summaryHeroBg: (isWinner, isTie) =>
      isTie
        ? "linear-gradient(135deg, #e7e2cf 0%, #cbd5e1 100%)"
        : isWinner
        ? "linear-gradient(135deg, #dcfce7 0%, #fef9c3 55%, #fde68a 100%)"
        : "linear-gradient(135deg, #fee2e2 0%, #fef3c7 100%)",
    summaryHeroBorder: (isWinner, isTie) =>
      isTie ? "#4A5A82" : isWinner ? "#166534" : "#991B1B",
  },

  gully: {
    id: "gully",
    name: "Gully Street",
    badge: "STREET",
    isDark: true,
    fontHeading: "'Impact', 'Arial Black', sans-serif",
    fontBody: "ui-sans-serif, system-ui, sans-serif",
    fontDigits: "'Impact', sans-serif",
    shellBg: "radial-gradient(circle at 50% 20%, #27272A 0%, #18181B 60%, #09090B 100%)",
    headerBg: "rgba(24, 24, 27, 0.90)",
    headerBorder: "rgba(234, 179, 8, 0.35)",
    headerText: "#FAFAFA",
    headerAccent: "#EAB308",
    cardBg: "linear-gradient(165deg, rgba(39, 39, 42, 0.95) 0%, rgba(24, 24, 27, 0.98) 100%)",
    cardBorder: "1.5px solid rgba(234, 179, 8, 0.25)",
    cardShadow: "0 10px 30px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255,255,255,0.08)",
    cardRadius: "10px",
    cardInnerBg: "rgba(0, 0, 0, 0.35)",
    scoreBg: "linear-gradient(140deg, #1C1917 0%, #0C0A09 100%)",
    scoreBorder: "2px solid #EAB308",
    scoreTextPrimary: "#FAFAFA",
    scoreTextSecondary: "#A1A1AA",
    scoreAccent: "#EAB308",
    scoreWicketColor: "#DC2626",
    creaseBg: "rgba(39, 39, 42, 0.70)",
    creaseBorder: "1px dashed rgba(234, 179, 8, 0.35)",
    strikerHighlight: "rgba(234, 179, 8, 0.20)",
    bowlerHighlight: "rgba(220, 38, 38, 0.20)",
    pickButton: (num, chosen, ok, _restricted) => {
      if (chosen) {
        return {
          bg: "linear-gradient(135deg, #EAB308 0%, #CA8A04 100%)",
          text: "#09090B",
          border: "2px solid #FEF08A",
          shadow: "0 0 18px rgba(234, 179, 8, 0.55)",
        };
      }
      if (!ok) {
        return {
          bg: "rgba(0, 0, 0, 0.40)",
          text: "rgba(255, 255, 255, 0.20)",
          border: "1px solid rgba(255, 255, 255, 0.05)",
        };
      }
      const streetColor = num >= 6 ? "#EAB308" : num >= 4 ? "#F97316" : "#22C55E";
      return {
        bg: `linear-gradient(160deg, ${streetColor}20, rgba(24, 24, 27, 0.85))`,
        text: "#FAFAFA",
        border: `1.5px solid ${streetColor}66`,
        shadow: "0 2px 8px rgba(0, 0, 0, 0.4)",
      };
    },
    chipBg: "rgba(39, 39, 42, 0.80)",
    chipText: "#D4D4D8",
    chipBorder: "1px solid rgba(255, 255, 255, 0.12)",
    chipGoldBg: "rgba(234, 179, 8, 0.20)",
    chipGoldText: "#FDE047",
    summaryHeroBg: (isWinner, isTie) =>
      isTie
        ? "linear-gradient(135deg, #27272A 0%, #18181B 100%)"
        : isWinner
        ? "linear-gradient(135deg, #14532D 0%, #18181B 100%)"
        : "linear-gradient(135deg, #7F1D1D 0%, #18181B 100%)",
    summaryHeroBorder: (isWinner, isTie) =>
      isTie ? "#A1A1AA" : isWinner ? "#22C55E" : "#EF4444",
  },

  neon: {
    id: "neon",
    name: "Midnight Cyber",
    badge: "CYBER",
    isDark: true,
    fontHeading: "'Orbitron', 'Rajdhani', ui-sans-serif, sans-serif",
    fontBody: "ui-sans-serif, system-ui, sans-serif",
    fontDigits: "'Orbitron', monospace",
    shellBg: "radial-gradient(ellipse at 50% 10%, #0E1738 0%, #060813 60%, #03040A 100%)",
    headerBg: "rgba(6, 8, 19, 0.85)",
    headerBorder: "rgba(6, 182, 212, 0.35)",
    headerText: "#F0FDFA",
    headerAccent: "#06B6D4",
    cardBg: "linear-gradient(170deg, rgba(14, 23, 56, 0.70) 0%, rgba(6, 9, 22, 0.85) 100%)",
    cardBorder: "1px solid rgba(6, 182, 212, 0.30)",
    cardShadow: "0 8px 32px rgba(6, 182, 212, 0.15), inset 0 0 16px rgba(6, 182, 212, 0.05)",
    cardRadius: "14px",
    cardInnerBg: "rgba(6, 182, 212, 0.05)",
    scoreBg: "linear-gradient(135deg, rgba(8, 28, 64, 0.90) 0%, rgba(4, 12, 30, 0.95) 100%)",
    scoreBorder: "1.5px solid #06B6D4",
    scoreTextPrimary: "#FFFFFF",
    scoreTextSecondary: "#94A3B8",
    scoreAccent: "#06B6D4",
    scoreWicketColor: "#F43F5E",
    creaseBg: "rgba(8, 18, 44, 0.70)",
    creaseBorder: "1px solid rgba(6, 182, 212, 0.25)",
    strikerHighlight: "rgba(6, 182, 212, 0.20)",
    bowlerHighlight: "rgba(244, 63, 94, 0.20)",
    pickButton: (num, chosen, ok, _restricted) => {
      if (chosen) {
        return {
          bg: "linear-gradient(168deg, #06B6D4, #0284C7)",
          text: "#030816",
          border: "2px solid #67E8F9",
          shadow: "0 0 24px rgba(6, 182, 212, 0.75)",
        };
      }
      if (!ok) {
        return {
          bg: "rgba(255, 255, 255, 0.02)",
          text: "rgba(255, 255, 255, 0.20)",
          border: "1px solid rgba(255, 255, 255, 0.04)",
        };
      }
      const neonColor = num >= 6 ? "#06B6D4" : num >= 4 ? "#EC4899" : "#10B981";
      return {
        bg: `linear-gradient(160deg, ${neonColor}20, rgba(6, 8, 19, 0.8))`,
        text: "#FFFFFF",
        border: `1.5px solid ${neonColor}88`,
        shadow: `0 0 12px ${neonColor}22`,
      };
    },
    chipBg: "rgba(6, 182, 212, 0.10)",
    chipText: "#A5F3FC",
    chipBorder: "1px solid rgba(6, 182, 212, 0.35)",
    chipGoldBg: "rgba(245, 158, 11, 0.18)",
    chipGoldText: "#FCD34D",
    summaryHeroBg: (isWinner, isTie) =>
      isTie
        ? "linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)"
        : isWinner
        ? "linear-gradient(135deg, rgba(6, 95, 70, 0.85) 0%, rgba(6, 8, 19, 0.95) 100%)"
        : "linear-gradient(135deg, rgba(136, 19, 55, 0.85) 0%, rgba(6, 8, 19, 0.95) 100%)",
    summaryHeroBorder: (isWinner, isTie) =>
      isTie ? "#64748B" : isWinner ? "#10B981" : "#F43F5E",
  },

  arcade: {
    id: "arcade",
    name: "8-Bit Arcade",
    badge: "RETRO",
    isDark: true,
    fontHeading: "'Press Start 2P', 'Courier New', monospace",
    fontBody: "'Courier New', monospace",
    fontDigits: "'Press Start 2P', monospace",
    shellBg: "radial-gradient(circle, #212918 0%, #141A0E 70%, #0B0E07 100%)",
    headerBg: "rgba(20, 26, 14, 0.92)",
    headerBorder: "2px solid #8BAC0F",
    headerText: "#9BBC0F",
    headerAccent: "#8BAC0F",
    cardBg: "#182010",
    cardBorder: "3px solid #8BAC0F",
    cardShadow: "4px 4px 0px #0F380F",
    cardRadius: "6px",
    cardInnerBg: "#0F160A",
    scoreBg: "#0F160A",
    scoreBorder: "2px solid #8BAC0F",
    scoreTextPrimary: "#9BBC0F",
    scoreTextSecondary: "#8BAC0F",
    scoreAccent: "#9BBC0F",
    scoreWicketColor: "#FF4444",
    creaseBg: "#141C0E",
    creaseBorder: "2px solid #8BAC0F",
    strikerHighlight: "rgba(139, 172, 15, 0.25)",
    bowlerHighlight: "rgba(255, 68, 68, 0.20)",
    pickButton: (_num, chosen, ok, _restricted) => {
      if (chosen) {
        return {
          bg: "#8BAC0F",
          text: "#0F380F",
          border: "3px solid #9BBC0F",
          shadow: "2px 2px 0px #0F380F",
        };
      }
      if (!ok) {
        return {
          bg: "#0B0E07",
          text: "#304018",
          border: "2px solid #304018",
        };
      }
      return {
        bg: "#182010",
        text: "#9BBC0F",
        border: "2px solid #8BAC0F",
        shadow: "3px 3px 0px #0F380F",
      };
    },
    chipBg: "#0F160A",
    chipText: "#8BAC0F",
    chipBorder: "1px solid #8BAC0F",
    chipGoldBg: "rgba(245, 158, 11, 0.25)",
    chipGoldText: "#F59E0B",
    summaryHeroBg: (isWinner, isTie) =>
      isTie ? "#182010" : isWinner ? "#183010" : "#301810",
    summaryHeroBorder: (isWinner, isTie) =>
      isTie ? "#8BAC0F" : isWinner ? "#9BBC0F" : "#FF4444",
  },

  heritage: {
    id: "heritage",
    name: "Vintage Pavilion",
    badge: "CLUB",
    isDark: true,
    fontHeading: "Georgia, 'Times New Roman', serif",
    fontBody: "Georgia, serif",
    fontDigits: "Georgia, 'Times New Roman', serif",
    shellBg: "linear-gradient(160deg, #2B1810 0%, #1A0E0A 60%, #0F0806 100%)",
    headerBg: "rgba(43, 24, 16, 0.90)",
    headerBorder: "1.5px solid rgba(217, 119, 6, 0.40)",
    headerText: "#FDFBF7",
    headerAccent: "#D97706",
    cardBg: "linear-gradient(165deg, #382016 0%, #24140D 100%)",
    cardBorder: "1.5px solid rgba(217, 119, 6, 0.30)",
    cardShadow: "0 10px 32px rgba(0, 0, 0, 0.60)",
    cardRadius: "12px",
    cardInnerBg: "rgba(253, 251, 247, 0.05)",
    scoreBg: "linear-gradient(135deg, #1C0F0A 0%, #2E1810 100%)",
    scoreBorder: "2px solid #D97706",
    scoreTextPrimary: "#FDFBF7",
    scoreTextSecondary: "#D4C4B7",
    scoreAccent: "#D97706",
    scoreWicketColor: "#DC2626",
    creaseBg: "rgba(36, 20, 13, 0.75)",
    creaseBorder: "1px solid rgba(217, 119, 6, 0.25)",
    strikerHighlight: "rgba(21, 128, 61, 0.25)",
    bowlerHighlight: "rgba(220, 38, 38, 0.25)",
    pickButton: (num, chosen, ok, _restricted) => {
      if (chosen) {
        return {
          bg: "linear-gradient(145deg, #D97706 0%, #B45309 100%)",
          text: "#FFFFFF",
          border: "2px solid #FDE68A",
          shadow: "0 4px 16px rgba(217, 119, 6, 0.45)",
        };
      }
      if (!ok) {
        return {
          bg: "rgba(0, 0, 0, 0.35)",
          text: "rgba(255, 255, 255, 0.25)",
          border: "1px solid rgba(255, 255, 255, 0.05)",
        };
      }
      const heritageTint = num >= 6 ? "#D97706" : num >= 4 ? "#EA580C" : "#15803D";
      return {
        bg: `linear-gradient(160deg, ${heritageTint}22, rgba(43, 24, 16, 0.85))`,
        text: "#FDFBF7",
        border: `1.5px solid ${heritageTint}66`,
        shadow: "0 2px 8px rgba(0, 0, 0, 0.35)",
      };
    },
    chipBg: "rgba(253, 251, 247, 0.08)",
    chipText: "#D4C4B7",
    chipBorder: "1px solid rgba(217, 119, 6, 0.25)",
    chipGoldBg: "rgba(217, 119, 6, 0.25)",
    chipGoldText: "#FCD34D",
    summaryHeroBg: (isWinner, isTie) =>
      isTie
        ? "linear-gradient(135deg, #2E1810 0%, #1C0F0A 100%)"
        : isWinner
        ? "linear-gradient(135deg, #14532D 0%, #1C0F0A 100%)"
        : "linear-gradient(135deg, #7F1D1D 0%, #1C0F0A 100%)",
    summaryHeroBorder: (isWinner, isTie) =>
      isTie ? "#D4C4B7" : isWinner ? "#22C55E" : "#DC2626",
  },
};
