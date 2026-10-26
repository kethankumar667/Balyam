import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BrickTetrisGame from "../BrickTetrisGame";
import { STORAGE_KEY } from "../services/storageService";
import { MiniPiece } from "../arcade/Board";

vi.mock("../services/audioService", () => ({ tetrisAudio: {
  setMuted: vi.fn(), setVolume: vi.fn(), playHardDrop: vi.fn(), playRotate: vi.fn(),
  playHold: vi.fn(), playLineClear: vi.fn(), playGameOver: vi.fn(),
} }));
afterEach(() => { cleanup(); localStorage.removeItem(STORAGE_KEY); vi.unstubAllGlobals(); });
const renderGame = () => render(<MemoryRouter><BrickTetrisGame /></MemoryRouter>);

describe("Color Arcade player flows", () => {
  it("uses the compact landscape arena on a short tablet-width phone without losing controls", () => {
    let matches = true;
    let resize: (() => void) | undefined;
    vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
      matches: matches && query.includes("max-height: 600px"), media: query,
      addEventListener: (_event: string, listener: () => void) => { if (query.includes("max-height")) resize = listener; },
      removeEventListener: vi.fn(),
    })));
    renderGame();
    fireEvent.click(screen.getByRole("button", { name: "Play Pentix" }));
    expect(document.querySelector('[data-layout="mobile-landscape"]')).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Drop" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hold shape" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open settings" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Drop" }));
    const blocks = screen.getByTestId("color-board").querySelectorAll("[data-block]").length;
    matches = false;
    fireEvent(window, new Event("resize"));
    // MatchMedia changes, rather than ordinary resize events, drive the layout subscription.
    act(() => resize?.());
    expect(document.querySelector('[data-layout="desktop"]')).toBeInTheDocument();
    expect(screen.getByTestId("color-board").querySelectorAll("[data-block]")).toHaveLength(blocks);
  });
  it("trims empty preview padding without dropping any Pentix cells", () => {
    const { rerender } = render(<MiniPiece type="I5" small />);
    expect(screen.getByRole("img", { name: "I5 shape" }).children).toHaveLength(5);
    rerender(<MiniPiece type="F" small />);
    const cells = [...screen.getByRole("img", { name: "F shape" }).children];
    expect(cells).toHaveLength(9);
    expect(cells.filter(cell => (cell as HTMLElement).style.background)).toHaveLength(5);
  });
  it("offers six modes, starts a colored game, supports hold and drop, and resumes a paused run", () => {
    renderGame();
    expect(screen.getAllByRole("button", { name: /^Play / })).toHaveLength(6);
    fireEvent.click(screen.getByRole("button", { name: "Play Marathon" }));
    expect(screen.getByTestId("color-board")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Hold shape" }));
    expect(screen.getByRole("button", { name: "Hold shape" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Drop" }));
    expect(screen.getByRole("button", { name: "Hold shape" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Pause game" }));
    fireEvent.click(screen.getByRole("button", { name: "Choose mode" }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Leave this run?" })).getByRole("button", { name: "Choose mode" }));
    fireEvent.click(screen.getByRole("button", { name: "Resume saved run" }));
    expect(screen.getByText("Your board is paused.")).toBeInTheDocument();
  });
  it("pauses for settings and reports duplicate key bindings", () => {
    renderGame();
    fireEvent.click(screen.getByRole("button", { name: "Play Marathon" }));
    fireEvent.click(screen.getByRole("button", { name: "Open settings" }));
    expect(screen.getByRole("dialog", { name: "Brick Blocks settings" })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Key for MOVE_LEFT" }), { code: "ArrowRight" });
    expect(screen.getByRole("alert")).toHaveTextContent("already assigned");
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Key for MOVE_LEFT" }), { code: "KeyA" });
    expect(screen.getByRole("textbox", { name: "Key for MOVE_LEFT" })).toHaveValue("A");
    fireEvent.click(screen.getByRole("button", { name: "Close settings" }));
    expect(screen.getByText("Your board is paused.")).toBeInTheDocument();
  });
});
