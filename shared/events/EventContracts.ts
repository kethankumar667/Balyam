import type { EventType, EventPayloadMap } from "./EventTypes.js";

/**
 * Immutable Domain Event Contract for BHALYAM Event Sourcing.
 * Represents an immutable fact that occurred in a room.
 */
export interface DomainEvent<TKey extends EventType = EventType> {
  /** Unique immutable event identifier (monotonic timestamp + uuid) */
  id: string;
  /** Unix timestamp in milliseconds when the event was recorded */
  timestamp: number;
  /** Normalized room code where the event occurred */
  roomId: string;
  /** Optional player identifier that initiated the action */
  playerId?: string;
  /** Strict platform event type */
  type: TKey;
  /** Monotonically increasing sequence number per room, starting at 1 */
  sequenceNumber: number;
  /** Strongly-typed domain event payload */
  payload: EventPayloadMap[TKey];
  /** Optional correlation identifier for distributed tracing and incident investigation */
  correlationId?: string;
}

/**
 * Immutable chronological timeline of domain events for a specific room.
 */
export interface RoomTimeline {
  roomId: string;
  createdAt: number;
  events: DomainEvent[];
}

/**
 * Portable, serializable timeline export format for incident review, replay, and analytics.
 */
export interface TimelineExport {
  version: "1.0";
  roomId: string;
  exportedAt: number;
  totalEvents: number;
  events: DomainEvent[];
}

/**
 * Pure, side-effect-free state projection interface.
 * Folds a sequence of domain events into a deterministic state snapshot.
 */
export interface StateProjector<TState> {
  name: string;
  initialState: () => TState;
  apply: (state: TState, event: DomainEvent) => TState;
}
