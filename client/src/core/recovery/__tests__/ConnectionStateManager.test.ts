import { describe, it, expect, beforeEach, vi } from "vitest";
import { connectionStateManager } from "../ConnectionStateManager";

describe("Realtime Recovery — Connection State Machine", () => {
  beforeEach(() => {
    connectionStateManager.reset();
    vi.useRealTimers();
  });

  it("initializes with DISCONNECTED state", () => {
    expect(connectionStateManager.getState()).toBe("DISCONNECTED");
    expect(connectionStateManager.isOnline()).toBe(false);
    expect(connectionStateManager.isRecovering()).toBe(false);
  });

  it("transitions between states and notifies subscribers", () => {
    const transitions: string[] = [];
    const unsubscribe = connectionStateManager.subscribe((evt) => {
      transitions.push(`${evt.previous} -> ${evt.current} (${evt.reason})`);
    });

    connectionStateManager.transition("RECONNECTING", "Network drop");
    connectionStateManager.transition("RECOVERING", "Rejoin in flight");
    connectionStateManager.transition("RECOVERED", "Rejoin ack ok");

    expect(transitions).toEqual([
      "DISCONNECTED -> RECONNECTING (Network drop)",
      "RECONNECTING -> RECOVERING (Rejoin in flight)",
      "RECOVERING -> RECOVERED (Rejoin ack ok)",
    ]);

    unsubscribe();
  });

  it("auto-settles RECOVERED to CONNECTED after confirmation window", async () => {
    vi.useFakeTimers();

    connectionStateManager.transition("RECOVERED", "Room state synced");
    expect(connectionStateManager.getState()).toBe("RECOVERED");
    expect(connectionStateManager.isOnline()).toBe(true);

    vi.advanceTimersByTime(1600);

    expect(connectionStateManager.getState()).toBe("CONNECTED");
    expect(connectionStateManager.isOnline()).toBe(true);
  });

  it("correctly evaluates isOnline and isRecovering queries", () => {
    connectionStateManager.transition("CONNECTED");
    expect(connectionStateManager.isOnline()).toBe(true);
    expect(connectionStateManager.isRecovering()).toBe(false);

    connectionStateManager.transition("RECONNECTING");
    expect(connectionStateManager.isOnline()).toBe(false);
    expect(connectionStateManager.isRecovering()).toBe(true);

    connectionStateManager.transition("RECOVERING");
    expect(connectionStateManager.isOnline()).toBe(false);
    expect(connectionStateManager.isRecovering()).toBe(true);

    connectionStateManager.transition("FAILED");
    expect(connectionStateManager.isOnline()).toBe(false);
    expect(connectionStateManager.isRecovering()).toBe(false);
  });
});
