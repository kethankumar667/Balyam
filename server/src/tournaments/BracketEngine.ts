import type {
  TournamentBracket,
  BracketRound,
  BracketMatch,
} from "@shared/tournaments/Bracket.js";
import type { TournamentParticipant } from "@shared/tournaments/Tournament.js";

export class BracketEngine {
  /**
   * Generates a deterministic single-elimination tournament bracket.
   */
  public static generateBracket(
    tournamentId: string,
    participants: TournamentParticipant[],
    autoAdvanceByes = true
  ): TournamentBracket {
    const count = participants.length;
    const bracketSize = this.getNextPowerOfTwo(Math.max(4, count));
    const totalRounds = Math.log2(bracketSize);

    // Seeded array padded with null for Byes
    const seededPlayers: Array<TournamentParticipant | null> = [...participants];
    while (seededPlayers.length < bracketSize) {
      seededPlayers.push(null);
    }

    const rounds: BracketRound[] = [];

    // Create empty rounds skeleton
    for (let r = 1; r <= totalRounds; r++) {
      const roundMatchesCount = bracketSize / Math.pow(2, r);
      const roundName = this.getRoundName(r, totalRounds);
      rounds.push({
        roundNumber: r,
        name: roundName,
        matches: [],
      });
    }

    // Build Round 1 matches
    const round1MatchesCount = bracketSize / 2;
    for (let m = 0; m < round1MatchesCount; m++) {
      const p1 = seededPlayers[m * 2] || null;
      const p2 = seededPlayers[m * 2 + 1] || null;
      const matchId = `match_${tournamentId}_r1_m${m + 1}`;

      const nextRoundIndex = 1;
      const nextMatchIndex = Math.floor(m / 2) + 1;
      const nextMatchId =
        totalRounds > 1 ? `match_${tournamentId}_r2_m${nextMatchIndex}` : undefined;

      const isBye = !p1 || !p2;
      const winnerId = isBye ? (p1 ? p1.playerId : p2 ? p2.playerId : null) : null;
      const status = isBye && autoAdvanceByes ? "BYE" : p1 && p2 ? "READY" : "PENDING";

      const match: BracketMatch = {
        matchId,
        roundNumber: 1,
        matchNumber: m + 1,
        player1: p1,
        player2: p2,
        winnerId,
        score1: 0,
        score2: 0,
        status,
        nextMatchId,
        spectatorsAllowed: true,
      };

      rounds[0]!.matches.push(match);
    }

    // Build subsequent rounds skeletons (Round 2 to Finals)
    for (let r = 2; r <= totalRounds; r++) {
      const matchesCount = bracketSize / Math.pow(2, r);
      const isFinal = r === totalRounds;

      for (let m = 0; m < matchesCount; m++) {
        const matchId = `match_${tournamentId}_r${r}_m${m + 1}`;
        const nextMatchIndex = Math.floor(m / 2) + 1;
        const nextMatchId = !isFinal
          ? `match_${tournamentId}_r${r + 1}_m${nextMatchIndex}`
          : undefined;

        const match: BracketMatch = {
          matchId,
          roundNumber: r,
          matchNumber: m + 1,
          player1: null,
          player2: null,
          winnerId: null,
          score1: 0,
          score2: 0,
          status: "PENDING",
          nextMatchId,
          spectatorsAllowed: true,
        };

        rounds[r - 1]!.matches.push(match);
      }
    }

    const bracket: TournamentBracket = { tournamentId, rounds };

    // Auto-advance byes to subsequent rounds if applicable
    if (autoAdvanceByes) {
      for (const m of rounds[0]!.matches) {
        if (m.status === "BYE" && m.winnerId && m.nextMatchId) {
          const winnerParticipant = m.player1?.playerId === m.winnerId ? m.player1 : m.player2;
          if (winnerParticipant) {
            this.propagateWinnerToNextMatch(bracket, m.nextMatchId, winnerParticipant, m.matchNumber % 2 === 1 ? 1 : 2);
          }
        }
      }
    }

    return bracket;
  }

  /**
   * Advances match outcome and progresses winner to the next round match.
   */
  public static advanceWinner(
    bracket: TournamentBracket,
    matchId: string,
    winnerId: string,
    score1 = 0,
    score2 = 0
  ): {
    success: boolean;
    isTournamentOver: boolean;
    championId?: string;
    runnerUpId?: string;
    nextMatch?: BracketMatch;
  } {
    let targetMatch: BracketMatch | undefined;
    let roundIndex = -1;

    for (let r = 0; r < bracket.rounds.length; r++) {
      const match = bracket.rounds[r]!.matches.find((m) => m.matchId === matchId);
      if (match) {
        targetMatch = match;
        roundIndex = r;
        break;
      }
    }

    if (!targetMatch) return { success: false, isTournamentOver: false };

    const winner =
      targetMatch.player1?.playerId === winnerId
        ? targetMatch.player1
        : targetMatch.player2?.playerId === winnerId
        ? targetMatch.player2
        : null;

    if (!winner) return { success: false, isTournamentOver: false };

    const loser =
      targetMatch.player1?.playerId === winnerId
        ? targetMatch.player2
        : targetMatch.player1;

    targetMatch.winnerId = winnerId;
    targetMatch.score1 = score1;
    targetMatch.score2 = score2;
    targetMatch.status = "COMPLETED";

    const isFinalRound = roundIndex === bracket.rounds.length - 1;
    if (isFinalRound) {
      return {
        success: true,
        isTournamentOver: true,
        championId: winner.playerId,
        runnerUpId: loser?.playerId,
      };
    }

    if (targetMatch.nextMatchId) {
      const slot = targetMatch.matchNumber % 2 === 1 ? 1 : 2;
      const nextMatch = this.propagateWinnerToNextMatch(
        bracket,
        targetMatch.nextMatchId,
        winner,
        slot
      );
      return {
        success: true,
        isTournamentOver: false,
        nextMatch,
      };
    }

    return { success: true, isTournamentOver: false };
  }

  private static propagateWinnerToNextMatch(
    bracket: TournamentBracket,
    nextMatchId: string,
    winner: TournamentParticipant,
    slot: 1 | 2
  ): BracketMatch | undefined {
    for (const round of bracket.rounds) {
      const match = round.matches.find((m) => m.matchId === nextMatchId);
      if (match) {
        if (slot === 1) {
          match.player1 = winner;
        } else {
          match.player2 = winner;
        }

        if (match.player1 && match.player2) {
          match.status = "READY";
        }
        return match;
      }
    }
    return undefined;
  }

  private static getNextPowerOfTwo(n: number): number {
    return Math.pow(2, Math.ceil(Math.log2(n)));
  }

  private static getRoundName(round: number, totalRounds: number): string {
    const fromFinal = totalRounds - round;
    if (fromFinal === 0) return "Finals";
    if (fromFinal === 1) return "Semifinals";
    if (fromFinal === 2) return "Quarterfinals";
    return `Round ${round}`;
  }
}
