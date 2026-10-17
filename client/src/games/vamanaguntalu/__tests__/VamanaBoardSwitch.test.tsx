import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";

const viewport = vi.hoisted(() => ({ current: "desktop" as "mobile" | "desktop" }));
const portrait = vi.hoisted(() => ({ current: false }));

vi.mock("../../../lib/useViewport", () => ({ useViewport: () => viewport.current }));
vi.mock("../../../lib/useMediaQuery", () => ({
  useMediaQuery: (query: string) => (query === "(orientation: portrait)" ? portrait.current : false),
}));
vi.mock("../VamanaBoardMobile", () => ({ default: () => <div data-testid="upright-shell" /> }));
vi.mock("../VamanaBoardDesktop", () => ({ default: () => <div data-testid="table-shell" /> }));

import VamanaBoard from "../VamanaBoard";
import type { VamanaBoardProps } from "../VamanaBoardProps";

const props = {} as VamanaBoardProps;

describe("VamanaBoard picks the shell built for the screen", () => {
  beforeEach(() => {
    viewport.current = "desktop";
    portrait.current = false;
  });

  it("stands the board upright on a phone", () => {
    viewport.current = "mobile";
    portrait.current = true;
    render(<VamanaBoard {...props} />);
    expect(screen.getByTestId("upright-shell")).toBeInTheDocument();
  });

  it("keeps a phone held sideways on the upright shell, which has its own short-landscape arrangement", () => {
    viewport.current = "mobile";
    portrait.current = false;
    render(<VamanaBoard {...props} />);
    expect(screen.getByTestId("upright-shell")).toBeInTheDocument();
  });

  it("stands the board upright on a tablet held upright", () => {
    viewport.current = "desktop";
    portrait.current = true;
    render(<VamanaBoard {...props} />);
    expect(screen.getByTestId("upright-shell")).toBeInTheDocument();
  });

  it("lays the board flat with side rails on a wide landscape screen", () => {
    viewport.current = "desktop";
    portrait.current = false;
    render(<VamanaBoard {...props} />);
    expect(screen.getByTestId("table-shell")).toBeInTheDocument();
  });
});
