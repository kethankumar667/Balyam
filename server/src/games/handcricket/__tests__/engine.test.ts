import { describe, it, expect, beforeEach } from "vitest";
import type { HcState, Player } from "@shared/types.js";
import { HandCricketEngine } from "../HandCricketEngine.js";

function makePlayers(): Player[] {
  return ["p0", "p1"].map((id, i) => ({
    id,
    name: `P${i}`,
    isHost: i === 0,
    isReady: true,
    isConnected: true,
  }));
}

function state(engine: HandCricketEngine): HcState {
  return engine.getPublicState() as HcState;
}

/**
 * Both pick country AND confirm a 11-strong squad, advancing to toss.
 * Uses bangladesh + afghanistan by default because their rosters are empty,
 * which means the engine accepts placeholder profile IDs and skips composition checks.
 * Real-roster + composition tests live separately below.
 */
function bothSelectTeams(
  engine: HandCricketEngine,
  t0 = "bangladesh",
  t1 = "afghanistan",
) {
  engine.applyMove({ playerId: "p0", type: "selectTeam", data: { teamId: t0 } });
  engine.applyMove({ playerId: "p1", type: "selectTeam", data: { teamId: t1 } });
  engine.applyMove({
    playerId: "p0",
    type: "confirmSquad",
    data: {
      playerIds: ["a0", "a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "a9", "a10"],
      captainId: "a0",
      viceCaptainId: "a1",
    },
  });
  engine.applyMove({
    playerId: "p1",
    type: "confirmSquad",
    data: {
      playerIds: ["b0", "b1", "b2", "b3", "b4", "b5", "b6", "b7", "b8", "b9", "b10"],
      captainId: "b0",
      viceCaptainId: "b1",
    },
  });
}

/** Pick a bowler from the current bowling team's squad. */
function selectBowler(engine: HandCricketEngine, bowlerProfileId: string) {
  const s = state(engine);
  const innings = s.phase === "innings1" ? s.innings1! : s.innings2!;
  engine.applyMove({
    playerId: innings.bowlingPlayerId,
    type: "selectBowler",
    data: { playerId: bowlerProfileId },
  });
}

/**
 * Resolve a pending next-batter selection by automatically choosing the player
 * already queued at pendingBatterSlot (matches the old auto-advance behaviour).
 * Called at the start of any helper that might run into a post-wicket state.
 */
function resolveNextBatterIfPending(engine: HandCricketEngine) {
  const s = state(engine);
  const innings = s.phase === "innings1" ? s.innings1 : s.phase === "innings2" ? s.innings2 : null;
  if (!innings?.needsNextBatterPick || innings.pendingBatterSlot == null) return;
  const sel = s.teamSelections[innings.battingPlayerId];
  const squad = sel?.squadPlayerIds ?? [];
  const profileId = squad[innings.pendingBatterSlot];
  if (profileId) {
    engine.applyMove({
      playerId: innings.battingPlayerId,
      type: "selectNextBatter",
      data: { profileId },
    });
  }
}

/** Bowl one ball with the given picks; assumes a bowler is already set. */
function ballWithBowler(
  engine: HandCricketEngine,
  bat: number,
  bowl: number,
) {
  // If the previous ball was a wicket, select the default next batter first.
  resolveNextBatterIfPending(engine);
  const s = state(engine);
  const innings = s.phase === "innings1" ? s.innings1! : s.innings2!;
  engine.applyMove({ playerId: innings.battingPlayerId, type: "pick", data: { pick: bat } });
  engine.applyMove({ playerId: innings.bowlingPlayerId, type: "pick", data: { pick: bowl } });
}

/** Drive a toss where p0 picks `a`, p1 picks `b`, then toss-winner chooses choice. */
function tossThen(
  engine: HandCricketEngine,
  a: number,
  b: number,
  choice: "bat" | "bowl",
) {
  engine.applyMove({ playerId: "p0", type: "tossPick", data: { pick: a } });
  engine.applyMove({ playerId: "p1", type: "tossPick", data: { pick: b } });
  const winner = state(engine).tossWinnerId!;
  engine.applyMove({ playerId: winner, type: "tossChoice", data: { choice } });
}

/**
 * Bowl one ball end-to-end: ensures a bowler is selected, then submits both picks.
 * Rotates through the squad if the first-pick bowler has hit their per-format quota.
 * Auto-resolves any pending next-batter selection before bowling.
 */
function ball(engine: HandCricketEngine, bat: number, bowl: number) {
  // If a wicket was pending (needsNextBatterPick), pick the default next batter.
  resolveNextBatterIfPending(engine);
  const s = state(engine);
  const innings = s.phase === "innings1" ? s.innings1! : s.innings2!;
  if (innings.currentBowlerId == null) {
    const bowlingSquad = s.teamSelections[innings.bowlingPlayerId]?.squadPlayerIds ?? [];
    for (const candidate of bowlingSquad) {
      const r = engine.applyMove({
        playerId: innings.bowlingPlayerId,
        type: "selectBowler",
        data: { playerId: candidate },
      });
      if (r.ok) break;
    }
  }
  engine.applyMove({ playerId: innings.battingPlayerId, type: "pick", data: { pick: bat } });
  engine.applyMove({ playerId: innings.bowlingPlayerId, type: "pick", data: { pick: bowl } });
}

describe("HandCricketEngine — Phase 1 (overs + 10 wickets + team select)", () => {
  let engine: HandCricketEngine;

  beforeEach(() => {
    engine = new HandCricketEngine();
    // Default options = T20 (10 overs). Override per test if needed.
  });

  it("starts in teamSelect phase with no team chosen", () => {
    engine.init(makePlayers());
    const s = state(engine);
    expect(s.phase).toBe("teamSelect");
    expect(s.teamSelections["p0"]).toBeNull();
    expect(s.teamSelections["p1"]).toBeNull();
  });

  it("advances to toss phase only after both players confirm a squad", () => {
    engine.init(makePlayers());
    engine.applyMove({ playerId: "p0", type: "selectTeam", data: { teamId: "bangladesh" } });
    engine.applyMove({ playerId: "p1", type: "selectTeam", data: { teamId: "afghanistan" } });
    // Country picked but no squad yet → still teamSelect
    expect(state(engine).phase).toBe("teamSelect");
    engine.applyMove({
      playerId: "p0",
      type: "confirmSquad",
      data: { playerIds: ["x", "y"], captainId: "x", viceCaptainId: "y" },
    });
    // Only one squad confirmed → still teamSelect
    expect(state(engine).phase).toBe("teamSelect");
    engine.applyMove({
      playerId: "p1",
      type: "confirmSquad",
      data: { playerIds: ["a", "b"], captainId: "a", viceCaptainId: "b" },
    });
    const s = state(engine);
    expect(s.phase).toBe("toss");
    expect(s.teamSelections["p0"]?.teamId).toBe("bangladesh");
    expect(s.teamSelections["p0"]?.squadPlayerIds).toEqual(["x", "y"]);
    expect(s.teamSelections["p1"]?.squadPlayerIds).toEqual(["a", "b"]);
  });

  it("changing country after confirming squad resets squadPlayerIds", () => {
    engine.init(makePlayers());
    engine.applyMove({ playerId: "p0", type: "selectTeam", data: { teamId: "bangladesh" } });
    engine.applyMove({
      playerId: "p0",
      type: "confirmSquad",
      data: { playerIds: ["a", "b"], captainId: "a", viceCaptainId: "b" },
    });
    expect(state(engine).teamSelections["p0"]?.squadPlayerIds).toEqual(["a", "b"]);
    // Switch country.
    engine.applyMove({ playerId: "p0", type: "selectTeam", data: { teamId: "afghanistan" } });
    expect(state(engine).teamSelections["p0"]?.teamId).toBe("afghanistan");
    expect(state(engine).teamSelections["p0"]?.squadPlayerIds).toBeNull();
  });

  it("confirmSquad fails without a country picked first", () => {
    engine.init(makePlayers());
    const r = engine.applyMove({
      playerId: "p0",
      type: "confirmSquad",
      data: { playerIds: ["a"] },
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/country first/i);
  });

  // === Squad composition + bowler role enforcement (real roster paths) ===

  it("real-roster confirmSquad rejects a squad with no keepers", () => {
    engine.init(makePlayers());
    engine.applyMove({ playerId: "p0", type: "selectTeam", data: { teamId: "india" } });
    // India T20: 5 batters + 3 ARs + 3 bowlers = 11 (no keeper).
    const noKeeperIds = [
      "rohit-sharma", "yashasvi-jaiswal", "virat-kohli", "suryakumar-yadav", "rinku-singh",
      "hardik-pandya", "shivam-dube", "axar-patel",
      "jasprit-bumrah", "arshdeep-singh", "kuldeep-yadav",
    ];
    const r = engine.applyMove({
      playerId: "p0",
      type: "confirmSquad",
      data: { playerIds: noKeeperIds },
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/wicket-keeper/i);
  });

  it("real-roster confirmSquad rejects a squad with fewer than 4 bowlers+ARs", () => {
    engine.init(makePlayers());
    engine.applyMove({ playerId: "p0", type: "selectTeam", data: { teamId: "india" } });
    // 5 T20 batters + 5 legend batters + 1 keeper = 11. Bowling options = 0 ✗
    const tooFewBowlersIds = [
      "rohit-sharma", "yashasvi-jaiswal", "virat-kohli", "suryakumar-yadav", "rinku-singh",
      "sachin-tendulkar", "sunil-gavaskar", "rahul-dravid", "virender-sehwag", "shikhar-dhawan",
      "rishabh-pant",
    ];
    const r = engine.applyMove({
      playerId: "p0",
      type: "confirmSquad",
      data: { playerIds: tooFewBowlersIds },
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/4 bowlers/i);
  });

  it("real-roster confirmSquad accepts a balanced XI (≥1 keeper, ≥4 bowling options)", () => {
    engine.init(makePlayers());
    engine.applyMove({ playerId: "p0", type: "selectTeam", data: { teamId: "india" } });
    // India T20: 5 batters + 1 AR + 1 keeper + 4 bowlers = 11.
    // Bowling options = 1 + 4 = 5 ✓
    const validIds = [
      "rohit-sharma", "yashasvi-jaiswal", "virat-kohli", "suryakumar-yadav", "rinku-singh",
      "hardik-pandya",
      "rishabh-pant",
      "jasprit-bumrah", "arshdeep-singh", "kuldeep-yadav", "mohammed-siraj",
    ];
    const r = engine.applyMove({
      playerId: "p0",
      type: "confirmSquad",
      data: { playerIds: validIds, captainId: "rohit-sharma", viceCaptainId: "virat-kohli" },
    });
    expect(r.ok).toBe(true);
  });

  it("real-roster bowler must be role=bowler or all-rounder", () => {
    engine.init(makePlayers());
    engine.applyMove({ playerId: "p0", type: "selectTeam", data: { teamId: "india" } });
    engine.applyMove({ playerId: "p1", type: "selectTeam", data: { teamId: "australia" } });
    // India T20 valid XI (5 bat + 1 AR + 1 WK + 4 bowl)
    const indiaXI = [
      "rohit-sharma", "yashasvi-jaiswal", "virat-kohli", "suryakumar-yadav", "rinku-singh",
      "hardik-pandya",
      "rishabh-pant",
      "jasprit-bumrah", "arshdeep-singh", "kuldeep-yadav", "mohammed-siraj",
    ];
    // Australia T20 valid XI (4 bat + 1 AR + 1 WK + 5 bowl).
    // david-warner is a pure batter in T20; glenn-maxwell is an all-rounder.
    const ausXI = [
      "mitchell-marsh", "david-warner", "travis-head", "tim-david",
      "glenn-maxwell",
      "josh-inglis",
      "pat-cummins", "mitchell-starc", "josh-hazlewood", "adam-zampa", "nathan-ellis",
    ];
    const r0 = engine.applyMove({
      playerId: "p0",
      type: "confirmSquad",
      data: { playerIds: indiaXI, captainId: "rohit-sharma", viceCaptainId: "virat-kohli" },
    });
    expect(r0.ok).toBe(true);
    const r1 = engine.applyMove({
      playerId: "p1",
      type: "confirmSquad",
      data: { playerIds: ausXI, captainId: "mitchell-marsh", viceCaptainId: "pat-cummins" },
    });
    expect(r1.ok).toBe(true);
    // Sum 4 → even → p0 wins toss.
    engine.applyMove({ playerId: "p0", type: "tossPick", data: { pick: 2 } });
    engine.applyMove({ playerId: "p1", type: "tossPick", data: { pick: 2 } });
    engine.applyMove({ playerId: "p0", type: "tossChoice", data: { choice: "bat" } });
    // p1 is bowling. Try sending David Warner (pure batter) to bowl.
    const rBat = engine.applyMove({
      playerId: "p1",
      type: "selectBowler",
      data: { playerId: "david-warner" },
    });
    expect(rBat.ok).toBe(false);
    expect(rBat.error).toMatch(/bowlers and all-rounders/i);
    // Glenn Maxwell is an all-rounder — must be allowed.
    const rAR = engine.applyMove({
      playerId: "p1",
      type: "selectBowler",
      data: { playerId: "glenn-maxwell" },
    });
    expect(rAR.ok).toBe(true);
  });

  it("rejects toss pick before teams are selected", () => {
    engine.init(makePlayers());
    const r = engine.applyMove({ playerId: "p0", type: "tossPick", data: { pick: 3 } });
    expect(r.ok).toBe(false);
  });

  it("defaults to T20 = 10 overs and 10 max wickets", () => {
    engine.init(makePlayers());
    bothSelectTeams(engine);
    const s = state(engine);
    expect(s.oversPerInnings).toBe(10);
    expect(s.maxWickets).toBe(10);
  });

  it("ODI format = 15 overs when set via options", () => {
    engine.setOptions({ mode: "single", format: "odi", category: "international" });
    engine.init(makePlayers());
    bothSelectTeams(engine);
    expect(state(engine).oversPerInnings).toBe(15);
  });

  it("Test format = 30 overs when set via options", () => {
    engine.setOptions({ mode: "single", format: "test", category: "international" });
    engine.init(makePlayers());
    bothSelectTeams(engine);
    expect(state(engine).oversPerInnings).toBe(30);
  });

  it("ball runs add to score and wickets are tracked separately", () => {
    engine.init(makePlayers());
    bothSelectTeams(engine);
    tossThen(engine, 2, 2, "bat"); // p0 bats (sum 4 → p0 wins)
    ball(engine, 4, 3); // 4 runs, no wicket
    const s = state(engine);
    expect(s.innings1!.runs).toBe(4);
    expect(s.innings1!.wickets).toBe(0);
    expect(s.innings1!.balls).toBe(1);
    expect(s.innings1!.history[0].isBoundary).toBe(true);
  });

  it("matching picks = wicket; innings only ends after 10 wickets", () => {
    engine.init(makePlayers());
    bothSelectTeams(engine);
    tossThen(engine, 2, 2, "bat");
    // 9 wickets fall, innings still alive
    for (let i = 0; i < 9; i++) ball(engine, 3, 3);
    const s = state(engine);
    expect(s.innings1!.wickets).toBe(9);
    expect(s.innings1!.endedReason).toBeNull();
    expect(s.phase).toBe("innings1");
  });

  it("10 wickets ends the innings as 'allOut' and swaps roles", () => {
    engine.init(makePlayers());
    bothSelectTeams(engine);
    tossThen(engine, 2, 2, "bat");
    for (let i = 0; i < 10; i++) ball(engine, 3, 3);
    const s = state(engine);
    expect(s.innings1!.wickets).toBe(10);
    expect(s.innings1!.endedReason).toBe("allOut");
    expect(s.phase).toBe("innings2");
    expect(s.innings2!.battingPlayerId).toBe("p1");
    expect(s.innings2!.bowlingPlayerId).toBe("p0");
  });

  it("running out of overs ends the innings as 'oversUp'", () => {
    // Use T20 (10 overs = 60 balls). Bowl 60 balls without 10 wickets.
    engine.init(makePlayers());
    bothSelectTeams(engine);
    tossThen(engine, 2, 2, "bat");
    for (let i = 0; i < 60; i++) ball(engine, 2, 3); // every ball scores 2, no wickets
    const s = state(engine);
    expect(s.innings1!.balls).toBe(60);
    expect(s.innings1!.runs).toBe(120);
    expect(s.innings1!.wickets).toBe(0);
    expect(s.innings1!.endedReason).toBe("oversUp");
    expect(s.phase).toBe("innings2");
  });

  it("innings 2 batter exceeding target wins (chased)", () => {
    engine.init(makePlayers());
    bothSelectTeams(engine);
    tossThen(engine, 2, 2, "bat");
    // Innings 1: p0 scores 5 then all out (10 wickets).
    ball(engine, 5, 3);
    for (let i = 0; i < 10; i++) ball(engine, 3, 3);
    // Innings 2: p1 needs > 5.
    ball(engine, 6, 1); // 6 runs — chased.
    const s = state(engine);
    expect(s.phase).toBe("finished");
    expect(s.result).toBe("win");
    expect(s.winnerId).toBe("p1");
    expect(s.innings2!.endedReason).toBe("chased");
  });

  it("innings 2 ending all-out before chasing → bowler wins", () => {
    engine.init(makePlayers());
    bothSelectTeams(engine);
    tossThen(engine, 2, 2, "bat");
    ball(engine, 6, 1); // p0 = 6
    for (let i = 0; i < 10; i++) ball(engine, 3, 3); // all out
    // Innings 2: p1 must exceed 6.
    ball(engine, 2, 1); // 2 runs
    for (let i = 0; i < 10; i++) ball(engine, 3, 3); // all out
    const s = state(engine);
    expect(s.phase).toBe("finished");
    expect(s.result).toBe("win");
    expect(s.winnerId).toBe("p0");
    expect(s.innings2!.endedReason).toBe("allOut");
  });

  it("tied score at end of innings 2 = tie", () => {
    engine.init(makePlayers());
    bothSelectTeams(engine);
    tossThen(engine, 2, 2, "bat");
    ball(engine, 3, 1);                              // p0 = 3
    for (let i = 0; i < 10; i++) ball(engine, 3, 3); // all out, p0 = 3
    ball(engine, 3, 1);                              // p1 = 3
    for (let i = 0; i < 10; i++) ball(engine, 3, 3); // all out
    const s = state(engine);
    expect(s.phase).toBe("finished");
    expect(s.result).toBe("tie");
    expect(s.winnerId).toBeNull();
  });

  it("over and ball-in-over are tracked correctly", () => {
    engine.init(makePlayers());
    bothSelectTeams(engine);
    tossThen(engine, 2, 2, "bat");
    // 7th ball → over 2, ball 1.
    for (let i = 0; i < 7; i++) ball(engine, 2, 3);
    const last = state(engine).innings1!.history.at(-1)!;
    expect(last.overNumber).toBe(2);
    expect(last.ballInOver).toBe(1);
  });

  it("masks opponent's pending pick during an over", () => {
    engine.init(makePlayers());
    bothSelectTeams(engine);
    tossThen(engine, 2, 2, "bat");
    selectBowler(engine, "b0");
    engine.applyMove({ playerId: "p0", type: "pick", data: { pick: 5 } });
    const seenByP1 = engine.getStateFor("p1") as HcState;
    expect(seenByP1.pendingPicks["p0"]).toBe(-1);
    expect(seenByP1.pendingPicks["p1"]).toBeNull();
  });

  it("rejects a second pick from the same player in the same ball", () => {
    engine.init(makePlayers());
    bothSelectTeams(engine);
    tossThen(engine, 2, 2, "bat");
    selectBowler(engine, "b0");
    engine.applyMove({ playerId: "p0", type: "pick", data: { pick: 3 } });
    const r = engine.applyMove({ playerId: "p0", type: "pick", data: { pick: 4 } });
    expect(r.ok).toBe(false);
  });

  it("only the toss winner can choose bat or bowl", () => {
    engine.init(makePlayers());
    bothSelectTeams(engine);
    engine.applyMove({ playerId: "p0", type: "tossPick", data: { pick: 1 } });
    engine.applyMove({ playerId: "p1", type: "tossPick", data: { pick: 1 } });
    const winner = state(engine).tossWinnerId!;
    const loser = winner === "p0" ? "p1" : "p0";
    const r = engine.applyMove({
      playerId: loser,
      type: "tossChoice",
      data: { choice: "bat" },
    });
    expect(r.ok).toBe(false);
  });

  it("rejects pick at the start of an innings before the bowler is chosen", () => {
    engine.init(makePlayers());
    bothSelectTeams(engine);
    tossThen(engine, 2, 2, "bat"); // p0 bats
    const r = engine.applyMove({ playerId: "p0", type: "pick", data: { pick: 4 } });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/bowler/i);
  });

  it("selectBowler must reference a player in the bowling team's squad", () => {
    engine.init(makePlayers());
    bothSelectTeams(engine);
    tossThen(engine, 2, 2, "bat"); // p0 bats, p1 bowls
    const r = engine.applyMove({
      playerId: "p1",
      type: "selectBowler",
      data: { playerId: "not-in-squad" },
    });
    expect(r.ok).toBe(false);
    const r2 = engine.applyMove({
      playerId: "p1",
      type: "selectBowler",
      data: { playerId: "b3" }, // p1's squad has b0..b10
    });
    expect(r2.ok).toBe(true);
    expect(state(engine).innings1!.currentBowlerId).toBe("b3");
  });

  it("only the bowling team can select the bowler", () => {
    engine.init(makePlayers());
    bothSelectTeams(engine);
    tossThen(engine, 2, 2, "bat");
    const r = engine.applyMove({
      playerId: "p0", // batting team
      type: "selectBowler",
      data: { playerId: "b0" },
    });
    expect(r.ok).toBe(false);
  });

  it("end of an over clears currentBowlerId; bowling team must pick again", () => {
    engine.init(makePlayers());
    bothSelectTeams(engine);
    tossThen(engine, 2, 2, "bat");
    // Bowl 6 balls of "2 vs 3" (no wickets, no boundaries, 12 runs total).
    for (let i = 0; i < 6; i++) ball(engine, 2, 3);
    const s = state(engine);
    expect(s.innings1!.balls).toBe(6);
    expect(s.innings1!.currentBowlerId).toBeNull();
    // Trying to bowl without picking a bowler should fail.
    const r = engine.applyMove({ playerId: "p0", type: "pick", data: { pick: 1 } });
    expect(r.ok).toBe(false);
  });

  it("tracks per-batter and per-bowler stats with strike rotation", () => {
    engine.init(makePlayers());
    bothSelectTeams(engine);
    tossThen(engine, 2, 2, "bat"); // p0 bats, p1 bowls
    selectBowler(engine, "b0");
    // Six legitimate deliveries. Track strike rotation:
    //   Start: striker=a0, non-striker=a1, next=a2
    //   Ball 1: 4 runs (even) → striker stays a0
    //   Ball 2: 6 runs (even) → striker stays a0
    //   Ball 3: 2 runs (even) → striker stays a0
    //   Ball 4: 4 runs (even) → striker stays a0
    //   Ball 5: wicket → striker becomes a2, nextBatter=a3 (non-striker still a1)
    //   Ball 6: 1 run (odd) → swap. Then end-of-over swap → net no change.
    //     a2 faced ball 6 and scored 1, but ended over as striker still.
    ballWithBowler(engine, 4, 1);
    ballWithBowler(engine, 6, 1);
    ballWithBowler(engine, 2, 1);
    ballWithBowler(engine, 4, 1);
    ballWithBowler(engine, 3, 3); // wicket
    ballWithBowler(engine, 1, 2);

    const s = state(engine);
    const i = s.innings1!;
    // a0 stats: 4+6+2+4 = 16 runs across 5 balls (2 fours, 1 six), dismissed by b0.
    expect(i.batterStats["a0"]).toMatchObject({
      runs: 16, balls: 5, fours: 2, sixes: 1, isOut: true, dismissedBy: "b0",
    });
    // a2 stats: 1 run, 1 ball (faced ball 6 after wicket replacement).
    expect(i.batterStats["a2"]).toMatchObject({ runs: 1, balls: 1, isOut: false });
    // a1 untouched — never faced a ball this over.
    expect(i.batterStats["a1"]).toMatchObject({ runs: 0, balls: 0 });
    // Bowler b0: 6 balls, 17 runs conceded, 1 wicket.
    expect(i.bowlerStats["b0"]).toMatchObject({ balls: 6, runs: 17, wickets: 1 });
  });

  it("rotates strike on odd runs and stays on even runs", () => {
    // Use Test format to avoid the T20 powerplay restriction on over 1.
    engine.setOptions({ mode: "single", format: "test", category: "international" });
    engine.init(makePlayers());
    bothSelectTeams(engine);
    tossThen(engine, 2, 2, "bat");
    selectBowler(engine, "b0");
    // Start: striker=a0, non-striker=a1.
    // Ball 1: 1 run (odd) → swap. Striker becomes a1, non-striker a0.
    ballWithBowler(engine, 1, 2);
    let i = state(engine).innings1!;
    expect(i.strikerIdx).toBe(1);
    expect(i.nonStrikerIdx).toBe(0);
    expect(i.batterStats["a0"]).toMatchObject({ runs: 1, balls: 1 });
    // Ball 2: 2 runs (even) — a1 faces and scores 2, no swap.
    ballWithBowler(engine, 2, 3);
    i = state(engine).innings1!;
    expect(i.strikerIdx).toBe(1);
    expect(i.batterStats["a1"]).toMatchObject({ runs: 2, balls: 1 });
    // Ball 3: 3 runs (odd) → swap back to a0.
    ballWithBowler(engine, 3, 4);
    i = state(engine).innings1!;
    expect(i.strikerIdx).toBe(0);
    expect(i.batterStats["a1"]).toMatchObject({ runs: 5, balls: 2 });
  });

  it("T20 enforces 3-over quota per bowler", () => {
    engine.setOptions({ mode: "single", format: "t20", category: "international" });
    engine.init(makePlayers());
    bothSelectTeams(engine);
    tossThen(engine, 2, 2, "bat");
    // Bowl 3 full overs with b0 (18 balls).
    for (let over = 0; over < 3; over++) {
      selectBowler(engine, "b0");
      for (let j = 0; j < 6; j++) ballWithBowler(engine, 2, 3);
    }
    // 4th over: cannot pick b0 again — quota of 3 is reached.
    const r = engine.applyMove({
      playerId: "p1",
      type: "selectBowler",
      data: { playerId: "b0" },
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/quota/i);
    // Another bowler is fine.
    const r2 = engine.applyMove({
      playerId: "p1",
      type: "selectBowler",
      data: { playerId: "b1" },
    });
    expect(r2.ok).toBe(true);
  });

  it("ODI enforces 4-over quota per bowler", () => {
    engine.setOptions({ mode: "single", format: "odi", category: "international" });
    engine.init(makePlayers());
    bothSelectTeams(engine);
    tossThen(engine, 2, 2, "bat");
    // Bowl 4 full overs with b0 (24 balls).
    for (let over = 0; over < 4; over++) {
      selectBowler(engine, "b0");
      for (let j = 0; j < 6; j++) ballWithBowler(engine, 2, 3);
    }
    // 5th over: cannot pick b0 again.
    const r = engine.applyMove({
      playerId: "p1",
      type: "selectBowler",
      data: { playerId: "b0" },
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/quota/i);
  });

  it("Test format has no bowler quota — same bowler can keep going", () => {
    engine.setOptions({ mode: "single", format: "test", category: "international" });
    engine.init(makePlayers());
    bothSelectTeams(engine);
    tossThen(engine, 2, 2, "bat");
    // Bowl 6 full overs with b0 (36 balls) — quotaless in Test.
    for (let over = 0; over < 6; over++) {
      selectBowler(engine, "b0");
      for (let j = 0; j < 6; j++) ballWithBowler(engine, 2, 3);
    }
    // 7th over: still allowed.
    const r = engine.applyMove({
      playerId: "p1",
      type: "selectBowler",
      data: { playerId: "b0" },
    });
    expect(r.ok).toBe(true);
  });

  it("end of over swaps strike (mechanical, bowler changes ends)", () => {
    engine.init(makePlayers());
    bothSelectTeams(engine);
    tossThen(engine, 2, 2, "bat");
    selectBowler(engine, "b0");
    // 6 balls of "2 vs 3" — all dot/even, no strike change from runs.
    // End of over: mechanical swap.
    for (let j = 0; j < 6; j++) ballWithBowler(engine, 2, 3);
    const i = state(engine).innings1!;
    expect(i.balls).toBe(6);
    expect(i.strikerIdx).toBe(1); // swapped from 0 → 1
    expect(i.nonStrikerIdx).toBe(0);
  });

  // === Galli mode (free play) ===

  it("Galli mode uses host-selected overs (galliOvers option)", () => {
    engine.setOptions({ mode: "galli", format: "t20", category: "international", galliOvers: 7 });
    engine.init(makePlayers());
    bothSelectTeams(engine);
    const s = state(engine);
    expect(s.options.mode).toBe("galli");
    expect(s.oversPerInnings).toBe(7);
  });

  it("Galli mode skips bowler role check — pure batters can bowl", () => {
    engine.setOptions({ mode: "galli", format: "t20", category: "international", galliOvers: 4 });
    engine.init(makePlayers());
    engine.applyMove({ playerId: "p0", type: "selectTeam", data: { teamId: "india" } });
    engine.applyMove({ playerId: "p1", type: "selectTeam", data: { teamId: "australia" } });
    // Galli accepts any squad of 1-15 valid pool members; no composition checks.
    const indiaSquad = ["rohit-sharma", "yashasvi-jaiswal", "virat-kohli", "suryakumar-yadav"];
    const ausSquad = ["mitchell-marsh", "david-warner", "travis-head", "tim-david"];
    expect(engine.applyMove({
      playerId: "p0",
      type: "confirmSquad",
      data: { playerIds: indiaSquad, captainId: "rohit-sharma", viceCaptainId: "virat-kohli" },
    }).ok).toBe(true);
    expect(engine.applyMove({
      playerId: "p1",
      type: "confirmSquad",
      data: { playerIds: ausSquad, captainId: "mitchell-marsh", viceCaptainId: "travis-head" },
    }).ok).toBe(true);
    engine.applyMove({ playerId: "p0", type: "tossPick", data: { pick: 2 } });
    engine.applyMove({ playerId: "p1", type: "tossPick", data: { pick: 2 } });
    engine.applyMove({ playerId: "p0", type: "tossChoice", data: { choice: "bat" } });
    // david-warner is a pure batter — would be rejected in T20, but Galli allows it.
    const r = engine.applyMove({
      playerId: "p1",
      type: "selectBowler",
      data: { playerId: "david-warner" },
    });
    expect(r.ok).toBe(true);
  });

  it("Galli mode has no bowler quota — same bowler can keep going forever", () => {
    engine.setOptions({ mode: "galli", format: "t20", category: "international", galliOvers: 10 });
    engine.init(makePlayers());
    bothSelectTeams(engine);
    tossThen(engine, 2, 2, "bat");
    // Bowl 5 full overs with b0 (30 balls) — no quota in Galli.
    for (let over = 0; over < 5; over++) {
      selectBowler(engine, "b0");
      for (let j = 0; j < 6; j++) ballWithBowler(engine, 2, 3);
    }
    const r = engine.applyMove({
      playerId: "p1",
      type: "selectBowler",
      data: { playerId: "b0" },
    });
    expect(r.ok).toBe(true);
  });

  it("Galli mode has no powerplay — restrictedBallsByOver stays empty", () => {
    engine.setOptions({ mode: "galli", format: "t20", category: "international", galliOvers: 6 });
    engine.init(makePlayers());
    bothSelectTeams(engine);
    tossThen(engine, 2, 2, "bat");
    selectBowler(engine, "b0");
    expect(state(engine).innings1!.powerplayOvers).toBe(0);
    expect(state(engine).innings1!.restrictedBallsByOver).toEqual({});
    // Bowler can pick 6 on the first ball — no restriction.
    expect(engine.applyMove({ playerId: "p0", type: "pick", data: { pick: 1 } }).ok).toBe(true);
    expect(engine.applyMove({ playerId: "p1", type: "pick", data: { pick: 6 } }).ok).toBe(true);
  });

  // === Powerplay ===

  it("T20 powerplay generates 3 restricted balls per powerplay over", () => {
    engine.setOptions({ mode: "single", format: "t20", category: "international" });
    engine.init(makePlayers());
    bothSelectTeams(engine);
    tossThen(engine, 2, 2, "bat");
    selectBowler(engine, "b0"); // over 1 is powerplay
    const restricted = state(engine).innings1!.restrictedBallsByOver[1];
    expect(restricted).toBeDefined();
    expect(restricted.length).toBe(3);
    // All 3 are valid ball positions 1-6, distinct.
    expect(new Set(restricted).size).toBe(3);
    for (const b of restricted) expect(b).toBeGreaterThanOrEqual(1);
    for (const b of restricted) expect(b).toBeLessThanOrEqual(6);
  });

  it("Powerplay rejects bowler pick > 3 on restricted balls", () => {
    engine.setOptions({ mode: "single", format: "t20", category: "international" });
    engine.init(makePlayers());
    bothSelectTeams(engine);
    tossThen(engine, 2, 2, "bat");
    selectBowler(engine, "b0");
    const restricted = state(engine).innings1!.restrictedBallsByOver[1];
    // Walk through balls 1..6 until we hit a restricted one.
    for (let b = 1; b <= 6; b++) {
      if (!restricted.includes(b)) {
        // Non-restricted ball — bowler can pick 6.
        engine.applyMove({ playerId: "p0", type: "pick", data: { pick: 1 } });
        const r = engine.applyMove({ playerId: "p1", type: "pick", data: { pick: 6 } });
        expect(r.ok).toBe(true);
      } else {
        // Restricted ball — bowler pick > 3 rejected; pick 3 accepted.
        engine.applyMove({ playerId: "p0", type: "pick", data: { pick: 2 } });
        const bad = engine.applyMove({ playerId: "p1", type: "pick", data: { pick: 5 } });
        expect(bad.ok).toBe(false);
        expect(bad.error).toMatch(/powerplay/i);
        const good = engine.applyMove({ playerId: "p1", type: "pick", data: { pick: 3 } });
        expect(good.ok).toBe(true);
      }
    }
    expect(state(engine).innings1!.balls).toBe(6);
  });

  it("Test format has no powerplay (powerplayOvers = 0)", () => {
    engine.setOptions({ mode: "single", format: "test", category: "international" });
    engine.init(makePlayers());
    bothSelectTeams(engine);
    tossThen(engine, 2, 2, "bat");
    selectBowler(engine, "b0");
    const innings = state(engine).innings1!;
    expect(innings.powerplayOvers).toBe(0);
    expect(innings.restrictedBallsByOver).toEqual({});
  });

  it("Powerplay window ends after configured overs — no restrictions on over 4 (T20)", () => {
    engine.setOptions({ mode: "single", format: "t20", category: "international" });
    engine.init(makePlayers());
    bothSelectTeams(engine);
    tossThen(engine, 2, 2, "bat");
    // Bowl 3 powerplay overs (18 balls). Rotate bowlers to avoid T20 quota.
    for (let over = 0; over < 3; over++) {
      selectBowler(engine, `b${over}`);
      for (let j = 0; j < 6; j++) ballWithBowler(engine, 2, 3);
    }
    // Over 4 is not a powerplay over — pick a bowler, no restriction generated.
    selectBowler(engine, "b3");
    const innings = state(engine).innings1!;
    expect(innings.restrictedBallsByOver[4]).toBeUndefined();
    // Bowler can pick 6 freely on the first ball.
    expect(engine.applyMove({ playerId: "p0", type: "pick", data: { pick: 1 } }).ok).toBe(true);
    expect(engine.applyMove({ playerId: "p1", type: "pick", data: { pick: 6 } }).ok).toBe(true);
  });

  it("removePlayer mid-game declares opponent the winner", () => {
    engine.init(makePlayers());
    bothSelectTeams(engine);
    engine.removePlayer("p1");
    const s = state(engine);
    expect(s.phase).toBe("finished");
    expect(s.winnerId).toBe("p0");
    expect(s.result).toBe("win");
  });
});
