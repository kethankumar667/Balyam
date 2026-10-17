import type { ChatMessage, Player, VamanaPublicState } from "@shared/types.js";

export interface VamanaBoardProps {
  state: VamanaPublicState;
  players: Player[];
  selfId: string;
  messages: ChatMessage[];
  roomCode: string;
  roomPhase?: string;
  onLeave: () => void;
  onScorecardClose?: () => void;
}
