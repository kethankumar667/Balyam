import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HowToPlayPage from "../HowToPlayPage";
import { getAllAcademySpecs } from "../../features/academy/data";
import { buildPlatformHowToPlaySchema } from "../../seo/schemas/howto";

// The layout pulls in the whole app shell (stores, sockets); only the page's own logic is under test.
vi.mock("../../components/layout/HelpLayout", () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("../../components/bhalyam/JoinRoomModal", () => ({ default: () => null }));

function renderPage() {
  return render(
    <MemoryRouter>
      <HowToPlayPage />
    </MemoryRouter>,
  );
}

const cardTitles = () => screen.getAllByRole("heading", { level: 4 }).map((h) => h.textContent ?? "");

describe("HowToPlayPage", () => {
  afterEach(cleanup);

  it("lists every game academy exactly once (the Block Blast alias must not add a second Brick Blocks card)", () => {
    renderPage();
    const distinctSpecs = new Set(getAllAcademySpecs().map((spec) => spec.slug));
    const titles = cardTitles().filter((title) => getAllAcademySpecs().some((spec) => spec.title === title));
    expect(titles).toHaveLength(distinctSpecs.size);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("has a search box with an accessible name", () => {
    renderPage();
    expect(screen.getByRole("searchbox", { name: /search games/i })).toBeInTheDocument();
  });

  it("filters by search and announces an empty result instead of a blank grid", () => {
    renderPage();
    const search = screen.getByRole("searchbox", { name: /search games/i });

    fireEvent.change(search, { target: { value: "ludo" } });
    expect(cardTitles().some((title) => /ludo/i.test(title))).toBe(true);

    fireEvent.change(search, { target: { value: "zzzz-no-such-game" } });
    expect(screen.getByRole("status")).toHaveTextContent(/no games match/i);
  });

  it("marks the active category filter and narrows the directory to it", () => {
    renderPage();
    const all = screen.getByRole("button", { name: "All Games" });
    const cards = screen.getByRole("button", { name: "Card Games" });
    expect(all).toHaveAttribute("aria-pressed", "true");
    expect(cards).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(cards);
    expect(cards).toHaveAttribute("aria-pressed", "true");
    expect(all).toHaveAttribute("aria-pressed", "false");
    const titles = cardTitles().join(" | ");
    expect(titles).toMatch(/rummy/i);
    expect(titles).not.toMatch(/ludo/i);
  });

  it("shows the four first-game steps that the page's HowTo structured data describes", () => {
    renderPage();
    const steps = buildPlatformHowToPlaySchema().step;
    expect(steps).toHaveLength(4);
    for (const step of steps) {
      expect(screen.getByText(step.name)).toBeInTheDocument();
      expect(screen.getByText(step.text)).toBeInTheDocument();
    }
  });

  it("launches a game's academy as a dialog", () => {
    renderPage();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const [firstLaunch] = screen.getAllByRole("button", { name: /launch interactive academy/i });
    fireEvent.click(firstLaunch!);
    expect(within(document.body).getByRole("dialog")).toBeInTheDocument();
  });

  it("uses stroke icons, not emoji, on the platform concept cards", () => {
    const { container } = renderPage();
    expect(container.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}⚡]/u);
  });
});
