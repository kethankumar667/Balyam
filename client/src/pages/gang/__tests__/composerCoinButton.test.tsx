import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { Gang, GangChannel, GangMember } from "@shared/gang/types.js";
import { GangHubDesktop } from "../GangHubDesktop";
import { GangHubMobile } from "../GangHubMobile";

/**
 * The composer's coin button was wired as `onClick={onRequestCoins}`, so the
 * click event itself arrived as the handler's first argument. The page's
 * handler treated any first argument as "the member to ask", found no such
 * member, and the instant request could never fire. Both layouts must call it
 * with nothing.
 */

const gang = { id: "m1", handle: "h", name: "Test Gang", level: 1, xp: 0 } as unknown as Gang;
const channels = [{ channelId: "c1", gangId: "m1", name: "lounge-chat", type: "TEXT" }] as unknown as GangChannel[];
const members = [
  { memberId: "a", gangId: "m1", playerId: "me", displayName: "Me", avatar: "a1", role: "MEMBER", state: "ACTIVE", joinedAt: 1, presence: "online", contributionScore: 0 },
] as unknown as GangMember[];

const commonProps = () => ({
  gang,
  members,
  channels,
  activeChannelId: "c1",
  messages: [],
  memories: [],
  currentUserId: "me",
  selfId: "me",
  isOwner: false,
  canManageMembers: false,
  canEditInfo: false,
  pendingRequestCount: 0,
  coinRequests: {},
  onSelectChannel: vi.fn(),
  onSendMessage: vi.fn(),
  onReactMessage: vi.fn(),
  onStartGame: vi.fn(),
  onOpenCoinTransfer: vi.fn(),
  onPayCoinRequest: vi.fn(async () => ({ success: true })),
  onPinMessage: vi.fn(async () => ({ success: true })),
  onDeleteMessage: vi.fn(async () => ({ success: true })),
  onOpenInvite: vi.fn(),
  onOpenGroupInfo: vi.fn(),
  onOpenMembers: vi.fn(),
  onOpenPendingRequests: vi.fn(),
  onLeaveGang: vi.fn(),
});

describe("composer Request Coins button", () => {
  afterEach(cleanup);

  it("desktop: calls the handler with no arguments", () => {
    const onRequestCoins = vi.fn();
    render(
      <MemoryRouter>
        <GangHubDesktop {...commonProps()} onRequestCoins={onRequestCoins} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Request coins" }));

    expect(onRequestCoins).toHaveBeenCalledTimes(1);
    expect(onRequestCoins).toHaveBeenCalledWith();
  });

  it("mobile: calls the handler with no arguments", () => {
    const onRequestCoins = vi.fn();
    render(
      <MemoryRouter>
        <GangHubMobile {...commonProps()} onRequestCoins={onRequestCoins} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Request coins" }));

    expect(onRequestCoins).toHaveBeenCalledTimes(1);
    expect(onRequestCoins).toHaveBeenCalledWith();
  });

  it("says so, in its accessible name, when the request is on cooldown", () => {
    render(
      <MemoryRouter>
        <GangHubMobile {...commonProps()} onRequestCoins={vi.fn()} isCoinRequestCoolingDown />
      </MemoryRouter>
    );

    expect(screen.getByRole("button", { name: /on cooldown/i })).toBeTruthy();
  });

  it("desktop: keeps coin actions in the group menu", () => {
    const onOpenCoinTransfer = vi.fn();
    render(
      <MemoryRouter>
        <GangHubDesktop {...commonProps()} onRequestCoins={vi.fn()} onOpenCoinTransfer={onOpenCoinTransfer} />
      </MemoryRouter>,
    );

    const groupMenu = screen.getByRole("navigation", { name: "Test Gang" });
    fireEvent.click(within(groupMenu).getByRole("button", { name: /Coins/ }));

    expect(onOpenCoinTransfer).toHaveBeenCalledTimes(1);
    expect(onOpenCoinTransfer).toHaveBeenCalledWith();
  });
});
