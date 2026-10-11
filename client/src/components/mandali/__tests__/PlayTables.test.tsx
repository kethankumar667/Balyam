import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { MandaliMessage } from "@shared/mandali/types.js";

vi.mock("../RoomInviteCard", () => ({
  default: ({ message }: { message: MandaliMessage }) => <div data-testid="table">{message.roomCode}</div>,
}));

import { PlayTables, recentTables } from "../PlayTables";

const HOUR = 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 11, 12, 0, 0);

const invite = (code: string, ageMs: number, over: Partial<MandaliMessage> = {}): MandaliMessage =>
  ({
    messageId: `m_${code}_${ageMs}`,
    channelId: "c1",
    senderId: "p1",
    senderName: "Asha",
    senderAvatar: "a.png",
    content: "invite",
    kind: "ROOM_INVITE",
    roomCode: code,
    timestamp: NOW - ageMs,
    ...over,
  }) as MandaliMessage;

describe("recentTables", () => {
  it("lists shared rooms newest first, one per room code", () => {
    const messages = [invite("AAA111", 2 * HOUR), invite("BBB222", HOUR), invite("AAA111", 30 * 60 * 1000)];

    expect(recentTables(messages, NOW).map((m) => m.roomCode)).toEqual(["AAA111", "BBB222"]);
  });

  it("skips old rooms, deleted cards and ordinary chat", () => {
    const messages = [
      invite("OLD111", 5 * HOUR),
      invite("GONE22", HOUR, { content: "" }),
      invite("CHAT33", HOUR, { kind: undefined }),
      invite("LIVE44", HOUR),
    ];

    expect(recentTables(messages, NOW).map((m) => m.roomCode)).toEqual(["LIVE44"]);
  });
});

describe("PlayTables", () => {
  afterEach(cleanup);

  const show = (messages: MandaliMessage[], onStart = vi.fn()) => {
    render(
      <MemoryRouter>
        <PlayTables messages={messages} groupName="Nellore Gang" selfId="p_me" onStart={onStart} variant="phone" />
      </MemoryRouter>,
    );
    return onStart;
  };

  it("invites the group to start the first game when nothing is open", () => {
    const onStart = show([]);

    fireEvent.click(screen.getByRole("button", { name: "Start the first game" }));

    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("shows a card for each recent room", () => {
    const recent = Date.now() - 60 * 1000;
    show([invite("AAA111", 0, { timestamp: recent }), invite("BBB222", 0, { timestamp: recent })]);

    expect(screen.getAllByTestId("table")).toHaveLength(2);
  });
});
