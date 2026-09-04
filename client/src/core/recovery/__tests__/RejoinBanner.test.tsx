import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RejoinBanner from "../RejoinBanner";
import { saveActiveSession, clearActiveSession, type RecoverySession } from "../recoveryStorage";
import { useRoomStore } from "../../../store/roomStore";
import { checkRoomAlive } from "../roomLiveness";

vi.mock("../roomLiveness", () => ({
  checkRoomAlive: vi.fn(),
}));

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
  const sessionStoreMap = new Map<string, string>();

  beforeEach(() => {
    storeMap.clear();
    sessionStoreMap.clear();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => storeMap.get(k) ?? null,
      setItem: (k: string, v: string) => storeMap.set(k, String(v)),
      removeItem: (k: string) => storeMap.delete(k),
      clear: () => storeMap.clear(),
    });
    vi.stubGlobal("sessionStorage", {
      getItem: (k: string) => sessionStoreMap.get(k) ?? null,
      setItem: (k: string, v: string) => sessionStoreMap.set(k, String(v)),
      removeItem: (k: string) => sessionStoreMap.delete(k),
      clear: () => sessionStoreMap.clear(),
    });
    vi.mocked(checkRoomAlive).mockReset();
    vi.mocked(checkRoomAlive).mockResolvedValue({
      alive: true,
      game: "ludo",
      phase: "playing",
    });
    useRoomStore.getState().reset();
    useRoomStore.getState().resetIdentity();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows a Rejoin Room offer outside the room page when a session exists and room is verified alive", async () => {
    saveActiveSession(makeSession());

    render(
      <MemoryRouter initialEntries={["/"]}>
        <RejoinBanner />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/You were disconnected from Room/i)).toBeDefined();
    expect(screen.getByText("ABC123")).toBeDefined();
    expect(screen.getByRole("button", { name: "Rejoin Room" })).toBeDefined();
  });

  it("renders nothing and purges stale session when server reports room is dead", async () => {
    vi.mocked(checkRoomAlive).mockResolvedValueOnce({
      alive: false,
      reason: "NOT_FOUND",
    });
    saveActiveSession(makeSession({ roomId: "DEAD99" }));

    render(
      <MemoryRouter initialEntries={["/"]}>
        <RejoinBanner />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.queryByText(/You were disconnected/i)).toBeNull();
    });

    expect(localStorage.getItem("bhalyam.recovery.active_session")).toBeNull();
    expect(localStorage.getItem("bhalyam.recovery.room.DEAD99")).toBeNull();
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

  it("hydrates the room store credential before navigating on Rejoin Room when room is alive", async () => {
    saveActiveSession(
      makeSession({ roomId: "XYZ777", playerId: "p9", seatToken: "tok_xyz", playerName: "Bob" }),
    );

    render(
      <MemoryRouter initialEntries={["/"]}>
        <RejoinBanner />
      </MemoryRouter>,
    );

    const rejoinBtn = await screen.findByRole("button", { name: "Rejoin Room" });
    fireEvent.click(rejoinBtn);

    await waitFor(() => {
      const state = useRoomStore.getState();
      expect(state.seatFor("XYZ777")).toEqual({ playerId: "p9", seatToken: "tok_xyz" });
      expect(state.playerName).toBe("Bob");
    });
  });

  it("aborts navigation and cleans up if room closes right when clicking Rejoin Room", async () => {
    saveActiveSession(makeSession({ roomId: "CLOS99" }));
    vi.mocked(checkRoomAlive)
      .mockResolvedValueOnce({ alive: true, game: "snl", phase: "playing" }) // initial mount check
      .mockResolvedValueOnce({ alive: false, reason: "CONCLUDED" }); // click check

    render(
      <MemoryRouter initialEntries={["/"]}>
        <RejoinBanner />
      </MemoryRouter>,
    );

    const rejoinBtn = await screen.findByRole("button", { name: "Rejoin Room" });
    fireEvent.click(rejoinBtn);

    await waitFor(() => {
      expect(screen.queryByText(/You were disconnected/i)).toBeNull();
    });

    expect(localStorage.getItem("bhalyam.recovery.active_session")).toBeNull();
    expect(localStorage.getItem("bhalyam.recovery.room.CLOS99")).toBeNull();
  });

  it("dismisses and records dismissal in sessionStorage without clearing the active session", async () => {
    saveActiveSession(makeSession({ roomId: "DISM11" }));

    render(
      <MemoryRouter initialEntries={["/"]}>
        <RejoinBanner />
      </MemoryRouter>,
    );

    const dismissBtn = await screen.findByRole("button", { name: "Dismiss rejoin notice" });
    fireEvent.click(dismissBtn);

    expect(screen.queryByText(/You were disconnected/i)).toBeNull();
    expect(sessionStorage.getItem("bhalyam.recovery.dismissed.DISM11")).toBe("true");
    expect(localStorage.getItem("bhalyam.recovery.active_session")).not.toBeNull();
  });
});

