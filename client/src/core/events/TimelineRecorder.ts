import { eventBus } from "../../lib/eventBus";
import { eventStore } from "./EventStore";
import { isFeatureEnabled } from "../../lib/featureFlags";
import type { DomainEvent } from "@shared/events/EventContracts";
import type { EventName, EventPayloadMap } from "@shared/events/EventTypes";

export class TimelineRecorder {
  private isRecording = false;
  private unsubs: (() => void)[] = [];
  private activeRoomCode: string | null = null;

  /**
   * Starts listening to all EventBus platform events and recording to EventStore.
   */
  public start(): void {
    if (this.isRecording) return;
    this.isRecording = true;

    const eventNames: EventName[] = [
      "ROOM_CREATED",
      "PLAYER_JOINED",
      "PLAYER_LEFT",
      "GAME_STARTED",
      "GAME_FINISHED",
      "MOVE_MADE",
      "CHAT_SENT",
      "VOICE_JOINED",
      "VOICE_LEFT",
      "ERROR_OCCURRED",
      "RECOVERY_STARTED",
      "RECOVERY_SUCCEEDED",
      "RECOVERY_FAILED",
      "TAB_HIDDEN",
      "TAB_VISIBLE",
      "APP_BACKGROUND",
      "APP_FOREGROUND",
    ];

    for (const name of eventNames) {
      const unsub = eventBus.subscribe(name, (payload) => {
        this.handleEvent(name, payload);
      });
      this.unsubs.push(unsub);
    }
  }

  public setActiveRoom(roomCode: string | null): void {
    this.activeRoomCode = roomCode ? roomCode.trim().toUpperCase() : null;
  }

  private handleEvent<TKey extends EventName>(name: TKey, payload: EventPayloadMap[TKey]): void {
    if (!isFeatureEnabled("EVENT_SOURCING")) return;

    // Extract roomId / code from payload or fallback to active room
    let roomId = this.activeRoomCode;
    if ("code" in payload && typeof payload.code === "string") {
      roomId = payload.code;
    } else if ("roomId" in payload && typeof payload.roomId === "string") {
      roomId = payload.roomId;
    }

    if (!roomId) return;
    const normalizedRoom = roomId.trim().toUpperCase();

    // Extract playerId if available
    let playerId: string | undefined;
    if ("playerId" in payload && typeof payload.playerId === "string") {
      playerId = payload.playerId;
    } else if ("hostId" in payload && typeof payload.hostId === "string") {
      playerId = payload.hostId;
    }

    const timestamp = "timestamp" in payload && typeof payload.timestamp === "number" ? payload.timestamp : Date.now();
    const eventId = `evt_${timestamp}_${Math.random().toString(36).slice(2, 7)}`;

    const domainEvent: DomainEvent<TKey> = {
      id: eventId,
      timestamp,
      roomId: normalizedRoom,
      playerId,
      type: name,
      sequenceNumber: eventStore.getNextSequence(normalizedRoom),
      payload,
    };

    eventStore.append(domainEvent);
  }

  /**
   * Stops recording and unsubscribes from EventBus.
   */
  public stop(): void {
    this.unsubs.forEach((unsub) => unsub());
    this.unsubs = [];
    this.isRecording = false;
    this.activeRoomCode = null;
  }
}

export const timelineRecorder = new TimelineRecorder();
