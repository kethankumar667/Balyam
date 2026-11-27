import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import WhatAreWePlayingSection from "../WhatAreWePlayingSection";

afterEach(cleanup);

/**
 * "What are we playing today?" is a desktop-only section: phones and tablets must not get it.
 * jsdom has no stylesheet, so the contract is pinned on the classes that do the hiding: `hidden`
 * (display: none, so no layout, no accessibility tree, no lazy image requests) lifted only at
 * Tailwind's `lg` (1024px, the app's desktop tier). A hook-based hide would render the section
 * into the prerendered page and then tear it out on a phone, so this stays a CSS rule.
 */
describe("WhatAreWePlayingSection", () => {
  function show() {
    return render(<WhatAreWePlayingSection onSelectGame={vi.fn()} onOpenCreateRoom={vi.fn()} />);
  }

  it("is hidden by default and only shown from the desktop breakpoint", () => {
    show();
    const heading = screen.getByRole("heading", { name: /what are we playing today/i, hidden: true });
    const section = heading.closest("section");
    expect(section).not.toBeNull();
    expect(section).toHaveClass("hidden", "lg:block");
  });

  it("does not show itself at the tablet breakpoint (md) or the small one (sm)", () => {
    show();
    const section = screen
      .getByRole("heading", { name: /what are we playing today/i, hidden: true })
      .closest("section")!;
    // Any `sm:block` / `md:block` would bring it back on a tablet.
    expect(section.className).not.toMatch(/\b(sm|md):(block|flex|grid)\b/);
  });
});
