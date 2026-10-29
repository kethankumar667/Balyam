import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { RecordScoreResult } from "@shared/profile/Scorecard";

const handlers = new Map<string, (payload: unknown) => void>();
vi.mock("../../../lib/socket", () => ({
  getSocket: () => ({
    on: (event: string, handler: (payload: unknown) => void) => handlers.set(event, handler),
    off: (event: string) => handlers.delete(event),
  }),
}));
vi.mock("../../../services/HapticsManager", () => ({
  HapticsManager: { getInstance: () => ({ win: () => undefined }) },
}));

const { default: NewRecordHost } = await import("../NewRecordHost");
const { resetNewRecordStore, useNewRecordStore } = await import("../../../store/newRecordStore");

function record(matchId = "m1"): RecordScoreResult {
  return {
    game: "handcricket",
    isNewPersonalBest: true,
    deltaFromPrevious: 15,
    previousBest: 40,
    totalPersonalBestsBeaten: 2,
    scorecard: {
      modeId: "international_t20",
      modeDisplayName: "International T20 (10 Overs)",
      bestScore: 55,
      bestScoreMatchId: matchId,
      scoringDirection: "HIGHER_IS_BETTER",
    },
  } as unknown as RecordScoreResult;
}

function mountHost() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <NewRecordHost />
      <Routes>
        <Route path="/" element={<p>home</p>} />
        <Route path="/myrecords" element={<p>my records page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("NewRecordHost", () => {
  beforeEach(() => {
    handlers.clear();
    resetNewRecordStore();
  });
  afterEach(cleanup);

  it("shows nothing until a record is beaten", () => {
    mountHost();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("tells the player they beat their own record, with the game, the old and the new score", () => {
    mountHost();
    act(() => useNewRecordStore.getState().announce(record()));

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("You beat your own record!")).toBeTruthy();
    expect(screen.getByRole("dialog", { name: /new personal record/i })).toBeTruthy();
    expect(screen.getByText(/Hand Cricket · International T20/)).toBeTruthy();
    expect(screen.getByText("40")).toBeTruthy();
    expect(screen.getByText("Improved by 15 runs")).toBeTruthy();
    expect(screen.getByText("55")).toBeTruthy();
  });

  it("puts the tile art of the game the record was set in at the centre of the trophy", () => {
    const { container } = mountHost();
    act(() => useNewRecordStore.getState().announce(record()));
    expect(container.ownerDocument.querySelector('[role="dialog"] image')?.getAttribute("href")).toBe("/HandCricketTile.png");

    fireEvent.click(screen.getByRole("button", { name: "Awesome!" }));
    act(() => useNewRecordStore.getState().announce({ ...record("m9"), game: "rummy" } as RecordScoreResult));
    expect(container.ownerDocument.querySelector('[role="dialog"] image')?.getAttribute("href")).toBe("/RummyTile.png");
  });

  it("closes on Escape", () => {
    mountHost();
    act(() => useNewRecordStore.getState().announce(record()));

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens when the server reports a room game's record on the player's socket", () => {
    mountHost();
    const onNewBest = handlers.get("scorecard:newBest");
    expect(onNewBest).toBeTypeOf("function");

    act(() => onNewBest!(record()));

    expect(screen.getByText("You beat your own record!")).toBeTruthy();
  });

  it("ignores a malformed payload from the socket", () => {
    mountHost();
    act(() => handlers.get("scorecard:newBest")!({ game: "rummy" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes on Awesome! and shows the next waiting record", () => {
    mountHost();
    act(() => {
      useNewRecordStore.getState().announce(record("m1"));
      useNewRecordStore.getState().announce({ ...record("m2"), game: "rummy" } as RecordScoreResult);
    });
    expect(screen.getByText(/Hand Cricket/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Awesome!" }));

    expect(screen.getByText(/Rummy/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Awesome!" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("View My Records closes the popup and goes to the records page", () => {
    mountHost();
    act(() => useNewRecordStore.getState().announce(record()));

    fireEvent.click(screen.getByRole("button", { name: "View My Records" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("my records page")).toBeTruthy();
  });

  it("stops listening to the socket when it unmounts", () => {
    const { unmount } = mountHost();
    expect(handlers.has("scorecard:newBest")).toBe(true);
    unmount();
    expect(handlers.has("scorecard:newBest")).toBe(false);
  });
});
