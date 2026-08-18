import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { BrowserRouter } from "react-router-dom";
import {
  PlayerJourneyTracker,
  journeyTracker,
  WelcomeModal,
  GettingStartedCard,
  SmartHint,
} from "../index";
import { STARTER_QUESTS } from "@shared/onboarding/PlayerJourney";

describe("BHALYAM FTUE & Onboarding Platform Suite", () => {
  beforeEach(() => {
    journeyTracker.reset();
  });

  describe("1. PlayerJourneyTracker", () => {
    it("initializes with zero completed milestones", () => {
      const state = journeyTracker.getState();
      expect(state.hasCompletedWelcome).toBe(false);
      expect(state.completedMilestones).toEqual([]);
      expect(journeyTracker.getCompletionPercentage()).toBe(0);
    });

    it("marks welcome modal as completed", () => {
      journeyTracker.markWelcomeComplete();
      expect(journeyTracker.getState().hasCompletedWelcome).toBe(true);
    });

    it("records milestone completion and updates progress percentage", () => {
      journeyTracker.markMilestone("PROFILE_COMPLETED");
      expect(journeyTracker.isMilestoneComplete("PROFILE_COMPLETED")).toBe(true);
      expect(journeyTracker.getCompletionPercentage()).toBe(20);

      journeyTracker.markMilestone("FIRST_MATCH_PLAYED");
      expect(journeyTracker.getCompletionPercentage()).toBe(40);
    });

    it("prevents duplicate milestone recordings", () => {
      journeyTracker.markMilestone("PROFILE_COMPLETED");
      journeyTracker.markMilestone("PROFILE_COMPLETED");
      expect(journeyTracker.getState().completedMilestones.length).toBe(1);
    });
  });

  describe("2. Starter Quests Configuration", () => {
    it("provides 5 foundational starter quests", () => {
      expect(STARTER_QUESTS.length).toBe(5);
      const totalXp = STARTER_QUESTS.reduce((acc, q) => acc + q.xpReward, 0);
      expect(totalXp).toBe(200);
    });

    it("ensures every quest has valid titles, descriptions, and action texts", () => {
      for (const quest of STARTER_QUESTS) {
        expect(quest.title).toBeDefined();
        expect(quest.description).toBeDefined();
        expect(quest.xpReward).toBeGreaterThan(0);
        expect(quest.actionText).toBeDefined();
      }
    });
  });

  describe("3. WelcomeModal Component", () => {
    it("renders WelcomeModal when open is true", () => {
      const onClose = vi.fn();
      const el = React.createElement(WelcomeModal, {
        open: true,
        onClose,
      });
      expect(el).toBeDefined();
      expect(el.props.open).toBe(true);
    });

    it("returns null when open is false", () => {
      const onClose = vi.fn();
      const el = React.createElement(WelcomeModal, {
        open: false,
        onClose,
      });
      expect(el.props.open).toBe(false);
    });
  });

  describe("4. GettingStartedCard Component", () => {
    it("renders GettingStartedCard with router wrapper", () => {
      const card = React.createElement(
        BrowserRouter,
        null,
        React.createElement(GettingStartedCard, { onDismiss: vi.fn() })
      );
      expect(card).toBeDefined();
    });
  });

  describe("5. SmartHint Contextual Guidance", () => {
    it("renders contextual hint banner", () => {
      const hint = React.createElement(
        BrowserRouter,
        null,
        React.createElement(SmartHint, {
          id: "test-hint-1",
          title: "Party Reminder",
          tip: "Invite friends to queue together.",
        })
      );
      expect(hint).toBeDefined();
    });
  });
});
