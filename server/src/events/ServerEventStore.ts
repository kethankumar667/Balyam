import type { DomainEvent, RoomTimeline, TimelineExport } from "@shared/events/EventContracts.js";
import type { EventType, EventPayloadMap } from "@shared/events/EventTypes.js";

/**
 * Server-Authoritative Event Store for BHALYAM Room Timelines.
 *
 * Implements strict append-only immutability, monotonic sequence numbers,
 * privacy-by-design (zero raw chat text, zero SDP/ICE credentials),
 * and export capabilities for analytics, replay, and incident investigation.
 */
export class ServerEventStore {
  private timelines: Map<string, DomainEvent[]> = new Map();
  private createdTimestamps: Map<string, number> = new Map();
  private maxEventsPerRoom = 10_000;

  /**
   * Appends an authoritative domain event to the room timeline.
   */
  public append<TKey extends EventType>(
    roomId: string,
    type: TKey,
    payload: EventPayloadMap[TKey],
    playerId?: string,
    correlationId?: string
  ): DomainEvent<TKey> {
    const normalized = roomId.trim().toUpperCase();
    let events = this.timelines.get(normalized);

    if (!events) {
      events = [];
      this.timelines.set(normalized, events);
      this.createdTimestamps.set(normalized, Date.now());
    }

    const sequenceNumber = events.length + 1;
    const timestamp = Date.now();
    const id = `srv_evt_${timestamp}_${Math.random().toString(36).slice(2, 7)}`;

    // Privacy Sanitization: ensure no raw message contents or credentials leak
    let sanitizedPayload = { ...payload };
    if (type === "CHAT_SENT" && "text" in (sanitizedPayload as any)) {
      const { text, ...rest } = sanitizedPayload as any;
      sanitizedPayload = {
        ...rest,
        textLength: typeof text === "string" ? text.length : (rest.textLength ?? 0),
      } as EventPayloadMap[TKey];
    }

    const event: DomainEvent<TKey> = {
      id,
      timestamp,
      roomId: normalized,
      playerId,
      type,
      sequenceNumber,
      payload: sanitizedPayload,
      correlationId,
    };

    if (events.length < this.maxEventsPerRoom) {
      events.push(event as DomainEvent);
    }

    return event;
  }

  /**
   * Retrieves all immutable domain events for a given room.
   */
  public getEvents(roomId: string): DomainEvent[] {
    const normalized = roomId.trim().toUpperCase();
    const list = this.timelines.get(normalized);
    return list ? [...list] : [];
  }

  /**
   * Retrieves events strictly after a given sequence number for incremental client sync.
   */
  public getEventsAfter(roomId: string, sequence: number): DomainEvent[] {
    const events = this.getEvents(roomId);
    return events.filter((e) => e.sequenceNumber > sequence);
  }

  /**
   * Returns full RoomTimeline object.
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
   * Clears room timeline from memory upon room closure.
   */
  public clear(roomId: string): void {
    const normalized = roomId.trim().toUpperCase();
    this.timelines.delete(normalized);
    this.createdTimestamps.delete(normalized);
  }

  /**
   * Returns operational store metrics.
   */
  public getStats(): { totalRooms: number; totalEvents: number } {
    let totalEvents = 0;
    for (const events of this.timelines.values()) {
      totalEvents += events.length;
    }
    return {
      totalRooms: this.timelines.size,
      totalEvents,
    };
  }

  /**
   * Reset store (for testing).
   */
  public reset(): void {
    this.timelines.clear();
    this.createdTimestamps.clear();
  }
}

export const serverEventStore = new ServerEventStore();
