import { connectionStateManager } from "./ConnectionStateManager";
import {
  clearActiveSession,
  saveActiveSession,
  type RecoverySession,
} from "./recoveryStorage";
import { eventBus } from "../../lib/eventBus";
import { telemetry } from "../../lib/observability";
import { getSocket, type AppSocket } from "../../lib/socket";
import { useRoomStore } from "../../store/roomStore";

class RoomRecoveryManager {
  private isInitialized = false;
  private socket: AppSocket | null = null;
  private currentRoomCode: string | null = null;
  private recoveryOwner: { roomCode: string; retry: () => Promise<boolean> } | null = null;
  private listenerCleanups: Array<() => void> = [];
  private lastActionTimestamp = 0;

  /**
   * Initializes global browser lifecycle and network listeners.
   */
  public init(socket?: AppSocket): void {
    if (this.isInitialized || typeof window === "undefined") return;
    this.isInitialized = true;
    this.socket = socket ?? getSocket();

    const browserListeners: Array<[Window | Document, string, () => void]> = [
      [window, "online", () => this.handleNetworkOnline()],
      [window, "offline", () => this.handleNetworkOffline()],
      [document, "visibilitychange", () => this.handleVisibilityChange()],
      [window, "pagehide", () => this.handlePageHide()],
      [window, "pageshow", () => this.handlePageShow()],
      [window, "focus", () => this.handleFocus()],
      [window, "blur", () => this.handleBlur()],
    ];
    for (const [target, event, listener] of browserListeners) {
      target.addEventListener(event, listener);
      this.listenerCleanups.push(() => target.removeEventListener(event, listener));
    }

    // 3. Socket event bindings
    this.bindSocketEvents();
  }

  private bindSocketEvents(): void {
    if (!this.socket) return;

    /**
    * Room owns credential resolution, joins and private-state readiness.
    * These listeners report transport state only; independently joining here
    * would race Room's handshake and duplicate server room revisions.
     */
    const socket = this.socket;
    const onConnect = () => {
      connectionStateManager.transition(
        this.currentRoomCode ? "RECOVERING" : "CONNECTED",
        "Socket connected",
      );
    };

    const onDisconnect = (reason: string) => {
      if (this.currentRoomCode) {
        connectionStateManager.transition("RECONNECTING", `Socket disconnected: ${reason}`);
      } else {
        connectionStateManager.transition("DISCONNECTED", `Socket disconnected: ${reason}`);
      }
    };

    const onConnectError = (err: Error) => {
      if (this.currentRoomCode) {
        connectionStateManager.transition("RECONNECTING", `Socket connect error: ${err?.message}`);
      } else {
        connectionStateManager.transition("DISCONNECTED", `Socket connect error: ${err?.message}`);
      }
    };

    const onReconnect = () => {
      connectionStateManager.transition(
        this.currentRoomCode ? "RECOVERING" : "CONNECTED",
        "Socket reconnected",
      );
    };
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.io.on("reconnect", onReconnect);
    this.listenerCleanups.push(() => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.io.off("reconnect", onReconnect);
    });
  }

  /**
   * Binds an active room to the recovery coordinator.
   */
  public attachRoom(roomCode: string, playerId: string, seatToken?: string, name?: string, avatar?: string, isReady = true): void {
    this.currentRoomCode = roomCode.trim().toUpperCase();

    const session: RecoverySession = {
      sessionId: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      playerId,
      roomId: this.currentRoomCode,
      playerName: name ?? useRoomStore.getState().playerName ?? "Player",
      avatar: avatar ?? useRoomStore.getState().avatarId ?? undefined,
      seatToken,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    saveActiveSession(session);
    connectionStateManager.transition(isReady ? "CONNECTED" : "RECOVERING", "Room attached");
  }

  /**
   * Detaches room from active recovery when user intentionally leaves.
   */
  public detachRoom(): void {
    if (this.currentRoomCode) {
      clearActiveSession();
      this.currentRoomCode = null;
    }
    this.recoveryOwner = null;
    connectionStateManager.transition("DISCONNECTED", "User left room");
  }

  /**
  * Registers the mounted Room as the sole owner of recovery attempts.
   */
  public registerRoomRecovery(roomCode: string, retry: () => Promise<boolean>): () => void {
    const owner = { roomCode: roomCode.trim().toUpperCase(), retry };
    this.recoveryOwner = owner;
    this.currentRoomCode = owner.roomCode;
    return () => {
      if (this.recoveryOwner !== owner) return;
      this.recoveryOwner = null;
      this.currentRoomCode = null;
    };
  }

  public async attemptRecovery(roomId?: string): Promise<boolean> {
    const owner = this.recoveryOwner;
    if (!owner || (roomId && roomId.trim().toUpperCase() !== owner.roomCode)) {
      connectionStateManager.transition("FAILED", "Return to the room to retry, or leave for the lounge.");
      return false;
    }
    return owner.retry();
  }

  /**
   * Generates a unique, collision-resistant actionId for idempotency protection.
   */
  public generateActionId(prefix = "act"): string {
    const now = Date.now();
    this.lastActionTimestamp = Math.max(now, this.lastActionTimestamp + 1);
    const rand = Math.random().toString(36).slice(2, 7);
    return `${prefix}_${this.lastActionTimestamp}_${rand}`;
  }

  /**
   * `handleNetworkOnline`/`handleVisibilityChange`/`handlePageShow`/
   * `handleFocus` all used to call `this.attemptRecovery(...)` directly on
   * these same four browser signals — the SAME duplicate-`room:join` race
   * as `bindSocketEvents`'s "connect"/"reconnect" handlers (see that
   * comment), just reached from a different trigger. `lib/socket.ts`'s own
   * `installNetworkRecovery` already listens for these identical
   * online/visibilitychange/focus events and actively PROBES the socket
   * (`net:ping` with a timeout) before deciding whether to rebuild the
   * transport — so if the connection is genuinely stale, that probe forces
   * a real reconnect, which fires the socket's own `connect` event, which
   * is the ALREADY-fixed path into Room.tsx's `attemptJoin("reconnect")`.
   * If the probe succeeds, the socket was never actually dead and there is
   * nothing here to recover. Either way, this class doesn't need — and
   * must not run — a second, uncoordinated attempt at the same room:join.
   */
  private handleNetworkOnline(): void {
    telemetry.network("network_online");
  }

  private handleNetworkOffline(): void {
    telemetry.network("network_offline");
    connectionStateManager.transition("RECONNECTING", "Browser offline");
  }

  private handleVisibilityChange(): void {
    if (document.hidden) {
      eventBus.publish("TAB_HIDDEN", {});
    } else {
      eventBus.publish("TAB_VISIBLE", {});
    }
  }

  private handlePageHide(): void {
    eventBus.publish("APP_BACKGROUND", {});
  }

  private handlePageShow(): void {
    eventBus.publish("APP_FOREGROUND", {});
  }

  private handleFocus(): void {
    // See the shared comment above `handleNetworkOnline` — recovery on this
    // signal is `lib/socket.ts`'s job (probe-then-rebuild), not this class's.
  }

  private handleBlur(): void {
    // Stash active session state
  }

  /**
   * Teardown for tests and clean unmounts.
   */
  public destroy(): void {
    for (const cleanup of this.listenerCleanups) cleanup();
    this.listenerCleanups = [];
    this.socket = null;
    this.isInitialized = false;
    this.currentRoomCode = null;
    this.recoveryOwner = null;
    connectionStateManager.reset();
  }
}

export const recoveryManager = new RoomRecoveryManager();
