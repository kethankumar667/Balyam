import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Trophy } from "lucide-react";
import {
  ProfileEmptyState,
  ProfileMetricTile,
  ProfileProgressBar,
} from "../ProfilePrimitives";

describe("profile primitives", () => {
  it("renders a labeled metric without inventing supporting data", () => {
    render(
      <ProfileMetricTile
        label="Matches played"
        value="18"
        detail="Career total"
        icon={Trophy}
        accent="cyan"
      />,
    );

    expect(screen.getByRole("group", { name: "Matches played" }).textContent).toContain("18");
    expect(screen.getByText("Career total")).toBeDefined();
  });

  it("exposes progress semantics and an actionable empty state", () => {
    const onAction = vi.fn();
    render(
      <>
        <ProfileProgressBar label="Achievement progress" value={42} accent="violet" />
        <ProfileEmptyState
          icon={Trophy}
          title="No records yet"
          description="Complete a supported match to start your record book."
          actionLabel="Explore games"
          onAction={onAction}
        />
      </>,
    );

    expect(screen.getByRole("progressbar", { name: "Achievement progress" }).getAttribute("aria-valuenow")).toBe("42");
    fireEvent.click(screen.getByRole("button", { name: "Explore games" }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("drops the icon tile from a compact metric but keeps its label, value and detail", () => {
    const { container } = render(
      <ProfileMetricTile compact label="Win rate" value="19%" detail="15 wins" icon={Trophy} accent="green" />,
    );

    const tile = screen.getByRole("group", { name: "Win rate" });
    expect(tile.textContent).toContain("Win rate");
    expect(tile.textContent).toContain("19%");
    expect(tile.textContent).toContain("15 wins");
    expect(container.querySelector("svg")).toBeNull();
  });

  it("keeps the icon tile on a regular metric", () => {
    const { container } = render(
      <ProfileMetricTile label="Win rate" value="19%" detail="15 wins" icon={Trophy} accent="green" />,
    );

    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("hides a progress bar's visible label without losing its accessible name or value", () => {
    render(<ProfileProgressBar label="Indian Rummy win rate" value={17} accent="cyan" showValue={false} hideLabel />);

    expect(screen.queryByText("Indian Rummy win rate")).toBeNull();
    const bar = screen.getByRole("progressbar", { name: "Indian Rummy win rate" });
    expect(bar.getAttribute("aria-valuenow")).toBe("17");
  });
});
