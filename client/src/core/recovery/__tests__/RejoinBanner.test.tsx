import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RejoinBanner from "../RejoinBanner";
import { saveActiveSession, clearActiveSession, type RecoverySession } from "../recoveryStorage";
import { useRoomStore } from "../../../store/roomStore";

function makeSession(overrides: Partial<RecoverySession> = {}): RecoverySession {
  return {
    sessionId: "sess_1",
    playerId: "p1",
    roomId: "ABC123",
    playerName: "Alice",
    seatToken: "tok_abc",
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

describe("RejoinBanner", () => {
  const storeMap = new Map<string, string>();

  beforeEach(() => {
    storeMap.clear();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => storeMap.get(k) ?? null,
      setItem: (k: string, v: string) => storeMap.set(k, String(v)),
      removeItem: (k: string) => storeMap.delete(k),
      clear: () => storeMap.clear(),
    });
    useRoomStore.getState().reset();
    useRoomStore.getState().resetIdentity();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows a Rejoin Room offer outside the room page when a session exists", () => {
    saveActiveSession(makeSession());

    render(
      <MemoryRouter initialEntries={["/"]}>
        <RejoinBanner />
      </MemoryRouter>,
    );

    expect(screen.getByText(/You were disconnected from Room/i)).toBeDefined();
    expect(screen.getByText("ABC123")).toBeDefined();
    expect(screen.getByRole("button", { name: "Rejoin Room" })).toBeDefined();
  });

  it("renders nothing when no session is stored", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <RejoinBanner />
      </MemoryRouter>,
    );

    expect(screen.queryByText(/You were disconnected/i)).toBeNull();
  });

  it("renders nothing once the session was cleared by an intentional leave", () => {
    saveActiveSession(makeSession());
    clearActiveSession();

    render(
      <MemoryRouter initialEntries={["/"]}>
        <RejoinBanner />
      </MemoryRouter>,
    );

    expect(screen.queryByText(/You were disconnected/i)).toBeNull();
  });

  it("stays hidden while already inside the room page it would offer to rejoin", () => {
    saveActiveSession(makeSession());

    render(
      <MemoryRouter initialEntries={["/room/ABC123"]}>
        <RejoinBanner />
      </MemoryRouter>,
    );

    expect(screen.queryByText(/You were disconnected/i)).toBeNull();
  });

  it("hydrates the room store credential before navigating on Rejoin Room", () => {
    saveActiveSession(makeSession({ roomId: "XYZ777", playerId: "p9", seatToken: "tok_xyz", playerName: "Bob" }));

    render(
      <MemoryRouter initialEntries={["/"]}>
        <RejoinBanner />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Rejoin Room" }));

    const state = useRoomStore.getState();
    expect(state.seatFor("XYZ777")).toEqual({ playerId: "p9", seatToken: "tok_xyz" });
    expect(state.playerName).toBe("Bob");
  });

  it("dismisses without clearing the underlying session (stays rejoinable elsewhere)", () => {
    saveActiveSession(makeSession());

    render(
      <MemoryRouter initialEntries={["/"]}>
        <RejoinBanner />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Dismiss rejoin notice" }));
    expect(screen.queryByText(/You were disconnected/i)).toBeNull();

    // The stored session itself must survive a dismiss — a dismiss is a
    // per-view preference, not an intentional leave.
    expect(localStorage.getItem("bhalyam.recovery.active_session")).not.toBeNull();
  });
});
