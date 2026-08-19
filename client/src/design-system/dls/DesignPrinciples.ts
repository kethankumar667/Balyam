export const DESIGN_PRINCIPLES = {
  name: "BHALYAM Design Language System (DLS)",
  version: "1.0.0",
  philosophy: [
    {
      pillar: "Premium Gaming First",
      rule: "Every screen must evoke the excitement and prestige of modern competitive esports (Chess.com, Supercell, Steam, Xbox). Never default to boring admin dashboards.",
    },
    {
      pillar: "Zero Ad-Hoc Styling",
      rule: "All colors, spacing, typography, surfaces, and animations must be sourced strictly from predefined DLS tokens. Never introduce arbitrary inline hex values or random margins.",
    },
    {
      pillar: "Immediate Feedback & Delight",
      rule: "Every player action (victories, claims, rank climbs, bracket advances) should feel tangible and rewarding through micro-interactions and ambient glow transitions.",
    },
    {
      pillar: "Uncompromising Accessibility & Ergonomics",
      rule: "All touch targets must meet the 44x44px mobile requirement. Contrast ratios must comply with WCAG 2.1 AA. Respect prefers-reduced-motion unconditionally.",
    },
    {
      pillar: "Cohesive Dark-Theme Gaming Depth",
      rule: "Surfaces leverage calibrated glassmorphism, multi-stop dark stone gradients, and tier-specific radiant auras to create visual depth without visual clutter.",
    },
  ],
} as const;
