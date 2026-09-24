import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import type { MandaliMessage } from "@shared/mandali/types.js";

const join = vi.hoisted(() => vi.fn());
vi.mock("../../../lib/roomJoin", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/roomJoin")>()),
  joinRoomByCode: join,
}));
vi.mock("../../../lib/playerIdentity", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/playerIdentity")>()),
  apiJson: vi.fn(async () => null),
}));

import RoomInviteCard from "../RoomInviteCard";
import { useRoomInviteStatusStore } from "../../../store/roomInviteStatusStore";

const message = (over: Partial<MandaliMessage> = {}): MandaliMessage => ({
  messageId: "m1", channelId: "c1", mandaliId: "man1", senderId: "host", senderName: "Rajesh", senderAvatar: "a1",
  senderRole: "MEMBER", content: "🎮 Ludo room ABC234 — tap Join to play", reactions: {}, timestamp: 1,
  kind: "ROOM_INVITE", roomCode: "ABC234",
  roomInvite: { game: "ludo", gameName: "Ludo", maxPlayers: 4, roomName: "Friday Ludo", hostName: "Rajesh" },
  ...over,
} as MandaliMessage);

const setStatus = (over: Record<string, unknown> = {}) =>
  useRoomInviteStatusStore.setState({
    statuses: { ABC234: { code: "ABC234", state: "OPEN", players: 2, maxPlayers: 4, youAreIn: false, ...over } as never },
    // Keep the real poller out of the way — these tests decide what the status is.
    subscribe: () => () => undefined,
    refresh: vi.fn(async () => undefined),
  });

const renderCard = (msg = message(), selfId: string | null = "me") =>
  render(
    <MemoryRouter initialEntries={["/mandali/x"]}>
      <Routes>
        <Route path="/mandali/x" element={<RoomInviteCard message={msg} selfId={selfId} />} />
        <Route path="/room/:code" element={<div>IN THE ROOM</div>} />
      </Routes>
    </MemoryRouter>
  );

describe("RoomInviteCard", () => {
  beforeEach(() => {
    join.mockReset();
    join.mockResolvedValue({ ok: true, code: "ABC234" });
    setStatus();
  });
  afterEach(cleanup);

  it("shows who is hosting, the game, the room and how many seats are taken", () => {
    renderCard();

    expect(screen.getByText(/Rajesh invited you to play/)).toBeTruthy();
    expect(screen.getByText("Friday Ludo")).toBeTruthy();
    expect(screen.getByText("ABC234")).toBeTruthy();
    expect(screen.getByText("2 of 4 seats")).toBeTruthy();
  });

  it("takes you straight into the room when you tap Join", async () => {
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: /Join room/ }));

    await waitFor(() => expect(screen.getByText("IN THE ROOM")).toBeTruthy());
    expect(join).toHaveBeenCalledWith("ABC234");
  });

  it("shows a full room calmly: dimmed, labelled, explained, and not joinable", () => {
    setStatus({ state: "FULL", players: 4 });
    renderCard();

    const button = screen.getByRole("button", { name: "Room full" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(screen.getByText(/Every seat is taken/)).toBeTruthy();
    expect(screen.getByText("4 of 4 seats")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("says when the match has already started", () => {
    setStatus({ state: "IN_PROGRESS" });
    renderCard();

    expect((screen.getByRole("button", { name: "Already started" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("says when the room has closed", () => {
    setStatus({ state: "CLOSED", players: 0 });
    renderCard();

    expect((screen.getByRole("button", { name: "Room closed" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("explains a lost race — the room filled up between the tap and the answer — and refreshes the card", async () => {
    join.mockResolvedValue({ ok: false, reason: "FULL", error: "Room is full" });
    renderCard();
    const refresh = useRoomInviteStatusStore.getState().refresh as ReturnType<typeof vi.fn>;

    fireEvent.click(screen.getByRole("button", { name: /Join room/ }));

    await waitFor(() => expect(screen.getByText(/just filled up/)).toBeTruthy());
    expect(refresh).toHaveBeenCalledWith(["ABC234"]);
    expect(screen.queryByText("IN THE ROOM")).toBeNull();
  });

  it("explains a match that started while you were on your way", async () => {
    join.mockResolvedValue({ ok: false, reason: "STARTED", error: "Game already in progress" });
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: /Join room/ }));

    await waitFor(() => expect(screen.getByText(/started while you were on your way/)).toBeTruthy());
  });

  it("offers a way back if you are already in that room, instead of a second seat", async () => {
    setStatus({ youAreIn: true });
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: /Return to room/ }));

    await waitFor(() => expect(screen.getByText("IN THE ROOM")).toBeTruthy());
    expect(join).not.toHaveBeenCalled();
  });

  it("recognises your own invitation", () => {
    renderCard(message({ senderId: "me" }), "me");

    expect(screen.getByText("You invited the Mandali")).toBeTruthy();
  });

  it("lets you try before the first status arrives — the server decides on the tap", () => {
    useRoomInviteStatusStore.setState({ statuses: {} });
    renderCard();

    expect((screen.getByRole("button", { name: /Join room/ }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByText("Checking seats…")).toBeTruthy();
  });

  it("does not send two joins from a double tap", async () => {
    let finish: (v: unknown) => void = () => undefined;
    join.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    renderCard();

    const button = screen.getByRole("button", { name: /Join room/ });
    fireEvent.click(button);
    fireEvent.click(button);
    finish({ ok: true, code: "ABC234" });

    await waitFor(() => expect(screen.getByText("IN THE ROOM")).toBeTruthy());
    expect(join).toHaveBeenCalledTimes(1);
  });

  it("shows a removed invitation as removed, with nothing to join", () => {
    renderCard(message({ content: "" }));

    expect(screen.getByText("This invitation was removed.")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("describes itself to a screen reader, including the state", () => {
    setStatus({ state: "FULL", players: 4 });
    renderCard();

    expect(screen.getByRole("group").getAttribute("aria-label")).toMatch(/4 of 4 seats taken.*Room full/);
  });
});
