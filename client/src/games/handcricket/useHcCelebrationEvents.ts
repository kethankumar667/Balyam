import { useEffect, useRef, useState } from "react";
import type { HcBall, HcInnings, HcState, Player } from "@shared/types";
import { getRosterFor } from "@shared/hc-rosters";
import { useRoomStore } from "../../store/roomStore";

/**
 * Celebration EVENT DETECTION, split out of the presentational
 * `HcCelebrationLayer` in hc-shared.tsx so a theme can render its own
 * overlay for the same events instead of being stuck with the shared
 * emoji-burst look. Broadcast and Classic still get that shared look via
 * `HcCelebrationLayer` (now a thin wrapper over this hook); Doordarshan
 * consumes this hook directly from `doordarshan/DoordarshanCelebration.tsx`.
 *
 * This is the fiddly half — ball-history diffing, milestone-vs-streak
 * priority, hat-trick detection, auto-dismiss timing — kept in exactly one
 * place so reskinning a theme can never accidentally change WHEN a
 * celebration fires, only what it looks like.
 */
export type HcCelebrationData =
  | { kind: "four"; id: number; batter: string; message: string }
  | { kind: "six"; id: number; batter: string; message: string }
  | { kind: "wicket"; id: number; batter: string; bowler: string; message: string }
  | { kind: "hattrickWickets"; id: number; bowler: string; message: string }
  | { kind: "streak"; id: number; batter: string; title: string; message: string; variant: "sixes" | "fours" | "mixed" }
  | { kind: "milestone"; id: number; batter: string; runs: number; message: string }
  | { kind: "winner"; id: number; youWon: boolean; winnerName: string; margin: string; isTie: boolean };

/** Resolve a batter/bowler profile id to the real player's name (e.g. "Pathum
 *  Nissanka"), not the socket player's display name. Falls back gracefully. */
function profileNameFor(
  state: HcState,
  teamPlayerId: string,
  profileId: string | undefined,
  fallback: string,
): string {
  if (!profileId) return fallback;
  const sel = state.teamSelections[teamPlayerId];
  const roster = sel?.teamId ? getRosterFor(sel.teamId, state.options.format) : null;
  if (!roster) return fallback;
  const found = [...roster.squad, ...roster.extras].find((p) => p.id === profileId);
  return found?.name ?? fallback;
}

/** Pick a random flavour line — keeps the boundary/wicket call-outs from
 *  reading as the same static string every time. */
function pickLine(lines: string[]): string {
  return lines[Math.floor(Math.random() * lines.length)];
}

/** Build a dynamic commentary line for a 3-ball big-hitting streak. */
function describeBoundaryStreak(
  last3: HcBall[],
  batter: string,
): { title: string; message: string; variant: "sixes" | "fours" | "mixed" } {
  const runs = last3.map((b) => b.runs);
  if (runs.every((r) => r === 6)) {
    return {
      variant: "sixes",
      title: "HAT-TRICK OF SIXES!",
      message: pickLine([
        `🚀 ${batter} — three maximums in a row! Monstrous hitting!`,
        `💥 ${batter} clears the ropes three times on the trot!`,
        `🔥 ${batter} is launching everything into the stands!`,
      ]),
    };
  }
  if (runs.every((r) => r === 4)) {
    return {
      variant: "fours",
      title: "THREE IN A ROW!",
      message: pickLine([
        `🏏 ${batter} — three cracking fours on the bounce!`,
        `⚡ ${batter} is finding the fence at will!`,
        `✨ ${batter} rattles off a hat-trick of boundaries!`,
      ]),
    };
  }
  const sum = runs.reduce((a, b) => a + b, 0);
  return {
    variant: "mixed",
    title: "ON FIRE!",
    message: pickLine([
      `🔥 ${batter} is on fire with great shots — ${runs.join(", ")} off the last three!`,
      `💫 ${batter} is dealing in big hits — ${sum} runs in three balls!`,
      `😤 ${batter} has the bowler on the ropes!`,
      `🌟 ${batter} is middling everything right now!`,
    ]),
  };
}

export function useHcCelebrationEvents(state: HcState, players: Player[], selfId: string): HcCelebrationData | null {
  const [active, setActive] = useState<HcCelebrationData | null>(null);
  const prevLensRef = useRef({
    i1: state.innings1?.history.length ?? 0,
    i2: state.innings2?.history.length ?? 0,
  });
  const prevPhaseRef = useRef(state.phase);

  const nameOf = (id: string | null | undefined) =>
    (id ? players.find((p) => p.id === id)?.name ?? useRoomStore.getState().knownPlayers[id]?.name : undefined) ?? "Player";

  // Ball events
  useEffect(() => {
    const i1Len = state.innings1?.history.length ?? 0;
    const i2Len = state.innings2?.history.length ?? 0;
    const prev = prevLensRef.current;

    let inn: HcInnings | null = null;
    if (i1Len > prev.i1) inn = state.innings1!;
    else if (i2Len > prev.i2) inn = state.innings2!;

    if (inn) {
      const last3 = inn.history.slice(-3);
      const lastBall = last3[last3.length - 1];
      // A "big shot" is any non-wicket ball worth 4+ — so 4,5,6 counts as a
      // hot streak even though a 5 isn't a boundary.
      const isBigShot = (b: HcBall) => !b.wicket && b.runs >= 4;
      const allWickets = last3.length === 3 && last3.every((b) => b.wicket);
      const bigStreak = last3.length === 3 && last3.every(isBigShot);

      // Real batsman/bowler names for THIS ball (profile ids on the ball),
      // not the socket player's display name.
      const batterName = profileNameFor(state, inn.battingPlayerId, lastBall.batterId, nameOf(inn.battingPlayerId));
      const bowlerName = profileNameFor(state, inn.bowlingPlayerId, lastBall.bowlerId, nameOf(inn.bowlingPlayerId));
      const stamp = Date.now();

      if (allWickets) {
        setActive({
          kind: "hattrickWickets",
          id: stamp,
          bowler: bowlerName,
          message: pickLine([
            `🎯 ${bowlerName} is unplayable — three in a row!`,
            `🔥 ${bowlerName} rips the heart out of the innings!`,
          ]),
        });
      } else if (lastBall.milestone) {
        // Takes priority over the plain four/six/streak cards below — a
        // named personal milestone (50, 100, 150…) is the more special
        // moment even when the ball that brought it up was also a boundary.
        // Can't coincide with `allWickets`/`lastBall.wicket`: a dismissal
        // ball scores 0 runs, so it can never cross a runs milestone.
        const m = lastBall.milestone;
        setActive({
          kind: "milestone",
          id: stamp,
          batter: batterName,
          runs: m,
          message:
            m === 100
              ? pickLine([
                  `💯 ${batterName} brings up a magnificent century!`,
                  `👏 ${batterName} reaches three figures!`,
                ])
              : pickLine([
                  `🎉 ${batterName} brings up a well-deserved ${m}!`,
                  `👏 ${batterName} raises the bat for ${m}!`,
                ]),
        });
      } else if (bigStreak) {
        const s = describeBoundaryStreak(last3, batterName);
        setActive({ kind: "streak", id: stamp, batter: batterName, ...s });
      } else if (lastBall.wicket) {
        setActive({
          kind: "wicket",
          id: stamp,
          batter: batterName,
          bowler: bowlerName,
          message: pickLine([
            `🎯 ${batterName} has to go — ${bowlerName} strikes!`,
            `💥 ${bowlerName} gets his man! ${batterName} departs.`,
            `😱 Big wicket! ${batterName} is dismissed by ${bowlerName}.`,
          ]),
        });
      } else if (lastBall.runs === 6) {
        setActive({
          kind: "six",
          id: stamp,
          batter: batterName,
          message: pickLine([
            `🚀 ${batterName} sends it out of the park!`,
            `💥 ${batterName} goes big — that's a maximum!`,
            `🔥 ${batterName} deposits it into the stands!`,
          ]),
        });
      } else if (lastBall.runs === 4) {
        setActive({
          kind: "four",
          id: stamp,
          batter: batterName,
          message: pickLine([
            `🏏 ${batterName} finds the fence — cracking shot!`,
            `⚡ ${batterName} pierces the gap for four!`,
            `✨ ${batterName} times it beautifully to the boundary!`,
          ]),
        });
      }
    }

    prevLensRef.current = { i1: i1Len, i2: i2Len };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.innings1?.history.length, state.innings2?.history.length]);

  // Match-over winner celebration
  useEffect(() => {
    if (prevPhaseRef.current !== "finished" && state.phase === "finished") {
      const isTie = state.result === "tie";
      const youWon = !!state.winnerId && state.winnerId === selfId;
      const winnerName = state.winnerId ? nameOf(state.winnerId) : "—";
      let margin = "";
      const i1 = state.innings1;
      const i2 = state.innings2;
      if (!isTie && i1 && i2) {
        const winnerInn = i1.runs > i2.runs ? i1 : i2;
        const gap = Math.abs(i1.runs - i2.runs);
        if (winnerInn.number === 2) {
          const wktsLeft = state.maxWickets - winnerInn.wickets;
          margin = `by ${wktsLeft} wicket${wktsLeft === 1 ? "" : "s"}`;
        } else {
          margin = `by ${gap} run${gap === 1 ? "" : "s"}`;
        }
      }
      setActive({
        kind: "winner",
        id: Date.now(),
        youWon,
        winnerName,
        margin,
        isTie,
      });
    }
    prevPhaseRef.current = state.phase;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.winnerId, state.result]);

  /**
   * Auto-dismiss.
   *
   * Holds were cut roughly in half for the per-ball events (four/six/wicket):
   * they fire on the most frequent notable deliveries, and a 2s hold after
   * every boundary is a large share of a 10-over match spent watching a
   * graphic. The winner card keeps a longer beat — it happens once.
   */
  useEffect(() => {
    if (!active) return;
    const ms =
      active.kind === "winner" ? 4200
      // A century is a bigger deal than a fifty — and both are rarer than a
      // plain boundary, so they hold the screen closer to the streak/
      // hat-trick beat than the four/six one.
      : active.kind === "milestone" ? (active.runs >= 100 ? 2800 : 2200)
      : active.kind === "hattrickWickets" || active.kind === "streak" ? 2400
      : active.kind === "six" ? 1300
      : active.kind === "wicket" ? 1300
      : 1100;
    const t = setTimeout(() => setActive(null), ms);
    return () => clearTimeout(t);
  }, [active]);

  // Any key or tap dismisses immediately — the celebration is feedback, never
  // a gate. `pointerdown` on the window (not a catcher element) means the same
  // tap that clears the graphic still reaches the control underneath it.
  useEffect(() => {
    if (!active) return;
    const dismiss = () => setActive(null);
    window.addEventListener("keydown", dismiss);
    window.addEventListener("pointerdown", dismiss);
    return () => {
      window.removeEventListener("keydown", dismiss);
      window.removeEventListener("pointerdown", dismiss);
    };
  }, [active]);

  return active;
}
