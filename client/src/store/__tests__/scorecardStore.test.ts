import { describe, it, expect, vi, beforeEach } from "vitest";

const mockApiJson = vi.fn();
const mockApiFetch = vi.fn();
vi.mock("../../lib/playerIdentity", () => ({
  apiJson: (...args: unknown[]) => mockApiJson(...args),
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  getPlayerCredential: vi.fn().mockResolvedValue(null),
  peekPlayerCredential: vi.fn().mockReturnValue(null),
}));

// Imported AFTER the mock so the store picks up the mocked apiJson.
const { useScorecardStore } = await import("../scorecardStore");

function archiveFor(playerId: string) {
  return { playerId, games: {}, totalPersonalBestsBeaten: 0, updatedAt: Date.now() };
}

describe("scorecardStore — cross-account isolation", () => {
  beforeEach(() => {
    mockApiJson.mockReset();
    mockApiFetch.mockReset();
    useScorecardStore.setState({ archive: null, localArchive: null, loading: false, error: null, lastNewPB: null, activeGhostPace: null });
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
  });

  it("does not let a slow fetch for the outgoing user overwrite the incoming user's data", async () => {
    // User A logs in on a slow connection.
    let resolveA!: (v: { archive: ReturnType<typeof archiveFor> }) => void;
    const pendingA = new Promise<{ archive: ReturnType<typeof archiveFor> }>((resolve) => {
      resolveA = resolve;
    });
    mockApiJson.mockReturnValueOnce(pendingA);
    const fetchA = useScorecardStore.getState().fetchScorecards("playerA");

    // Before A's request resolves, User B logs in on the same tab and their
    // fetch resolves immediately.
    mockApiJson.mockResolvedValueOnce({ archive: archiveFor("playerB") });
    await useScorecardStore.getState().fetchScorecards("playerB");

    expect(useScorecardStore.getState().archive?.playerId).toBe("playerB");

    // A's slow request finally resolves. It must NOT be allowed to clobber
    // B's already-rendered data — this is the exact bug the generation
    // guard in scorecardStore.fetchScorecards fixes.
    resolveA({ archive: archiveFor("playerA") });
    await fetchA;

    expect(useScorecardStore.getState().archive?.playerId).toBe("playerB");
  });

  it("discards a stale fetch that resolves after clearScorecards() runs", async () => {
    let resolveA!: (v: { archive: ReturnType<typeof archiveFor> }) => void;
    const pendingA = new Promise<{ archive: ReturnType<typeof archiveFor> }>((resolve) => {
      resolveA = resolve;
    });
    mockApiJson.mockReturnValueOnce(pendingA);
    const fetchA = useScorecardStore.getState().fetchScorecards("playerA");

    // Sign-out fires before A's request resolves.
    useScorecardStore.getState().clearScorecards("playerA");
    expect(useScorecardStore.getState().archive).toBeNull();

    resolveA({ archive: archiveFor("playerA") });
    await fetchA;

    // The stale response must not resurrect the signed-out user's archive.
    expect(useScorecardStore.getState().archive).toBeNull();
  });

  it("a normal, single fetch still populates the archive", async () => {
    mockApiJson.mockResolvedValueOnce({ archive: archiveFor("playerA") });
    await useScorecardStore.getState().fetchScorecards("playerA");
    expect(useScorecardStore.getState().archive?.playerId).toBe("playerA");
    expect(useScorecardStore.getState().loading).toBe(false);
    expect(useScorecardStore.getState().error).toBeNull();
  });

  it("reports an unavailable response instead of displaying an empty archive", async () => {
    mockApiJson.mockResolvedValueOnce(null);
    await useScorecardStore.getState().fetchScorecards("playerA");
    expect(useScorecardStore.getState().loading).toBe(false);
    expect(useScorecardStore.getState().error).toBe("Could not load records. Please try again.");
  });

  it("preserves cached records when the refresh is unavailable", async () => {
    localStorage.setItem("bhalyam.scorecards.cache.playerA", JSON.stringify(archiveFor("playerA")));
    mockApiJson.mockResolvedValueOnce(null);
    await useScorecardStore.getState().fetchScorecards("playerA");
    expect(useScorecardStore.getState().archive?.playerId).toBe("playerA");
    expect(useScorecardStore.getState().error).toBeTruthy();
  });

  it("preserves an old cache locally when the new durable account archive is empty", async () => {
    const previous = { ...archiveFor("playerA"), totalPersonalBestsBeaten: 7 };
    localStorage.setItem("bhalyam.scorecards.cache.playerA", JSON.stringify(previous));
    mockApiJson.mockResolvedValue({ archive: archiveFor("playerA") });
    await useScorecardStore.getState().fetchScorecards("playerA");
    expect(useScorecardStore.getState().localArchive).toEqual(previous);
    await useScorecardStore.getState().fetchScorecards("playerA");
    expect(useScorecardStore.getState().localArchive).toEqual(previous);
    mockApiJson.mockResolvedValue({ archive: archiveFor("playerB") });
    await useScorecardStore.getState().fetchScorecards("playerB");
    expect(useScorecardStore.getState().localArchive).toBeNull();
    useScorecardStore.getState().clearScorecards();
    mockApiJson.mockResolvedValue({ archive: archiveFor("playerA") });
    await useScorecardStore.getState().fetchScorecards("playerA");
    expect(useScorecardStore.getState().localArchive).toEqual(previous);
  });

  it("clears another account's archive immediately while the new account loads", async () => {
    useScorecardStore.setState({ archive: archiveFor("playerA") });
    let resolveB!: (v: { archive: ReturnType<typeof archiveFor> }) => void;
    mockApiJson.mockReturnValueOnce(new Promise((resolve) => { resolveB = resolve; }));
    const loading = useScorecardStore.getState().fetchScorecards("playerB");
    expect(useScorecardStore.getState().archive).toBeNull();
    resolveB({ archive: archiveFor("playerB") });
    await loading;
  });

  it("refuses a mismatched account response rather than caching someone else's records", async () => {
    mockApiJson.mockResolvedValueOnce({ archive: archiveFor("playerB") });
    await useScorecardStore.getState().fetchScorecards("playerA");
    expect(useScorecardStore.getState().archive).toBeNull();
    expect(useScorecardStore.getState().error).toBeTruthy();
  });

  it("makes a failed score sync visible instead of reporting a successful record", async () => {
    mockApiFetch.mockResolvedValueOnce({ ok: false });
    const result = await useScorecardStore.getState().recordScore("playerA", {
      game: "2048", modeId: "classic", score: 128, context: "SOLO", matchId: "failed",
    });
    expect(result).toBeNull();
    expect(useScorecardStore.getState().error).toContain("could not be synced");
    expect(useScorecardStore.getState().lastNewPB).toBeNull();
  });
});
