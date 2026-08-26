import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import EmptyState from "../index";

describe("EmptyState — screen reader announcements (Phase 2 §7)", () => {
  it("regression: the container is role=status, so a search/filter yielding zero results is announced the moment it appears, not just readable if the user happens to land on it", () => {
    render(<EmptyState title="No users found" description="Try adjusting your search." />);
    const status = screen.getByRole("status");
    expect(status.textContent).toContain("No users found");
  });

  it.each([
    ["No users found", "Try a different name or email."],
    ["No matches found", "Try a different room code."],
    ["No announcements found", "Try a different title."],
  ])("announces '%s' as real text content, not just an icon", (title, description) => {
    render(<EmptyState title={title} description={description} />);
    expect(screen.getByText(title)).toBeDefined();
    expect(screen.getByText(description)).toBeDefined();
  });

  it("regression: the icon is decorative — hidden from assistive tech so it isn't announced as meaningless noise before the real message", () => {
    const { container } = render(<EmptyState title="No data available" />);
    const iconWrapper = container.querySelector('[aria-hidden="true"]');
    expect(iconWrapper).not.toBeNull();
  });

  it("uses the default 'No records found' message accessibly when no custom title is given", () => {
    render(<EmptyState />);
    expect(screen.getByRole("status").textContent).toContain("No records found");
  });
});
