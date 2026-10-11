import { describe, it, expect, beforeEach, vi } from "vitest";
import { useRoomStore } from "../roomStore";

describe("a guest's room name lives on the seat", () => {
  beforeEach(() => {
    localStorage.clear();
    useRoomStore.setState({ seats: {} });
  });

  it("stores the chosen name with the seat and reads it back by room code", () => {
    useRoomStore.getState().rememberSeat("abc123", "p1", "tok", "Ravi");

    expect(useRoomStore.getState().seatFor("ABC123")).toEqual({
      playerId: "p1",
      seatToken: "tok",
      name: "Ravi",
    });
  });

  it("keeps the name when the seat is re-stored without one (a rejoin must not lose it)", () => {
    const store = useRoomStore.getState();
    store.rememberSeat("ABC123", "p1", "tok", "Ravi");
    store.rememberSeat("ABC123", "p1", "tok-renewed");

    expect(useRoomStore.getState().seatFor("ABC123")?.name).toBe("Ravi");
    expect(useRoomStore.getState().seatFor("ABC123")?.seatToken).toBe("tok-renewed");
  });

  it("stores no name for an account — the field is simply absent", () => {
    useRoomStore.getState().rememberSeat("ABC123", "p1", "tok");

    expect(useRoomStore.getState().seatFor("ABC123")).toEqual({ playerId: "p1", seatToken: "tok" });
  });

  it("forgets the name with the seat when the guest leaves the room", () => {
    const store = useRoomStore.getState();
    store.rememberSeat("ABC123", "p1", "tok", "Ravi");
    store.forgetSeat("ABC123");

    expect(useRoomStore.getState().seatFor("ABC123")).toBeNull();
  });

  it("survives a reload: the name is written to the seats key and restored from it", async () => {
    useRoomStore.getState().rememberSeat("ABC123", "p1", "tok", "Ravi");
    expect(JSON.parse(localStorage.getItem("mpg.seats") ?? "{}").ABC123.name).toBe("Ravi");

    // A fresh module instance reads storage the way a page refresh does.
    vi.resetModules();
    const reloaded = await import("../roomStore");

    expect(reloaded.useRoomStore.getState().seatFor("ABC123")?.name).toBe("Ravi");
  });
});
