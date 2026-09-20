import type { ChatMessage, Player, Connect4PublicState } from "@shared/types.js";

export interface Connect4BoardProps {
  state: Connect4PublicState;
  players: Player[];
  selfId: string;
  messages: ChatMessage[];
  roomCode: string;
  roomPhase?: string;
  onLeave: () => void;
  onScorecardClose?: () => void;
}
