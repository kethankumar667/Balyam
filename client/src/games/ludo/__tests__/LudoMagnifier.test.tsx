import { act, fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LudoMagnifier, lensPlacement } from "../LudoMagnifier";

function show(playerCount = 8, label = "Live pawn") {
  const move = vi.fn();
  const view = render(
    <LudoMagnifier playerCount={playerCount} world="classic">
      {(readOnly) => <button disabled={readOnly} onClick={move}>{label}</button>}
    </LudoMagnifier>,
  );
  return { ...view, move };
}

describe("Ludo board magnifier", () => {
  it("reports inspection to sibling move controls and resets it on unmount", () => {
    const change = vi.fn();
    const view = render(<LudoMagnifier playerCount={8} world="classic" onInspectionChange={change}>{() => <span>Board</span>}</LudoMagnifier>);
    expect(change).toHaveBeenLastCalledWith(false);
    fireEvent.click(screen.getByRole("button", { name: "Enable board magnifier" }));
    expect(change).toHaveBeenLastCalledWith(true);
    view.unmount();
    expect(change).toHaveBeenLastCalledWith(false);
  });

  it.each([2, 3, 4])("leaves %i-player gameplay unchanged without a magnifier", (count) => {
    const { move } = show(count);
    expect(screen.queryByRole("button", { name: /magnifier/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Live pawn" }));
    expect(move).toHaveBeenCalledOnce();
  });

  it.each([5, 6, 7, 8])("offers an optional magnifier at %i players", (count) => {
    show(count);
    expect(screen.getByRole("button", { name: "Enable board magnifier" }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.queryByTestId("ludo-magnifier-lens")).toBeNull();
  });

  it("disables board moves during inspection and restores them after Escape", async () => {
    const { move } = show();
    fireEvent.click(screen.getByRole("button", { name: "Enable board magnifier" }));
    const surface = screen.getByRole("group", { name: "Ludo board inspection" });
    expect(document.activeElement).toBe(surface);
    fireEvent.click(screen.getByRole("button", { name: "Live pawn" }));
    fireEvent.click(surface);
    expect(move).not.toHaveBeenCalled();
    fireEvent.keyDown(surface, { key: "Escape" });
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Enable board magnifier" })));
    fireEvent.click(screen.getByRole("button", { name: "Live pawn" }));
    expect(move).toHaveBeenCalledOnce();
  });

  it("offers a keyboard-driven 2x lens hidden from assistive technology", () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: "Enable board magnifier" }));
    const surface = screen.getByRole("group", { name: "Ludo board inspection" });
    vi.spyOn(surface, "getBoundingClientRect").mockReturnValue(new DOMRect(10, 100, 300, 300));
    fireEvent.keyDown(surface, { key: "ArrowRight" });
    const lens = screen.getByTestId("ludo-magnifier-lens");
    expect(lens.getAttribute("aria-hidden")).toBe("true");
    expect(lens.style.pointerEvents).toBe("none");
    expect(lens.textContent).toContain("2");
    expect(within(lens).queryByRole("button")).toBeNull();
    expect(within(lens).getByText("Live pawn").hasAttribute("disabled")).toBe(true);
    fireEvent.blur(surface);
    expect(screen.queryByTestId("ludo-magnifier-lens")).toBeNull();
  });

  it("renders current state in the lens, not a stale screenshot", () => {
    const view = show();
    fireEvent.click(screen.getByRole("button", { name: "Enable board magnifier" }));
    const surface = screen.getByRole("group", { name: "Ludo board inspection" });
    vi.spyOn(surface, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 300, 300));
    fireEvent.keyDown(surface, { key: "ArrowDown" });
    view.rerender(
      <LudoMagnifier playerCount={8} world="reef">
        {(readOnly) => <button disabled={readOnly}>Updated pawn</button>}
      </LudoMagnifier>,
    );
    expect(screen.getByTestId("ludo-magnifier-lens").textContent).toContain("Updated pawn");
    expect(screen.getByTestId("ludo-magnifier-lens").className).toContain("theme-reef");
  });

  it("keeps effects on the original only and reuses scene subtrees while inspecting", () => {
    const draw = vi.fn((readOnly: boolean, inLens: boolean) => (
      <div>
        <button disabled={readOnly}>Live pawn</button>
        {!inLens && <span>Original effect</span>}
      </div>
    ));
    render(<LudoMagnifier playerCount={8} world="classic">{draw}</LudoMagnifier>);
    fireEvent.click(screen.getByRole("button", { name: "Enable board magnifier" }));
    const surface = screen.getByRole("group", { name: "Ludo board inspection" });
    vi.spyOn(surface, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 300, 300));
    fireEvent.keyDown(surface, { key: "ArrowRight" });
    const count = draw.mock.calls.length;
    fireEvent.keyDown(surface, { key: "ArrowRight" });
    expect(draw).toHaveBeenCalledTimes(count);
    expect(screen.getAllByText("Original effect")).toHaveLength(1);
    expect(within(screen.getByTestId("ludo-magnifier-lens")).queryByText("Original effect")).toBeNull();
  });

  it("hides the lens on cancellation and viewport changes without exiting inspection", () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: "Enable board magnifier" }));
    const surface = screen.getByRole("group", { name: "Ludo board inspection" });
    vi.spyOn(surface, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 300, 300));
    fireEvent.keyDown(surface, { key: "ArrowDown" });
    fireEvent.pointerCancel(surface);
    expect(screen.queryByTestId("ludo-magnifier-lens")).toBeNull();
    fireEvent.keyDown(surface, { key: "ArrowLeft" });
    fireEvent.resize(window);
    expect(screen.queryByTestId("ludo-magnifier-lens")).toBeNull();
    expect(screen.getByRole("button", { name: "Disable board magnifier" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("turns inspection off if the board no longer has 5–8 seats", () => {
    const view = show();
    fireEvent.click(screen.getByRole("button", { name: "Enable board magnifier" }));
    view.rerender(<LudoMagnifier playerCount={4} world="classic">{() => <span>Small board</span>}</LudoMagnifier>);
    expect(screen.queryByRole("group", { name: "Ludo board inspection" })).toBeNull();
    expect(screen.queryByRole("button", { name: /magnifier/i })).toBeNull();
  });

  it("blocks global token shortcuts during inspection without blocking chat typing", () => {
    const shortcut = vi.fn();
    window.addEventListener("keydown", shortcut);
    show();
    fireEvent.click(screen.getByRole("button", { name: "Enable board magnifier" }));
    fireEvent.keyDown(document.body, { key: "1" });
    expect(shortcut).not.toHaveBeenCalled();
    const input = document.createElement("input");
    document.body.append(input);
    fireEvent.keyDown(input, { key: "1" });
    expect(shortcut).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Disable board magnifier" }));
    fireEvent.keyDown(document.body, { key: "1" });
    expect(shortcut).toHaveBeenCalledTimes(2);
    input.remove();
    window.removeEventListener("keydown", shortcut);
  });

  it("tracks a primary touch once per frame and releases without moving a pawn", () => {
    const { move } = show();
    fireEvent.click(screen.getByRole("button", { name: "Enable board magnifier" }));
    const surface = screen.getByRole("group", { name: "Ludo board inspection" });
    vi.spyOn(surface, "getBoundingClientRect").mockReturnValue(new DOMRect(10, 100, 300, 300));
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { frames.push(callback); return frames.length; });
    const touch = (type: string, x: number, y: number, isPrimary = true) => {
      fireEvent(surface, Object.assign(new Event(type, { bubbles: true }), {
        pointerId: 7, pointerType: "touch", isPrimary, button: 0, clientX: x, clientY: y,
      }));
    };
    touch("pointermove", 100, 200);
    expect(frames).toHaveLength(0);
    touch("pointerdown", 100, 200);
    touch("pointermove", 235, 175);
    touch("pointermove", 50, 150, false);
    expect(frames).toHaveLength(1);
    act(() => frames[0](0));
    const content = screen.getByTestId("ludo-magnifier-lens").firstElementChild as HTMLElement;
    expect(content.style.left).toBe("-366px");
    expect(content.style.top).toBe("-66px");
    touch("pointerup", 235, 175);
    expect(screen.queryByTestId("ludo-magnifier-lens")).toBeNull();
    expect(move).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});

describe("lens placement", () => {
  it.each([[320, 568], [375, 812], [768, 1024], [1440, 900]])("stays within a %ix%i viewport at all board edges", (width, height) => {
    for (const x of [0, width / 2, width]) for (const y of [0, height / 2, height]) {
      const placement = lensPlacement(x, y, { left: 0, top: 0, width, height });
      expect(placement.left).toBeGreaterThanOrEqual(8);
      expect(placement.top).toBeGreaterThanOrEqual(8);
      expect(placement.left + placement.size).toBeLessThanOrEqual(width - 8);
      expect(placement.top + placement.size).toBeLessThanOrEqual(height - 8);
    }
  });

  it("respects the visual viewport origin when browser zoom is active", () => {
    const p = lensPlacement(210, 360, { left: 100, top: 200, width: 240, height: 300 });
    expect(p.left).toBeGreaterThanOrEqual(108);
    expect(p.top).toBeGreaterThanOrEqual(208);
    expect(p.left + p.size).toBeLessThanOrEqual(332);
    expect(p.top + p.size).toBeLessThanOrEqual(492);
  });
});
