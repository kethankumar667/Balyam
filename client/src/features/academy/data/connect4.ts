import type { GameAcademySpec } from "../types/academy";

export const CONNECT4_ACADEMY: GameAcademySpec = {
  slug: "connect4",
  title: "Connect 4",
  tagline: "The vertical gravity four-in-a-row duel — drop discs, create double threats, and claim the matrix.",
  genre: "board",
  players: "2 Players",
  duration: "5–10 min",
  difficulty: "Tactical",
  primaryAccent: "#3B82F6",
  secondaryAccent: "#FACC15",
  glowAura: "from-blue-600/25 via-yellow-500/15 to-transparent",
  storageKey: "bhalyam.academy.connect4.v2",
  slides: [
    {
      id: "objective",
      badge: "MISSION 01",
      title: "Vertical Gravity & Grid",
      summary: "Players alternate dropping one colored disc into any of the 7 columns. Gravity pulls each disc down to the lowest unoccupied slot in that column.",
      keyRule: "Board is 7 columns by 6 rows (42 slots). You choose the column; gravity determines the row.",
      proTip: "Control the center column (column 4): it participates in the highest number of potential winning lines across the board.",
      iconName: "Target",
    },
    {
      id: "winning_lines",
      badge: "MISSION 02",
      title: "Connect Four in a Row",
      summary: "Align 4 or more of your discs in an unbroken straight line to win immediately.",
      keyRule: "Winning lines can be horizontal, vertical, ascending diagonal, or descending diagonal. 5 or more in a row also counts as a win.",
      proTip: "Build double threats (forks) where two independent winning moves exist simultaneously, making it impossible for the opponent to block both.",
      iconName: "Zap",
    },
    {
      id: "board_draw_and_timer",
      badge: "TACTICAL LAWS",
      title: "Draws & Turn Clock",
      summary: "If all 42 slots fill up with no four-in-a-row, the match ends in an honorable draw. A four-in-a-row on the 42nd disc is still a win.",
      keyRule: "Turns have a turn timer (20 seconds default). If the clock expires, the server automatically plays the best available move (win, block, or center column).",
      proTip: "In Pass & Play mode, both players share the screen. Human-vs-human online wins award leaderboard points based on speed (fewer discs used yields up to 18 points).",
      iconName: "ShieldCheck",
    },
  ],
  cheatsheet: [
    {
      title: "Connect 4 Fundamentals",
      iconName: "Zap",
      items: [
        { label: "Grid Size", detail: "7 columns × 6 rows (42 total slots).", tag: "Board" },
        { label: "Gravity Rule", detail: "Discs drop to the lowest vacant slot in the chosen column.", tag: "Drop" },
        { label: "Win Condition", detail: "4 or more in a row horizontally, vertically, or diagonally.", tag: "Win" },
        { label: "Draw Rule", detail: "Board full (all 42 cells) with no winning line.", tag: "Draw" },
        { label: "Timeout Fallback", detail: "Auto-drop: win if possible, block opponent win, else central column.", tag: "Clock" },
      ],
    },
  ],
};
