import { describe, it, expect } from "vitest";
import React, { useRef } from "react";
import { render, screen, waitFor } from "@testing-library/react";
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
import Modal from "../../components/Modal";

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

  /**
   * The button-consolidation pass routes several `<Modal initialFocusRef>`
   * targets (e.g. LeaveRoomModal's "Stay Here") through DLS `Button`
   * variants instead of a raw `<button ref={...}>`. `useFocusTrap` calls
   * `.focus()` on whatever `initialFocusRef.current` resolves to — if
   * `Button` didn't forward its ref to the real DOM node, that would
   * silently stay `null` and nothing would be focused, a gap invisible to
   * anything except a keyboard-only pass. This is the regression test for
   * that specific chain, not a general "does Modal work" test (see
   * MODAL-SYSTEM-AUDIT.md for that).
   */
  it("forwards a ref through SecondaryButton to the real <button>, and Modal's initialFocusRef focuses it", async () => {
    function Harness() {
      const btnRef = useRef<HTMLButtonElement>(null);
      return (
        <Modal open initialFocusRef={btnRef}>
          <SecondaryButton ref={btnRef}>Stay Here</SecondaryButton>
        </Modal>
      );
    }
    render(<Harness />);
    const btn = screen.getByText("Stay Here").closest("button");
    expect(btn).not.toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(btn));
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
