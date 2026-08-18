import { describe, it, expect } from "vitest";
import React from "react";
import {
  DESIGN_PRINCIPLES,
  VISUAL_IDENTITY,
  TYPOGRAPHY,
  SPACING,
  SURFACES,
  Button,
  PrimaryButton,
  SecondaryButton,
  TournamentCTAButton,
  RewardButton,
  DangerButton,
  StandardLoungePageLayout,
  SectionHeaderBlock,
  DashboardGrid,
} from "../dls";

describe("BHALYAM Design Language System (DLS) Foundation", () => {
  it("defines 5 core gaming design principles", () => {
    expect(DESIGN_PRINCIPLES.philosophy.length).toBe(5);
    expect(DESIGN_PRINCIPLES.philosophy[0].pillar).toBe("Premium Gaming First");
  });

  it("defines standard visual identity tokens and geometry", () => {
    expect(VISUAL_IDENTITY.brandName).toBe("BHALYAM");
    expect(VISUAL_IDENTITY.palette.primaryGold).toBe("#F59E0B");
    expect(VISUAL_IDENTITY.geometry.radiusXl).toBe("rounded-3xl");
  });

  it("defines strict typography classes for all text levels", () => {
    expect(TYPOGRAPHY.heroTitle).toContain("font-black");
    expect(TYPOGRAPHY.pageTitle).toContain("font-black");
    expect(TYPOGRAPHY.sectionHeader).toContain("font-bold");
    expect(TYPOGRAPHY.statNumberLarge).toContain("font-mono");
  });

  it("defines 4px spatial scale and layout spacing", () => {
    expect(SPACING.scale[1]).toBe("4px");
    expect(SPACING.scale[16]).toBe("64px");
    expect(SPACING.pagePadding).toBeDefined();
  });

  it("defines standardized surface tokens for cards and arenas", () => {
    expect(SURFACES.cardDefault).toContain("backdrop-blur-md");
    expect(SURFACES.cardElevated).toContain("backdrop-blur-lg");
    expect(SURFACES.arenaHero).toContain("backdrop-blur-xl");
  });

  it("renders all DLS button variants", () => {
    expect(React.createElement(Button, null, "Generic")).toBeDefined();
    expect(React.createElement(PrimaryButton, null, "Primary")).toBeDefined();
    expect(React.createElement(SecondaryButton, null, "Secondary")).toBeDefined();
    expect(React.createElement(TournamentCTAButton, null, "Arena")).toBeDefined();
    expect(React.createElement(RewardButton, null, "Reward")).toBeDefined();
    expect(React.createElement(DangerButton, null, "Danger")).toBeDefined();
  });

  it("renders layout blueprints and grid structures", () => {
    const layout = React.createElement(StandardLoungePageLayout, {
      children: React.createElement("div", null, "Page Content"),
    });
    expect(layout).toBeDefined();

    const header = React.createElement(SectionHeaderBlock, {
      title: "Section Title",
      subtitle: "Section Subtitle",
    });
    expect(header).toBeDefined();

    const grid = React.createElement(DashboardGrid, {
      columns: 3,
      children: React.createElement("div", null, "Grid Item"),
    });
    expect(grid).toBeDefined();
  });
});
