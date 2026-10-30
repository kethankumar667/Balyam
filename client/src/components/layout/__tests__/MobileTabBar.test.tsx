import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MobileTabBar, { activeTabId } from "../MobileTabBar";

afterEach(cleanup);

function renderAt(path: string, onOpenJoin = vi.fn()) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <MobileTabBar onOpenJoin={onOpenJoin} />
    </MemoryRouter>,
  );
  return onOpenJoin;
}

describe("activeTabId", () => {
  it.each([
    ["/", "home"],
    ["/home", "home"],
    ["/games", "games"],
    ["/favorites", "games"],
    ["/recently-played", "games"],
    ["/mandali", "mandali"],
    ["/mandali/the-gang", "mandali"],
    ["/social", "mandali"],
    ["/profile", "you"],
    ["/profile/matches", "you"],
    ["/myrecords", "you"],
    ["/referrals", "you"],
  ])("lights the right tab for %s", (path, tab) => {
    expect(activeTabId(path)).toBe(tab);
  });

  it("lights nothing for pages that belong to no tab", () => {
    expect(activeTabId("/shop")).toBeNull();
    expect(activeTabId("/about")).toBeNull();
  });

  it("does not mistake a lookalike path for a tab", () => {
    expect(activeTabId("/gamesx")).toBeNull();
    expect(activeTabId("/profiles")).toBeNull();
  });
});

describe("MobileTabBar", () => {
  it("offers the four destinations and the join action in a named landmark", () => {
    renderAt("/");
    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(nav).toBeTruthy();
    for (const name of ["Home", "Games", "Mandali", "You"]) {
      expect(screen.getByRole("link", { name })).toBeTruthy();
    }
    expect(screen.getByRole("button", { name: "Join a room with a code" })).toBeTruthy();
  });

  it("marks the current page, and only that page, for assistive technology", () => {
    renderAt("/games");
    expect(screen.getByRole("link", { name: "Games" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Home" }).getAttribute("aria-current")).toBeNull();
    expect(screen.getByRole("link", { name: "Mandali" }).getAttribute("aria-current")).toBeNull();
  });

  it("keeps a sub-page's parent tab lit", () => {
    renderAt("/profile/achievements");
    expect(screen.getByRole("link", { name: "You" }).getAttribute("aria-current")).toBe("page");
  });

  it("points each tab at its page", () => {
    renderAt("/");
    expect(screen.getByRole("link", { name: "Home" }).getAttribute("href")).toBe("/");
    expect(screen.getByRole("link", { name: "Games" }).getAttribute("href")).toBe("/games");
    expect(screen.getByRole("link", { name: "Mandali" }).getAttribute("href")).toBe("/mandali");
    expect(screen.getByRole("link", { name: "You" }).getAttribute("href")).toBe("/profile");
  });

  it("opens the join sheet from the centre button instead of navigating", () => {
    const onOpenJoin = renderAt("/games");
    fireEvent.click(screen.getByRole("button", { name: "Join a room with a code" }));
    expect(onOpenJoin).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "Games" }).getAttribute("aria-current")).toBe("page");
  });

  it("is a phone-and-tablet control only: hidden from the desktop breakpoint up", () => {
    renderAt("/");
    expect(screen.getByRole("navigation", { name: "Primary" }).className).toContain("lg:hidden");
  });
});
