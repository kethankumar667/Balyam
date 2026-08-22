export * from "./NavigationIcons";
export * from "./RankIcons";
export * from "./GameIcons";
export * from "./AchievementIcons";
export * from "./TournamentIcons";
export * from "./SocialIcons";
export * from "./StatusIcons";
export * from "./VoiceIcons";
export * from "./FancyLockIcon";

export const RANK_COLORS = {
  bronze: {
    primary: "#B45309",
    light: "#FDE68A",
    gradient: "from-amber-700 to-amber-900",
    border: "border-amber-600/40",
  },
  silver: {
    primary: "#94A3B8",
    light: "#F8FAFC",
    gradient: "from-slate-400 to-slate-700",
    border: "border-slate-400/40",
  },
  gold: {
    primary: "#EAB308",
    light: "#FEF08A",
    gradient: "from-amber-400 to-yellow-600",
    border: "border-amber-400/50",
  },
  platinum: {
    primary: "#2DD4BF",
    light: "#CCFBF1",
    gradient: "from-teal-300 to-teal-700",
    border: "border-teal-400/50",
  },
  diamond: {
    primary: "#38BDF8",
    light: "#E0F2FE",
    gradient: "from-sky-300 to-blue-700",
    border: "border-sky-400/60",
  },
  master: {
    primary: "#A855F7",
    light: "#F3E8FF",
    gradient: "from-purple-400 to-indigo-800",
    border: "border-purple-400/60",
  },
  grandmaster: {
    primary: "#F43F5E",
    light: "#FFE4E6",
    gradient: "from-rose-400 via-purple-600 to-zinc-900",
    border: "border-rose-500/70",
  },
} as const;

export const RARITY_COLORS = {
  common: { text: "text-stone-400", border: "border-stone-700", bg: "bg-stone-900" },
  rare: { text: "text-sky-400", border: "border-sky-500/50", bg: "bg-sky-950/40" },
  epic: { text: "text-purple-400", border: "border-purple-500/50", bg: "bg-purple-950/40" },
  legendary: { text: "text-amber-400", border: "border-amber-500/60", bg: "bg-amber-950/40" },
  mythic: { text: "text-rose-400", border: "border-rose-500/70", bg: "bg-rose-950/40" },
} as const;
