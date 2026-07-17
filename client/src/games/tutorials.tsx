import type { TutorialSlide } from "../components/GameTutorial";

/**
 * "How to play" decks for every game that uses the shared {@link GameTutorial}
 * modal. Rummy and Word Building keep their own richer, bespoke slide tutorials
 * (with live card art) and Ludo keeps its detailed `InstructionsModal`, so those
 * three are intentionally NOT here. Each deck carries its localStorage gate key
 * (matching the `<game>.tutorial.completed.v1` convention) and an accent colour
 * tuned to that game's palette.
 */
export interface TutorialDeck {
  key: string;
  accent: string;
  slides: TutorialSlide[];
}

export const UNO_TUTORIAL: TutorialDeck = {
  // Bumped v1 -> v2: the declare/challenge slides below are new content, not
  // a wording tweak, so returning players whose localStorage already marked
  // v1 "completed" still see this update once (same versioning convention
  // the file header describes) instead of the deck silently going stale.
  key: "uno.tutorial.completed.v2",
  accent: "#D22B27",
  slides: [
    {
      emoji: "🎴",
      title: "Match the pile",
      body: "Play a card that matches the top of the discard pile by colour, number, or symbol.",
    },
    {
      emoji: "⏭️",
      title: "Action cards",
      body: "Skip makes the next player lose their turn. Reverse flips the direction of play. Draw Two forces the next player to pick up two cards and skip.",
    },
    {
      emoji: "🌈",
      title: "Wild cards",
      body: "A Wild lets you choose the next colour. Wild Draw Four also makes the next player draw four cards — play it only when you have no matching colour.",
    },
    {
      emoji: "🤔",
      title: "Challenge a Wild Draw Four",
      body: "Think someone played Wild Draw Four illegally — they actually had a matching-colour card? Challenge it! Guess right and they draw 4 instead of you. Guess wrong and you draw 6.",
    },
    {
      emoji: "🃏",
      title: "Stuck? Draw",
      body: "No playable card? Draw one from the pile. If it can be played you may play it, otherwise pass your turn.",
    },
    {
      emoji: "❗",
      title: "Down to one card? Say UNO!",
      body: "The moment you have one card left, tap UNO! before anyone else notices. Miss it and another player can catch you — you'll draw two penalty cards.",
    },
    {
      emoji: "🏆",
      title: "Empty your hand",
      body: "The first player to get rid of every card in their hand wins the round.",
    },
  ],
};

export const HANDCRICKET_TUTORIAL: TutorialDeck = {
  key: "handcricket.tutorial.completed.v1",
  accent: "#2E8B2E",
  slides: [
    {
      emoji: "🏏",
      title: "Pick your team",
      body: "Choose a country or IPL franchise, then select your playing XI and a captain before the match.",
    },
    {
      emoji: "🎲",
      title: "Win the toss",
      body: "The toss winner decides whether to bat or bowl first.",
    },
    {
      emoji: "✋",
      title: "The numbers game",
      body: "Every ball, the batter and the bowler each reveal a number from 1 to 6. If they differ, the batter scores that many runs.",
    },
    {
      emoji: "🪦",
      title: "Same number = wicket",
      body: "If both players pick the same number, the batter is OUT. Lose all your wickets (or finish your overs) and the innings ends.",
    },
    {
      emoji: "🏆",
      title: "Chase it down",
      body: "Teams swap innings. The side that scores more runs across its innings wins the match.",
    },
  ],
};

export const SNL_TUTORIAL: TutorialDeck = {
  key: "snl.tutorial.completed.v1",
  accent: "#FF8F00",
  slides: [
    {
      emoji: "🎲",
      title: "Roll & advance",
      body: "Roll the dice and move your coin forward that many squares along the board.",
    },
    {
      emoji: "🪜",
      title: "Climb ladders",
      body: "Land on the bottom of a ladder and climb straight up to its top — a handy shortcut ahead.",
    },
    {
      emoji: "🐍",
      title: "Mind the snakes",
      body: "Land on a snake's head and you slide all the way down to its tail.",
    },
    {
      emoji: "🏁",
      title: "Reach the top first",
      body: "The first coin to land exactly on the final square wins the game.",
    },
  ],
};

export const RPS_TUTORIAL: TutorialDeck = {
  key: "rps.tutorial.completed.v1",
  accent: "#8B5CF6",
  slides: [
    {
      emoji: "✊",
      title: "Make your throw",
      body: "Each round, secretly choose Rock, Paper, or Scissors.",
    },
    {
      emoji: "⚔️",
      title: "What beats what",
      body: "Rock crushes Scissors, Scissors cut Paper, and Paper covers Rock.",
    },
    {
      emoji: "🤝",
      title: "Ties replay",
      body: "If both players throw the same, the round is a draw — throw again.",
    },
    {
      emoji: "🏆",
      title: "Win the most rounds",
      body: "Score a point for every round you win. The player ahead when the match ends takes it.",
    },
  ],
};

export const DOTSBOXES_TUTORIAL: TutorialDeck = {
  key: "dotsboxes.tutorial.completed.v1",
  accent: "#1C6DD0",
  slides: [
    {
      emoji: "✏️",
      title: "Draw a line",
      body: "On your turn, draw a single line connecting two adjacent dots.",
    },
    {
      emoji: "🟦",
      title: "Close a box",
      body: "Draw the fourth and final side of a box to claim it — it's marked with your initial.",
    },
    {
      emoji: "🔁",
      title: "A box earns a bonus",
      body: "Complete a box and you immediately go again. Chain several boxes in one turn!",
    },
    {
      emoji: "🏆",
      title: "Most boxes wins",
      body: "When every line is drawn, the player who owns the most boxes wins.",
    },
  ],
};

export const MEMORYMATCH_TUTORIAL: TutorialDeck = {
  key: "memorymatch.tutorial.completed.v1",
  accent: "#0EA5A5",
  slides: [
    {
      emoji: "🃏",
      title: "Flip two cards",
      body: "On your turn, flip over two of the face-down cards on the board.",
    },
    {
      emoji: "✨",
      title: "Find a pair",
      body: "If the two cards show the same symbol, you keep the pair and take another turn.",
    },
    {
      emoji: "🔄",
      title: "Miss? Next player",
      body: "If they don't match, the cards flip back over and it becomes the next player's turn — so remember where things are!",
    },
    {
      emoji: "🏆",
      title: "Most pairs wins",
      body: "Once every pair has been found, the player who collected the most pairs wins.",
    },
  ],
};

export const STARGAME_TUTORIAL: TutorialDeck = {
  key: "stargame.tutorial.completed.v1",
  accent: "#8C5A2B",
  slides: [
    {
      emoji: "🎭",
      title: "Pick a secret value",
      body: "At the start of each round, choose one hidden value from the theme deck. Other players cannot see your pick.",
    },
    {
      emoji: "🔀",
      title: "Shuffle and deal",
      body: "Each player shuffles when prompted. Then everyone gets four face-down chits for the round.",
    },
    {
      emoji: "⟳",
      title: "Pass clockwise",
      body: "Arm one chit and pass it clockwise. Read the table, bait opponents, and protect your own value.",
    },
    {
      emoji: "⭐",
      title: "Four of a kind triggers STAR",
      body: "If someone forms four of the same value, the STAR phase begins instantly. Eligible players race to slap STAR first.",
    },
    {
      emoji: "🖐️",
      title: "Hand-stack speed rank",
      body: "After STAR, everyone races to stack their hand. Faster stack rank means better points and momentum.",
    },
    {
      emoji: "🏆",
      title: "Win across rounds",
      body: "Round scores build over the full match. Stay consistent and clutch late rounds to top the final podium.",
    },
  ],
};
