import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Button, SURFACES, TYPOGRAPHY } from "../dls";
import { GLASSMORPHISM } from "../premium/glassmorphism";
import { EmptyStateIllustration } from "../premium/EmptyStateIllustration";
import { PremiumErrorState } from "../premium/PremiumErrorState";
import { PremiumProgressCard } from "../premium/PremiumProgressCard";
import { SkeletonLoader } from "../premium/SkeletonLoader";
import { RewardRevealModal } from "../premium/RewardRevealModal";
import { SectionHeaderBlock } from "../dls/PageBlueprints";
import { MOTION_TOKENS } from "../premium/motionTokens";

afterEach(cleanup);

describe("shared lounge consistency", () => {
  it("uses adaptive surfaces and readable typography rather than dark-only defaults", () => {
    for (const key of ["cardDefault", "cardElevated", "panelSubtle", "modalHero"] as const) {
      expect(SURFACES[key]).toContain("var(--chrome-");
      expect(SURFACES[key]).not.toMatch(/bg-(stone|zinc)-9/);
    }
    expect(GLASSMORPHISM.card).toContain("var(--chrome-");
    expect(TYPOGRAPHY.pageTitle).toContain("var(--chrome-ink)");
    expect(TYPOGRAPHY.body).toContain("var(--chrome-ink-soft)");
  });

  it("keeps the button label available while loading and announces busy state", () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Save preferences</Button>);
    const button = screen.getByRole("button", { name: "Save preferences" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("defaults non-submit actions to button and preserves explicit submit behavior", () => {
    const { rerender } = render(<Button>Open details</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
    rerender(<Button type="submit">Save</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it("lets caller classes override defaults deterministically", () => {
    render(<Button className="rounded-full min-h-[52px]">Action</Button>);
    expect(screen.getByRole("button").className).not.toContain("rounded-xl");
    expect(screen.getByRole("button").className).not.toContain("min-h-[48px]");
  });

  it("gives empty/error actions the same minimum touch size without decorative emoji", () => {
    const retry = vi.fn();
    render(<>
      <EmptyStateIllustration type="friends" actionText="Find friends" onAction={retry} />
      <PremiumErrorState onRetry={retry} />
    </>);
    for (const button of screen.getAllByRole("button")) {
      expect(button.className).toContain("min-h-[44px]");
    }
    expect(screen.queryByText("⚠️")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("exposes the visible progress consistently to assistive technology", () => {
    render(<PremiumProgressCard title="Level progress" current={40} total={100} progressPercent={40} />);
    const progress = screen.getByRole("progressbar", { name: "Level progress" });
    expect(progress).toHaveAttribute("aria-valuenow", "40");
    expect(progress).toHaveAttribute("aria-valuemin", "0");
    expect(progress).toHaveAttribute("aria-valuemax", "100");
  });

  it.each(["card", "hero", "profile", "table", "grid"] as const)(
    "announces one loading status for the %s skeleton and keeps its decoration adaptive",
    (type) => {
      render(<SkeletonLoader type={type} count={2} />);
      const status = screen.getByRole("status");
      expect(status).toHaveAccessibleName("Loading content");
      expect(status).toHaveAttribute("aria-busy", "true");
      expect(status.querySelector('[aria-hidden="true"]')).not.toBeNull();
      expect(status.innerHTML).toContain("motion-reduce:animate-none");
      expect(status.innerHTML).not.toMatch(/bg-stone-|border-stone-/);
      expect(status.querySelector(".w-64")).toBeNull();
    },
  );

  it("uses an adaptive section divider and suppresses shared decorative motion when requested", () => {
    const { container } = render(<SectionHeaderBlock title="Your lounge" />);
    expect(container.firstElementChild?.className).toContain("border-[var(--chrome-hairline)]");
    expect(MOTION_TOKENS.cardHover).toContain("motion-safe:hover:-translate-y-1");
    expect(MOTION_TOKENS.pulseAura).toContain("motion-reduce:animate-none");
  });

  it("labels reward dialogs even without a reward name and lets Escape dismiss them", async () => {
    const onClose = vi.fn();
    render(<RewardRevealModal isOpen onClose={onClose} title="Achievement unlocked" />);
    expect(screen.getByRole("dialog", { name: "Achievement unlocked" })).toBeVisible();
    expect(await screen.findByRole("button", { name: "Claim & Continue" })).toBeEnabled();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
