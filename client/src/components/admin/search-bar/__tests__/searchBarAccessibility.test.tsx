import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SearchBar from "../index";

describe("SearchBar — accessible name (Phase 2 §2)", () => {
  it("regression: exposes the caller-supplied ariaLabel as the input's accessible name, not just placeholder text", () => {
    render(<SearchBar ariaLabel="Search users" placeholder="Search by name, email..." />);
    expect(screen.getByRole("textbox", { name: "Search users" })).toBeDefined();
  });

  it("falls back to placeholder as the accessible name when ariaLabel is not supplied", () => {
    render(<SearchBar placeholder="Search by name, email..." />);
    expect(screen.getByRole("textbox", { name: "Search by name, email..." })).toBeDefined();
  });

  it("different pages get genuinely different accessible names", () => {
    const { unmount } = render(<SearchBar ariaLabel="Search matches" />);
    expect(screen.getByRole("textbox", { name: "Search matches" })).toBeDefined();
    unmount();

    render(<SearchBar ariaLabel="Search announcements" />);
    expect(screen.getByRole("textbox", { name: "Search announcements" })).toBeDefined();
  });
});
