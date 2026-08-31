import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import JoinFeedbackBanner from "../JoinFeedbackBanner";
import type { JoinEvent } from "../../../hooks/useJoinAnimationTracker";

describe("JoinFeedbackBanner Component", () => {
  it("renders nothing when joins array is empty", () => {
    const { container } = render(
      <JoinFeedbackBanner joins={[]} onDismiss={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders human player join feedback with accessible role and player badge", () => {
    const mockJoin: JoinEvent = {
      id: "join-p1-123",
      playerId: "p1",
      name: "Alice",
      isBot: false,
      timestamp: Date.now(),
    };

    render(
      <JoinFeedbackBanner joins={[mockJoin]} onDismiss={vi.fn()} />,
    );

    const banner = screen.getByRole("status");
    expect(banner).toBeDefined();
    expect(screen.getByText("Alice")).toBeDefined();
    expect(screen.getByText("Player")).toBeDefined();
    expect(screen.getByText("Joined the table")).toBeDefined();
  });

  it("renders bot join feedback with distinct AI badge and label", () => {
    const mockBotJoin: JoinEvent = {
      id: "join-bot1-456",
      playerId: "bot_1",
      name: "Sparky Bot",
      isBot: true,
      timestamp: Date.now(),
    };

    render(
      <JoinFeedbackBanner joins={[mockBotJoin]} onDismiss={vi.fn()} />,
    );

    const banner = screen.getByRole("status");
    expect(banner).toBeDefined();
    expect(screen.getByText("Sparky Bot")).toBeDefined();
    expect(screen.getByText("AI")).toBeDefined();
    expect(screen.getByText("Joined as AI participant")).toBeDefined();
  });

  it("calls onDismiss with event id when dismiss button is clicked", () => {
    const onDismissMock = vi.fn();
    const mockJoin: JoinEvent = {
      id: "join-p1-123",
      playerId: "p1",
      name: "Alice",
      isBot: false,
      timestamp: Date.now(),
    };

    render(
      <JoinFeedbackBanner joins={[mockJoin]} onDismiss={onDismissMock} />,
    );

    const dismissBtn = screen.getByRole("button", { name: /Dismiss notification for Alice/i });
    fireEvent.click(dismissBtn);

    expect(onDismissMock).toHaveBeenCalledTimes(1);
    expect(onDismissMock).toHaveBeenCalledWith("join-p1-123");
  });

  it("uses exactly one live region even with multiple simultaneous joins", () => {
    const joins: JoinEvent[] = [
      { id: "join-p1-1", playerId: "p1", name: "Alice", isBot: false, timestamp: Date.now() },
      { id: "join-p2-2", playerId: "p2", name: "Bob", isBot: true, timestamp: Date.now() },
      { id: "join-p3-3", playerId: "p3", name: "Charlie", isBot: false, timestamp: Date.now() },
    ];

    render(<JoinFeedbackBanner joins={joins} onDismiss={vi.fn()} />);

    // A burst of joins must not spawn one aria-live region per card.
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByText("Alice")).toBeDefined();
    expect(screen.getByText("Bob")).toBeDefined();
    expect(screen.getByText("Charlie")).toBeDefined();
  });

  it("shifts below a higher-priority connection banner when hasCriticalBannerAbove is set", () => {
    const mockJoin: JoinEvent = {
      id: "join-p1-123",
      playerId: "p1",
      name: "Alice",
      isBot: false,
      timestamp: Date.now(),
    };

    const { rerender, container } = render(
      <JoinFeedbackBanner joins={[mockJoin]} onDismiss={vi.fn()} />,
    );
    expect(container.querySelector(".top-4")).not.toBeNull();

    rerender(
      <JoinFeedbackBanner joins={[mockJoin]} onDismiss={vi.fn()} hasCriticalBannerAbove />,
    );
    expect(container.querySelector(".top-14")).not.toBeNull();
  });
});
