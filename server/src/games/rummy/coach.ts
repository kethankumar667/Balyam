import type { Card, CoachAnalysis, CoachHint } from "@shared/types.js";
import {
  advise,
  type Advice,
  type DiscardOption,
  type DrawChoice,
  type DropVerdict,
  type HandEvaluation,
} from "./advisor/advisor.js";
import { cardLabel, describeOuts, labelsOf, percent, plural } from "./advisor/labels.js";
import type { OpponentReads } from "./advisor/opponents.js";
import type { AdvisorTable } from "./advisor/types.js";
import { DEFAULT_TUNING, type AdvisorTuning } from "./advisor/tuning.js";

/**
 * Rummy coach.
 *
 * The thinking is in `advisor/`: it counts the cards still in play, reads what opponents were seen to pick
 * up, and weighs every discard by how close it leaves the hand, how likely the next draw is to help and what
 * it costs if an opponent shows first. This file turns that verdict into what the player sees: a headline, a
 * reason a player can check, the alternatives weighed, and a machine-readable `action` (which the self-play
 * tournament uses to play the coach against the bots).
 *
 * Nothing here can see another player's hand or the closed deck's order: `AdvisorTable` has no field for them.
 */

export interface RummyHintInput {
  table: AdvisorTable;
  /** Display names by player id, for the opponent reads. */
  names: Readonly<Record<string, string>>;
}

const fromShowing = (needed: number): string => (needed === 0 ? "ready to show" : `${plural(needed, "card")} from showing`);

function melds(evaluation: HandEvaluation): string[][] {
  return evaluation.arrangement.melds.map((group) => group.map((card) => card.id));
}

function facts(evaluation: HandEvaluation, unseenTotal: number): CoachAnalysis["facts"] {
  return [
    { label: "Cards from showing", value: String(evaluation.needed) },
    { label: "Chance a draw helps", value: percent(evaluation.chance) },
    { label: "Points exposed", value: String(evaluation.deadwood) },
    { label: "Cards unseen", value: String(unseenTotal) },
  ];
}

/** What the table has shown about each opponent's hand, in a line a player can act on. */
function describeReads(reads: OpponentReads, names: RummyHintInput["names"]): string[] {
  const lines: string[] = [];
  for (const [id, read] of reads.byPlayer) {
    if (read.held.length === 0) continue;
    const who = names[id] ?? "An opponent";
    lines.push(`${who} took ${labelsOf(read.held)} from the open pile, so cards next to those help them: do not feed them.`);
  }
  return lines;
}

function describeShape(evaluation: HandEvaluation): string {
  const { hasPureSequence, hasSecondSequence } = evaluation.arrangement;
  if (hasPureSequence && hasSecondSequence) return "Both sequences are in: build sets and close the gaps";
  if (hasPureSequence) return "Pure sequence done: find a second sequence";
  return "No pure sequence yet: that is the priority";
}

function dropHint(drop: DropVerdict, evaluation: HandEvaluation, rivals: number, unseenTotal: number): CoachHint {
  return {
    kind: "drop",
    action: { type: "drop" },
    headline: "Drop this round",
    detail:
      `You are ${fromShowing(evaluation.needed)} with ${evaluation.deadwood} points exposed, about ${percent(drop.winChance)} to show first ` +
      `against ${plural(rivals, "opponent")}. Playing on is expected to cost around ${Math.round(drop.playCost)} points; dropping costs ${drop.dropCost}.`,
    highlight: [],
    groups: melds(evaluation),
    analysis: {
      status: "A hand this far from showing usually costs more to carry than to leave.",
      facts: [...facts(evaluation, unseenTotal), { label: "Chance to show first", value: percent(drop.winChance) }],
      options: [
        { label: "Drop now", detail: `Pay ${drop.dropCost} points and keep the rest of the round off your back.`, best: true },
        { label: "Play on", detail: `Expected cost about ${Math.round(drop.playCost)} points.` },
      ],
    },
  };
}

function drawHint(advice: Extract<Advice, { kind: "draw" }>, table: AdvisorTable, names: RummyHintInput["names"]): CoachHint {
  const { choice, reads, unseenTotal, drop } = advice;
  const { current } = choice;
  if (drop?.advised) return dropHint(drop, current, table.opponents.length, unseenTotal);

  const top = choice.openCard;
  const takeOpen = choice.from === "open" && top !== null;
  const analysis: CoachAnalysis = {
    status: `${describeShape(current)}.`,
    facts: facts(current, unseenTotal),
    options: drawOptions(choice, current),
    reads: describeReads(reads, names),
  };

  if (current.needed === 0) {
    return {
      kind: "draw",
      action: { type: "draw", from: "closed" },
      headline: "Draw from the closed deck",
      detail: "Your hand is already complete: draw any card, throw it back and show.",
      highlight: [],
      groups: melds(current),
      analysis,
    };
  }

  if (takeOpen && top) {
    return {
      kind: "draw",
      action: { type: "draw", from: "open" },
      headline: `Take the ${cardLabel(top)} from the open pile`,
      detail: openReason(choice, current),
      highlight: [],
      groups: melds(current),
      analysis,
    };
  }

  const outs = `${current.outs.reduce((sum, out) => sum + out.copies, 0)} of the ${unseenTotal} unseen cards help (${percent(current.chance)}): ${describeOuts(current.outs)}.`;
  const why = top
    ? `The ${cardLabel(top)} does not move you closer, and taking it shows opponents what you want. `
    : "The open pile has nothing for you. ";
  return {
    kind: "draw",
    action: { type: "draw", from: "closed" },
    headline: "Draw from the closed deck",
    detail: `${why}${outs}`,
    highlight: [],
    groups: melds(current),
    analysis,
  };
}

/** Why the open card is worth taking, stated as what really changes: cards from showing, else odds, else points. */
function openReason(choice: DrawChoice, current: HandEvaluation): string {
  const after = choice.openBest;
  if (!after) return "It improves your hand.";
  const { evaluation } = after;
  const thrown = cardLabel(after.card);
  if (evaluation.needed < current.needed) {
    return `It ${choice.openCardIsOut ? "is one of the cards your hand wants and " : ""}leaves you ${fromShowing(evaluation.needed)} once you throw the ${thrown}, against ${fromShowing(current.needed)} now.`;
  }
  const better: string[] = [];
  if (evaluation.chance > current.chance + 0.02) better.push(`lifts your chance of improving from ${percent(current.chance)} to ${percent(evaluation.chance)}`);
  if (evaluation.deadwood < current.deadwood) better.push(`cuts the points you hold from ${current.deadwood} to ${evaluation.deadwood}`);
  const gain = better.length > 0 ? better.join(" and ") : "is the better card to hold";
  return `It does not bring you closer to showing, but once you throw the ${thrown} it ${gain}.`;
}

function drawOptions(choice: DrawChoice, current: HandEvaluation): NonNullable<CoachAnalysis["options"]> {
  const closed = {
    label: "Closed deck",
    detail: `${percent(current.chance)} to bring you closer; ${fromShowing(current.needed)} now.`,
    best: choice.from === "closed",
  };
  if (!choice.openCard || !choice.openBest) return [closed];
  const open = {
    label: `Open pile ${cardLabel(choice.openCard)}`,
    detail: `${fromShowing(choice.openBest.evaluation.needed)} after throwing the ${cardLabel(choice.openBest.card)}.`,
    best: choice.from === "open",
  };
  return choice.from === "open" ? [open, closed] : [closed, open];
}

function discardOptions(options: readonly DiscardOption[]): NonNullable<CoachAnalysis["options"]> {
  return options.slice(0, 3).map((option, index) => ({
    label: `Discard ${cardLabel(option.card)}`,
    detail: `${fromShowing(option.evaluation.needed)}, ${percent(option.evaluation.chance)} to improve, ${option.evaluation.deadwood} points exposed${
      option.feedRisk >= 0.5 ? ", and it would feed an opponent" : ""
    }.`,
    best: index === 0,
  }));
}

function discardHint(advice: Extract<Advice, { kind: "discard" }>, names: RummyHintInput["names"]): CoachHint {
  const [best, runnerUp] = advice.options;
  if (!best) {
    return { kind: "wait", headline: "Nothing to discard", detail: "Your hand is empty.", highlight: [] };
  }
  const after = best.evaluation;
  const closeCall = runnerUp && runnerUp.score - best.score < 0.4 ? ` The ${cardLabel(runnerUp.card)} is nearly as good.` : "";
  const outs = after.needed > 0 ? ` ${percent(after.chance)} of unseen cards help: ${describeOuts(after.outs)}.` : "";
  const feed = best.feedRisk >= 0.5 ? " It sits next to a card an opponent picked up, but nothing else is cheaper to lose." : "";
  const pure = after.arrangement.hasPureSequence ? "" : " You still need a pure sequence (no joker) before any group counts.";
  return {
    kind: "discard",
    action: { type: "discard", cardId: best.card.id },
    headline: `Discard the ${cardLabel(best.card)}`,
    detail: `It leaves you ${fromShowing(after.needed)} with ${after.deadwood} points exposed.${outs}${feed}${closeCall}${pure}`,
    highlight: [best.card.id],
    groups: melds(after),
    analysis: {
      status: `${describeShape(after)}.`,
      facts: facts(after, advice.unseenTotal),
      options: discardOptions(advice.options),
      reads: describeReads(advice.reads, names),
    },
  };
}

function declareHint(advice: Extract<Advice, { kind: "declare" }>, hand: readonly Card[]): CoachHint {
  const { show } = advice;
  const toss = hand.find((card) => card.id === show.discardCardId);
  return {
    kind: "declare",
    action: { type: "declare", discardCardId: show.discardCardId, melds: show.melds },
    headline: "You can declare: every card is in a valid group",
    detail: `Discard the ${toss ? cardLabel(toss) : "spare card"} and show. The groups are checked: a pure sequence, a second sequence, and the rest in sets or runs.`,
    highlight: [show.discardCardId],
    groups: show.melds,
  };
}

function waitHint(advice: Extract<Advice, { kind: "wait" }>, names: RummyHintInput["names"]): CoachHint {
  const evaluation = advice.evaluation;
  if (!evaluation) {
    return { kind: "wait", headline: "Nothing to work with yet", detail: "Your hand is empty: wait for the deal.", highlight: [] };
  }
  const grouped = evaluation.arrangement.melds;
  return {
    kind: "wait",
    headline: describeShape(evaluation),
    detail: grouped.length
      ? `Best grouping so far: ${grouped.map(labelsOf).join(" | ")}. You are ${fromShowing(evaluation.needed)}; plan your discard before your turn.`
      : "No groups yet. Look for three cards in a row in one suit: that pure sequence is mandatory.",
    highlight: grouped.flat().map((card) => card.id),
    groups: melds(evaluation),
    analysis: {
      status: "Planning while an opponent thinks is what good players do with this time.",
      facts: facts(evaluation, 0).slice(0, 3),
      reads: describeReads(advice.reads, names),
    },
  };
}

export function rummyHint(input: RummyHintInput, tuning: AdvisorTuning = DEFAULT_TUNING): CoachHint {
  const { table, names } = input;
  const advice = advise(table, tuning);
  switch (advice.kind) {
    case "declare":
      return declareHint(advice, table.hand);
    case "discard":
      return discardHint(advice, names);
    case "draw":
      return drawHint(advice, table, names);
    case "wait":
      return waitHint(advice, names);
  }
}
