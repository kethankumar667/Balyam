import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook } from "@testing-library/react";
import type { RecordScorePayload } from "@shared/profile/Scorecard";

const mockPeek = vi.fn();
vi.mock("../../lib/playerIdentity", () => ({
  apiJson: vi.fn(), apiFetch: vi.fn(), getPlayerCredential: vi.fn(), peekPlayerCredential: (...a: unknown[]) => mockPeek(...a),
}));

const { useScoreSyncOnReconnect } = await import("../useScoreSyncOnReconnect");
const { useScorecardStore } = await import("../../store/scorecardStore");
const { enqueueScore } = await import("../../lib/scoreOutbox");

/**
 * A score that could not be sent while offline should be sent the moment the connection is back, without the
 * player having to open My Records. This is wired from the app's bootstrap, not from the store's module scope,
 * so merely importing the store never registers a global listener.
 */

const queued: RecordScorePayload = { game: "nokiacricket", modeId: "classic_1", score: 18, matchId: "m1", context: "SOLO" };
const fetchScorecards = vi.fn();

beforeEach(() => {
  localStorage.clear();
  mockPeek.mockReset().mockReturnValue({ playerId: "alice", token: "t", kind: "member" });
  fetchScorecards.mockReset().mockResolvedValue(undefined);
  useScorecardStore.setState({ fetchScorecards });
});
afterEach(cleanup);

describe("useScoreSyncOnReconnect", () => {
  it("sends the waiting scores when the browser comes back online", () => {
    enqueueScore("alice", queued, 1);
    renderHook(() => useScoreSyncOnReconnect());

    window.dispatchEvent(new Event("online"));

    expect(fetchScorecards).toHaveBeenCalledWith("alice");
  });

  it("does nothing when nothing is waiting", () => {
    renderHook(() => useScoreSyncOnReconnect());

    window.dispatchEvent(new Event("online"));

    expect(fetchScorecards).not.toHaveBeenCalled();
  });

  it("does nothing for someone else's queued scores", () => {
    enqueueScore("bob", queued, 1);
    renderHook(() => useScoreSyncOnReconnect());

    window.dispatchEvent(new Event("online"));

    expect(fetchScorecards).not.toHaveBeenCalled();
  });

  it("does nothing when nobody is signed in", () => {
    mockPeek.mockReturnValue(null);
    enqueueScore("alice", queued, 1);
    renderHook(() => useScoreSyncOnReconnect());

    window.dispatchEvent(new Event("online"));

    expect(fetchScorecards).not.toHaveBeenCalled();
  });

  it("stops listening when the app unmounts", () => {
    enqueueScore("alice", queued, 1);
    const { unmount } = renderHook(() => useScoreSyncOnReconnect());
    unmount();

    window.dispatchEvent(new Event("online"));

    expect(fetchScorecards).not.toHaveBeenCalled();
  });
});
