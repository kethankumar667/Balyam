import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ParticipantRow from "../ParticipantRow";
import type { Player } from "@shared/types";

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: "p_1",
    name: "Alex",
    isBot: false,
    isConnected: true,
    isHost: false,
    isReady: false,
    ...overrides,
  };
}

describe("ParticipantRow Animation & Distinction Suite", () => {
  it("renders human participant with proper data attributes and name", () => {
    const humanPlayer = makePlayer({ name: "Alex", isBot: false });
    const { container } = render(
      <ParticipantRow
        player={humanPlayer}
        selfId={null}
        isHost={false}
        isNewlyJoined={false}
      />,
    );

    const seat = container.querySelector("#seat-p_1");
    expect(seat).toBeDefined();
    expect(seat?.getAttribute("data-is-bot")).toBe("false");
    expect(seat?.getAttribute("data-is-new")).toBe("false");
    expect(screen.getByText("Alex")).toBeDefined();
    expect(screen.getByText("Human Player")).toBeDefined();
  });

  it("applies data-is-new='true' when isNewlyJoined is true for a human player", () => {
    const humanPlayer = makePlayer({ name: "Alex", isBot: false });
    const { container } = render(
      <ParticipantRow
        player={humanPlayer}
        selfId={null}
        isHost={false}
        isNewlyJoined={true}
      />,
    );

    const seat = container.querySelector("#seat-p_1");
    expect(seat?.getAttribute("data-is-new")).toBe("true");
    expect(seat?.getAttribute("data-is-bot")).toBe("false");
  });

  it("renders bot participant with data-is-bot='true' and AI Bot badge", () => {
    const botPlayer = makePlayer({ id: "bot_1", name: "Sparky", isBot: true });
    const { container } = render(
      <ParticipantRow
        player={botPlayer}
        selfId={null}
        isHost={false}
        isNewlyJoined={true}
      />,
    );

    const seat = container.querySelector("#seat-bot_1");
    expect(seat?.getAttribute("data-is-bot")).toBe("true");
    expect(seat?.getAttribute("data-is-new")).toBe("true");
    expect(screen.getByText("Sparky")).toBeDefined();
    expect(screen.getByText("Bot")).toBeDefined();
    expect(screen.getByText("AI Player")).toBeDefined();
  });

  it("renders presence indicator correctly for disconnected / reconnecting state", () => {
    const disconnectedPlayer = makePlayer({ isConnected: false });
    render(
      <ParticipantRow
        player={disconnectedPlayer}
        selfId={null}
        isHost={false}
      />,
    );

    expect(screen.getByText(/Reconnecting/i)).toBeDefined();
  });

  it("renders ready state indicator when player is ready", () => {
    const readyPlayer = makePlayer({ isReady: true });
    render(
      <ParticipantRow
        player={readyPlayer}
        selfId={null}
        isHost={false}
      />,
    );

    expect(screen.getByLabelText("Ready")).toBeDefined();
    expect(screen.getByText("Ready")).toBeDefined();
  });
});
