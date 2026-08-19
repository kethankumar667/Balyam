import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eventBus } from "../eventBus";
import { telemetry } from "../observability";

describe("Typed EventBus", () => {
  beforeEach(() => {
    eventBus.clear();
  });

  afterEach(() => {
    eventBus.clear();
  });

  it("dispatches typed events to subscribers with auto-generated timestamps", () => {
    let receivedPayload: unknown = null;
    const unsubscribe = eventBus.subscribe("ROOM_CREATED", (payload) => {
      receivedPayload = payload;
    });

    eventBus.publish("ROOM_CREATED", {
      code: "LUDO99",
      game: "ludo",
      hostId: "player_1",
      isCustomName: false,
    });

    expect(receivedPayload).toMatchObject({
      code: "LUDO99",
      game: "ludo",
      hostId: "player_1",
      isCustomName: false,
    });
    expect((receivedPayload as any).timestamp).toBeGreaterThan(0);

    unsubscribe();
  });

  it("stops dispatching after unsubscription", () => {
    let callCount = 0;
    const unsubscribe = eventBus.subscribe("PLAYER_JOINED", () => {
      callCount++;
    });

    eventBus.publish("PLAYER_JOINED", {
      code: "XYZ123",
      playerId: "p1",
      name: "Alice",
      isBot: false,
    });
    expect(callCount).toBe(1);

    unsubscribe();

    eventBus.publish("PLAYER_JOINED", {
      code: "XYZ123",
      playerId: "p2",
      name: "Bob",
      isBot: false,
    });
    expect(callCount).toBe(1);
  });

  it("supports once subscriptions for single-shot handling", () => {
    let callCount = 0;
    eventBus.once("GAME_STARTED", () => {
      callCount++;
    });

    eventBus.publish("GAME_STARTED", {
      code: "RPS001",
      game: "rps",
      playersCount: 2,
    });
    eventBus.publish("GAME_STARTED", {
      code: "RPS001",
      game: "rps",
      playersCount: 2,
    });

    expect(callCount).toBe(1);
  });

  it("catches subscriber errors without crashing other subscribers", () => {
    const spyError = vi.spyOn(telemetry, "error").mockImplementation(() => {});

    let survivorReceived = false;
    eventBus.subscribe("MOVE_MADE", () => {
      throw new Error("Subscriber failure");
    });
    eventBus.subscribe("MOVE_MADE", () => {
      survivorReceived = true;
    });

    eventBus.publish("MOVE_MADE", {
      code: "RUMMY1",
      playerId: "p1",
      game: "rummy",
      moveType: "discard",
    });

    expect(survivorReceived).toBe(true);
    expect(spyError).toHaveBeenCalled();
    spyError.mockRestore();
  });
});
