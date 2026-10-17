import type { GameAcademySpec } from "../types/academy";

/**
 * Every number here is the number the server enforces (shared/types.ts VAMANA_* and the engine). The
 * test in games/vamanaguntalu/__tests__/vamanaAcademy.test.ts pins them, so the lesson cannot drift.
 */
export const VAMANAGUNTALU_ACADEMY: GameAcademySpec = {
  slug: "vamanaguntalu",
  title: "Vamana Guntalu",
  tagline: "The Telugu seed-sowing duel — sow, keep the relay going, and capture after an empty pit.",
  genre: "board",
  players: "2 Players",
  duration: "10–15 min",
  difficulty: "Tactical",
  primaryAccent: "#D97706",
  secondaryAccent: "#E4B128",
  glowAura: "from-amber-700/30 via-yellow-600/15 to-transparent",
  storageKey: "bhalyam.academy.vamanaguntalu.v2",
  slides: [
    {
      id: "board_and_seeds",
      badge: "MISSION 01",
      title: "Pits, Rows & Seeds",
      summary:
        "The board has two rows of 7 pits, one row for each player, with 5 seeds in every pit — 70 seeds in all. On your turn you pick one pit on your own row that still has seeds.",
      keyRule: "You can only start from a pit on your own row, and only if it is not empty.",
      proTip: "A pit with many seeds travels far. Count where its last seed will land before you lift it.",
      iconName: "Grid",
    },
    {
      id: "sowing",
      badge: "MISSION 02",
      title: "Sow Counter-Clockwise",
      summary:
        "Lift every seed out of your chosen pit and drop them one by one into the pits that follow, going counter-clockwise round the board — along your row, then back along your opponent's.",
      keyRule: "One seed per pit. Seeds go into your opponent's pits too, and into the pit you lifted from if you have enough to go all the way round.",
      iconName: "Orbit",
    },
    {
      id: "relay_and_capture",
      badge: "MISSION 03",
      title: "Relay and Capture",
      summary:
        "Look at the pit right after your last seed. If it has seeds, lift them all and keep sowing from there — that is a relay. If it is empty, your turn ends and you capture the seeds in the pit just beyond it.",
      keyRule: "Full pit next: relay. Empty pit next: capture the pit after it (if that pit is empty too, you capture nothing).",
      proTip: "Leave an empty pit just before one of your opponent's fattest pits, and let a relay finish there.",
      iconName: "Zap",
    },
    {
      id: "counting_up",
      badge: "TACTICAL LAWS",
      title: "Counting Up",
      summary:
        "When the player whose turn it is has no seeds left on their row, the match ends. Each player keeps the seeds still on their own row, and the bigger pile of the 70 wins. 35 each is a draw.",
      keyRule: "More than 35 seeds wins. Exactly 35 each is a draw, and a stake is returned.",
      proTip: "Seeds on your row at the end are yours, so a full row is worth protecting.",
      iconName: "Trophy",
    },
    {
      id: "clock_and_scores",
      badge: "TURN CLOCK",
      title: "Turn Clock & Scores",
      summary:
        "Each turn has a clock (25 seconds unless the host chose another). If it runs out, the server plays the pit that captures the most for you. Leaderboard scores come only from wins by a person over another person.",
      keyRule: "A win scores the seeds you finished with, from 36 up to 70. Wins against a bot, in Pass & Play, or because your opponent left do not score.",
      iconName: "ShieldCheck",
    },
  ],
  cheatsheet: [
    {
      title: "Vamana Guntalu at a glance",
      iconName: "Grid",
      items: [
        { label: "Board", detail: "2 rows of 7 pits, 5 seeds in each pit (70 seeds).", tag: "Setup" },
        { label: "Your move", detail: "Lift a non-empty pit on your own row and sow it counter-clockwise.", tag: "Sow" },
        { label: "Relay", detail: "If the pit after your last seed has seeds, lift them and keep sowing.", tag: "Relay" },
        { label: "Capture", detail: "If it is empty, capture the pit beyond it and your turn ends.", tag: "Capture" },
        { label: "End", detail: "When the player to move has no seeds, each player keeps their own row.", tag: "End" },
        { label: "Win", detail: "More than 35 seeds wins; 35 each is a draw.", tag: "Win" },
      ],
    },
  ],
  keybindings: [
    { key: "Tab", description: "Move between your pits" },
    { key: "← →", description: "Move between your pits on the wide board" },
    { key: "Enter / Space", description: "Sow the pit you are on" },
  ],
};
