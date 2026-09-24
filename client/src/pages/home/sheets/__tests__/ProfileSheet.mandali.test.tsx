import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";

const join = vi.hoisted(() => vi.fn());
vi.mock("../../../../lib/roomJoin", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../../lib/roomJoin")>()),
  joinRoomByCode: join,
}));
vi.mock("../../../../lib/playerIdentity", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../../lib/playerIdentity")>()),
  apiJson: vi.fn(async () => null),
}));

import { ProfileSheet } from "../ProfileSheet";
import type { NotificationItem } from "../../../../lib/profileNotifications";
import { useAuthStore, setAccessToken } from "../../../../store/authStore";
import { useRoomInviteStatusStore } from "../../../../store/roomInviteStatusStore";

const DIGEST: NotificationItem = {
  id: "mandali:m1", type: "mandali", title: "47 new messages in Ludo Lounge",
  desc: "Rajesh (23), Sai (11) +5 more · Latest: “who is up for Ludo tonight?”",
  time: "2m ago", unread: true, mandaliId: "m1", mandaliHandle: "ludo-lounge",
};
const INVITE: NotificationItem = {
  id: "mandali-invite:i1", type: "mandali_invite", title: "Rajesh invited you to play Ludo",
  desc: "Room ABC234 · Ludo Lounge", time: "1m ago", unread: true, roomCode: "ABC234",
  mandaliId: "m1", mandaliHandle: "ludo-lounge", inviteMessageId: "i1",
};

const setRoom = (over: Record<string, unknown> = {}) =>
  useRoomInviteStatusStore.setState({
    statuses: { ABC234: { code: "ABC234", state: "OPEN", players: 2, maxPlayers: 4, youAreIn: false, ...over } as never },
    subscribe: () => () => undefined,
    refresh: vi.fn(async () => undefined),
  });

function renderPanel(items: NotificationItem[] = [DIGEST, INVITE]) {
  const onClose = vi.fn();
  const onUpdate = vi.fn();
  render(
    <BrowserRouter>
      <ProfileSheet
        open
        onClose={onClose}
        notifications={items}
        onUpdateNotifications={onUpdate}
        onOpenJoin={() => {}}
        initialView="notifications"
      />
    </BrowserRouter>
  );
  return { onClose, onUpdate };
}

describe("ProfileSheet — Mandali notifications", () => {
  beforeEach(() => {
    setAccessToken("test-access-token");
    useAuthStore.setState({ kind: "member", userId: "user-1", isAdmin: false, isSuperAdmin: false } as never);
    join.mockReset();
    join.mockResolvedValue({ ok: true, code: "ABC234" });
    setRoom();
    window.history.pushState({}, "", "/");
  });
  afterEach(() => {
    cleanup();
    setAccessToken(null);
  });

  it("shows a busy Mandali as one row that says how many, from whom, and the latest line", () => {
    renderPanel();

    expect(screen.getByText("47 new messages in Ludo Lounge")).toBeTruthy();
    expect(screen.getByText(/Rajesh \(23\), Sai \(11\) \+5 more/)).toBeTruthy();
  });

  it("opens the conversation when the summary is tapped", () => {
    const { onClose } = renderPanel();

    fireEvent.click(screen.getByText("47 new messages in Ludo Lounge"));

    expect(onClose).toHaveBeenCalled();
    expect(window.location.pathname).toBe("/mandali/ludo-lounge");
  });

  it("shows a shared room as its own row, with a live seat count and a Join button", () => {
    renderPanel();

    expect(screen.getByText("Rajesh invited you to play Ludo")).toBeTruthy();
    expect(screen.getByText(/2 of 4 seats/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Join Room" })).toBeTruthy();
  });

  it("takes the member straight into the room from the Join button", async () => {
    const { onClose } = renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Join Room" }));

    await waitFor(() => expect(window.location.pathname).toBe("/room/ABC234"));
    expect(join).toHaveBeenCalledWith("ABC234");
    expect(onClose).toHaveBeenCalled();
  });

  it("shows a full room as full — a plain fact, not a button that fails", () => {
    setRoom({ state: "FULL", players: 4 });
    renderPanel();

    const button = screen.getByRole("button", { name: "Room full" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(screen.getByText(/4 of 4 seats · Every seat is taken/)).toBeTruthy();
  });

  it("explains a lost race in words", async () => {
    join.mockResolvedValue({ ok: false, reason: "FULL", error: "Room is full" });
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Join Room" }));

    expect(await screen.findByText(/just filled up/)).toBeTruthy();
    expect(window.location.pathname).toBe("/");
  });

  it("looking at a shared room does not mark anything read", () => {
    const { onUpdate } = renderPanel();

    fireEvent.click(screen.getByText("Rajesh invited you to play Ludo"));

    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("dismisses just the invitation", () => {
    const { onUpdate } = renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(onUpdate).toHaveBeenCalledTimes(1);
    const updater = onUpdate.mock.calls[0][0] as (prev: NotificationItem[]) => NotificationItem[];
    expect(updater([DIGEST, INVITE]).map((n) => n.id)).toEqual(["mandali:m1"]);
  });

  it("filters: Chats shows the summary only, Invites shows the room only", async () => {
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "chats" }));
    // Rows leave with an exit animation, so wait for them to go.
    await waitFor(() => expect(screen.queryByText("Rajesh invited you to play Ludo")).toBeNull());
    expect(screen.getByText("47 new messages in Ludo Lounge")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "invites" }));
    await waitFor(() => expect(screen.queryByText("47 new messages in Ludo Lounge")).toBeNull());
    expect(screen.getByText("Rajesh invited you to play Ludo")).toBeTruthy();
  });

  it("says you are all caught up when there is nothing", () => {
    renderPanel([]);

    expect(screen.getByText("You're all caught up!")).toBeTruthy();
  });
});
