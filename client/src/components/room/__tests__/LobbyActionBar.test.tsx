import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LobbyActionBar from "../LobbyActionBar";

describe("LobbyActionBar Component (Phase 7F Upgrade)", () => {
  it("renders Start Game with dynamic commitment coins when isHost is true", () => {
    render(
      <LobbyActionBar
        isHost={true}
        isReady={true}
        canStart={true}
        startGameDisabledReason={null}
        readyCount={4}
        totalCount={4}
        commitmentCoins="400"
        onToggleReady={vi.fn()}
        onStartGame={vi.fn()}
        variant="desktop-panel"
      />
    );

    const startBtn = screen.getByRole("button", { name: /Start Game/i });
    expect(startBtn).toBeDefined();
    expect(screen.getByText("Start Game (🪙 400)")).toBeDefined();
    expect(screen.getByText("4 of 4 ready")).toBeDefined();
  });

  it("renders disabled state with honest reason when canStart is false", () => {
    render(
      <LobbyActionBar
        isHost={true}
        isReady={false}
        canStart={false}
        startGameDisabledReason="Waiting for 1 player to be ready"
        readyCount={3}
        totalCount={4}
        commitmentCoins="400"
        onToggleReady={vi.fn()}
        onStartGame={vi.fn()}
        variant="desktop-panel"
      />
    );

    const startBtn = screen.getByRole("button", { name: /Start Game disabled/i });
    expect(startBtn.getAttribute("disabled")).not.toBeNull();
    expect(screen.getByText("Waiting for 1 player to be ready")).toBeDefined();
  });

  it("renders a plain Start Game label with no amount when commitmentCoins is unavailable — never a guessed number", () => {
    // Regression guard for the original defect: this used to fall back to
    // `Math.max(1, totalCount) * 100` when no commitmentCoins prop was
    // passed. It must now show no coin amount at all rather than invent one.
    render(
      <LobbyActionBar
        isHost={true}
        isReady={true}
        canStart={true}
        startGameDisabledReason={null}
        readyCount={3}
        totalCount={3}
        commitmentCoins={undefined}
        onToggleReady={vi.fn()}
        onStartGame={vi.fn()}
        variant="desktop-panel"
      />
    );

    expect(screen.getByText("Start Game")).toBeDefined();
    expect(screen.queryByText(/🪙/)).toBeNull();
    expect(screen.queryByText(/Start Game \(/)).toBeNull();
  });

  it("calls onToggleReady when ready button is clicked", () => {
    const onToggleReady = vi.fn();
    render(
      <LobbyActionBar
        isHost={false}
        isReady={false}
        canStart={false}
        startGameDisabledReason="Waiting for host"
        readyCount={1}
        totalCount={2}
        onToggleReady={onToggleReady}
        onStartGame={vi.fn()}
        variant="desktop-panel"
      />
    );

    const readyBtn = screen.getByRole("button", { name: /I'm Ready/i });
    fireEvent.click(readyBtn);
    expect(onToggleReady).toHaveBeenCalledTimes(1);
  });

  it("renders sticky-mobile variant properly", () => {
    render(
      <LobbyActionBar
        isHost={true}
        isReady={true}
        canStart={true}
        startGameDisabledReason={null}
        readyCount={2}
        totalCount={2}
        commitmentCoins="200"
        onToggleReady={vi.fn()}
        onStartGame={vi.fn()}
        variant="sticky-mobile"
      />
    );

    expect(screen.getByText("Start Game (🪙 200)")).toBeDefined();
    expect(screen.getByText("2 of 2 ready")).toBeDefined();
  });

  it("renders Start Game (Free) when commitmentCoins is '0' (bot practice table)", () => {
    render(
      <LobbyActionBar
        isHost={true}
        isReady={true}
        canStart={true}
        startGameDisabledReason={null}
        readyCount={8}
        totalCount={8}
        commitmentCoins="0"
        onToggleReady={vi.fn()}
        onStartGame={vi.fn()}
        variant="desktop-panel"
      />
    );

    expect(screen.getByText("Start Game (Free)")).toBeDefined();
    expect(screen.getByText("8 of 8 ready")).toBeDefined();
  });
});
