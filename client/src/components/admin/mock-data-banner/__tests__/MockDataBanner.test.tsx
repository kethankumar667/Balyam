import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MockDataBanner from "../index";

describe("MockDataBanner (ADMIN-DATA-001)", () => {
  it("defaults to the fully-mock disclosure and states no server changes occur", () => {
    render(<MockDataBanner />);

    expect(screen.getByText(/design preview.*mock data/i)).toBeDefined();
    const body = screen.getByText(/local demonstration data/i);
    expect(body).toBeDefined();
    expect(body.textContent).toMatch(/nothing is saved, exported, broadcast, or sent to a server/i);
  });

  it("renders the mixed-status disclosure for kind=\"mixed\" and distinguishes live vs demo data", () => {
    render(<MockDataBanner kind="mixed" />);

    expect(screen.getByText(/partially live/i)).toBeDefined();
    const body = screen.getByText(/system-status indicator above is live/i);
    expect(body).toBeDefined();
    expect(body.textContent).toMatch(/is local demonstration data/i);
  });

  it("is visible in the accessibility tree without any hover/tooltip interaction", () => {
    render(<MockDataBanner />);
    // A real assertion that this is plain, always-rendered DOM content, not
    // content gated behind a [title]/tooltip trigger or aria-hidden.
    const label = screen.getByText(/design preview.*mock data/i);
    expect(label.closest("[aria-hidden='true']")).toBeNull();
    expect(document.querySelector("[title]")).toBeNull();
  });

  it("does not depend on colour alone — carries a real text label distinct from decoration", () => {
    render(<MockDataBanner />);
    // The FlaskConical icon must be decorative (aria-hidden), not the only
    // signal that this is a preview.
    const icon = document.querySelector("svg");
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByText(/design preview.*mock data/i).textContent).toBeTruthy();
  });
});
