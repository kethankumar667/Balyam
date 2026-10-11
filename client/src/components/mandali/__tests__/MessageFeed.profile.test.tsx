import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach, beforeAll } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { MandaliMember, MandaliMessage } from "@shared/mandali/types.js";

const apiJson = vi.hoisted(() => vi.fn());
vi.mock("../../../lib/playerIdentity", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/playerIdentity")>()),
  apiJson,
}));

import { MessageFeed } from "../album/MessageFeed";

const member = (over: Partial<MandaliMember> = {}): MandaliMember => ({
  memberId: "mem_a",
  mandaliId: "g1",
  playerId: "p_asha",
  displayName: "Asha",
  avatar: "asha.png",
  role: "MEMBER",
  state: "ACTIVE",
  joinedAt: Date.UTC(2026, 8, 24),
  presence: "online",
  contributionScore: 0,
  ...over,
});

const line = (over: Partial<MandaliMessage> = {}): MandaliMessage =>
  ({
    messageId: "msg1",
    channelId: "c1",
    senderId: "p_asha",
    senderName: "Asha",
    senderAvatar: "asha.png",
    content: "Sunday works for me",
    timestamp: Date.now(),
    ...over,
  }) as MandaliMessage;

const feed = (messages: MandaliMessage[], members: MandaliMember[], onCoinsWith?: (id: string) => void) =>
  render(
    <MessageFeed
      variant="phone"
      messages={messages}
      members={members}
      mandaliName="Nellore Gang"
      currentUserId="p_me"
      selfId="p_me"
      coinRequests={{}}
      canManageMembers={false}
      onReact={vi.fn()}
      onPin={vi.fn()}
      onDelete={vi.fn()}
      onPayCoinRequest={vi.fn()}
      onCoinsWith={onCoinsWith}
    />,
  );

describe("MessageFeed: tapping a sender opens their profile", () => {
  beforeAll(() => {
    Element.prototype.scrollTo = (() => undefined) as typeof Element.prototype.scrollTo;
  });
  afterEach(() => {
    cleanup();
    apiJson.mockReset();
  });

  it("opens the profile card from the avatar", () => {
    apiJson.mockResolvedValue(null);
    feed([line()], [member()]);

    fireEvent.click(screen.getAllByRole("button", { name: "View Asha's profile" })[0]);

    expect(screen.getByRole("dialog")).toHaveTextContent("Profile");
    expect(apiJson).toHaveBeenCalledWith("/api/profile/p_asha/stats");
  });

  it("opens the same card from the sender's name", () => {
    apiJson.mockResolvedValue(null);
    feed([line()], [member()]);

    const buttons = screen.getAllByRole("button", { name: "View Asha's profile" });
    expect(buttons.length).toBeGreaterThanOrEqual(2);
    fireEvent.click(buttons[buttons.length - 1]);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("leaves the face of someone who is no longer in the group plain", () => {
    feed([line({ senderId: "p_gone", senderName: "Ravi" })], [member()]);

    expect(screen.queryByRole("button", { name: "View Ravi's profile" })).toBeNull();
  });

  it("offers the coin button on the card and hands over who it is for", () => {
    apiJson.mockResolvedValue(null);
    const onCoinsWith = vi.fn();
    feed([line()], [member()], onCoinsWith);

    fireEvent.click(screen.getAllByRole("button", { name: "View Asha's profile" })[0]);
    fireEvent.click(screen.getByRole("button", { name: /Send or ask for coins/ }));

    expect(onCoinsWith).toHaveBeenCalledWith("p_asha");
  });
});
