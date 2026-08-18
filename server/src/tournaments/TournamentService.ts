import type { GameKind } from "@shared/types.js";
import {
  type Tournament,
  type TournamentParticipant,
  type TournamentConfig,
  type TournamentStatus,
  type TournamentHistoryItem,
  DEFAULT_TOURNAMENT_CONFIG,
  DEFAULT_TOURNAMENT_REWARDS,
} from "@shared/tournaments/Tournament.js";
import type { TournamentBracket } from "@shared/tournaments/Bracket.js";
import { TournamentEngine } from "./TournamentEngine.js";
import { BracketEngine } from "./BracketEngine.js";
import { seasonService } from "../seasons/SeasonService.js";
import { XPEngine } from "../ranking/XPEngine.js";
import { profileService } from "../profile/ProfileService.js";
import { logger } from "../lib/logger.js";

export class TournamentService {
  private tournaments = new Map<string, Tournament>();
  private brackets = new Map<string, TournamentBracket>();
  private playerHistory = new Map<string, TournamentHistoryItem[]>();

  constructor() {
    this.seedDefaultTournaments();
  }

  /**
   * Creates a new tournament.
   */
  public createTournament(params: {
    title: string;
    description: string;
    game: GameKind;
    config?: Partial<TournamentConfig>;
    createdBy?: string;
    startsAt?: number;
  }): Tournament {
    const id = `tourney_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const currentSeason = seasonService.getCurrentSeason();

    const tournament: Tournament = {
      id,
      title: params.title,
      description: params.description,
      game: params.game,
      type: "SINGLE_ELIMINATION",
      status: "REGISTRATION_OPEN",
      config: { ...DEFAULT_TOURNAMENT_CONFIG, ...(params.config || {}) },
      seasonId: currentSeason.id,
      participants: [],
      currentRound: 0,
      totalRounds: 0,
      startsAt: params.startsAt || Date.now() + 3600000,
      createdAt: Date.now(),
      createdBy: params.createdBy || "system",
      rewards: [...DEFAULT_TOURNAMENT_REWARDS],
    };

    this.tournaments.set(id, tournament);
    logger.info({ message: `Tournament created: ${tournament.title} (${tournament.id})`, module: "TOURNAMENT" });

    return tournament;
  }

  /**
   * Retrieves list of tournaments with optional filtering.
   */
  public getTournaments(filter?: { game?: GameKind; status?: TournamentStatus }): Tournament[] {
    let list = Array.from(this.tournaments.values());
    if (filter?.game) list = list.filter((t) => t.game === filter.game);
    if (filter?.status) list = list.filter((t) => t.status === filter.status);
    list.sort((a, b) => b.createdAt - a.createdAt);
    return list;
  }

  public getTournament(id: string): Tournament | undefined {
    return this.tournaments.get(id);
  }

  public getBracket(tournamentId: string): TournamentBracket | undefined {
    return this.brackets.get(tournamentId);
  }

  /**
   * Registers a player for a tournament.
   */
  public registerPlayer(
    tournamentId: string,
    player: { playerId: string; displayName: string; avatar?: string }
  ): { success: boolean; error?: string } {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return { success: false, error: "Tournament not found" };

    if (tournament.status !== "REGISTRATION_OPEN") {
      return { success: false, error: `Registration is not open (current status: ${tournament.status})` };
    }

    if (tournament.participants.length >= tournament.config.maxPlayers) {
      return { success: false, error: "Tournament is at maximum capacity" };
    }

    const alreadyRegistered = tournament.participants.some((p) => p.playerId === player.playerId);
    if (alreadyRegistered) {
      return { success: false, error: "Player already registered" };
    }

    const participant: TournamentParticipant = {
      playerId: player.playerId,
      displayName: player.displayName,
      avatar: player.avatar,
      seed: tournament.participants.length + 1,
      checkedIn: !tournament.config.checkInRequired,
      status: tournament.config.checkInRequired ? "REGISTERED" : "CHECKED_IN",
    };

    tournament.participants.push(participant);
    logger.info({ message: `Player ${player.displayName} registered for ${tournament.title}`, module: "TOURNAMENT" });

    return { success: true };
  }

  /**
   * Checks in a registered player.
   */
  public checkInPlayer(tournamentId: string, playerId: string): { success: boolean; error?: string } {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return { success: false, error: "Tournament not found" };

    const participant = tournament.participants.find((p) => p.playerId === playerId);
    if (!participant) return { success: false, error: "Player is not registered" };

    participant.checkedIn = true;
    participant.status = "CHECKED_IN";
    return { success: true };
  }

  /**
   * Starts tournament and generates bracket.
   */
  public startTournament(tournamentId: string): { success: boolean; error?: string; bracket?: TournamentBracket } {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return { success: false, error: "Tournament not found" };

    if (tournament.status === "IN_PROGRESS") {
      return { success: false, error: "Tournament already in progress" };
    }

    if (tournament.config.checkInRequired) {
      TournamentEngine.processCheckIns(tournament);
    }

    const activeParticipants = tournament.participants.filter(
      (p) => p.status === "ACTIVE" || p.status === "CHECKED_IN"
    );

    if (activeParticipants.length < tournament.config.minPlayers) {
      return {
        success: false,
        error: `Insufficient checked-in participants (${activeParticipants.length}/${tournament.config.minPlayers})`,
      };
    }

    const bracket = BracketEngine.generateBracket(
      tournament.id,
      activeParticipants,
      tournament.config.autoAdvanceByes
    );

    tournament.status = "IN_PROGRESS";
    tournament.currentRound = 1;
    tournament.totalRounds = bracket.rounds.length;

    this.brackets.set(tournament.id, bracket);
    logger.info({ message: `Tournament started: ${tournament.title} with ${activeParticipants.length} players`, module: "TOURNAMENT" });

    return { success: true, bracket };
  }

  /**
   * Reports match outcome and advances winner in bracket.
   */
  public reportMatchResult(
    tournamentId: string,
    matchId: string,
    winnerId: string,
    score1 = 1,
    score2 = 0
  ): {
    success: boolean;
    isTournamentOver: boolean;
    championId?: string;
    bracket?: TournamentBracket;
  } {
    const tournament = this.tournaments.get(tournamentId);
    const bracket = this.brackets.get(tournamentId);

    if (!tournament || !bracket) return { success: false, isTournamentOver: false };

    const advanceResult = BracketEngine.advanceWinner(bracket, matchId, winnerId, score1, score2);

    if (advanceResult.isTournamentOver && advanceResult.championId) {
      tournament.status = "FINISHED";
      tournament.championId = advanceResult.championId;
      tournament.runnerUpId = advanceResult.runnerUpId;
      tournament.endsAt = Date.now();

      this.distributeRewards(tournament, advanceResult.championId, advanceResult.runnerUpId);
    }

    return {
      success: advanceResult.success,
      isTournamentOver: advanceResult.isTournamentOver,
      championId: advanceResult.championId,
      bracket,
    };
  }

  /**
   * Distributes XP, badges, and records tournament history for participants.
   */
  private distributeRewards(tournament: Tournament, championId: string, runnerUpId?: string): void {
    for (const p of tournament.participants) {
      let placement = 4; // Participant
      if (p.playerId === championId) placement = 1;
      else if (p.playerId === runnerUpId) placement = 2;

      const reward = tournament.rewards.find((r) => r.placement === placement) || tournament.rewards[3]!;

      // 1. Award XP to lifetime profile
      XPEngine.awardChallengeXP(p.playerId, reward.xp);

      // 2. Award seasonal XP and stats
      seasonService.recordSeasonMatch(p.playerId, {
        isWin: placement === 1,
        earnedXP: reward.xp,
        isTournamentWin: placement === 1,
      });

      // 3. Record tournament history
      const historyItem: TournamentHistoryItem = {
        tournamentId: tournament.id,
        tournamentName: tournament.title,
        game: tournament.game,
        placement,
        participatedAt: Date.now(),
        prizeXP: reward.xp,
        badge: reward.badge,
      };

      let histList = this.playerHistory.get(p.playerId);
      if (!histList) {
        histList = [];
        this.playerHistory.set(p.playerId, histList);
      }
      histList.push(historyItem);
    }
  }

  /**
   * Retrieves tournament history for a player.
   */
  public getPlayerTournamentHistory(playerId: string): TournamentHistoryItem[] {
    return this.playerHistory.get(playerId) || [];
  }

  private seedDefaultTournaments(): void {
    this.createTournament({
      title: "Ludo Grand Prix — Weekly Open",
      description: "Fast-paced 8-player knockout championship with double XP rewards.",
      game: "ludo",
      config: { minPlayers: 4, maxPlayers: 8, checkInRequired: false },
    });

    this.createTournament({
      title: "Rummy Masters Invitational",
      description: "Compete against elite card strategists in a high-stakes bracket.",
      game: "rummy",
      config: { minPlayers: 4, maxPlayers: 16, checkInRequired: false },
    });

    this.createTournament({
      title: "UNO Color Clash Blitz",
      description: "Lightning single-elimination tournament for speed card masters.",
      game: "uno",
      config: { minPlayers: 4, maxPlayers: 8, checkInRequired: false },
    });
  }

  public reset(): void {
    this.tournaments.clear();
    this.brackets.clear();
    this.playerHistory.clear();
    this.seedDefaultTournaments();
  }
}

export const tournamentService = new TournamentService();
