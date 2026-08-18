import { serverEventStore } from "./ServerEventStore.js";
import type { GameKind } from "@shared/types.js";

/**
 * Server-Authoritative Timeline Recorder for BHALYAM.
 * Ingests authoritative server transitions and facts directly into ServerEventStore.
 */
export class ServerTimelineRecorder {
  public recordRoomCreated(roomId: string, game: GameKind, hostId: string, isCustomName = false): void {
    serverEventStore.append(
      roomId,
      "ROOM_CREATED",
      {
        code: roomId,
        game,
        hostId,
        isCustomName,
        timestamp: Date.now(),
      },
      hostId
    );
  }

  public recordPlayerJoined(roomId: string, playerId: string, name: string, isBot = false): void {
    serverEventStore.append(
      roomId,
      "PLAYER_JOINED",
      {
        code: roomId,
        playerId,
        name,
        isBot,
        timestamp: Date.now(),
      },
      playerId
    );
  }

  public recordPlayerLeft(roomId: string, playerId: string, reason?: string): void {
    serverEventStore.append(
      roomId,
      "PLAYER_LEFT",
      {
        code: roomId,
        playerId,
        reason,
        timestamp: Date.now(),
      },
      playerId
    );
  }

  public recordGameStarted(roomId: string, game: GameKind, playersCount: number): void {
    serverEventStore.append(
      roomId,
      "GAME_STARTED",
      {
        code: roomId,
        game,
        playersCount,
        timestamp: Date.now(),
      }
    );
  }

  public recordGameFinished(roomId: string, game: GameKind, winnerId: string | null, durationMs?: number): void {
    serverEventStore.append(
      roomId,
      "GAME_FINISHED",
      {
        code: roomId,
        game,
        winnerId,
        durationMs,
        timestamp: Date.now(),
      }
    );
  }

  public recordMoveMade(roomId: string, playerId: string, game: GameKind, moveType: string): void {
    serverEventStore.append(
      roomId,
      "MOVE_MADE",
      {
        code: roomId,
        playerId,
        game,
        moveType,
        timestamp: Date.now(),
      },
      playerId
    );
  }

  /**
   * Records chat event with length metadata only (PII safe).
   */
  public recordChatSent(roomId: string, playerId: string, textLength: number): void {
    serverEventStore.append(
      roomId,
      "CHAT_SENT",
      {
        code: roomId,
        playerId,
        textLength,
        timestamp: Date.now(),
      },
      playerId
    );
  }

  public recordVoiceJoined(roomId: string, peerId: string): void {
    serverEventStore.append(
      roomId,
      "VOICE_JOINED",
      {
        code: roomId,
        peerId,
        timestamp: Date.now(),
      },
      peerId
    );
  }

  public recordVoiceLeft(roomId: string, peerId: string): void {
    serverEventStore.append(
      roomId,
      "VOICE_LEFT",
      {
        code: roomId,
        peerId,
        timestamp: Date.now(),
      },
      peerId
    );
  }

  public recordRecoveryStarted(roomId: string, playerId: string): void {
    serverEventStore.append(
      roomId,
      "RECOVERY_STARTED",
      {
        roomId,
        playerId,
        timestamp: Date.now(),
      },
      playerId
    );
  }

  public recordRecoverySucceeded(roomId: string, playerId: string): void {
    serverEventStore.append(
      roomId,
      "RECOVERY_SUCCEEDED",
      {
        roomId,
        playerId,
        timestamp: Date.now(),
      },
      playerId
    );
  }

  public recordRecoveryFailed(roomId: string, error: string): void {
    serverEventStore.append(
      roomId,
      "RECOVERY_FAILED",
      {
        roomId,
        error,
        timestamp: Date.now(),
      }
    );
  }

  public recordError(roomId: string, module: string, error: string, context?: Record<string, unknown>): void {
    serverEventStore.append(
      roomId,
      "ERROR_OCCURRED",
      {
        module,
        error,
        context,
        timestamp: Date.now(),
      }
    );
  }
}

export const serverTimelineRecorder = new ServerTimelineRecorder();
