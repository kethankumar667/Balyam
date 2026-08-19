/**
 * Connection State Machine for Realtime Resilience.
 * Replaces implicit boolean flags with an authoritative, strictly-typed state machine.
 */

export type ConnectionState =
  | "CONNECTED"
  | "RECONNECTING"
  | "DISCONNECTED"
  | "RECOVERING"
  | "RECOVERED"
  | "FAILED";

export interface ConnectionStateEvent {
  previous: ConnectionState;
  current: ConnectionState;
  reason?: string;
  timestamp: number;
}

type StateListener = (event: ConnectionStateEvent) => void;

class ConnectionStateManager {
  private currentState: ConnectionState = "DISCONNECTED";
  private listeners: Set<StateListener> = new Set();
  private recoveryTimer: ReturnType<typeof setTimeout> | null = null;

  public getState(): ConnectionState {
    return this.currentState;
  }

  public isOnline(): boolean {
    return this.currentState === "CONNECTED" || this.currentState === "RECOVERED";
  }

  public isRecovering(): boolean {
    return this.currentState === "RECOVERING" || this.currentState === "RECONNECTING";
  }

  /**
   * Transitions the state machine to a target state.
   */
  public transition(target: ConnectionState, reason?: string): boolean {
    if (this.currentState === target) return false;

    const previous = this.currentState;
    this.currentState = target;

    // Clear auto-recovery settle timers on state transition
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }

    // Auto-settle RECOVERED -> CONNECTED after a 1.5s confirmation window
    if (target === "RECOVERED") {
      this.recoveryTimer = setTimeout(() => {
        if (this.currentState === "RECOVERED") {
          this.transition("CONNECTED", "Recovery confirmed and settled");
        }
      }, 1500);
    }

    const event: ConnectionStateEvent = {
      previous,
      current: target,
      reason,
      timestamp: Date.now(),
    };

    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Prevent listener failures from cascading
      }
    }

    return true;
  }

  /**
   * Subscribes to connection state machine transitions.
   */
  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Resets connection state to default disconnected (e.g. for testing).
   */
  public reset(): void {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }
    this.currentState = "DISCONNECTED";
    this.listeners.clear();
  }
}

export const connectionStateManager = new ConnectionStateManager();
