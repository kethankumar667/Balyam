import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { StaticRouter } from "react-router-dom/server";
import CommunityRulesPage from "../CommunityRulesPage";

vi.mock("../../components/layout/HelpLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("../../components/Modal", () => ({ default: () => null }));

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("community pledge hydration", () => {
  it("renders on the server without browser storage", () => {
    vi.stubGlobal("localStorage", undefined);
    const html = renderToString(<StaticRouter location="/community-rules"><CommunityRulesPage /></StaticRouter>);
    expect(html).toContain("I Pledge to Play Fair");
  });

  it("keeps the initial HTML deterministic even when a pledge is stored", () => {
    localStorage.setItem("bhalyam.fairplay.pledge", "true");
    const html = renderToString(<StaticRouter location="/community-rules"><CommunityRulesPage /></StaticRouter>);
    expect(html).toContain("I Pledge to Play Fair");
    expect(html).not.toContain("Pledge Verified");
    render(<MemoryRouter><CommunityRulesPage /></MemoryRouter>);
    expect(screen.getByText("Pledge Verified")).toBeDefined();
  });
});
