import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { BrainVitaDock, BrainVitaPill, BrainVitaScene, BrainVitaStats, BrainVitaTitleSign } from "../BrainVitaChrome";
import { BrainVitaGrid } from "../BrainVitaGrid";
import { createBoard } from "../brainvitaRules";
import { MAX_FRAME, MIN_FRAME } from "../brainvitaTheme";

describe("BrainVitaStats", () => {
  const stats = (layout: "bar" | "list", overrides: Partial<Parameters<typeof BrainVitaStats>[0]> = {}) =>
    render(<BrainVitaStats marbles={32} jumps={4} time="1:15" layout={layout} {...overrides} />);

  it.each(["bar", "list"] as const)("shows marbles, jumps and time as labelled values in the %s layout", (layout) => {
    stats(layout);
    expect(screen.getByText("Marbles")).toBeInTheDocument();
    expect(screen.getByText("Jumps")).toBeInTheDocument();
    expect(screen.getByText("Time")).toBeInTheDocument();
    expect(screen.getByText("32")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("1:15")).toBeInTheDocument();
  });

  it("pairs each label with its own value in the document's own terms, so a screen reader reads them together", () => {
    const { container } = stats("bar");
    const terms = [...container.querySelectorAll("dt")].map((dt) => dt.textContent);
    const values = [...container.querySelectorAll("dd")].map((dd) => dd.textContent);
    expect(terms).toEqual(["Marbles", "Jumps", "Time"]);
    expect(values).toEqual(["32", "4", "1:15"]);
  });

  it("keeps the icons out of the accessible tree", () => {
    const { container } = stats("bar");
    expect(container.querySelectorAll("svg[aria-hidden]").length).toBeGreaterThanOrEqual(2);
  });
});

describe("BrainVitaPill", () => {
  it("is a named button that does its job when pressed", () => {
    const onClick = vi.fn();
    render(<BrainVitaPill label="Hint" ariaLabel="Show a hint" icon={<svg />} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button", { name: "Show a hint" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Hint")).toBeInTheDocument();
  });

  it("when dimmed, says so to assistive tech, stays focusable, and does nothing", () => {
    const onClick = vi.fn();
    render(<BrainVitaPill label="Undo" ariaLabel="Undo the last jump" icon={<svg />} onClick={onClick} isDisabled />);
    const button = screen.getByRole("button", { name: "Undo the last jump" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).not.toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("lays its pills in a column when asked", () => {
    const { container } = render(
      <BrainVitaDock isStacked>
        <span>a</span>
      </BrainVitaDock>,
    );
    expect(container.firstElementChild).toHaveClass("flex-col");
  });
});

describe("BrainVitaTitleSign", () => {
  it("is the page heading, whatever size the sign is", () => {
    const full = render(<BrainVitaTitleSign />);
    expect(screen.getByRole("heading", { level: 1, name: "Goli Jump" })).toBeInTheDocument();
    full.unmount();
    render(<BrainVitaTitleSign isCompact />);
    expect(screen.getByRole("heading", { level: 1, name: "Goli Jump" })).toBeInTheDocument();
  });

  it("drops the crown and marbles on a compact sign", () => {
    const full = render(<BrainVitaTitleSign />);
    const fullShapes = full.container.querySelectorAll("svg, span[aria-hidden]").length;
    full.unmount();
    const compact = render(<BrainVitaTitleSign isCompact />);
    expect(compact.container.querySelectorAll("svg, span[aria-hidden]").length).toBeLessThan(fullShapes);
  });
});

describe("BrainVitaScene", () => {
  it("is decoration only: hidden from assistive tech and never in the way of a tap", () => {
    const { container } = render(<BrainVitaScene />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute("aria-hidden", "true");
    expect(root).toHaveClass("pointer-events-none");
  });
});

describe("BrainVitaGrid dressing", () => {
  const grid = (props: Partial<Parameters<typeof BrainVitaGrid>[0]> = {}) =>
    render(<BrainVitaGrid board={createBoard()} selected={null} targets={[]} hint={null} disabled={false} onTap={vi.fn()} {...props} />);

  it("lays the table props in the corners by default, as decoration that adds no control", () => {
    const { container } = grid();
    expect(container.querySelector("text")?.textContent).toContain("Remove");
    expect(screen.getAllByRole("button")).toHaveLength(33);
  });

  it("leaves the props out on a cramped screen", () => {
    const { container } = grid({ hasProps: false });
    expect(container.querySelector("text")).toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(33);
  });

  it("carves the four sprigs where the rim is wide enough, and none where it has thinned", () => {
    const wide = grid({ frame: MAX_FRAME });
    const wideSprigs = wide.container.querySelectorAll("svg g[transform*='rotate(-8)']").length;
    wide.unmount();
    const thin = grid({ frame: MIN_FRAME });
    const thinSprigs = thin.container.querySelectorAll("svg g[transform*='rotate(-8)']").length;
    expect(wideSprigs).toBe(4);
    expect(thinSprigs).toBe(0);
  });

  it("is one square of the offered size", () => {
    const { container } = grid({ size: { width: 320, height: 320 } });
    const group = container.querySelector('[role="group"]') as HTMLElement;
    expect(group.style.width).toBe("320px");
    expect(group.style.height).toBe("320px");
  });

  it("holds 33 holes, one of them the empty centre, whatever it is wearing", () => {
    const { container } = grid();
    const buttons = [...container.querySelectorAll("button")];
    expect(buttons).toHaveLength(33);
    expect(buttons.filter((b) => b.getAttribute("aria-label")?.includes("empty hole"))).toHaveLength(1);
  });
});
