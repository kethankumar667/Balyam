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
  key: "uno.tutorial.completed.v1",
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
      emoji: "🃏",
      title: "Stuck? Draw",
      body: "No playable card? Draw one from the pile. If it can be played you may play it, otherwise pass your turn.",
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
