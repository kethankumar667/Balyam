import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Player } from "@shared/types";
import ParticipantRow from "../ParticipantRow";

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: "p_1",
    name: "Bob",
    isHost: false,
    isReady: true,
    isConnected: true,
    ...overrides,
  };
}

describe("ParticipantRow — readiness blocker visibility (2026-09-09)", () => {
  it("renders the plain Ready badge when there is no active start attempt", () => {
    render(
      <ParticipantRow
        player={makePlayer({ isReady: true })}
        selfId="p_self"
        isHost={false}
      />
    );
    expect(screen.getByLabelText("Ready")).toBeDefined();
  });

  it("renders the plain Waiting badge when not ready and no blockers were supplied", () => {
    render(
      <ParticipantRow
        player={makePlayer({ isReady: false })}
        selfId="p_self"
        isHost={false}
      />
    );
    expect(screen.getByLabelText("Waiting")).toBeDefined();
  });

  it("shows a specific rotate-device reason instead of a generic Waiting badge", () => {
    render(
      <ParticipantRow
        player={makePlayer({ name: "Bob", isReady: false })}
        selfId="p_self"
        isHost={false}
        blockers={["ORIENTATION_REQUIRED"]}
        requiredOrientation="landscape"
      />
    );
    expect(screen.getByText("Rotate device")).toBeDefined();
    expect(
      screen.getByLabelText(
        "This game requires landscape mode. Bob needs to rotate their device to continue."
      )
    ).toBeDefined();
    expect(screen.queryByLabelText("Waiting")).toBeNull();
  });

  it("shows a Confirming badge for a player who is marked ready but hasn't acknowledged the preflight yet", () => {
    // A real, distinct state: the lobby "I'm Ready" toggle and the preflight
    // ack are two different signals — a plain "Ready" badge here would be
    // misleading during the window between them.
    render(
      <ParticipantRow
        player={makePlayer({ name: "Alice", isReady: true })}
        selfId="p_self"
        isHost={false}
        blockers={["ACKNOWLEDGEMENT_MISSING"]}
      />
    );
    expect(screen.getByText("Confirming")).toBeDefined();
    expect(screen.queryByLabelText("Ready")).toBeNull();
  });

  it("does not surface DISCONNECTED as a blocker badge (the connection-dot subtext already covers it)", () => {
    render(
      <ParticipantRow
        player={makePlayer({ name: "Bob", isReady: false, isConnected: false })}
        selfId="p_self"
        isHost={false}
        blockers={[]}
      />
    );
    expect(screen.getByText("Reconnecting...")).toBeDefined();
    expect(screen.getByLabelText("Waiting")).toBeDefined();
  });

  it("renders Edit and Delete buttons for a bot when user is host in card variant", () => {
    const onRemoveBot = vi.fn();
    const onRenameBot = vi.fn();

    render(
      <ParticipantRow
        player={makePlayer({ id: "bot_1", name: "Robo", isBot: true })}
        selfId="p_host"
        isHost={true}
        onRemoveBot={onRemoveBot}
        onRenameBot={onRenameBot}
        variant="card"
      />
    );

    const editBtn = screen.getByLabelText("Rename Robo");
    const deleteBtn = screen.getByLabelText("Remove Robo");
    expect(editBtn).toBeDefined();
    expect(deleteBtn).toBeDefined();

    // Click Delete calls onRemoveBot
    fireEvent.click(deleteBtn);
    expect(onRemoveBot).toHaveBeenCalledWith("bot_1");
  });

  it("opens RenameBotModal when clicking edit button and submits new name", () => {
    const onRenameBot = vi.fn();

    render(
      <ParticipantRow
        player={makePlayer({ id: "bot_1", name: "Robo", isBot: true })}
        selfId="p_host"
        isHost={true}
        onRenameBot={onRenameBot}
        variant="card"
      />
    );

    const editBtn = screen.getByLabelText("Rename Robo");
    fireEvent.click(editBtn);

    // Modal dialog is open
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText("Rename Bot")).toBeDefined();

    const input = screen.getByLabelText("Bot Nickname") as HTMLInputElement;
    expect(input.value).toBe("Robo");

    // Change value and submit
    fireEvent.change(input, { target: { value: "SuperBot" } });
    const saveBtn = screen.getByRole("button", { name: /save/i });
    fireEvent.click(saveBtn);

    expect(onRenameBot).toHaveBeenCalledWith("bot_1", "SuperBot");
  });

  it("does not render Edit or Delete buttons if player is human or user is not host", () => {
    render(
      <ParticipantRow
        player={makePlayer({ id: "p_guest", name: "Guest", isBot: false })}
        selfId="p_host"
        isHost={true}
        variant="card"
      />
    );

    expect(screen.queryByLabelText("Rename Guest")).toBeNull();
    expect(screen.queryByLabelText("Remove Guest")).toBeNull();
  });
});
