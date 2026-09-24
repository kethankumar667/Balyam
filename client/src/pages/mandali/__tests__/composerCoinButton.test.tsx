import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { Mandali, MandaliChannel, MandaliMember } from "@shared/mandali/types.js";
import { MandaliHubDesktop } from "../MandaliHubDesktop";
import { MandaliHubMobile } from "../MandaliHubMobile";

/**
 * The composer's coin button was wired as `onClick={onRequestCoins}`, so the
 * click event itself arrived as the handler's first argument. The page's
 * handler treated any first argument as "the member to ask", found no such
 * member, and the instant request could never fire. Both layouts must call it
 * with nothing.
 */

const mandali = { id: "m1", handle: "h", name: "Test Mandali", level: 1, xp: 0 } as unknown as Mandali;
const channels = [{ channelId: "c1", mandaliId: "m1", name: "lounge-chat", type: "TEXT" }] as unknown as MandaliChannel[];
const members = [
  { memberId: "a", mandaliId: "m1", playerId: "me", displayName: "Me", avatar: "a1", role: "MEMBER", state: "ACTIVE", joinedAt: 1, presence: "online", contributionScore: 0 },
] as unknown as MandaliMember[];

const commonProps = () => ({
  mandali,
  members,
  channels,
  activeChannelId: "c1",
  messages: [],
  parties: [],
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
  onCreateParty: vi.fn(),
  onJoinParty: vi.fn(),
  onLeaveParty: vi.fn(),
  onLaunchParty: vi.fn(),
  onOpenCoinTransfer: vi.fn(),
  onPayCoinRequest: vi.fn(async () => ({ success: true })),
  onPinMessage: vi.fn(async () => ({ success: true })),
  onDeleteMessage: vi.fn(async () => ({ success: true })),
  onOpenInvite: vi.fn(),
  onOpenGroupInfo: vi.fn(),
  onOpenMembers: vi.fn(),
  onOpenPendingRequests: vi.fn(),
  onLeaveMandali: vi.fn(),
});

describe("composer Request Coins button", () => {
  afterEach(cleanup);

  it("desktop: calls the handler with no arguments", () => {
    const onRequestCoins = vi.fn();
    render(
      <MemoryRouter>
        <MandaliHubDesktop {...commonProps()} onRequestCoins={onRequestCoins} />
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
        <MandaliHubMobile {...commonProps()} onRequestCoins={onRequestCoins} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Request coins" }));

    expect(onRequestCoins).toHaveBeenCalledTimes(1);
    expect(onRequestCoins).toHaveBeenCalledWith();
  });

  it("says so, in its accessible name, when the request is on cooldown", () => {
    render(
      <MemoryRouter>
        <MandaliHubMobile {...commonProps()} onRequestCoins={vi.fn()} isCoinRequestCoolingDown />
      </MemoryRouter>
    );

    expect(screen.getByRole("button", { name: /on cooldown/i })).toBeTruthy();
  });
});
