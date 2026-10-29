import { describe, it, expect, vi, beforeEach } from "vitest";

const mockApiJson = vi.fn();
const mockApiFetch = vi.fn();
const mockPeek = vi.fn();
vi.mock("../../lib/playerIdentity", () => ({
  apiJson: (...args: unknown[]) => mockApiJson(...args),
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  getPlayerCredential: vi.fn().mockResolvedValue(null),
  peekPlayerCredential: (...args: unknown[]) => mockPeek(...args),
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

describe("scorecardStore — scores that could not be saved are kept and sent again", () => {
  const payload = (matchId: string, score = 18) => ({
    game: "nokiacricket" as const, modeId: "classic_1", score, context: "SOLO" as const, matchId,
  });
  const ok = { ok: true, status: 200, json: async () => ({ result: null }) };
  const asPlayer = (playerId: string | null) =>
    mockPeek.mockReturnValue(playerId ? { playerId, token: "t", kind: "member" } : null);
  const sentMatchIds = () =>
    mockApiFetch.mock.calls.map(([, init]) => (JSON.parse((init as { body: string }).body) as { matchId: string }).matchId);

  beforeEach(() => {
    mockApiJson.mockReset();
    mockApiFetch.mockReset();
    mockPeek.mockReset();
    asPlayer("playerA");
    useScorecardStore.setState({
      archive: null, localArchive: null, loading: false, error: null, lastNewPB: null, activeGhostPace: null, pendingScoreCount: 0,
    });
    localStorage.clear();
  });

  it("asks for the \"you beat your own record\" popup when a solo score beats the old best", async () => {
    const { resetNewRecordStore, useNewRecordStore } = await import("../newRecordStore");
    resetNewRecordStore();
    const beaten = {
      game: "nokiacricket", isNewPersonalBest: true, deltaFromPrevious: 6, previousBest: 12, totalPersonalBestsBeaten: 1,
      scorecard: { modeId: "classic_1", modeDisplayName: "Classic", bestScore: 18, bestScoreMatchId: "m-pb", scoringDirection: "HIGHER_IS_BETTER" },
    };
    mockApiFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ result: beaten }) });
    mockApiJson.mockResolvedValue({ archive: archiveFor("playerA") });

    await useScorecardStore.getState().recordScore("playerA", payload("m-pb"));

    expect(useNewRecordStore.getState().queue.map((r) => r.scorecard.bestScoreMatchId)).toEqual(["m-pb"]);
    resetNewRecordStore();
  });

  it("queues a score the server could not take, and says it will be sent again", async () => {
    mockApiFetch.mockResolvedValueOnce({ ok: false, status: 503 });

    const result = await useScorecardStore.getState().recordScore("playerA", payload("m1"));

    expect(result).toBeNull();
    expect(useScorecardStore.getState().pendingScoreCount).toBe(1);
    expect(useScorecardStore.getState().error).toContain("sent again");
  });

  it("queues a score when the request never got through at all", async () => {
    mockApiFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await useScorecardStore.getState().recordScore("playerA", payload("m1"));

    expect(useScorecardStore.getState().pendingScoreCount).toBe(1);
  });

  it("does not queue a score the server refused as invalid, because it would never be accepted", async () => {
    mockApiFetch.mockResolvedValueOnce({ ok: false, status: 400 });

    await useScorecardStore.getState().recordScore("playerA", payload("m1"));

    expect(useScorecardStore.getState().pendingScoreCount).toBe(0);
  });

  it("sends queued scores before it reads the account, then clears the queue", async () => {
    mockApiFetch.mockResolvedValueOnce({ ok: false, status: 503 });
    await useScorecardStore.getState().recordScore("playerA", payload("m1"));
    mockApiFetch.mockReset();
    mockApiFetch.mockResolvedValue(ok);
    mockApiJson.mockResolvedValueOnce({ archive: archiveFor("playerA") });

    await useScorecardStore.getState().fetchScorecards("playerA");

    expect(sentMatchIds()).toEqual(["m1"]);
    expect(useScorecardStore.getState().pendingScoreCount).toBe(0);
    expect(mockApiFetch.mock.invocationCallOrder[0]).toBeLessThan(mockApiJson.mock.invocationCallOrder[0]!);
  });

  it("keeps the rest, in order, when the server is still unavailable", async () => {
    mockApiFetch.mockResolvedValue({ ok: false, status: 503 });
    await useScorecardStore.getState().recordScore("playerA", payload("m1"));
    await useScorecardStore.getState().recordScore("playerA", payload("m2"));
    mockApiFetch.mockReset();
    mockApiFetch.mockResolvedValueOnce(ok).mockResolvedValue({ ok: false, status: 503 });
    mockApiJson.mockResolvedValue({ archive: archiveFor("playerA") });

    await useScorecardStore.getState().fetchScorecards("playerA");

    expect(sentMatchIds()).toEqual(["m1", "m2"]);
    expect(useScorecardStore.getState().pendingScoreCount).toBe(1);
  });

  it("gives up on a queued score the server rejects as invalid, but keeps one it merely could not reach", async () => {
    mockApiFetch.mockResolvedValue({ ok: false, status: 503 });
    await useScorecardStore.getState().recordScore("playerA", payload("m1"));
    await useScorecardStore.getState().recordScore("playerA", payload("m2"));
    mockApiFetch.mockReset();
    mockApiFetch.mockResolvedValueOnce({ ok: false, status: 400 }).mockResolvedValue({ ok: false, status: 503 });
    mockApiJson.mockResolvedValue({ archive: archiveFor("playerA") });

    await useScorecardStore.getState().fetchScorecards("playerA");

    expect(useScorecardStore.getState().pendingScoreCount).toBe(1);
  });

  it("never sends one account's queued scores while a different account is signed in", async () => {
    mockApiFetch.mockResolvedValueOnce({ ok: false, status: 503 });
    await useScorecardStore.getState().recordScore("playerA", payload("m1"));
    mockApiFetch.mockReset();
    asPlayer("playerB");
    mockApiJson.mockResolvedValue({ archive: archiveFor("playerB") });

    await useScorecardStore.getState().fetchScorecards("playerB");

    expect(mockApiFetch).not.toHaveBeenCalled();
    expect(useScorecardStore.getState().pendingScoreCount).toBe(0);
  });

  it("counts a queued score once however many times it is retried", async () => {
    mockApiFetch.mockResolvedValue({ ok: false, status: 503 });
    mockApiJson.mockResolvedValue({ archive: archiveFor("playerA") });
    await useScorecardStore.getState().recordScore("playerA", payload("m1"));

    await useScorecardStore.getState().fetchScorecards("playerA");
    await useScorecardStore.getState().fetchScorecards("playerA");

    expect(useScorecardStore.getState().pendingScoreCount).toBe(1);
  });

  it("leaves the queue empty when a score is saved first time", async () => {
    mockApiFetch.mockResolvedValue({ ...ok, json: async () => ({ result: { isNewPersonalBest: false } }) });
    mockApiJson.mockResolvedValue({ archive: archiveFor("playerA") });

    await useScorecardStore.getState().recordScore("playerA", payload("m1"));

    expect(useScorecardStore.getState().pendingScoreCount).toBe(0);
  });
});
