import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MiniclipLevelBadge } from "../MiniclipLevelBadge";
import { MatchXPBreakdownCard } from "../MatchXPBreakdownCard";
import { MiniclipLevelUpModal } from "../MiniclipLevelUpModal";
import { LevelRoadmapModal } from "../LevelRoadmapModal";
import type { MatchXPBreakdown } from "@shared/progression/MiniclipProgression";

vi.mock("canvas-confetti", () => ({
  default: vi.fn(),
}));

describe("Miniclip Progression Components", () => {
  describe("MiniclipLevelBadge", () => {
    it("renders level numeral and proper tier label", () => {
      render(<MiniclipLevelBadge level={1} size="md" />);
      expect(screen.getByTestId("miniclip-level-number").textContent).toBe("1");
      expect(screen.getByTestId("miniclip-level-badge").getAttribute("aria-label")).toBe(
        "Level 1 • Bronze Tier (Novice)"
      );
    });

    it("renders higher tiers with appropriate labels", () => {
      const { rerender } = render(<MiniclipLevelBadge level={10} size="sm" />);
      expect(screen.getByTestId("miniclip-level-number").textContent).toBe("10");
      expect(screen.getByTestId("miniclip-level-badge").getAttribute("aria-label")).toBe(
        "Level 10 • Silver Tier (Contender)"
      );

      rerender(<MiniclipLevelBadge level={35} size="lg" />);
      expect(screen.getByTestId("miniclip-level-number").textContent).toBe("35");
      expect(screen.getByTestId("miniclip-level-badge").getAttribute("aria-label")).toBe(
        "Level 35 • Gold Tier (Professional)"
      );

      rerender(<MiniclipLevelBadge level={155} size="xl" />);
      expect(screen.getByTestId("miniclip-level-number").textContent).toBe("155");
      expect(screen.getByTestId("miniclip-level-badge").getAttribute("aria-label")).toBe(
        "Level 155 • Celestial Tier (Living Legend)"
      );
    });

    it("handles click callback when passed", () => {
      const handleClick = vi.fn();
      render(<MiniclipLevelBadge level={25} onClick={handleClick} />);
      const badge = screen.getByRole("button");
      fireEvent.click(badge);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("MatchXPBreakdownCard", () => {
    const mockBreakdown: MatchXPBreakdown = {
      totalXP: 60,
      items: [
        { id: "match_played", label: "Match Played", amount: 15, category: "base" },
        { id: "match_win", label: "Victory Bonus", amount: 35, category: "outcome" },
        { id: "win_streak", label: "2x Win Streak Bonus", amount: 10, category: "streak" },
      ],
      previousXP: 80,
      newXP: 140,
      previousLevel: 1,
      newLevel: 2,
      leveledUp: true,
      rewardsUnlocked: [{ coins: 150, title: "First Steps" }],
    };

    it("renders total XP earned and level up banner", () => {
      render(<MatchXPBreakdownCard breakdown={mockBreakdown} />);
      expect(screen.getByText("+60 XP EARNED")).toBeDefined();
      expect(screen.getByText("LEVEL UP!")).toBeDefined();
      expect(screen.getByText("Level 2")).toBeDefined();
    });

    it("allows toggling the itemized XP breakdown", () => {
      render(<MatchXPBreakdownCard breakdown={mockBreakdown} />);
      const toggleBtn = screen.getByText("View XP Breakdown");
      fireEvent.click(toggleBtn);

      expect(screen.getByText("Match Played")).toBeDefined();
      expect(screen.getByText("+15 XP")).toBeDefined();
      expect(screen.getByText("Victory Bonus")).toBeDefined();
      expect(screen.getByText("+35 XP")).toBeDefined();
      expect(screen.getByText("2x Win Streak Bonus")).toBeDefined();
      expect(screen.getByText("+10 XP")).toBeDefined();
    });
  });

  describe("MiniclipLevelUpModal", () => {
    it("renders celebration details when open", () => {
      const handleClose = vi.fn();
      render(<MiniclipLevelUpModal isOpen={true} level={5} onClose={handleClose} />);

      expect(screen.getByText("LEVEL UP!")).toBeDefined();
      expect(screen.getByText("Bronze TIER UNLOCKED")).toBeDefined();
      expect(screen.getByText("Level 5 • Rising Talent")).toBeDefined();
      expect(screen.getByText("CLAIM & CONTINUE")).toBeDefined();

      const claimBtn = screen.getByText("CLAIM & CONTINUE");
      fireEvent.click(claimBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it("renders nothing when isOpen is false", () => {
      const handleClose = vi.fn();
      render(<MiniclipLevelUpModal isOpen={false} level={5} onClose={handleClose} />);
      expect(screen.queryByText("LEVEL UP!")).toBeNull();
    });
  });

  describe("LevelRoadmapModal", () => {
    it("renders trophy road and milestones when open", () => {
      const handleClose = vi.fn();
      render(
        <LevelRoadmapModal
          isOpen={true}
          onClose={handleClose}
          experiencePoints={450}
          playerId="test_player"
        />
      );

      expect(screen.getByText("Level Rewards Road")).toBeDefined();
      expect(
        screen.getByText("Progress through levels to unlock coins, titles & prestige crests")
      ).toBeDefined();
      expect(screen.getByText("Bronze Tier • 450 Lifetime XP")).toBeDefined();
    });
  });
});
