import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import LoadingState from "../index";

describe("LoadingState — aria-busy and announcements (Phase 2 §6)", () => {
  it.each(["table", "cards", "chart"] as const)(
    "regression: the %s variant exposes role=status and aria-busy=true — the skeleton alone gives a screen reader user no indication anything is loading",
    (variant) => {
      render(<LoadingState variant={variant} label="Loading analytics data" />);
      const status = screen.getByRole("status");
      expect(status.getAttribute("aria-busy")).toBe("true");
    },
  );

  it("announces a meaningful, page-specific label, not a generic one", () => {
    render(<LoadingState variant="table" label="Loading user list" />);
    expect(screen.getByText("Loading user list")).toBeDefined();
  });

  it("defaults to a real (if generic) label when none is supplied, rather than announcing nothing", () => {
    render(<LoadingState variant="cards" />);
    expect(screen.getByRole("status").textContent).toContain("Loading");
  });

  it.each(["table", "cards"] as const)(
    "the decorative skeleton content in the %s variant is hidden from assistive tech",
    (variant) => {
      const { container } = render(<LoadingState variant={variant} />);
      const hidden = container.querySelectorAll('[aria-hidden="true"]');
      expect(hidden.length).toBeGreaterThan(0);
    },
  );
});
