import type { GameAcademySpec } from "../types/academy";

/**
 * Every fact here is the rule the game enforces (games/brainvita/brainvitaRules.ts, brainvitaGame.ts and
 * the shared mode definition). The test in games/brainvita/__tests__/brainvitaAcademy.test.ts pins them.
 */
export const BRAINVITA_ACADEMY: GameAcademySpec = {
  slug: "brainvita",
  title: "Brain Vita",
  tagline: "The classic marble puzzle — jump, remove, and try to leave just one.",
  genre: "board",
  players: "1 Player",
  duration: "5–15 min",
  difficulty: "Mastermind",
  primaryAccent: "#38BDF8",
  secondaryAccent: "#E4B128",
  glowAura: "from-sky-600/25 via-amber-500/15 to-transparent",
  storageKey: "bhalyam.academy.brainvita.v2",
  slides: [
    {
      id: "board_and_marbles",
      badge: "MISSION 01",
      title: "The Cross Board",
      summary:
        "The board is a cross with 33 holes. It starts with a marble in every hole except the centre one: 32 marbles and one empty hole.",
      keyRule: "You play alone, against the board. There is no clock to beat and no opponent.",
      iconName: "Grid",
    },
    {
      id: "jumping",
      badge: "MISSION 02",
      title: "Jump and Remove",
      summary:
        "Pick a marble, then pick the empty hole two steps away from it. Your marble jumps over the marble between them and lands in the empty hole, and the marble it jumped over is taken off the board.",
      keyRule: "Jumps go straight up, down, left or right — never diagonally — and always over exactly one marble into an empty hole.",
      proTip: "Every jump removes one marble, so a game that ends on one marble takes exactly 31 jumps.",
      iconName: "Orbit",
    },
    {
      id: "goal",
      badge: "MISSION 03",
      title: "Leave Just One",
      summary:
        "The game is over when no jump is left. Fewer marbles left is better. One marble is the goal, and a single marble in the centre hole is a perfect game.",
      keyRule: "Marbles left decide your result: 1 is Genius, 2 Excellent, 3 Very good, 4 Good.",
      proTip: "Work from the edges inward. Marbles left stranded in the corners of the cross are the hardest to remove.",
      iconName: "Target",
    },
    {
      id: "help_and_scores",
      badge: "PRACTICE & SCORES",
      title: "Hints, Undo and the Leaderboard",
      summary:
        "Undo takes back your last jump. Hint shows a jump from which the board can still be finished on one marble, and tells you honestly when it cannot.",
      keyRule: "Only a game played without any hint or undo is posted to the leaderboard. The score is the number of marbles left, so 1 is the best.",
      iconName: "ShieldCheck",
    },
  ],
  cheatsheet: [
    {
      title: "Brain Vita at a glance",
      iconName: "Grid",
      items: [
        { label: "Board", detail: "A cross of 33 holes. 32 marbles, the centre hole empty.", tag: "Setup" },
        { label: "Jump", detail: "Over one marble, in a straight line, into an empty hole. The jumped marble goes.", tag: "Move" },
        { label: "End", detail: "The game ends when no jump is left.", tag: "End" },
        { label: "Best result", detail: "One marble left, in the centre.", tag: "Goal" },
        { label: "Hint & undo", detail: "For practice. A game that uses either is not posted to the leaderboard.", tag: "Help" },
      ],
    },
  ],
  keybindings: [
    { key: "Arrow keys", description: "Move between holes" },
    { key: "Enter / Space", description: "Pick up a marble, or drop it in a highlighted hole" },
  ],
};
