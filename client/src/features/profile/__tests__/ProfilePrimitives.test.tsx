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
});
