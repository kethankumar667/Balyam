import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { describeXpJourney } from "../../../../lib/xpJourney";
import { NextMoveCard, describeNextStep } from "../NextMoveCard";

// The roadmap is its own, already-tested modal; here we only care that this card opens it.
vi.mock("../../../../components/progression/LevelRoadmapModal", () => ({
  LevelRoadmapModal: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div role="dialog" aria-label="Level roadmap" /> : null),
}));

// A player 85 XP into level 16: close enough to a level that one win finishes it.
const XP = 1585;
const journey = describeXpJourney(XP);

function setup(experiencePoints = XP) {
  const onPlay = vi.fn();
  render(<NextMoveCard experiencePoints={experiencePoints} playerId="player_1" onPlay={onPlay} />);
  return { onPlay, card: screen.getByRole("region", { name: "Player command center" }) };
}

afterEach(cleanup);

describe("NextMoveCard", () => {
  it("says where the player is and how far the next level is, from the real XP", () => {
    const { card } = setup();

    expect(card.textContent).toContain(`Level ${journey.level}`);
    expect(card.textContent).toContain(journey.title);
    expect(card.textContent).toContain(`${journey.xpIntoLevel}`);
    expect(card.textContent).toContain(`${journey.xpToNext} XP to Level ${journey.nextLevel}`);
  });

  it("turns the gap into an action: one win is enough here", () => {
    const { card } = setup();

    expect(journey.winsToLevel).toBe(1);
    expect(card.textContent).toContain(`One win takes you to Level ${journey.nextLevel}.`);
  });

  it("draws level progress exactly once, and exposes it as a progress bar with a spoken value", () => {
    setup();

    const bars = screen.getAllByRole("progressbar");
    expect(bars).toHaveLength(1);
    expect(bars[0].getAttribute("aria-label")).toBe(`Level ${journey.level} experience`);
    expect(bars[0].getAttribute("aria-valuenow")).toBe(String(journey.xpIntoLevel));
    expect(bars[0].getAttribute("aria-valuemax")).toBe(String(journey.xpPerLevel));
    expect(bars[0].getAttribute("aria-valuetext")).toContain(`${journey.xpToNext} XP to Level ${journey.nextLevel}`);
  });

  it("keeps lifetime XP as quiet secondary text", () => {
    const { card } = setup();

    expect(card.textContent).toContain("Lifetime");
    expect(card.textContent).toContain(journey.lifetimeXp.toLocaleString());
  });

  it("makes Play now the action that starts a game", () => {
    const { onPlay } = setup();

    fireEvent.click(screen.getByRole("button", { name: "Play now" }));

    expect(onPlay).toHaveBeenCalledOnce();
  });

  describe("How to earn XP", () => {
    it("starts collapsed and exposes its state and the panel it controls", () => {
      setup();
      const toggle = screen.getByRole("button", { name: "How to earn XP" });
      const panel = document.getElementById(toggle.getAttribute("aria-controls") ?? "");

      expect(toggle.getAttribute("aria-expanded")).toBe("false");
      expect(panel).not.toBeNull();
      expect(panel?.hidden).toBe(true);
    });

    it("opens to the real XP values and closes again", () => {
      setup();
      const toggle = screen.getByRole("button", { name: "How to earn XP" });
      const panel = document.getElementById(toggle.getAttribute("aria-controls") ?? "") as HTMLElement;

      fireEvent.click(toggle);

      expect(toggle.getAttribute("aria-expanded")).toBe("true");
      expect(panel.hidden).toBe(false);
      for (const way of journey.earn) expect(panel.textContent).toContain(`+${way.xp} XP`);

      fireEvent.click(toggle);

      expect(toggle.getAttribute("aria-expanded")).toBe("false");
      expect(panel.hidden).toBe(true);
    });
  });

  describe("next reward", () => {
    it("shows only the nearest milestone, not the whole roadmap", () => {
      const { card } = setup();
      const [next, later] = journey.upcoming;

      expect(card.textContent).toContain(`Next reward · Level ${next.level}`);
      expect(card.textContent).toContain(`+${next.coins.toLocaleString()} coins`);
      expect(card.textContent).toContain(`${next.levelsAway} ${next.levelsAway === 1 ? "level" : "levels"} away`);
      expect(card.textContent).not.toContain(`Level ${later.level}`);
    });

    it("sends the player to the full roadmap, which opens only on request", () => {
      setup();
      expect(screen.queryByRole("dialog", { name: "Level roadmap" })).toBeNull();

      fireEvent.click(screen.getByRole("button", { name: /View level roadmap/ }));

      expect(screen.getByRole("dialog", { name: "Level roadmap" })).toBeDefined();
    });

    it("says so, instead of showing an empty reward, once every milestone is behind the player", () => {
      const beyondEveryMilestone = 10_000_000;
      expect(describeXpJourney(beyondEveryMilestone).upcoming).toHaveLength(0);

      const { card } = setup(beyondEveryMilestone);

      expect(card.textContent).toContain("You have reached every milestone");
      expect(card.textContent).not.toContain("Next reward");
      expect(screen.getByRole("button", { name: /View level roadmap/ })).toBeDefined();
    });
  });

  it("copes with a brand-new player: level 1, nothing earned yet", () => {
    const { card } = setup(0);

    expect(card.textContent).toContain("Level 1");
    expect(card.textContent).toContain("0");
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("0");
  });
});

describe("describeNextStep", () => {
  it("names a single win when one is enough", () => {
    expect(describeNextStep({ nextLevel: 17, winsToLevel: 1, matchesToLevel: 1 })).toBe("One win takes you to Level 17.");
  });

  it("gives both routes when it will take longer, pluralised for the numbers", () => {
    expect(describeNextStep({ nextLevel: 2, winsToLevel: 3, matchesToLevel: 7 })).toBe("3 wins, or 7 matches, take you to Level 2.");
  });
});
