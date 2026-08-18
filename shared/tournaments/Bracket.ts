import type { TournamentParticipant } from "./Tournament";

export type MatchStatus = "PENDING" | "READY" | "IN_PROGRESS" | "COMPLETED" | "BYE";

export interface BracketMatch {
  matchId: string;
  roundNumber: number;
  matchNumber: number;
  player1: TournamentParticipant | null;
  player2: TournamentParticipant | null;
  winnerId: string | null;
  score1: number;
  score2: number;
  roomCode?: string;
  status: MatchStatus;
  nextMatchId?: string;
  isThirdPlaceMatch?: boolean;
  spectatorsAllowed: boolean;
}

export interface BracketRound {
  roundNumber: number;
  name: string;
  matches: BracketMatch[];
}

export interface TournamentBracket {
  tournamentId: string;
  rounds: BracketRound[];
}
