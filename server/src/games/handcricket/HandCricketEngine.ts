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
    //   • Wicket: striker is out; bring in the next batter (non-striker stays put).
    //   • Odd runs (1, 3, 5): batters cross — striker and non-striker swap ends.
    //   • End of over: bowler switches end, so striker/non-striker swap mechanically.
    if (wicket) {
      innings.strikerIdx = innings.nextBatterIdx;
      innings.nextBatterIdx += 1;
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
    // 2. Otherwise: pick a number 1-6.
    let pick = 1 + Math.floor(Math.random() * 6);
    if (
      playerId === innings.bowlingPlayerId &&
      this.isUpcomingBallRestricted(innings)
    ) {
      // Powerplay restriction: bowler must pick 1-3 on restricted balls.
      pick = 1 + Math.floor(Math.random() * 3);
    }
    return this.applyMove({ playerId, type: "pick", data: { pick } });
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
