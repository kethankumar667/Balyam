import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { HcLeaveButton } from "../hc-notebook";

/**
 * Hand Cricket was one of the audit's "partially broken" games: Room.tsx's
 * generic mid-match header was confirmed, but the notebook shell's own
 * `HcLeaveButton` (rendered because "the fixed notebook overlay covers
 * Room.tsx's own Leave control" — see hc-notebook.tsx) called `onLeave`
 * directly with nothing gating it.
 *
 * The actual fix lives in Room.tsx (it now passes `requestLeaveConfirmation`
 * instead of `leaveRoom` into `<HandCricketBoard>`, which this component
 * receives all the way down) — `HcLeaveButton` itself was never touched and
 * should never need to be: it must only ever forward whatever `onLeave` it's
 * given, never assume or hardcode what leaving means. This test pins that
 * contract so a future change to this file can't quietly reintroduce a
 * direct leave call.
 */
describe("HcLeaveButton", () => {
  it("forwards a click to whatever onLeave callback it's given, and only that", () => {
    const onLeave = vi.fn();
    render(<HcLeaveButton onLeave={onLeave} />);

    fireEvent.click(screen.getByRole("button", { name: "Leave room" }));

    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it("does not fire onLeave on render — only on an actual click", () => {
    const onLeave = vi.fn();
    render(<HcLeaveButton onLeave={onLeave} />);

    expect(onLeave).not.toHaveBeenCalled();
  });
});
