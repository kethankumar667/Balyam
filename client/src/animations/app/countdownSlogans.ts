import type { GameKind } from "@shared/types";

export interface CountdownSlogans {
  three: string[];
  two: string[];
  one: string[];
  go: string[];
}

/**
 * Funny, game-flavored countdown copy for the 3-2-1 ceremony that plays
 * right before every match — the moment right after cards are shuffled and
 * dealt. One pool per beat (mild anticipation at 3, rising urgency at 2,
 * "here it comes" at 1, payoff at GO) so the joke escalates instead of
 * repeating the same tone four times. `pickCountdownSlogans` below picks
 * one line per beat at mount time; callers must not re-invoke it on every
 * render or the copy would flicker mid-countdown.
 */
const UNO_SLOGANS: CountdownSlogans = {
  three: ["Shuffle your grudges…", "Hands hovering over your cards…", "May your Wilds be ever in your favor…"],
  two: ["Someone's getting a Draw 4…", "Reverse card loading…", "Pick a color. Pick a fight."],
  one: ["Say UNO like you mean it…", "Cards ready. Friendships optional.", "This is not a drill."],
  go: ["UNO TIME!", "CHAOS UNLEASHED!", "GO GET 'EM!"],
};

const RUMMY_SLOGANS: CountdownSlogans = {
  three: ["Cards are dealt, hearts are pounding…", "Sort your hand, sort your life…", "13 cards, 1 destiny…"],
  two: ["Pure sequence or pure panic?", "The Joker is watching…", "No peeking at your neighbor's hand!"],
  one: ["Declare-worthy hands only…", "Deep breath. Big brain.", "This is your moment…"],
  go: ["RUMMY TIME!", "DECLARE YOUR DESTINY!", "DEAL WITH IT!"],
};

const LUDO_SLOGANS: CountdownSlogans = {
  three: ["Dice are loaded… with hope.", "Your tokens are plotting their escape…", "Home stretch dreams loading…"],
  two: ["Someone's getting cut…", "Need a six? Manifest it.", "Safe zones won't save you forever…"],
  one: ["Roll like your ego depends on it…", "May the dice gods be merciful…", "This is not a peaceful game…"],
  go: ["ROLL OUT!", "LUDO LAUNCH!", "SIXES OR BUST!"],
};

const HANDCRICKET_SLOGANS: CountdownSlogans = {
  three: ["Warm up those fingers…", "Bat or bowl, choose your fate…", "The pitch is set…"],
  two: ["Six or silly out?", "Bowlers are plotting revenge…", "Fingers crossed, literally…"],
  one: ["This is your over…", "No pressure. Just legacy.", "Steady hands, steady heart…"],
  go: ["HOWZAT TIME!", "PLAY BALL!", "SWING FOR THE STANDS!"],
};

const TAMBOLA_SLOGANS: CountdownSlogans = {
  three: ["Tickets out, dabbers ready…", "The caller clears their throat…", "Housie hearts are racing…"],
  two: ["Someone's one number from Early Five…", "Four Corners has entered the chat…", "The numbers are calling your name…"],
  one: ["Eyes on your ticket, not your neighbor's…", "This could be your Full House moment…", "Deep breath. Big shout coming."],
  go: ["HOUSIE HOUSIE!", "CALL IT LOUD!", "NUMBERS AWAY!"],
};

const BINGO_SLOGANS: CountdownSlogans = {
  three: ["Grids locked, nerves unlocked…", "Dab-a-dab-doo…", "B-I-N-G-O loading…"],
  two: ["One line from bragging rights…", "Somebody's dauber is trembling…", "Blackout dreams incoming…"],
  one: ["Scan every square twice…", "This is the line that counts…", "Hold your shout…"],
  go: ["BINGO!!!", "DAUB IT!", "LINE IT UP!"],
};

const GENERIC_SLOGANS: CountdownSlogans = {
  three: ["Get hyped!", "Something big is coming…", "Warming up the dice…"],
  two: ["Almost showtime…", "Butterflies? Good sign.", "Focus mode: ON."],
  one: ["Deep breath…", "This is it…", "Here we go…"],
  go: ["LET'S GO!", "GAME ON!", "SHOWTIME!"],
};

function sloganSetFor(game: GameKind | undefined): CountdownSlogans {
  if (game === "uno") return UNO_SLOGANS;
  if (game === "rummy") return RUMMY_SLOGANS;
  if (game === "ludo") return LUDO_SLOGANS;
  if (game === "handcricket") return HANDCRICKET_SLOGANS;
  if (game === "tambola") return TAMBOLA_SLOGANS;
  if (game === "bingo") return BINGO_SLOGANS;
  return GENERIC_SLOGANS;
}

export interface PickedCountdownSlogans {
  three: string;
  two: string;
  one: string;
  go: string;
}

/** Call once per countdown mount (e.g. inside `useState(() => pickCountdownSlogans(game))`) — never on every render. */
export function pickCountdownSlogans(game: GameKind | undefined): PickedCountdownSlogans {
  const set = sloganSetFor(game);
  const pick = (lines: string[]) => lines[Math.floor(Math.random() * lines.length)]!;
  return { three: pick(set.three), two: pick(set.two), one: pick(set.one), go: pick(set.go) };
}
