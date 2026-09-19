import type { ChatMessage, Player, TicTacToePublicState } from "@shared/types.js";

export interface TicTacToeBoardProps {
  state: TicTacToePublicState;
  players: Player[];
  selfId: string;
  messages: ChatMessage[];
  roomCode: string;
  roomPhase?: string;
  onLeave: () => void;
  onScorecardClose?: () => void;
}
