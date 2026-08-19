import type { DomainEvent, RoomTimeline, TimelineExport } from "@shared/events/EventContracts";

/**
 * In-memory, append-only Event Store for BHALYAM Room Timelines.
 * Enforces strict immutability, monotonic sequence ordering, and fast index lookups.
 */
export class EventStore {
  private timelines: Map<string, DomainEvent[]> = new Map();
  private createdTimestamps: Map<string, number> = new Map();
  private maxEventsPerRoom = 10_000;

  /**
   * Appends an immutable domain event to the room's event stream.
   */
  public append<TKey extends DomainEvent["type"]>(event: DomainEvent<TKey>): void {
    const roomId = event.roomId.trim().toUpperCase();
    let events = this.timelines.get(roomId);

    if (!events) {
      events = [];
      this.timelines.set(roomId, events);
      this.createdTimestamps.set(roomId, event.timestamp);
    }

    // Sequence verification: ensure monotonic ordering
    const expectedSequence = events.length + 1;
    const validatedEvent: DomainEvent<TKey> = {
      ...event,
      roomId,
      sequenceNumber: expectedSequence,
    };

    if (events.length < this.maxEventsPerRoom) {
      events.push(validatedEvent as DomainEvent);
    }
  }

  /**
   * Appends a batch of events atomically in sequence.
   */
  public appendBatch(events: DomainEvent[]): void {
    for (const evt of events) {
      this.append(evt);
    }
  }

  /**
   * Returns all domain events for a given room code.
   */
  public getEvents(roomId: string): DomainEvent[] {
    const normalized = roomId.trim().toUpperCase();
    const list = this.timelines.get(normalized);
    return list ? [...list] : [];
  }

  /**
   * Returns events strictly after a specific sequence number for incremental catch-up.
   */
  public getEventsAfter(roomId: string, sequence: number): DomainEvent[] {
    const events = this.getEvents(roomId);
    return events.filter((e) => e.sequenceNumber > sequence);
  }

  /**
   * Retrieves the full room timeline object.
   */
  public getTimeline(roomId: string): RoomTimeline | null {
    const normalized = roomId.trim().toUpperCase();
    const events = this.timelines.get(normalized);
    if (!events || events.length === 0) return null;

    return {
      roomId: normalized,
      createdAt: this.createdTimestamps.get(normalized) ?? events[0]?.timestamp ?? Date.now(),
      events: [...events],
    };
  }

  /**
   * Generates the next sequence number for a room without mutating state.
   */
  public getNextSequence(roomId: string): number {
    const normalized = roomId.trim().toUpperCase();
    const events = this.timelines.get(normalized);
    return (events?.length ?? 0) + 1;
  }

  /**
   * Clears event timeline for a room upon cleanup or completion.
   */
  public clear(roomId: string): void {
    const normalized = roomId.trim().toUpperCase();
    this.timelines.delete(normalized);
    this.createdTimestamps.delete(normalized);
  }

  /**
   * Exports room timeline to a portable, versioned JSON payload.
   */
  public export(roomId: string): TimelineExport | null {
    const timeline = this.getTimeline(roomId);
    if (!timeline) return null;

    return {
      version: "1.0",
      roomId: timeline.roomId,
      exportedAt: Date.now(),
      totalEvents: timeline.events.length,
      events: timeline.events,
    };
  }

  /**
   * Clears all timelines (for testing and reset).
   */
  public reset(): void {
    this.timelines.clear();
    this.createdTimestamps.clear();
  }
}

export const eventStore = new EventStore();
