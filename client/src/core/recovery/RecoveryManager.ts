import { connectionStateManager } from "./ConnectionStateManager";
import {
  clearActiveSession,
  getActiveSession,
  getRoomSession,
  saveActiveSession,
  type RecoverySession,
} from "./recoveryStorage";
import { eventBus } from "../../lib/eventBus";
import { telemetry } from "../../lib/observability";
import { isFeatureEnabled } from "../../lib/featureFlags";
import { getSocket, type AppSocket } from "../../lib/socket";
import { useRoomStore } from "../../store/roomStore";

class RoomRecoveryManager {
  private isInitialized = false;
  private socket: AppSocket | null = null;
  private currentRoomCode: string | null = null;
  private maxRetries = 4;
  private retryCount = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private lastActionTimestamp = 0;

  /**
   * Initializes global browser lifecycle and network listeners.
   */
  public init(socket?: AppSocket): void {
    if (this.isInitialized || typeof window === "undefined") return;
    this.isInitialized = true;
    this.socket = socket ?? getSocket();

    // 1. Online / Offline network listeners
    window.addEventListener("online", () => this.handleNetworkOnline());
    window.addEventListener("offline", () => this.handleNetworkOffline());

    // 2. Tab visibility & mobile backgrounding
    document.addEventListener("visibilitychange", () => this.handleVisibilityChange());
    window.addEventListener("pagehide", () => this.handlePageHide());
    window.addEventListener("pageshow", () => this.handlePageShow());
    window.addEventListener("focus", () => this.handleFocus());
    window.addEventListener("blur", () => this.handleBlur());

    // 3. Socket event bindings
    this.bindSocketEvents();
  }

  private bindSocketEvents(): void {
    if (!this.socket) return;

    /**
     * These two handlers used to call `this.attemptRecovery(...)` directly,
     * which independently emits its OWN `room:join` for the seat. Room.tsx
     * has its own complete, tested reconnect handshake (`attemptJoin`,
     * fired from the exact same socket `connect` event) reading from its
     * own seat storage — so on every reconnect while a room page was
     * mounted, BOTH systems fired `room:join` for the same seat off the
     * same underlying event, racing each other: two `roomRevision` bumps
     * instead of one (which the match-start preflight matches exactly by
     * revision), double-counted recovery metrics, and two overlapping ack
     * round-trips independently racing to update client state. `attachRoom`
     * has exactly one caller (`Room.tsx`, on its own successful join) and
     * `currentRoomCode` is in-memory singleton state that cannot survive a
     * full page reload — so whenever it is set, a mounted `Room.tsx` for
     * that exact room is provably also present and about to run its own
     * `attemptJoin("reconnect")` on this identical event. Nothing is lost
     * by leaving the actual re-join to it: this now only drives the
     * `RecoveryBanner` state machine ("Reconnecting…" / "Restoring room…"),
     * and `Room.tsx` reports the outcome back via `connectionStateManager`
     * once ITS join ack actually resolves (see its own comment).
     */
    this.socket.on("connect", () => {
      connectionStateManager.transition(
        this.currentRoomCode ? "RECOVERING" : "CONNECTED",
        "Socket connected",
      );
    });

    this.socket.on("disconnect", (reason) => {
      if (this.currentRoomCode) {
        connectionStateManager.transition("RECONNECTING", `Socket disconnected: ${reason}`);
      } else {
        connectionStateManager.transition("DISCONNECTED", `Socket disconnected: ${reason}`);
      }
    });

    this.socket.on("connect_error", (err) => {
      if (this.currentRoomCode) {
        connectionStateManager.transition("RECONNECTING", `Socket connect error: ${err?.message}`);
      } else {
        connectionStateManager.transition("DISCONNECTED", `Socket connect error: ${err?.message}`);
      }
    });

    this.socket.io.on("reconnect", () => {
      connectionStateManager.transition(
        this.currentRoomCode ? "RECOVERING" : "CONNECTED",
        "Socket reconnected",
      );
    });
  }

  /**
   * Binds an active room to the recovery coordinator.
   */
  public attachRoom(roomCode: string, playerId: string, seatToken?: string, name?: string, avatar?: string): void {
    this.currentRoomCode = roomCode.trim().toUpperCase();
    this.retryCount = 0;

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
    connectionStateManager.transition("CONNECTED", "Room attached");
  }

  /**
   * Detaches room from active recovery when user intentionally leaves.
   */
  public detachRoom(): void {
    if (this.currentRoomCode) {
      clearActiveSession();
      this.currentRoomCode = null;
    }
    this.retryCount = 0;
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    connectionStateManager.transition("DISCONNECTED", "User left room");
  }

  /**
   * Executes the authoritative room recovery handshake.
   */
  public async attemptRecovery(roomId?: string): Promise<boolean> {
    if (!isFeatureEnabled("REALTIME_RECOVERY")) return false;

    const targetRoom = (roomId ?? this.currentRoomCode ?? getActiveSession()?.roomId)?.trim().toUpperCase();
    if (!targetRoom) return false;

    const session = getRoomSession(targetRoom) ?? getActiveSession();
    if (!session || session.roomId.toUpperCase() !== targetRoom) {
      connectionStateManager.transition("FAILED", "No active session for room");
      return false;
    }

    connectionStateManager.transition("RECOVERING", `Attempting recovery for room ${targetRoom}`);
    eventBus.publish("RECOVERY_STARTED", {
      roomId: targetRoom,
      playerId: session.playerId,
    });

    const socket = this.socket ?? getSocket();

    return new Promise<boolean>((resolve) => {
      socket.emit(
        "room:join",
        {
          code: targetRoom,
          playerId: session.playerId,
          seatToken: session.seatToken,
          name: session.playerName,
          avatar: session.avatar,
        },
        (res) => {
          if (res && res.ok && res.state && res.playerId) {
            this.retryCount = 0;
            this.currentRoomCode = targetRoom;

            // Update Zustand room store with authoritative snapshot
            const store = useRoomStore.getState();
            store.setRoomState(res.state);
            store.setPlayerId(res.playerId);
            if (res.seatToken) {
              store.rememberSeat(targetRoom, res.playerId, res.seatToken);
            }

            // Update session persistence
            session.seatToken = res.seatToken ?? session.seatToken;
            session.updatedAt = Date.now();
            saveActiveSession(session);

            connectionStateManager.transition("RECOVERED", `Successfully recovered room ${targetRoom}`);
            eventBus.publish("RECOVERY_SUCCEEDED", {
              roomId: targetRoom,
              playerId: res.playerId,
            });
            resolve(true);
          } else {
            this.handleRecoveryFailure(targetRoom, res?.error ?? "Recovery handshake rejected");
            resolve(false);
          }
        }
      );
    });
  }

  private handleRecoveryFailure(roomId: string, error: string): void {
    telemetry.error("RoomRecoveryFailure", error, { roomId, attempt: this.retryCount });
    eventBus.publish("RECOVERY_FAILED", { roomId, error });

    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      const delay = Math.min(1000 * Math.pow(1.5, this.retryCount), 6000);
      connectionStateManager.transition("RECONNECTING", `Recovery retry ${this.retryCount}/${this.maxRetries} in ${Math.round(delay)}ms`);

      this.retryTimer = setTimeout(() => {
        this.attemptRecovery(roomId);
      }, delay);
    } else {
      connectionStateManager.transition("FAILED", `Recovery exhausted: ${error}`);
    }
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
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.isInitialized = false;
    this.currentRoomCode = null;
    connectionStateManager.reset();
  }
}

export const recoveryManager = new RoomRecoveryManager();
