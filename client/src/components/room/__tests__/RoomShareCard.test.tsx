import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../mandali/ShareToMandaliSheet", () => ({
  default: ({ open, roomCode }: { open: boolean; roomCode: string }) =>
    open ? <div role="dialog">Mandali sheet for {roomCode}</div> : null,
}));
vi.mock("../../QrCodeModal", () => ({ default: () => null }));

import RoomShareCard from "../RoomShareCard";
import { rememberInviteFriend, resetInviteFriends } from "../../../lib/inviteFriend";
import { useAuthStore } from "../../../store/authStore";

const renderCard = () =>
  render(
    <MemoryRouter>
      <RoomShareCard code="ABC234" game="ludo" name="Friday Ludo" />
    </MemoryRouter>
  );

describe("RoomShareCard — a room made for one friend", () => {
  afterEach(() => { cleanup(); resetInviteFriends(); });

  it("says who it is for and shares a message that names them", () => {
    useAuthStore.setState({ isMember: true } as never);
    rememberInviteFriend("ABC234", "Meera");
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    renderCard();

    expect(screen.getByText(/share this with meera to start your match/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Share Room Link" }));
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ text: expect.stringContaining("Meera, I'm waiting for you in") }));
  });

  it("keeps the usual wording for every other room", () => {
    useAuthStore.setState({ isMember: true } as never);
    renderCard();
    expect(screen.getByText(/share this code with friends to join/i)).toBeTruthy();
  });
});

describe("RoomShareCard — Mandali button", () => {
  afterEach(cleanup);

  it("is offered to members", () => {
    useAuthStore.setState({ isMember: true } as never);
    renderCard();

    expect(screen.getByRole("button", { name: "Share this room to a Mandali" })).toBeTruthy();
  });

  it("is not offered to guests — a Mandali needs an account", () => {
    useAuthStore.setState({ isMember: false } as never);
    renderCard();

    expect(screen.queryByRole("button", { name: "Share this room to a Mandali" })).toBeNull();
  });

  it("opens the Mandali picker for this room's code", () => {
    useAuthStore.setState({ isMember: true } as never);
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: "Share this room to a Mandali" }));

    expect(screen.getByRole("dialog").textContent).toContain("ABC234");
  });
});
