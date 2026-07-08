import type {
  HcBall,
  HcBatterStats,
  HcBowlerStats,
  HcGameOptions,
  HcInnings,
  HcInningsEndReason,
  HcResult,
  HcState,
  HcTeamId,
  Player,
} from "@shared/types.js";
import {
  DEFAULT_HC_OPTIONS,
  HC_GALLI_MAX_OVERS,
  HC_GALLI_MIN_OVERS,
  HC_MAX_OVERS_PER_BOWLER,
  HC_OVERS_BY_FORMAT,
  HC_POWERPLAY_OVERS,
  HC_WICKETS_PER_INNINGS,
} from "@shared/types.js";
import {
  evaluateSquadComposition,
  getAllPlayersFor,
} from "@shared/hc-rosters.js";
import type { GameEngine, MoveContext, MoveResult } from "../GameEngine.js";

const VALID_PICKS = [1, 2, 3, 4, 5, 6];

function freshBatterStats(): HcBatterStats {
  return {
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    isOut: false,
    dismissedBy: null,
  };
}

function freshBowlerStats(): HcBowlerStats {
  return { balls: 0, runs: 0, wickets: 0 };
}

function freshInnings(
  number: 1 | 2,
  battingPlayerId: string,
  bowlingPlayerId: string,
  oversPerInnings: number,
  powerplayOvers: number,
  battingSquad: string[],
  bowlingSquad: string[],
): HcInnings {
  const batterStats: Record<string, HcBatterStats> = {};
  for (const id of battingSquad) batterStats[id] = freshBatterStats();
  const bowlerStats: Record<string, HcBowlerStats> = {};
  for (const id of bowlingSquad) bowlerStats[id] = freshBowlerStats();
  return {
    number,
    battingPlayerId,
    bowlingPlayerId,
    runs: 0,
    wickets: 0,
    balls: 0,
    overs: oversPerInnings,
    endedReason: null,
    history: [],
    // Openers take guard at slots 0 (striker) and 1 (non-striker).
    strikerIdx: 0,
    nonStrikerIdx: 1,
    nextBatterIdx: 2,
    currentBowlerId: null,   // bowling player must pick before play starts
    batterStats,
    bowlerStats,
    restrictedBallsByOver: {},
    powerplayOvers,
    needsNextBatterPick: false,
    pendingBatterSlot: null,
  };
}

/**
 * Pick 3 distinct ball positions (1..6) where the bowler will be restricted
 * to picks 1-3 during a powerplay over.
 */
function chooseRestrictedBalls(rng: () => number = Math.random): number[] {
  const balls = [1, 2, 3, 4, 5, 6];
  // Fisher-Yates partial — pick 3 from 6.
  for (let i = 5; i >= 3; i--) {
    const j = Math.floor(rng() * (i + 1));
    [balls[i], balls[j]] = [balls[j], balls[i]];
  }
  return balls.slice(0, 3).sort((a, b) => a - b);
}

export class HandCricketEngine implements GameEngine {
  readonly kind = "handcricket" as const;
  readonly minPlayers = 2;
  readonly maxPlayers = 2;

  private state!: HcState;
  private pendingOptions: HcGameOptions = { ...DEFAULT_HC_OPTIONS };

  setOptions(options: HcGameOptions): void {
    this.pendingOptions = { ...DEFAULT_HC_OPTIONS, ...options };
  }

  init(players: Player[]): void {
    if (players.length !== 2) {
      throw new Error("Hand Cricket requires exactly 2 players");
    }
    const order = players.map((p) => p.id) as [string, string];
    const oversPerInnings = this.resolveOversForInnings();
    this.state = {
      kind: "handcricket",
      phase: "teamSelect",
      playerOrder: order,
      options: { ...this.pendingOptions },
      teamSelections: {
        [order[0]]: null,
        [order[1]]: null,
      },
      tossPicks: { [order[0]]: null, [order[1]]: null },
      tossSum: null,
      tossWinnerId: null,
      innings1: null,
      innings2: null,
      pendingPicks: { [order[0]]: null, [order[1]]: null },
      winnerId: null,
      result: null,
      maxWickets: HC_WICKETS_PER_INNINGS,
      oversPerInnings,
      startedAt: Date.now(),
    };
  }

  /** Galli mode bypasses the formal rules (composition, bowler role, quota, powerplay). */
  private isGalli(): boolean {
    return this.state.options.mode === "galli";
  }

  /** Compute overs for an innings, honoring host's galliOvers in Galli mode. */
  private resolveOversForInnings(): number {
    const opts = this.pendingOptions;
    if (opts.mode === "galli") {
      const requested = opts.galliOvers ?? 5;
      return Math.max(
        HC_GALLI_MIN_OVERS,
        Math.min(HC_GALLI_MAX_OVERS, Math.floor(requested)),
      );
    }
    return HC_OVERS_BY_FORMAT[opts.format];
  }

  applyMove(move: MoveContext): MoveResult {
    if (!this.state.playerOrder.includes(move.playerId)) {
      return { ok: false, error: "Not a player in this game" };
    }
    switch (move.type) {
      case "selectTeam":
        return this.handleSelectTeam(move);
      case "confirmSquad":
        return this.handleConfirmSquad(move);
      case "tossPick":
        return this.handleTossPick(move);
      case "tossChoice":
        return this.handleTossChoice(move);
      case "selectBowler":
        return this.handleSelectBowler(move);
      case "pick":
        return this.handlePick(move);
      case "reorderBatting":
        return this.handleReorderBatting(move);
      case "selectNextBatter":
        return this.handleSelectNextBatter(move);
      default:
        return { ok: false, error: `Unknown move type: ${move.type}` };
    }
  }

  private handleSelectTeam(move: MoveContext): MoveResult {
    if (this.state.phase !== "teamSelect") {
      return { ok: false, error: "Team selection is closed" };
    }
    const teamId = (move.data as { teamId?: HcTeamId } | undefined)?.teamId;
    if (!teamId) return { ok: false, error: "Missing teamId" };
    // Setting/changing country resets squad + captain/VC (must re-pick for new team).
    this.state.teamSelections[move.playerId] = {
      teamId,
      squadPlayerIds: null,
      captainId: null,
      viceCaptainId: null,
    };
    return { ok: true };
  }

  private handleConfirmSquad(move: MoveContext): MoveResult {
    if (this.state.phase !== "teamSelect") {
      return { ok: false, error: "Team selection is closed" };
    }
    const current = this.state.teamSelections[move.playerId];
    if (!current) {
      return { ok: false, error: "Pick a country first" };
    }
    const data = move.data as
      | { playerIds?: string[]; captainId?: string; viceCaptainId?: string }
      | undefined;
    const ids = data?.playerIds;
    if (!Array.isArray(ids)) {
      return { ok: false, error: "Provide your playing XI" };
    }

    // Look up player profiles for the chosen team+format.
    // Galli mode skips composition rules but still validates IDs against the chosen format's pool.
    const pool = getAllPlayersFor(current.teamId, this.state.options.format);
    if (pool.length > 0) {
      const selectedProfiles = ids
        .map((id) => pool.find((p) => p.id === id))
        .filter((p): p is NonNullable<typeof p> => !!p);
      if (selectedProfiles.length !== ids.length) {
        return { ok: false, error: "One or more players not in this team's pool" };
      }
      if (!this.isGalli()) {
        const report = evaluateSquadComposition(selectedProfiles);
        if (!report.isValid) {
          return { ok: false, error: report.problems.join("; ") };
        }
      } else {
        // Galli: just need a sane size.
        if (ids.length === 0 || ids.length > 15) {
          return { ok: false, error: "Squad must have 1-15 players" };
        }
      }
    } else {
      // No roster data — just enforce a size cap.
      if (ids.length === 0 || ids.length > 15) {
        return { ok: false, error: "Squad must have 1-15 players" };
      }
    }

    // Captain + Vice-Captain are required and must be distinct members of the XI.
    const captainId = data?.captainId;
    const viceCaptainId = data?.viceCaptainId;
    if (!captainId || !viceCaptainId) {
      return { ok: false, error: "Pick a Captain and a Vice-Captain" };
    }
    if (captainId === viceCaptainId) {
      return { ok: false, error: "Captain and Vice-Captain must be different players" };
    }
    if (!ids.includes(captainId) || !ids.includes(viceCaptainId)) {
      return { ok: false, error: "Captain and Vice-Captain must be in your XI" };
    }

    this.state.teamSelections[move.playerId] = {
      teamId: current.teamId,
      squadPlayerIds: ids.slice(),
      captainId,
      viceCaptainId,
    };

    // Advance to toss once both players have confirmed their squad.
    const [p0, p1] = this.state.playerOrder;
    const s0 = this.state.teamSelections[p0];
    const s1 = this.state.teamSelections[p1];
    if (s0?.squadPlayerIds && s1?.squadPlayerIds) {
      this.state.phase = "toss";
    }
    return { ok: true };
  }

  private handleTossPick(move: MoveContext): MoveResult {
    if (this.state.phase !== "toss") {
      return { ok: false, error: "Toss already complete" };
    }
    const pick = (move.data as { pick?: number } | undefined)?.pick;
    if (!pick || !VALID_PICKS.includes(pick)) {
      return { ok: false, error: "Pick must be 1-6" };
    }
    if (this.state.tossPicks[move.playerId] != null) {
      return { ok: false, error: "You already picked for the toss" };
    }
    this.state.tossPicks[move.playerId] = pick;

    const [p0, p1] = this.state.playerOrder;
    const v0 = this.state.tossPicks[p0];
    const v1 = this.state.tossPicks[p1];
    if (v0 != null && v1 != null) {
      const sum = v0 + v1;
      this.state.tossSum = sum;
      this.state.tossWinnerId = sum % 2 === 0 ? p0 : p1;
      this.state.phase = "tossChoice";
    }
    return { ok: true };
  }

  private handleTossChoice(move: MoveContext): MoveResult {
    if (this.state.phase !== "tossChoice") {
      return { ok: false, error: "Not in toss-choice phase" };
    }
    if (move.playerId !== this.state.tossWinnerId) {
      return { ok: false, error: "Only the toss winner chooses" };
    }
    const choice = (move.data as { choice?: "bat" | "bowl" } | undefined)?.choice;
    if (choice !== "bat" && choice !== "bowl") {
      return { ok: false, error: "Choice must be 'bat' or 'bowl'" };
    }
    const winner = this.state.tossWinnerId!;
    const other = this.state.playerOrder.find((id) => id !== winner)!;
    const batter = choice === "bat" ? winner : other;
    const bowler = choice === "bat" ? other : winner;
    this.state.innings1 = freshInnings(
      1,
      batter,
      bowler,
      this.state.oversPerInnings,
      this.powerplayOversForCurrentMatch(),
      this.squadFor(batter),
      this.squadFor(bowler),
    );
    this.state.phase = "innings1";
    this.clearPendingPicks();
    return { ok: true };
  }

  private powerplayOversForCurrentMatch(): number {
    if (this.isGalli()) return 0;
    return HC_POWERPLAY_OVERS[this.state.options.format];
  }

  private squadFor(playerId: string): string[] {
    return this.state.teamSelections[playerId]?.squadPlayerIds ?? [];
  }

  private handleSelectBowler(move: MoveContext): MoveResult {
    if (this.state.phase !== "innings1" && this.state.phase !== "innings2") {
      return { ok: false, error: "Not in a live innings" };
    }
    const innings = this.currentInnings();
    if (move.playerId !== innings.bowlingPlayerId) {
      return { ok: false, error: "Only the bowling team picks the bowler" };
    }
    if (innings.currentBowlerId != null) {
      return { ok: false, error: "Bowler is already set for this over" };
    }
    const profileId = (move.data as { playerId?: string } | undefined)?.playerId;
    if (!profileId) return { ok: false, error: "Missing playerId" };
    const bowlingSquad = this.squadFor(innings.bowlingPlayerId);
    if (!bowlingSquad.includes(profileId)) {
      return { ok: false, error: "Selected bowler is not in your squad" };
    }
    if (!this.isGalli()) {
      // Bowler must actually be a bowler or all-rounder (not a pure batter or keeper).
      const teamId = this.state.teamSelections[innings.bowlingPlayerId]?.teamId;
      if (teamId) {
        const pool = getAllPlayersFor(teamId, this.state.options.format);
        const profile = pool.find((p) => p.id === profileId);
        if (profile && profile.role !== "bowler" && profile.role !== "allrounder") {
          return {
            ok: false,
            error: "Only bowlers and all-rounders can bowl",
          };
        }
      }
      // Per-format over quota (T20 = 3, ODI = 4, Test = no limit).
      const maxOvers = HC_MAX_OVERS_PER_BOWLER[this.state.options.format];
      if (maxOvers != null) {
        const stats = innings.bowlerStats[profileId];
        const completedOvers = stats ? Math.floor(stats.balls / 6) : 0;
        if (completedOvers >= maxOvers) {
          return {
            ok: false,
            error: `Bowler has used their ${maxOvers}-over quota`,
          };
        }
      }
    }
    innings.currentBowlerId = profileId;

    // Powerplay: if the upcoming over is inside the powerplay window, pick 3
    // restricted ball positions (1..6) where the bowler will be capped at 1-3.
    const upcomingOverNumber = Math.floor(innings.balls / 6) + 1;
    if (
      upcomingOverNumber <= innings.powerplayOvers &&
      !innings.restrictedBallsByOver[upcomingOverNumber]
    ) {
      innings.restrictedBallsByOver[upcomingOverNumber] = chooseRestrictedBalls();
    }

    return { ok: true };
  }

  private handlePick(move: MoveContext): MoveResult {
    if (this.state.phase !== "innings1" && this.state.phase !== "innings2") {
      return { ok: false, error: "Not in a live innings" };
    }
    const innings = this.currentInnings();
    if (innings.needsNextBatterPick) {
      return { ok: false, error: "Pick your next batter before the next ball" };
    }
    if (innings.currentBowlerId == null) {
      return { ok: false, error: "Bowling team must pick a bowler first" };
    }
    if (
      innings.battingPlayerId !== move.playerId &&
      innings.bowlingPlayerId !== move.playerId
    ) {
      return { ok: false, error: "Not a player in this innings" };
    }
    const pick = (move.data as { pick?: number } | undefined)?.pick;
    if (!pick || !VALID_PICKS.includes(pick)) {
      return { ok: false, error: "Pick must be 1-6" };
    }
    if (this.state.pendingPicks[move.playerId] != null) {
      return { ok: false, error: "You already picked this ball" };
    }
    // Powerplay restriction: bowler may only pick 1-3 on restricted balls.
    if (move.playerId === innings.bowlingPlayerId && this.isUpcomingBallRestricted(innings)) {
      if (pick > 3) {
        return {
          ok: false,
          error: "Powerplay: bowler must pick 1, 2 or 3 on this ball",
        };
      }
    }
    this.state.pendingPicks[move.playerId] = pick;

    const batterPick = this.state.pendingPicks[innings.battingPlayerId];
    const bowlerPick = this.state.pendingPicks[innings.bowlingPlayerId];
    if (batterPick != null && bowlerPick != null) {
      this.resolveBall(innings, batterPick, bowlerPick);
    }
    return { ok: true };
  }

  private handleReorderBatting(move: MoveContext): MoveResult {
    if (this.state.phase !== "innings1" && this.state.phase !== "innings2") {
      return { ok: false, error: "No live innings" };
    }
    const innings = this.currentInnings();
    if (innings.battingPlayerId !== move.playerId) {
      return { ok: false, error: "Only the batting team can reorder" };
    }
    if (innings.endedReason) {
      return { ok: false, error: "Innings has ended" };
    }
    const sel = this.state.teamSelections[move.playerId];
    if (!sel?.squadPlayerIds) return { ok: false, error: "No squad confirmed" };

    const newOrder: unknown = (move.data as { newOrder?: unknown } | undefined)?.newOrder;
    if (!Array.isArray(newOrder) || newOrder.some((x) => typeof x !== "string")) {
      return { ok: false, error: "newOrder must be an array of player ids" };
    }
    const order = newOrder as string[];
    const oldOrder = sel.squadPlayerIds;
    if (order.length !== oldOrder.length) {
      return { ok: false, error: "Player count mismatch" };
    }
    // Positions before nextBatterIdx (already at crease or dismissed) must be unchanged.
    const lockCount = innings.nextBatterIdx;
    for (let i = 0; i < lockCount; i++) {
      if (order[i] !== oldOrder[i]) {
        return { ok: false, error: "Cannot move batters already at or past the crease" };
      }
    }
    // Must contain exactly the same players.
    const oldSet = new Set(oldOrder);
    if (!order.every((id) => oldSet.has(id))) {
      return { ok: false, error: "New order contains unknown players" };
    }
    sel.squadPlayerIds = order;
    return { ok: true };
  }

  private handleSelectNextBatter(move: MoveContext): MoveResult {
    if (this.state.phase !== "innings1" && this.state.phase !== "innings2") {
      return { ok: false, error: "No live innings" };
    }
    const innings = this.currentInnings();
    if (innings.battingPlayerId !== move.playerId) {
      return { ok: false, error: "Only the batting player selects the next batter" };
    }
    if (!innings.needsNextBatterPick) {
      return { ok: false, error: "No wicket is pending a batter selection" };
    }
    if (innings.pendingBatterSlot == null) {
      return { ok: false, error: "Internal error: pending slot missing" };
    }
    const sel = this.state.teamSelections[move.playerId];
    if (!sel?.squadPlayerIds) return { ok: false, error: "No squad confirmed" };

    const profileId = (move.data as { profileId?: string } | undefined)?.profileId;
    if (!profileId) return { ok: false, error: "Missing profileId" };

    const squad = sel.squadPlayerIds;
    const slot = innings.pendingBatterSlot;
    const currentPos = squad.indexOf(profileId);

    if (currentPos === -1) {
      return { ok: false, error: "Player not found in squad" };
    }
    // Batters before `slot` have already batted or are currently at the crease.
    if (currentPos < slot) {
      return { ok: false, error: "That player has already batted or is at the crease" };
    }

    // Swap chosen batter to the reserved slot so strikerIdx points to them.
    if (currentPos !== slot) {
      const newOrder = [...squad];
      [newOrder[slot], newOrder[currentPos]] = [newOrder[currentPos], newOrder[slot]];
      sel.squadPlayerIds = newOrder;
    }

    innings.needsNextBatterPick = false;
    innings.pendingBatterSlot = null;
    return { ok: true };
  }

  private isUpcomingBallRestricted(innings: HcInnings): boolean {
    const upcomingOver = Math.floor(innings.balls / 6) + 1;
    const upcomingBall = (innings.balls % 6) + 1;
    const restricted = innings.restrictedBallsByOver[upcomingOver];
    return !!restricted && restricted.includes(upcomingBall);
  }

  private currentInnings(): HcInnings {
    if (this.state.phase === "innings1") return this.state.innings1!;
    return this.state.innings2!;
  }

  private resolveBall(innings: HcInnings, batterPick: number, bowlerPick: number): void {
    const wicket = batterPick === bowlerPick;
    const runs = wicket ? 0 : batterPick;
    const isBoundary = !wicket && (batterPick === 4 || batterPick === 6);

    // Resolve current striker's profile id from the squad.
    const battingSquad = this.squadFor(innings.battingPlayerId);
    const batterId =
      battingSquad[innings.strikerIdx] ?? `batter-${innings.strikerIdx}`;
    const bowlerId = innings.currentBowlerId ?? "unknown-bowler";

    innings.balls += 1;
    if (wicket) {
      innings.wickets += 1;
    } else {
      innings.runs += runs;
    }

    // Per-player stats — ensure entries exist (defensive for legacy/test paths).
    const bStats = (innings.batterStats[batterId] ??= freshBatterStats());
    bStats.balls += 1;
    bStats.runs += runs;
    if (batterPick === 4 && !wicket) bStats.fours += 1;
    if (batterPick === 6 && !wicket) bStats.sixes += 1;
    if (wicket) {
      bStats.isOut = true;
      bStats.dismissedBy = bowlerId;
    }

    const bowlStats = (innings.bowlerStats[bowlerId] ??= freshBowlerStats());
    bowlStats.balls += 1;
    bowlStats.runs += runs;
    if (wicket) bowlStats.wickets += 1;

    // Compute over/ball-in-over (1-based).
    const overNumber = Math.floor((innings.balls - 1) / 6) + 1;
    const ballInOver = ((innings.balls - 1) % 6) + 1;

    const restrictedThisOver = innings.restrictedBallsByOver[overNumber];
    const isRestrictedBall = !!restrictedThisOver && restrictedThisOver.includes(ballInOver);

    const ball: HcBall = {
      inningsNumber: innings.number,
      overNumber,
      ballInOver,
      batterPick,
      bowlerPick,
      runs,
      wicket,
      isBoundary,
      isRestrictedBall,
      batterId,
      bowlerId,
    };
    innings.history.push(ball);

    // Innings end?
    const target = this.state.innings1 ? this.state.innings1.runs : null;
    const maxBalls = innings.overs * 6;
    let endedReason: HcInningsEndReason | null = null;

    if (innings.wickets >= this.state.maxWickets) {
      endedReason = "allOut";
    } else if (
      this.state.phase === "innings2" &&
      target != null &&
      innings.runs > target
    ) {
      endedReason = "chased";
    } else if (innings.balls >= maxBalls) {
      endedReason = "oversUp";
    }

    if (endedReason) {
      innings.endedReason = endedReason;
      this.endCurrentInnings();
      return;
    }

    // Strike rotation rules:
    //   • Wicket: batting player must manually select the next batter (needsNextBatterPick).
    //             Reserve the incoming slot (strikerIdx = nextBatterIdx) and record it in
    //             pendingBatterSlot so selectNextBatter knows where to put the chosen player.
    //   • Odd runs (1, 3, 5): batters cross — striker and non-striker swap ends.
    //   • End of over: bowler switches end, so striker/non-striker swap mechanically.
    if (wicket) {
      innings.pendingBatterSlot = innings.nextBatterIdx;
      innings.strikerIdx = innings.nextBatterIdx;   // reserve slot; selectNextBatter fills it
      innings.nextBatterIdx += 1;
      innings.needsNextBatterPick = true;
    } else if (runs % 2 === 1) {
      [innings.strikerIdx, innings.nonStrikerIdx] =
        [innings.nonStrikerIdx, innings.strikerIdx];
    }
    if (innings.balls % 6 === 0) {
      [innings.strikerIdx, innings.nonStrikerIdx] =
        [innings.nonStrikerIdx, innings.strikerIdx];
      innings.currentBowlerId = null;
    }

    this.clearPendingPicks();
  }

  private endCurrentInnings(): void {
    if (this.state.phase === "innings1") {
      const i1 = this.state.innings1!;
      // Swap roles for innings 2.
      this.state.innings2 = freshInnings(
        2,
        i1.bowlingPlayerId,
        i1.battingPlayerId,
        this.state.oversPerInnings,
        this.powerplayOversForCurrentMatch(),
        this.squadFor(i1.bowlingPlayerId),
        this.squadFor(i1.battingPlayerId),
      );
      this.state.phase = "innings2";
      this.clearPendingPicks();
      return;
    }
    // Innings 2 done — finalize.
    this.state.phase = "finished";
    this.clearPendingPicks();
    const i1 = this.state.innings1!;
    const i2 = this.state.innings2!;
    let winnerId: string | null = null;
    let result: HcResult | null = null;
    if (i2.runs > i1.runs) {
      winnerId = i2.battingPlayerId;
      result = "win";
    } else if (i2.runs < i1.runs) {
      winnerId = i1.battingPlayerId;
      result = "win";
    } else {
      winnerId = null;
      result = "tie";
    }
    this.state.winnerId = winnerId;
    this.state.result = result;
  }

  private clearPendingPicks(): void {
    for (const id of this.state.playerOrder) {
      this.state.pendingPicks[id] = null;
    }
  }

  getStateFor(playerId: string): unknown {
    // Mask opponent's pending pick and toss pick (use -1 sentinel = "locked in but hidden").
    const maskedToss: Record<string, number | null> = { ...this.state.tossPicks };
    const maskedPending: Record<string, number | null> = { ...this.state.pendingPicks };
    if (this.state.phase === "toss") {
      for (const id of Object.keys(maskedToss)) {
        if (id !== playerId) maskedToss[id] = maskedToss[id] != null ? -1 : null;
      }
    }
    if (this.state.phase === "innings1" || this.state.phase === "innings2") {
      for (const id of Object.keys(maskedPending)) {
        if (id !== playerId) maskedPending[id] = maskedPending[id] != null ? -1 : null;
      }
    }
    return {
      ...this.state,
      tossPicks: maskedToss,
      pendingPicks: maskedPending,
    };
  }

  getPublicState(): unknown {
    return this.state;
  }

  isOver(): boolean {
    return this.state.phase === "finished";
  }

  removePlayer(playerId: string): void {
    if (!this.state.playerOrder.includes(playerId)) return;
    if (this.state.phase === "finished") return;
    const opponent = this.state.playerOrder.find((id) => id !== playerId) ?? null;
    this.state.phase = "finished";
    this.state.winnerId = opponent;
    this.state.result = opponent ? "win" : null;
  }

  /* ── Bot support ──
   *
   * Hand Cricket has 5 phases (teamSelect → toss → tossChoice → innings1 →
   * innings2). The bot needs to make moves in every one. Decisions are
   * intentionally naïve — a bot here exists to keep the match flowing, not
   * to play well. Improve heuristics later.
   */

  pendingActors(): string[] {
    if (this.state.phase === "finished") return [];
    const out: string[] = [];
    switch (this.state.phase) {
      case "teamSelect":
        for (const pid of this.state.playerOrder) {
          const sel = this.state.teamSelections[pid];
          if (!sel?.squadPlayerIds) out.push(pid);
        }
        return out;
      case "toss":
        for (const pid of this.state.playerOrder) {
          if (this.state.tossPicks[pid] == null) out.push(pid);
        }
        return out;
      case "tossChoice":
        if (this.state.tossWinnerId) out.push(this.state.tossWinnerId);
        return out;
      case "innings1":
      case "innings2": {
        const innings = this.currentInnings();
        // When a wicket has fallen, the batting player must pick the next batter.
        // The bowling player may still need to pick a bowler (end of over concurrent).
        if (innings.needsNextBatterPick) {
          out.push(innings.battingPlayerId);
          if (innings.currentBowlerId == null) out.push(innings.bowlingPlayerId);
          return out;
        }
        if (innings.currentBowlerId == null) {
          out.push(innings.bowlingPlayerId);
          return out;
        }
        // Both batter and bowler pick on each ball.
        if (this.state.pendingPicks[innings.battingPlayerId] == null) {
          out.push(innings.battingPlayerId);
        }
        if (this.state.pendingPicks[innings.bowlingPlayerId] == null) {
          out.push(innings.bowlingPlayerId);
        }
        return out;
      }
    }
    return out;
  }

  applyAutoMove(playerId: string): MoveResult {
    if (!this.state.playerOrder.includes(playerId)) {
      return { ok: false, error: "Not a player" };
    }
    switch (this.state.phase) {
      case "teamSelect":
        return this.botTeamSelect(playerId);
      case "toss":
        return this.botTossPick(playerId);
      case "tossChoice":
        return this.botTossChoice(playerId);
      case "innings1":
      case "innings2":
        return this.botInningsMove(playerId);
      default:
        return { ok: false, error: "Nothing to do" };
    }
  }

  private botTeamSelect(playerId: string): MoveResult {
    const sel = this.state.teamSelections[playerId];
    if (!sel) {
      // Pick a default team based on category. Galli mode treats any team
      // as fine — we use India here too, the squad pool is shared.
      const defaultTeam: HcTeamId =
        this.state.options.category === "ipl" ? "csk" : "india";
      const r = this.applyMove({
        playerId,
        type: "selectTeam",
        data: { teamId: defaultTeam },
      });
      if (!r.ok) return r;
    }
    const final = this.state.teamSelections[playerId];
    if (!final?.teamId) return { ok: false, error: "Team picker failed" };
    if (final.squadPlayerIds) return { ok: false, error: "Squad already confirmed" };
    const squad = this.pickDefaultSquad(final.teamId);
    // Pick captain + vice-captain. Prefer roster-tagged captain (isCaptain).
    // Fallbacks: first all-rounder, then first batter, then first in squad.
    const pool = getAllPlayersFor(final.teamId, this.state.options.format);
    const profilesIn = squad
      .map((id) => pool.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => !!p);
    const pickByPredicate = (
      pred: (p: (typeof profilesIn)[number]) => boolean,
      exclude: string | null = null,
    ): string | null => {
      const hit = profilesIn.find((p) => p.id !== exclude && pred(p));
      return hit?.id ?? null;
    };
    const captainId =
      pickByPredicate((p) => !!p.isCaptain) ??
      pickByPredicate((p) => p.role === "allrounder") ??
      pickByPredicate((p) => p.role === "batter") ??
      squad[0] ?? null;
    const viceCaptainId =
      pickByPredicate((p) => p.role === "allrounder", captainId) ??
      pickByPredicate((p) => p.role === "batter", captainId) ??
      pickByPredicate(() => true, captainId) ??
      squad.find((id) => id !== captainId) ??
      null;
    if (!captainId || !viceCaptainId) {
      return { ok: false, error: "Bot could not pick captain/VC" };
    }
    return this.applyMove({
      playerId,
      type: "confirmSquad",
      data: { playerIds: squad, captainId, viceCaptainId },
    });
  }

  /**
   * Greedy 11-pick that satisfies the composition rules — 1 keeper, ≥4
   * bowling options, total = 11. Falls back to "first 11" in galli where
   * composition isn't validated.
   */
  private pickDefaultSquad(teamId: HcTeamId): string[] {
    const pool = getAllPlayersFor(teamId, this.state.options.format);
    if (pool.length === 0) return [];
    if (this.isGalli()) return pool.slice(0, Math.min(11, pool.length)).map((p) => p.id);

    const keepers = pool.filter((p) => p.role === "keeper");
    const bowlers = pool.filter((p) => p.role === "bowler");
    const allrounders = pool.filter((p) => p.role === "allrounder");
    const batters = pool.filter((p) => p.role === "batter");

    const picked = new Set<string>();
    const add = (ids: string[], limit: number) => {
      for (const id of ids) {
        if (picked.size >= 11) return;
        if (limit <= 0) return;
        if (!picked.has(id)) {
          picked.add(id);
          limit -= 1;
        }
      }
    };
    add(keepers.slice(0, 1).map((p) => p.id), 1);                // 1 keeper
    add(bowlers.slice(0, 4).map((p) => p.id), 4);                // 4 bowlers
    add(allrounders.map((p) => p.id), 11 - picked.size);          // allrounders fill bowling options
    add(batters.map((p) => p.id), 11 - picked.size);              // batters round out the XI
    // Fallback fill if pool is thin
    add(pool.map((p) => p.id), 11 - picked.size);
    return [...picked];
  }

  private botTossPick(playerId: string): MoveResult {
    const pick = 1 + Math.floor(Math.random() * 6);
    return this.applyMove({ playerId, type: "tossPick", data: { pick } });
  }

  private botTossChoice(playerId: string): MoveResult {
    // Slight preference for batting — easier to chase a small total against a
    // human, easier to set one if the bot is up first. Pure heuristic.
    const choice = Math.random() < 0.55 ? "bat" : "bowl";
    return this.applyMove({ playerId, type: "tossChoice", data: { choice } });
  }

  private botInningsMove(playerId: string): MoveResult {
    const innings = this.currentInnings();
    // 0. If a wicket just fell and this bot is the batting player → auto-pick
    //    the next batter in squad order (same as the old auto-advance behaviour).
    if (innings.needsNextBatterPick && playerId === innings.battingPlayerId) {
      const sel = this.state.teamSelections[playerId];
      const slot = innings.pendingBatterSlot;
      if (sel?.squadPlayerIds && slot != null && slot < sel.squadPlayerIds.length) {
        return this.applyMove({
          playerId,
          type: "selectNextBatter",
          data: { profileId: sel.squadPlayerIds[slot] },
        });
      }
      return { ok: false, error: "Bot: no batter available for auto-pick" };
    }
    // 1. If bowler isn't picked yet AND we're the bowling team → pick a bowler.
    if (innings.currentBowlerId == null) {
      if (playerId !== innings.bowlingPlayerId) {
        return { ok: false, error: "Waiting for opponent to pick bowler" };
      }
      const bowler = this.pickDefaultBowler(playerId, innings);
      if (!bowler) return { ok: false, error: "No bowler available" };
      return this.applyMove({
        playerId,
        type: "selectBowler",
        data: { playerId: bowler },
      });
    }
    // 2. Pick a number 1-6 with awareness of opponent patterns + match context.
    const isBowler = playerId === innings.bowlingPlayerId;
    const isPowerplayRestricted = isBowler && this.isUpcomingBallRestricted(innings);
    const allowed = isPowerplayRestricted ? [1, 2, 3] : [1, 2, 3, 4, 5, 6];
    const pick = this.chooseSmartPick(playerId, innings, isBowler, allowed);
    return this.applyMove({ playerId, type: "pick", data: { pick } });
  }

  /**
   * Smart pick selection:
   *   • Look at the opponent's last few picks in this innings.
   *   • Bowler tries to MATCH the batter's most-frequent recent pick
   *     (a match = wicket). Batter tries to AVOID the bowler's most-frequent
   *     recent pick (a match = out).
   *   • Layer match-context bias on top:
   *       - Batter chasing a tight target → lean toward 4/5/6.
   *       - Bowler defending a small total → bias picks toward common boundary
   *         values to convert big shots into wickets.
   *   • Pick weights are mixed with a uniform floor so the bot stays
   *     unpredictable — pure pattern-matching is easy to exploit.
   */
  private chooseSmartPick(
    playerId: string,
    innings: HcInnings,
    isBowler: boolean,
    allowed: number[],
  ): number {
    const opponentId = isBowler ? innings.battingPlayerId : innings.bowlingPlayerId;
    // Last up to 6 picks from this opponent in the current innings.
    const recent: number[] = [];
    for (let i = innings.history.length - 1; i >= 0 && recent.length < 6; i--) {
      const ball = innings.history[i];
      const pick = isBowler ? ball.batterPick : ball.bowlerPick;
      if (Number.isInteger(pick)) recent.push(pick);
      void opponentId; // playerId disambiguation; history is already innings-scoped.
    }

    const freq = new Map<number, number>();
    for (const v of recent) freq.set(v, (freq.get(v) ?? 0) + 1);

    // Base weights: floor of 1 so every allowed pick stays reachable.
    const weights = new Map<number, number>();
    for (const v of allowed) weights.set(v, 1);

    if (isBowler) {
      // Match the batter — heavier weight where the batter is most predictable.
      for (const [v, c] of freq) {
        if (!allowed.includes(v)) continue;
        weights.set(v, (weights.get(v) ?? 1) + c * 1.4);
      }
    } else {
      // Avoid the bowler — lighter weight where the bowler keeps picking.
      // We don't drop to zero; just reduce. Then add weight to picks the
      // bowler has been cold on.
      for (const [v, c] of freq) {
        if (!allowed.includes(v)) continue;
        weights.set(v, Math.max(0.2, (weights.get(v) ?? 1) - c * 0.5));
      }
      for (const v of allowed) {
        const c = freq.get(v) ?? 0;
        if (c === 0) weights.set(v, (weights.get(v) ?? 1) + 0.8);
      }
    }

    // Match-context bias.
    const target =
      this.state.innings1 && innings.number === 2
        ? this.state.innings1.runs + 1
        : null;
    const ballsLeft = innings.overs * 6 - innings.balls;
    const runsNeeded = target != null ? target - innings.runs : null;
    const requiredRate = runsNeeded != null && ballsLeft > 0 ? runsNeeded / ballsLeft : null;
    if (!isBowler) {
      // Batting bias: more aggressive when run-rate demands it.
      if (requiredRate != null) {
        if (requiredRate >= 1.5) {
          weights.set(6, (weights.get(6) ?? 1) * 1.6);
          weights.set(5, (weights.get(5) ?? 1) * 1.4);
          weights.set(4, (weights.get(4) ?? 1) * 1.3);
        } else if (requiredRate >= 1.0) {
          weights.set(4, (weights.get(4) ?? 1) * 1.25);
          weights.set(6, (weights.get(6) ?? 1) * 1.2);
        }
      }
    } else {
      // Bowling bias when defending a small total: tilt toward boundary values
      // so wickets are more likely when the batter swings for the fence.
      if (
        innings.number === 2 &&
        target != null &&
        target - innings.runs <= 30 &&
        ballsLeft > 0
      ) {
        weights.set(6, (weights.get(6) ?? 1) * 1.35);
        weights.set(4, (weights.get(4) ?? 1) * 1.2);
      }
    }

    // Weighted sample.
    let total = 0;
    for (const v of allowed) total += weights.get(v) ?? 0;
    if (total <= 0) {
      return allowed[Math.floor(Math.random() * allowed.length)];
    }
    let r = Math.random() * total;
    for (const v of allowed) {
      r -= weights.get(v) ?? 0;
      if (r <= 0) return v;
    }
    return allowed[allowed.length - 1];
  }

  /**
   * Pick a bowler from the bowling team's squad that satisfies the over-quota.
   * Galli skips role / quota checks entirely.
   */
  private pickDefaultBowler(playerId: string, innings: HcInnings): string | null {
    const squad = this.squadFor(playerId);
    if (squad.length === 0) return null;
    if (this.isGalli()) {
      // Galli: rotate through the squad
      return squad[Math.floor(Math.random() * squad.length)];
    }
    const teamId = this.state.teamSelections[playerId]?.teamId;
    if (!teamId) return squad[0];
    const pool = getAllPlayersFor(teamId, this.state.options.format);
    const maxOvers = HC_MAX_OVERS_PER_BOWLER[this.state.options.format];
    const eligible = squad
      .map((id) => pool.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => !!p)
      .filter((p) => p.role === "bowler" || p.role === "allrounder")
      .filter((p) => {
        if (maxOvers == null) return true;
        const stats = innings.bowlerStats[p.id];
        const completed = stats ? Math.floor(stats.balls / 6) : 0;
        return completed < maxOvers;
      });
    if (eligible.length === 0) return null;
    return eligible[Math.floor(Math.random() * eligible.length)].id;
  }
}
