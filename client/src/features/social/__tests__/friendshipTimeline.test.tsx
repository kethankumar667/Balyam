import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Friend, SharedHistory } from "@shared/social/Friend";
import { FRIENDSHIP_MILESTONE_KINDS, FRIENDSHIP_MILESTONE_LABELS } from "@shared/social/Friendship";
import SharedHistoryModal from "../SharedHistoryModal";
import type { LoadState } from "../useLoadable";

const T0 = Date.UTC(2026, 2, 10, 10, 0, 0);

const SAI: Friend = { playerId: "me", friendPlayerId: "player_sai", displayName: "Sai Kumar", createdAt: T0 };

function history(over: Partial<SharedHistory> = {}): SharedHistory {
  return {
    playerId: "me",
    friendPlayerId: "player_sai",
    matchesPlayedTogether: 0,
    winsTogether: 0,
    tournamentsTogether: 0,
    lastPlayedAt: 0,
    currentStreakDays: 0,
    bestStreakDays: 0,
    milestones: [],
    ...over,
  };
}

function open(
  props: {
    history?: SharedHistory | null;
    state?: LoadState;
    error?: string | null;
    friend?: Friend | null;
    onRetry?: () => void;
    onClose?: () => void;
  } = {},
) {
  const onRetry = props.onRetry ?? vi.fn();
  const onClose = props.onClose ?? vi.fn();
  render(
    <SharedHistoryModal
      friend={props.friend === undefined ? SAI : props.friend}
      history={props.history === undefined ? history() : props.history}
      state={props.state ?? "ready"}
      error={props.error ?? null}
      onRetry={onRetry}
      onClose={onClose}
    />,
  );
  return { onRetry, onClose };
}

describe("Friendship timeline", () => {
  it("renders nothing without a friend", () => {
    open({ friend: null });

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("is a dialog named for the friendship", () => {
    open();

    expect(screen.getByRole("dialog", { name: /you & sai kumar/i })).toBeDefined();
  });

  describe("loading and failure", () => {
    it("shows a loading state, not numbers, while the history loads", () => {
      open({ state: "loading", history: null });

      expect(screen.getByRole("status", { name: /loading your timeline/i })).toBeDefined();
      expect(screen.queryByText("Matches together")).toBeNull();
    });

    it("shows the error with Retry instead of an empty timeline, and Retry calls back", () => {
      const { onRetry } = open({ state: "error", history: null, error: "Timeline service down" });

      expect(screen.getByRole("alert").textContent).toContain("Timeline service down");
      expect(screen.queryByText(/haven.t played a match together/i)).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: /retry/i }));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it("does not show another friend's history under this friend's name", () => {
      open({ history: history({ friendPlayerId: "someone_else", matchesPlayedTogether: 99 }) });

      expect(screen.queryByText("99")).toBeNull();
      expect(screen.getByRole("status", { name: /loading your timeline/i })).toBeDefined();
    });
  });

  describe("the numbers", () => {
    it("shows matches together and a streak of N days", () => {
      open({ history: history({ matchesPlayedTogether: 40, currentStreakDays: 17, bestStreakDays: 17 }) });

      expect(screen.getByText("40")).toBeDefined();
      expect(screen.getByText("17-day streak")).toBeDefined();
    });

    it("says there is no active streak when it has lapsed, and still shows the best", () => {
      open({ history: history({ matchesPlayedTogether: 12, currentStreakDays: 0, bestStreakDays: 9 }) });

      expect(screen.getByText("None active")).toBeDefined();
      expect(screen.getByText("9 days")).toBeDefined();
    });

    it("says '1 day', not '1 days'", () => {
      open({ history: history({ matchesPlayedTogether: 2, bestStreakDays: 1 }) });

      expect(screen.getByText("1 day")).toBeDefined();
    });

    it("hides wins and tournaments while they are zero, rather than showing a permanent 0", () => {
      open({ history: history({ matchesPlayedTogether: 5 }) });

      expect(screen.queryByText("Wins together")).toBeNull();
      expect(screen.queryByText("Tournaments together")).toBeNull();
    });

    it("shows wins and tournaments once there is one", () => {
      open({ history: history({ matchesPlayedTogether: 5, winsTogether: 2, tournamentsTogether: 1 }) });

      expect(screen.getByText("Wins together")).toBeDefined();
      expect(screen.getByText("Tournaments together")).toBeDefined();
    });

    it("shows when they first played, only if they have", () => {
      const { unmount } = render(
        <SharedHistoryModal
          friend={SAI}
          history={history({ matchesPlayedTogether: 1, firstPlayedAt: T0 })}
          state="ready"
          error={null}
          onRetry={vi.fn()}
          onClose={vi.fn()}
        />,
      );
      expect(screen.getByText(/first played together/i)).toBeDefined();
      unmount();

      open({ history: history() });
      expect(screen.queryByText(/first played together/i)).toBeNull();
    });
  });

  describe("the timeline", () => {
    it("lists each milestone with its label, in the order given", () => {
      open({
        history: history({
          matchesPlayedTogether: 10,
          milestones: [
            { kind: "FRIENDS_SINCE", reachedAt: T0 },
            { kind: "FIRST_MATCH", reachedAt: T0 + 1000, matchId: "m1" },
            { kind: "MATCHES_10", reachedAt: T0 + 2000, matchId: "m10" },
          ],
        }),
      });

      const items = screen.getAllByRole("listitem").map((li) => li.textContent ?? "");
      expect(items[0]).toContain(FRIENDSHIP_MILESTONE_LABELS.FRIENDS_SINCE);
      expect(items[1]).toContain(FRIENDSHIP_MILESTONE_LABELS.FIRST_MATCH);
      expect(items[2]).toContain(FRIENDSHIP_MILESTONE_LABELS.MATCHES_10);
    });

    it("has a label for every milestone kind the server can send", () => {
      for (const kind of FRIENDSHIP_MILESTONE_KINDS) {
        expect(FRIENDSHIP_MILESTONE_LABELS[kind].length).toBeGreaterThan(0);
      }
    });

    it("is an accessible list", () => {
      open({ history: history({ matchesPlayedTogether: 1, milestones: [{ kind: "FIRST_MATCH", reachedAt: T0 }] }) });

      expect(screen.getByRole("list", { name: /friendship timeline/i })).toBeDefined();
    });

    it("tells friends who have never played that the timeline starts with their first match", () => {
      open({ history: history({ matchesPlayedTogether: 0 }) });

      expect(screen.getByRole("status").textContent).toMatch(/haven.t played a match together yet/i);
    });

    it("says milestones will come, for friends who have played but not reached one", () => {
      open({ history: history({ matchesPlayedTogether: 3 }) });

      expect(screen.getByRole("status").textContent).toMatch(/no milestones yet/i);
    });
  });

  it("closes from the Close button", () => {
    const { onClose } = open();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
