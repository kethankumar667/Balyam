import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { DoordarshanLeaveButton } from "../DoordarshanHeader";

/** Same contract the deleted hc-notebook.leave.test.tsx originally pinned
 *  for the notebook skin's leave button (see that history): a leave button
 *  must only ever forward whatever `onLeave` it's given, never assume or
 *  hardcode what leaving means. Mirrored here for this new theme. */
describe("DoordarshanLeaveButton", () => {
  it("forwards a click to whatever onLeave callback it's given, and only that", () => {
    const onLeave = vi.fn();
    render(<DoordarshanLeaveButton onLeave={onLeave} />);

    fireEvent.click(screen.getByRole("button", { name: "Leave room" }));

    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it("does not fire onLeave on render — only on an actual click", () => {
    const onLeave = vi.fn();
    render(<DoordarshanLeaveButton onLeave={onLeave} />);

    expect(onLeave).not.toHaveBeenCalled();
  });
});
