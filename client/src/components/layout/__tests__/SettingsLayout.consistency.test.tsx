import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SettingsLayout from "../SettingsLayout";

vi.mock("../AppLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
afterEach(cleanup);

describe("settings navigation consistency", () => {
  it("identifies the current section without nesting main landmarks", () => {
    render(<MemoryRouter initialEntries={["/settings/security"]}><SettingsLayout><h2>Privacy</h2></SettingsLayout></MemoryRouter>);
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getByRole("navigation", { name: "Settings sections" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Security & Data" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Preferences" })).not.toHaveAttribute("aria-current");
  });

  it("does not force the settings links wider than a narrow phone", () => {
    render(<MemoryRouter initialEntries={["/settings"]}><SettingsLayout>Content</SettingsLayout></MemoryRouter>);
    expect(screen.getByRole("link", { name: "Preferences" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Preferences" }).className).toContain("min-w-0");
  });
});
