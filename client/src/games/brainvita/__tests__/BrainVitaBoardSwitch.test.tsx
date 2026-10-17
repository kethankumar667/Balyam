import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";

const viewport = vi.hoisted(() => ({ current: "desktop" as "mobile" | "desktop" }));
const portrait = vi.hoisted(() => ({ current: false }));

vi.mock("../../../lib/useViewport", () => ({ useViewport: () => viewport.current }));
vi.mock("../../../lib/useMediaQuery", () => ({
  useMediaQuery: (query: string) => (query === "(orientation: portrait)" ? portrait.current : false),
}));
vi.mock("../BrainVitaBoardMobile", () => ({ default: () => <div data-testid="upright-shell" /> }));
vi.mock("../BrainVitaBoardDesktop", () => ({ default: () => <div data-testid="table-shell" /> }));

import BrainVitaBoard from "../BrainVitaBoard";

describe("BrainVitaBoard picks the shell built for the screen", () => {
  beforeEach(() => {
    viewport.current = "desktop";
    portrait.current = false;
  });

  it("stacks sign, stats, board and pills on a phone", () => {
    viewport.current = "mobile";
    portrait.current = true;
    render(<BrainVitaBoard onExit={vi.fn()} />);
    expect(screen.getByTestId("upright-shell")).toBeInTheDocument();
  });

  it("keeps a phone held sideways on the same shell, which has its own short-landscape arrangement", () => {
    viewport.current = "mobile";
    portrait.current = false;
    render(<BrainVitaBoard onExit={vi.fn()} />);
    expect(screen.getByTestId("upright-shell")).toBeInTheDocument();
  });

  it("stacks the same way on a tablet held upright", () => {
    viewport.current = "desktop";
    portrait.current = true;
    render(<BrainVitaBoard onExit={vi.fn()} />);
    expect(screen.getByTestId("upright-shell")).toBeInTheDocument();
  });

  it("puts the board beside a side panel on a wide landscape screen", () => {
    viewport.current = "desktop";
    portrait.current = false;
    render(<BrainVitaBoard onExit={vi.fn()} />);
    expect(screen.getByTestId("table-shell")).toBeInTheDocument();
  });
});
