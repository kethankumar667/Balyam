import type { GameAcademySpec } from "../types/academy";

// Rules text in this file is checked against the engines by
// __tests__/academyRulesTruth.test.ts. Sources: server/src/games/{handcricket,
// rps,wordbuilding,stargame,bingo,tambola,namesplaceanimal}, shared/catalog.ts.

export const HANDCRICKET_ACADEMY: GameAcademySpec = {
  slug: "handcricket",
  title: "Hand Cricket",
  tagline: "The legendary 90s classroom finger-cricket duel — score runs, outwit batters, and unleash Mystery Yorkers.",
  genre: "duel",
  players: "2 Players",
  duration: "5–10 min",
  difficulty: "Casual",
  primaryAccent: "#16A34A",
  secondaryAccent: "#DC2626",
  glowAura: "from-green-600/25 via-red-600/10 to-transparent",
  storageKey: "bhalyam.academy.handcricket.v2",
  slides: [
    {
      id: "objective",
      badge: "MISSION 01",
      title: "The Numbers Duel (1 to 6)",
      summary: "Every ball, batter and bowler simultaneously flash a number from 1 to 6.",
      keyRule: "If the numbers DIFFER, the batter scores that many runs. If the numbers MATCH, the batter is OUT!",
      proTip: "Observe opponent rhythm: players often alternate between high risks (4, 6) and defensive singles (1, 2).",
      iconName: "Target",
      sandboxKind: "cricket-duel",
      sandboxConfig: { mode: "standard" },
    },
    {
      id: "mystery_yorker",
      badge: "LETHAL WEAPON",
      title: "Powerplay & The Mystery Yorker",
      summary: "During Powerplay overs (ODI and T20 formats), the bowler gets 1 lethal Mystery Yorker per over! Batters must read the Yorker indicator.",
      keyRule: "Hitting 4, 5, or 6 against a Yorker results in INSTANT CLEAN BOWLED! Batters must dig it out with 1, 2, or 3 (a matching number is still OUT).",
      proTip: "Bowlers: save your Yorker for the final ball or when the batter has shown a pattern of hitting boundaries.",
      iconName: "Zap",
      sandboxKind: "cricket-duel",
      sandboxConfig: { mode: "yorker" },
    },
    {
      id: "innings_chase",
      badge: "CHASE PRESSURE",
      title: "Innings Switch & Target Chase",
      summary: "Once 10 wickets fall or the designated overs end, roles reverse. The chasing side must exceed the target to win.",
      keyRule: "Surpassing the target immediately triggers victory — every run in the chase counts.",
      proTip: "In tight chases, calculate required run rate per over to avoid desperate slogs.",
      iconName: "Trophy",
    },
  ],
  cheatsheet: [
    {
      title: "Scoring & Wickets",
      iconName: "Zap",
      items: [
        { label: "Run Scoring", detail: "Batter picks X, Bowler picks Y (X ≠ Y) → Batter gains X runs.", tag: "Runs" },
        { label: "Wicket (OUT)", detail: "Batter picks X, Bowler picks X (X = Y) → Batter dismissed.", tag: "Wicket" },
        { label: "Mystery Yorker Rule", detail: "Powerplay only, once per over: batter playing 4/5/6 = Clean Bowled! 1/2/3 defends unless the numbers match.", tag: "Lethal" },
      ],
    },
  ],
};

export const RPS_ACADEMY: GameAcademySpec = {
  slug: "rps",
  title: "Rock Paper Scissors",
  tagline: "The purest reflex mind-game — prediction, counter-picks, and round momentum streaks.",
  genre: "duel",
  players: "2 Players",
  duration: "3–5 min",
  difficulty: "Casual",
  primaryAccent: "#8B5CF6",
  secondaryAccent: "#EC4899",
  glowAura: "from-purple-600/25 via-pink-600/10 to-transparent",
  storageKey: "bhalyam.academy.rps.v2",
  slides: [
    {
      id: "objective",
      badge: "MISSION 01",
      title: "The Triangle of Dominance",
      summary: "Secretly throw Rock, Paper, or Scissors simultaneously before the round timer runs out.",
      keyRule: "Rock crushes Scissors, Scissors cut Paper, and Paper covers Rock.",
      proTip: "Watch for patterns in your opponent's throws, then mix up your own so they cannot read you.",
      iconName: "Target",
    },
    {
      id: "ties_streaks",
      badge: "STREAK MOMENTUM",
      title: "Ties & Rapid Replay",
      summary: "When both players throw the same symbol, the round is a tie: nobody scores, both win streaks reset, and the next round starts straight away.",
      keyRule: "First to win 10 rounds claims the match victory.",
      proTip: "Break predictability by throwing unexpected consecutive repeats.",
      iconName: "Flame",
    },
  ],
  cheatsheet: [
    {
      title: "Combat Chart",
      iconName: "Zap",
      items: [
        { label: "Rock 🪨", detail: "Beats Scissors · Loses to Paper · Ties Rock", tag: "Heavy" },
        { label: "Paper 📄", detail: "Beats Rock · Loses to Scissors · Ties Paper", tag: "Control" },
        { label: "Scissors ✂️", detail: "Beats Paper · Loses to Rock · Ties Scissors", tag: "Sharp" },
      ],
    },
    {
      title: "Match Flow",
      iconName: "Trophy",
      items: [
        { label: "Match Target", detail: "The first player to win 10 rounds takes the match.", tag: "Goal" },
        { label: "Win Streak", detail: "Consecutive round wins build a streak; a loss or a tie resets it.", tag: "Streak" },
      ],
    },
  ],
  keybindings: [
    { key: "R", description: "Throw Rock" },
    { key: "P", description: "Throw Paper" },
    { key: "S", description: "Throw Scissors" },
  ],
};

export const WORDBUILDING_ACADEMY: GameAcademySpec = {
  slug: "wordbuilding",
  title: "Word Building",
  tagline: "Classroom notebook lexicon combat — place letters, complete words across the grid, and rack up marks.",
  genre: "classroom",
  players: "2–6 Players",
  duration: "5–10 min",
  difficulty: "Tactical",
  primaryAccent: "#D97706",
  secondaryAccent: "#B45309",
  glowAura: "from-amber-600/20 via-orange-600/10 to-transparent",
  storageKey: "bhalyam.academy.wordbuilding.v2",
  slides: [
    {
      id: "objective",
      badge: "MISSION 01",
      title: "The Shared Workbook Grid",
      summary: "Players take turns writing a single letter into any empty cell on the ruled workbook page.",
      keyRule: "When your letter completes a valid 3+ letter English word, you score points equal to the word length.",
      proTip: "Build small 3-letter stems to prime the grid for massive 6+ letter words on your next turn.",
      iconName: "BookOpen",
    },
    {
      id: "cross_scoring",
      badge: "ANY DIRECTION",
      title: "Rows, Columns & Diagonals",
      summary: "A word can be completed along the placed letter's row, its column, or either diagonal.",
      keyRule: "Only the single longest new word a placement completes scores, and each word can score only once per match.",
      proTip: "Look for a spot where one common letter (E, A, I) finishes a long word, because length is what you are paid for.",
      iconName: "Zap",
    },
  ],
  cheatsheet: [
    {
      title: "Scoring Marks",
      iconName: "Crown",
      items: [
        { label: "3-Letter Word", detail: "3 Marks (Good)", tag: "Base" },
        { label: "4-Letter Word", detail: "4 Marks (Well Done)", tag: "Solid" },
        { label: "5-Letter Word", detail: "5 Marks (Very Good)", tag: "High" },
        { label: "6+ Letter Word", detail: "6+ Marks (Excellent)", tag: "Mastery" },
        { label: "One Word Per Move", detail: "If a letter completes several words, only the longest one scores.", tag: "Rule" },
      ],
    },
  ],
  keybindings: [
    { key: "A - Z", description: "Type a letter into the selected cell" },
    { key: "Esc", description: "Deselect the cell" },
  ],
};

export const STARGAME_ACADEMY: GameAcademySpec = {
  slug: "stargame",
  title: "Star Game (Chits)",
  tagline: "Secret identity passing, four-of-a-kind detection, and lightning-fast hand stack races.",
  genre: "duel",
  players: "2–8 Players",
  duration: "5–10 min",
  difficulty: "Tactical",
  primaryAccent: "#8C5A2B",
  secondaryAccent: "#F59E0B",
  glowAura: "from-amber-700/20 via-yellow-500/10 to-transparent",
  storageKey: "bhalyam.academy.stargame.v2",
  slides: [
    {
      id: "objective",
      badge: "MISSION 01",
      title: "Chit Passing & 4-of-a-Kind",
      summary: "Every player secretly picks one value from a shared theme. The deck holds 4 copies of each picked value and everyone is dealt 4 chits. Players then pass one chit at a time, clockwise around the table.",
      keyRule: "When a full lap of passes ends and someone holds 4 identical chits, the STAR phase opens.",
      proTip: "Track which chits come back to you to deduce what your neighbours are collecting.",
      iconName: "Target",
    },
    {
      id: "slap_star",
      badge: "REFLEX RACE",
      title: "The STAR Slap & Hand Stack",
      summary: "When STAR opens, only a player holding 4-of-a-kind can slap the STAR button, and the first slap wins the round. Everyone else then races to stack their hand.",
      keyRule: "The STAR winner scores 10 points; each later hand-stack scores one point less, down to a minimum of 1.",
      proTip: "If you cannot slap STAR, get your hand on the stack the moment it opens. Every place you lose costs a point.",
      iconName: "Flame",
    },
  ],
  cheatsheet: [
    {
      title: "Round Flow",
      iconName: "Zap",
      items: [
        { label: "Chit Passing", detail: "Select 1 chit to arm and send to the next player clockwise; players pass one at a time.", tag: "Stealth" },
        { label: "STAR Trigger", detail: "After a full lap of passes, anyone holding 4-of-a-kind can slap the STAR. The first slap takes the round.", tag: "Trigger" },
        { label: "Hand Stack Rank", detail: "STAR winner 10 pts, then 9, 8 and so on, never below 1 pt.", tag: "Reflex" },
      ],
    },
  ],
  keybindings: [
    { key: "1 - 4", description: "Arm the 1st to 4th chit before passing" },
    { key: "Enter", description: "Pass the armed chit" },
    { key: "S", description: "Slap the STAR (four of a kind only)" },
    { key: "Space", description: "Stack your hand" },
  ],
};

export const BINGO_ACADEMY: GameAcademySpec = {
  slug: "bingo",
  title: "Bingo Lounge",
  tagline: "Fill your 5x5 matrix, cross off called numbers, and race to complete 5 lines to shout B-I-N-G-O.",
  genre: "classroom",
  players: "1–8 Players",
  duration: "5–10 min",
  difficulty: "Casual",
  primaryAccent: "#EC4899",
  secondaryAccent: "#8B5CF6",
  glowAura: "from-pink-500/20 via-purple-500/10 to-transparent",
  storageKey: "bhalyam.academy.bingo.v2",
  slides: [
    {
      id: "objective",
      badge: "MISSION 01",
      title: "Set Your 5x5 Number Matrix",
      summary: "Your card is a 5x5 grid holding every number from 1 to 25. Shuffle it until you like the layout, then lock it in.",
      keyRule: "Players take turns calling a number nobody has called yet; everyone marks it on their own card before the mark window closes.",
      proTip: "Spread numbers so your lines cross often: a number that sits on two lines helps twice.",
      iconName: "Grid",
    },
    {
      id: "line_clears",
      badge: "LINE ILLUMINATION",
      title: "5 Completed Lines = B-I-N-G-O",
      summary: "Completing any horizontal row, vertical column, or diagonal of 5 marked numbers counts as a line, and each line lights up one letter of B-I-N-G-O.",
      keyRule: "Once you have 5 completed lines, claim BINGO. The first valid claim wins the round instantly.",
      proTip: "There are 12 possible lines (5 rows, 5 columns, 2 diagonals). Call numbers that advance your intersections without helping opponents.",
      iconName: "Crown",
    },
  ],
  cheatsheet: [
    {
      title: "Line Mechanics",
      iconName: "Grid",
      items: [
        { label: "Card Layout", detail: "5x5 grid containing numbers 1 to 25.", tag: "Grid" },
        { label: "Line Completion", detail: "5 marked numbers horizontally, vertically, or diagonally.", tag: "Line" },
        { label: "Victory Shout", detail: "5 lines complete, then claim BINGO to win.", tag: "Win" },
      ],
    },
  ],
};

export const TAMBOLA_ACADEMY: GameAcademySpec = {
  slug: "tambola",
  title: "Tambola (Housie)",
  tagline: "The quintessential Indian social ticket game — strike Early 5, the three Lines, and the Full House.",
  genre: "classroom",
  players: "1–12 Players",
  duration: "10–20 min",
  difficulty: "Casual",
  primaryAccent: "#E11D48",
  secondaryAccent: "#F59E0B",
  glowAura: "from-rose-600/20 via-amber-500/10 to-transparent",
  storageKey: "bhalyam.academy.tambola.v2",
  slides: [
    {
      id: "objective",
      badge: "MISSION 01",
      title: "The 3x9 Tambola Ticket",
      summary: "Your ticket contains 15 numbers across 3 rows and 9 columns, 5 per row. Numbers 1–90 are drawn and announced one at a time.",
      keyRule: "Mark called numbers on your ticket to claim intermediate and major prizes.",
      proTip: "Tap each number on your ticket as it is called. A claim only counts numbers you have marked.",
      iconName: "Grid",
    },
    {
      id: "prizes",
      badge: "BOUNTY MATRIX",
      title: "Early 5, Lines & Full House",
      summary: "Each prize can be claimed once, by the first player whose marked numbers meet it.",
      keyRule: "First to mark all 15 numbers claims the coveted FULL HOUSE grand prize, which ends the game!",
      proTip: "Tap 'Claim' the moment your milestone is marked. A prize goes to the first valid claim, and a claim you have not earned is rejected.",
      iconName: "Trophy",
    },
  ],
  cheatsheet: [
    {
      title: "Prize Milestones",
      iconName: "Trophy",
      items: [
        { label: "Early 5 (Jaldi 5)", detail: "First player to mark any 5 numbers on their ticket.", tag: "Speed" },
        { label: "Top / Middle / Bottom Line", detail: "First to mark all 5 numbers on row 1, 2, or 3.", tag: "Lines" },
        { label: "Full House", detail: "First to mark all 15 numbers on the complete ticket. The game ends.", tag: "Jackpot" },
      ],
    },
  ],
};

export const NAMESPLACEANIMAL_ACADEMY: GameAcademySpec = {
  slug: "namesplaceanimal",
  title: "Name Place Animal Thing",
  tagline: "Rapid-fire vocabulary sprint — lock words under the random letter before the round timer runs out.",
  genre: "classroom",
  players: "2–8 Players",
  duration: "5–10 min",
  difficulty: "Casual",
  primaryAccent: "#0D9488",
  secondaryAccent: "#14B8A6",
  glowAura: "from-teal-600/20 via-cyan-500/10 to-transparent",
  storageKey: "bhalyam.academy.namesplaceanimal.v2",
  slides: [
    {
      id: "objective",
      badge: "MISSION 01",
      title: "Letter Spin & 4 Categories",
      summary: "A random alphabet letter is selected. Type a valid Name, Place, Animal, and Thing starting with that letter.",
      keyRule: "Each valid answer scores 10 points. An answer for which you asked for a clue scores only 5. Blank or invalid answers score 0.",
      proTip: "Skip the clue when you can: each one halves that answer's points.",
      iconName: "Target",
    },
    {
      id: "stop_buzzer",
      badge: "STOP CALL",
      title: "Hit STOP to Cut the Clock",
      summary: "The first player to fill all 4 fields can slam the STOP buzzer, leaving opponents with only 5 seconds to finish!",
      keyRule: "STOP only works once all four of your fields are filled. Blank fields score 0 points.",
      proTip: "Speed beats perfection: lock four solid answers and slam STOP immediately.",
      iconName: "Zap",
    },
  ],
  cheatsheet: [
    {
      title: "Scoring Matrix",
      iconName: "ShieldCheck",
      items: [
        { label: "Valid Answer", detail: "10 Points — starts with the round's letter (2+ letters, letters only).", tag: "Max" },
        { label: "Answer With Clue", detail: "5 Points — a valid answer for a category where you requested a clue.", tag: "Half" },
        { label: "Invalid / Empty", detail: "0 Points — word does not start with the letter or was left blank.", tag: "Zero" },
        { label: "Round Timer", detail: "30 seconds by default (Easy 45 s, Hard 20 s). STOP cuts it to 5 seconds.", tag: "Clock" },
      ],
    },
  ],
};
