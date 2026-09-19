import type { GameAcademySpec } from "../types/academy";

// Rules text in this file is checked against the games by
// __tests__/academyRulesTruth.test.ts. Sources: server/src/games/{tictactoe,
// snake,spacewar}, client/src/games/{nokiacricket,brickracer,2048,snake,
// spacewar}, client/src/features/{brick-tetris,brick-breakout}.
//
// Only Snake keeps a `sandboxKind`: the "retro-mini" demo is a pixel snake, so
// it would teach the wrong game on any other slide.

export const TICTACTOE_ACADEMY: GameAcademySpec = {
  slug: "tictactoe",
  title: "Quantum Tic Tac Toe",
  tagline: "Tic Tac Toe with a twist — Quantum mode (the default) vaporizes your oldest piece so nobody can draw. Prefer the traditional game? Switch to Classic.",
  genre: "duel",
  players: "2 Players",
  duration: "3–5 min",
  difficulty: "Tactical",
  primaryAccent: "#06B6D4",
  secondaryAccent: "#EC4899",
  glowAura: "from-cyan-500/25 via-pink-500/15 to-transparent",
  storageKey: "bhalyam.academy.tictactoe.v2",
  slides: [
    {
      id: "quantum_flux",
      badge: "THE REVOLUTION",
      title: "No More Boring Ties (Quantum Mode)",
      summary: "Traditional Tic Tac Toe often ends in a draw. In Quantum mode each player keeps at most 3 pieces on the grid, so the board can never fill up and draws cannot happen.",
      keyRule: "Quantum mode: each player can only maintain a maximum of 3 pieces on the grid at any time. Classic mode has no piece limit, and a full board with no line is a draw.",
      proTip: "Think two moves ahead: anticipate which square your opponent will be forced to vacate.",
      iconName: "Zap",
      sandboxKind: "quantum-grid",
    },
    {
      id: "fifo_vapor",
      badge: "FIFO RULE",
      title: "The 4th Piece Dissolves the 1st",
      summary: "In Quantum mode, when you place your 4th piece, your OLDEST (1st) piece instantly evaporates into quantum vapor!",
      keyRule: "Your oldest active piece glows with a warning pulse so you always know which piece will vanish.",
      proTip: "You can create lethal traps where an opponent thinks they have blocked your line, but their block piece dissolves next turn!",
      iconName: "Flame",
      sandboxKind: "quantum-grid",
    },
  ],
  cheatsheet: [
    {
      title: "Quantum Laws",
      iconName: "Zap",
      items: [
        { label: "3-Piece Queue", detail: "Strictly First-In, First-Out (FIFO) queue for each player.", tag: "Queue" },
        { label: "Vaporization Warning", detail: "Oldest piece pulses with a beacon before evaporating.", tag: "HUD" },
        { label: "Winning Strike", detail: "Align 3 in a row after placing a piece. Your oldest piece has already vanished by then.", tag: "Win" },
        { label: "Classic Mode", detail: "Standard rules: pieces stay put, and a full board with no line is a draw.", tag: "Draw" },
        { label: "Turn Timer", detail: "15 seconds per turn by default; the host can change or disable it.", tag: "Clock" },
      ],
    },
  ],
};

export const SUDOKU_ACADEMY: GameAcademySpec = {
  slug: "sudoku",
  title: "Cyber Sudoku",
  tagline: "Pure logic numerical deduction — master crosshatch scanning, naked singles, and note pruning.",
  genre: "arcade",
  players: "Solo Play",
  duration: "10–20 min",
  difficulty: "Mastermind",
  primaryAccent: "#6366F1",
  secondaryAccent: "#A855F7",
  glowAura: "from-indigo-600/20 via-purple-600/10 to-transparent",
  storageKey: "bhalyam.academy.sudoku.v2",
  slides: [
    {
      id: "objective",
      badge: "MISSION 01",
      title: "The 3 Golden Rules",
      summary: "Every 9x9 grid consists of 9 rows, 9 columns, and 9 3x3 sector boxes.",
      keyRule: "Each row, column, and 3x3 box must contain digits 1 through 9 with ZERO duplicates.",
      proTip: "Start by scanning for rows or 3x3 sectors that already have 6 or 7 digits filled.",
      iconName: "Grid",
      sandboxKind: "sudoku-scanner",
    },
    {
      id: "naked_single",
      badge: "LOGIC STRIKE",
      title: "The Naked Single & Elimination",
      summary: "When 8 digits in intersecting rows, columns, and sector box are accounted for, the remaining cell is mathematically locked.",
      keyRule: "Use crosshatch elimination to rule out impossible digits without guessing.",
      proTip: "Toggle pencil notes mode to track potential candidates and let the engine auto-prune conflicts.",
      iconName: "Zap",
      sandboxKind: "sudoku-scanner",
    },
  ],
  cheatsheet: [
    {
      title: "Deduction Protocols",
      iconName: "ShieldCheck",
      items: [
        { label: "Crosshatch Scanning", detail: "Trace rows and columns containing the same digit to isolate target cell.", tag: "Scan" },
        { label: "Naked Single", detail: "A cell that has exactly one remaining candidate digit.", tag: "Locked" },
        { label: "Pencil Notes", detail: "Annotate multiple candidates per cell to spot hidden pairs and triples.", tag: "Pro" },
      ],
    },
  ],
};

export const GAME2048_ACADEMY: GameAcademySpec = {
  slug: "2048",
  title: "2048 Cyber Fusion",
  tagline: "Slide numbered tiles, merge identical powers of two, and build the legendary 2048 crown tile.",
  genre: "arcade",
  players: "Solo Play",
  duration: "5–15 min",
  difficulty: "Tactical",
  primaryAccent: "#F59E0B",
  secondaryAccent: "#D97706",
  glowAura: "from-amber-500/20 via-yellow-600/10 to-transparent",
  storageKey: "bhalyam.academy.2048.v2",
  slides: [
    {
      id: "objective",
      badge: "MISSION 01",
      title: "Slide & Merge Identical Numbers",
      summary: "Swipe in any direction (Up, Down, Left, Right). All tiles slide until stopped by an edge or another tile.",
      keyRule: "When two tiles with the SAME number collide during a move, they merge into one tile with double the value!",
      proTip: "Keep your highest-value tile locked permanently in one corner (e.g. bottom-right).",
      iconName: "Layers",
    },
    {
      id: "corner_strategy",
      badge: "PRO STRATEGY",
      title: "The Monotonic Snake Method",
      summary: "Build tiles in decreasing order along your primary wall so merges cascade smoothly.",
      keyRule: "Never swipe in the opposite direction of your anchor corner unless absolutely forced.",
      proTip: "Keep the bottom row fully packed with 4 tiles so your high-value corner never gets displaced.",
      iconName: "Crown",
    },
  ],
  cheatsheet: [
    {
      title: "Merge Multipliers",
      iconName: "Zap",
      items: [
        { label: "2 + 2 = 4", detail: "Base merge adding 4 points to score.", tag: "Base" },
        { label: "512 + 512 = 1024", detail: "Elite merge opening path to 2048.", tag: "Tier 4" },
        { label: "1024 + 1024 = 2048", detail: "Victory tile creation! Continue for endless high scores.", tag: "Crown" },
      ],
    },
  ],
  keybindings: [{ key: "Arrow Keys / WASD", description: "Slide tiles across grid" }],
};

export const SNAKE_ACADEMY: GameAcademySpec = {
  slug: "snake",
  title: "Snake Arena",
  tagline: "Nokia monochrome nostalgia meets multiplayer battle — devour food, lengthen your tail, and trap rivals.",
  genre: "retro",
  players: "1–4 Players",
  duration: "3–8 min",
  difficulty: "Casual",
  primaryAccent: "#8BAC0F",
  secondaryAccent: "#306230",
  glowAura: "from-lime-600/20 via-green-800/15 to-transparent",
  storageKey: "bhalyam.academy.snake.v2",
  slides: [
    {
      id: "objective",
      badge: "MISSION 01",
      title: "Feed the Serpent",
      summary: "Steer your snake to eat food dots. Each dot adds one body segment and 2 points, and with Speed Progression on the snake speeds up as you eat.",
      keyRule: "Hitting your own body or another snake's body ends your run. Walls are deadly in solid-wall mode; in the default wrap mode you re-enter on the opposite side.",
      proTip: "In multiplayer, cut in front of opponent paths to force them into head-on collisions with your tail.",
      iconName: "Flame",
      sandboxKind: "retro-mini",
    },
  ],
  cheatsheet: [
    {
      title: "Arena Rules",
      iconName: "Zap",
      items: [
        { label: "Growth", detail: "+1 body segment and +2 points per food consumed.", tag: "Feed" },
        { label: "Collision", detail: "Crashing into any snake's body, an obstacle, or a wall in solid-wall mode eliminates you.", tag: "Hazard" },
        { label: "Multiplayer Cut", detail: "Box opponents in with coiled body loops.", tag: "Tactic" },
        { label: "Match End", detail: "The match ends when only one snake is left (or none). The highest score wins.", tag: "Result" },
      ],
    },
  ],
  keybindings: [
    { key: "Arrow Keys / WASD", description: "Steer snake direction" },
    { key: "P / Esc / Space", description: "Pause or resume" },
  ],
};

export const TETRIS_ACADEMY: GameAcademySpec = {
  slug: "tetris",
  title: "Brick Tetris",
  tagline: "9999-in-1 handheld brick legend — rotate falling blocks, clear solid lines, and survive level speed-ups.",
  genre: "retro",
  players: "Solo Play",
  duration: "5–15 min",
  difficulty: "Tactical",
  primaryAccent: "#8BAC0F",
  secondaryAccent: "#166534",
  glowAura: "from-lime-500/20 via-emerald-700/10 to-transparent",
  storageKey: "bhalyam.academy.tetris.v2",
  slides: [
    {
      id: "objective",
      badge: "MISSION 01",
      title: "Complete Solid Horizontal Lines",
      summary: "Maneuver falling geometric blocks into complete horizontal lines without gaps.",
      keyRule: "Full lines vanish, awarding points and lowering the stack.",
      proTip: "Clearing 4 lines at once with the long I-bar is a TETRIS — awarding the highest score multiplier!",
      iconName: "Grid",
    },
  ],
  cheatsheet: [
    {
      title: "Line Clear Points",
      iconName: "Crown",
      items: [
        { label: "Single", detail: "1 line: 100 points × your level.", tag: "1x" },
        { label: "Double", detail: "2 lines at once: 300 points × your level.", tag: "3x" },
        { label: "Triple", detail: "3 lines at once: 600 points × your level.", tag: "6x" },
        { label: "Tetris (4 Lines)", detail: "1000 points × your level using the 4-block straight bar. Back-to-back Tetrises earn a further 1.5x.", tag: "10x" },
        { label: "Level Up", detail: "Every 10 lines raises the level and the drop speed.", tag: "Speed" },
      ],
    },
  ],
  keybindings: [
    { key: "Arrow Up / W / X", description: "Rotate block clockwise" },
    { key: "Z", description: "Rotate block counter-clockwise" },
    { key: "Arrow Left/Right (A / D)", description: "Move block left/right" },
    { key: "Arrow Down (S)", description: "Soft drop" },
    { key: "Space", description: "Hard drop" },
    { key: "C / Shift", description: "Hold piece" },
    { key: "P / Esc", description: "Pause" },
  ],
};

export const BREAKOUT_ACADEMY: GameAcademySpec = {
  slug: "breakout",
  title: "Brick Breakout",
  tagline: "Deflect the bouncing ball with your paddle to shatter colored brick formations.",
  genre: "retro",
  players: "Solo Play",
  duration: "5–10 min",
  difficulty: "Casual",
  primaryAccent: "#8BAC0F",
  secondaryAccent: "#306230",
  glowAura: "from-lime-600/20 via-green-800/15 to-transparent",
  storageKey: "bhalyam.academy.breakout.v2",
  slides: [
    {
      id: "objective",
      badge: "MISSION 01",
      title: "Deflect & Shatter All Bricks",
      summary: "Slide your paddle across the bottom to keep the ball in play while smashing the bricks above.",
      keyRule: "Where the ball meets your paddle sets its direction: hit it left of center to send it left, right of center to send it right.",
      proTip: "Get your paddle under the ball early, then use the left or right side of it to steer your rebounds toward the bricks you want.",
      iconName: "Zap",
    },
  ],
  cheatsheet: [
    {
      title: "Paddle Control",
      iconName: "ShieldCheck",
      items: [
        { label: "Serve", detail: "Press Space or Enter to launch the ball from your paddle.", tag: "Start" },
        { label: "Center Hit", detail: "Sends the ball back up, keeping its current sideways drift.", tag: "Safe" },
        { label: "Side Hit", detail: "Sends the ball back up toward the side of the paddle it struck.", tag: "Steer" },
      ],
    },
  ],
  keybindings: [
    { key: "Arrow Left / Right (A / D)", description: "Move paddle" },
    { key: "Space / Enter", description: "Launch the ball" },
    { key: "P / Esc", description: "Pause" },
    { key: "R", description: "Restart" },
  ],
};

export const ROADRASH_ACADEMY: GameAcademySpec = {
  slug: "roadrash",
  title: "Brick Racer",
  tagline: "9999-in-1 brick-game racing — dodge oncoming cars across three lanes and hit the boost for a high score.",
  genre: "arcade",
  players: "Solo Play",
  duration: "3–8 min",
  difficulty: "Tactical",
  primaryAccent: "#EF4444",
  secondaryAccent: "#F59E0B",
  glowAura: "from-red-600/25 via-amber-500/15 to-transparent",
  storageKey: "bhalyam.academy.roadrash.v2",
  slides: [
    {
      id: "objective",
      badge: "MISSION 01",
      title: "Dodge Across Three Lanes",
      summary: "Move your car between the left, center and right lanes to dodge the enemy cars coming down the road. Each car you dodge scores points.",
      keyRule: "One collision ends your run, so change lanes early.",
      proTip: "Traffic gets faster as your level rises. Read the next wave before you commit to a lane.",
      iconName: "Flame",
    },
    {
      id: "boost",
      badge: "NITRO",
      title: "Boost for Double Points",
      summary: "Boost speeds your car up and pays 20 points per dodged car instead of 10 (both multiplied by your level).",
      keyRule: "Press the boost key to switch boost on, and press it again to switch it off.",
      proTip: "Boost when the road is clear and switch it off before a tight wave, because faster traffic leaves less time to react.",
      iconName: "Zap",
    },
  ],
  cheatsheet: [
    {
      title: "Score & Controls",
      iconName: "Zap",
      items: [
        { label: "Dodge Points", detail: "10 points per dodged car × level; 20 points per car while boosting.", tag: "Score" },
        { label: "Level Up", detail: "Dodging more cars raises your level and adds a 100-point bonus.", tag: "Level" },
        { label: "Crash", detail: "Any collision is game over. Your high score is saved.", tag: "Hazard" },
      ],
    },
  ],
  keybindings: [
    { key: "Arrow Left (A / 4)", description: "Move one lane left" },
    { key: "Arrow Right (D / 6)", description: "Move one lane right" },
    { key: "Arrow Down (S / 8)", description: "Toggle boost" },
    { key: "Space / Enter", description: "Confirm in menus" },
    { key: "P / Esc", description: "Pause" },
  ],
};

export const SPACEWAR_ACADEMY: GameAcademySpec = {
  slug: "spacewar",
  title: "Space War",
  tagline: "Vector-style side-scrolling space shooter — blast enemy waves, grab power-ups, and beat a boss at the end of every level.",
  genre: "arcade",
  players: "Solo Play",
  duration: "3–10 min",
  difficulty: "Tactical",
  primaryAccent: "#38BDF8",
  secondaryAccent: "#818CF8",
  glowAura: "from-sky-500/25 via-indigo-500/15 to-transparent",
  storageKey: "bhalyam.academy.spacewar.v2",
  slides: [
    {
      id: "objective",
      badge: "MISSION 01",
      title: "Wave After Wave",
      summary: "Fly your ship on the left of the screen, dodge enemy fire and blast the enemies flying in. Clear a level's wave target and a boss appears.",
      keyRule: "You start with 4 lives and a short shield. Every hit costs a life and gives you a fresh shield, and at 0 lives the run is over.",
      proTip: "Keep moving and pick enemies off from range. Sitting still in a firing lane is the fastest way to lose lives.",
      iconName: "Orbit",
    },
    {
      id: "specials",
      badge: "SPECIAL WEAPONS",
      title: "Specials & Power-Ups",
      summary: "Press X to fire your special weapon: a homing missile, a laser or an energy wall. Defeated enemies sometimes drop an extra life, special ammo or a shield.",
      keyRule: "An ammo pickup adds 3 special charges and switches your special weapon to the next type.",
      proTip: "Save your specials for the boss. Beat the boss on level 8 to win the game.",
      iconName: "Zap",
    },
  ],
  cheatsheet: [
    {
      title: "Ship Systems",
      iconName: "Orbit",
      items: [
        { label: "Cannon", detail: "Space fires your primary shots; there is no ammo limit.", tag: "Primary" },
        { label: "Special Weapon", detail: "X fires missile, laser or wall. You start with 3 charges (9 at most).", tag: "Special" },
        { label: "Shield", detail: "Active at the start, after a hit and after each boss; a shield pickup lasts a little longer.", tag: "Defense" },
        { label: "Lives", detail: "Start with 4 (the host can change it). A life pickup adds one, up to 7.", tag: "Health" },
      ],
    },
  ],
  keybindings: [
    { key: "Arrow Keys / WASD", description: "Fly the ship" },
    { key: "Space", description: "Fire cannon" },
    { key: "X", description: "Fire special weapon" },
    { key: "P", description: "Pause" },
  ],
};

export const NOKIACRICKET_ACADEMY: GameAcademySpec = {
  slug: "nokiacricket",
  title: "Nokia Cricket 2D",
  tagline: "Vintage pixelated batting timing — time your shots, pick the right line, and chase big overs.",
  genre: "retro",
  players: "Solo Play",
  duration: "5–10 min",
  difficulty: "Casual",
  primaryAccent: "#8BAC0F",
  secondaryAccent: "#306230",
  glowAura: "from-lime-600/20 via-green-800/15 to-transparent",
  storageKey: "bhalyam.academy.nokiacricket.v2",
  slides: [
    {
      id: "objective",
      badge: "MISSION 01",
      title: "Pitch Timing & Shot Selection",
      summary: "Watch the bowler's delivery and press a shot key just as the ball reaches the batter. Your timing and the shot you pick decide the outcome.",
      keyRule: "Perfect timing on the matching line is a SIX. Well-timed shots are usually FOURS, while early, late or wrong-line shots risk a catch or only 2 runs.",
      proTip: "Play straight against yorkers, the leg-side shot (Left) against bouncers, and the off-side shot (Right) against outswingers.",
      iconName: "Target",
    },
  ],
  cheatsheet: [
    {
      title: "Batting Controls",
      iconName: "Zap",
      items: [
        { label: "Straight Shot", detail: "Best for balls on middle line and for yorkers.", tag: "Drive" },
        { label: "Leg-Side Shot", detail: "Best for balls on the leg side and for bouncers.", tag: "Pull" },
        { label: "Off-Side Shot", detail: "Best for balls on the off side and for outswingers.", tag: "Cover" },
        { label: "Timing", detail: "Perfect and Good timing score 4 or 6; Early or Late scores 2 or gets you caught; a Miss is a dot ball or bowled.", tag: "Grade" },
      ],
    },
  ],
  keybindings: [
    { key: "Arrow Up / W / 5 / Space", description: "Straight shot" },
    { key: "Arrow Left / A / 4", description: "Leg-side shot" },
    { key: "Arrow Right / D / 6", description: "Off-side shot" },
    { key: "P / Esc / 0", description: "Pause" },
  ],
};

export const BRICKBLOCKS_ACADEMY: GameAcademySpec = {
  slug: "brickblocks",
  title: "Brick Blocks",
  tagline: "Falling-block stacking in two flavors — Classic tetrominoes or five-cell Pentix pieces. Clear full rows before the stack reaches the top.",
  genre: "retro",
  players: "1–8 Players",
  duration: "5–15 min",
  difficulty: "Casual",
  primaryAccent: "#F59E0B",
  secondaryAccent: "#10B981",
  glowAura: "from-amber-500/20 via-emerald-500/10 to-transparent",
  storageKey: "bhalyam.academy.brickblocks.v2",
  slides: [
    {
      id: "objective",
      badge: "MISSION 01",
      title: "Stack, Rotate, Clear",
      summary: "Guide each falling piece into place so it completes full horizontal rows. Choose Classic (the 7 tetrominoes) or Pentix (12 five-cell pentominoes) from the menu.",
      keyRule: "The game ends when a new piece can no longer enter the board.",
      proTip: "Use the ghost preview to see where a piece will land, and hold a piece back when a better spot is coming.",
      iconName: "Grid",
    },
  ],
  cheatsheet: [
    {
      title: "Grid Rules",
      iconName: "Grid",
      items: [
        { label: "Line Clear", detail: "A completely filled row dissolves and the stack drops.", tag: "Clear" },
        { label: "Scoring", detail: "1 line 100, 2 lines 300, 3 lines 600, 4 lines 1000 (5 lines 1500 in Pentix), all × your level.", tag: "Score" },
        { label: "Level Up", detail: "Every 10 lines raises the level and the drop speed, up to level 15.", tag: "Speed" },
      ],
    },
  ],
  keybindings: [
    { key: "Arrow Up / W / X", description: "Rotate clockwise" },
    { key: "Z", description: "Rotate counter-clockwise" },
    { key: "Arrow Left/Right (A / D)", description: "Move piece" },
    { key: "Arrow Down (S)", description: "Soft drop" },
    { key: "Space", description: "Hard drop" },
    { key: "C / Shift", description: "Hold piece" },
  ],
};
