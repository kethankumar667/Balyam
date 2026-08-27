/**
 * BHALYAM Economy Motion System — Type Definitions & State Contracts.
 *
 * Implements the state machine contracts, coordinate targets, idempotency keys,
 * and string-safe payload types for the 5 lifecycle motion chapters:
 * 1. Match Commitment
 * 2. Game Start
 * 3. Settlement Payout
 * 4. Refund Reversal
 * 5. Guest Escrow
 */

export type EconomyMotionPhase =
  | "idle"
  | "awaiting_authority"
  | "commitment_confirmed"
  | "coins_departing"
  | "seats_funded"
  | "pot_formed"
  | "game_starting"
  | "result_pending"
  | "settled"
  | "refunded"
  | "escrowed"
  | "failed"
  | "complete";

export type MotionIntensity = "full" | "reduced" | "disabled";

export interface Point2D {
  x: number;
  y: number;
}

export interface CoinFlightParticle {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  delay: number;
  duration: number;
  curveOffset: number;
  scale: number;
}

export interface ParticipantSeatTarget {
  seatId: string;
  seatNumber: number;
  playerId?: string;
  name: string;
  isHost?: boolean;
  isBot?: boolean;
  isSelf?: boolean;
  isWinner?: boolean;
  /** Screen bounding rectangle for coordinate targeting */
  point?: Point2D;
}

export interface MatchCommitmentMotionPayload {
  sequenceId: string;
  matchId: string;
  amountPerSeat: string; // Strictly string (BigInt-safe)
  totalPotAmount: string; // Strictly string (BigInt-safe)
  seats: ParticipantSeatTarget[];
  hostWalletPoint?: Point2D;
  potPoint?: Point2D;
}

export interface MatchSettlementWinnerPayout {
  playerId: string;
  name: string;
  payoutAmount: string; // Strictly string
  isSelf: boolean;
  targetPoint?: Point2D;
}

export interface MatchSettlementMotionPayload {
  sequenceId: string;
  matchId: string;
  totalPotAmount: string;
  winners: MatchSettlementWinnerPayout[];
  worldBankFeeAmount?: string;
  isGuestWinner?: boolean;
  potPoint?: Point2D;
  walletPoint?: Point2D;
}

export interface MatchRefundMotionPayload {
  sequenceId: string;
  matchId: string;
  refundAmount: string;
  reason: string;
  potPoint?: Point2D;
  walletPoint?: Point2D;
}

export interface GuestEscrowMotionPayload {
  sequenceId: string;
  matchId: string;
  voucherAmount: string;
  voucherCode?: string;
  potPoint?: Point2D;
  voucherPoint?: Point2D;
}

export interface OptionalSoundHooks {
  onCommitSound?: () => void;
  onCoinClinkSound?: () => void;
  onPotFormSound?: () => void;
  onWinFanfareSound?: () => void;
  onRefundSound?: () => void;
  onEscrowSound?: () => void;
  onErrorSound?: () => void;
}
