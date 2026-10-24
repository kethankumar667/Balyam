import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlayerScorecardArchive, RecordScorePayload } from "@shared/profile/Scorecard";

const mockApiJson = vi.fn();
const mockApiFetch = vi.fn();
const mockPeek = vi.fn();
vi.mock("../playerIdentity", () => ({
  apiJson: (...args: unknown[]) => mockApiJson(...args),
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  getPlayerCredential: vi.fn().mockResolvedValue(null),
  peekPlayerCredential: (...args: unknown[]) => mockPeek(...args),
}));

const { checkRecordsAtRisk } = await import("../signOutGuard");
const { useScorecardStore } = await import("../../store/scorecardStore");
const { enqueueScore } = await import("../scoreOutbox");

/**
 * Signing out clears local storage. Anything that exists only there (a score still waiting to be sent, or a
 * best that never reached the account) is destroyed with no warning. This is the check that says so first.
 */

const CRICKET_KEY = "bhalyam_nokia_cricket_data_v1";
const archiveFor = (playerId: string, extra: Partial<PlayerScorecardArchive> = {}): PlayerScorecardArchive =>
  ({ playerId, games: {}, totalPersonalBestsBeaten: 0, updatedAt: 1, ...extra });
const queued: RecordScorePayload = { game: "nokiacricket", modeId: "classic_1", score: 18, matchId: "m1", context: "SOLO" };

const asMember = () => mockPeek.mockReturnValue({ playerId: "alice", token: "t", kind: "member" });

beforeEach(() => {
  mockApiJson.mockReset();
  mockApiFetch.mockReset();
  mockPeek.mockReset();
  localStorage.clear();
  useScorecardStore.setState({ archive: null, localArchive: null, loading: false, error: null, pendingScoreCount: 0 });
  asMember();
  mockApiJson.mockResolvedValue({ archive: archiveFor("alice") });
});

describe("checkRecordsAtRisk", () => {
  it("has nothing to say to a guest, whose sign-out does not wipe the device", async () => {
    mockPeek.mockReturnValue({ playerId: "guest-1", token: "t", kind: "guest" });

    await expect(checkRecordsAtRisk()).resolves.toBeNull();
    expect(mockApiJson).not.toHaveBeenCalled();
  });

  it("has nothing to say when everything is already in the account", async () => {
    await expect(checkRecordsAtRisk()).resolves.toBeNull();
  });

  it("sends a waiting score first, and stays quiet once the account has it", async () => {
    enqueueScore("alice", queued, 1);
    mockApiFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ result: null }) });

    await expect(checkRecordsAtRisk()).resolves.toBeNull();
    expect(mockApiFetch).toHaveBeenCalledTimes(1);
  });

  it("warns about a score that still cannot be sent", async () => {
    enqueueScore("alice", queued, 1);
    mockApiFetch.mockResolvedValue({ ok: false, status: 503 });

    await expect(checkRecordsAtRisk()).resolves.toMatchObject({ playerId: "alice", pending: 1, deviceBests: [] });
  });

  it("warns about a best that exists only on this device", async () => {
    localStorage.setItem(CRICKET_KEY, JSON.stringify({ modeBestScores: { classic_10: 140 } }));

    await expect(checkRecordsAtRisk()).resolves.toMatchObject({
      pending: 0,
      deviceBests: [{ game: "nokiacricket", modeId: "classic_10", score: 140 }],
    });
  });

  it("does not warn about a device best the account already holds", async () => {
    localStorage.setItem(CRICKET_KEY, JSON.stringify({ modeBestScores: { classic_10: 140 } }));
    mockApiJson.mockResolvedValue({ archive: archiveFor("alice", { deviceImports: { nokiacricket: { classic_10: { score: 140, importedAt: 1 } } } }) });

    await expect(checkRecordsAtRisk()).resolves.toBeNull();
  });

  it("still answers, and errs on the side of warning, when the server is too slow to check against", async () => {
    localStorage.setItem(CRICKET_KEY, JSON.stringify({ modeBestScores: { classic_10: 140 } }));
    mockApiJson.mockReturnValue(new Promise(() => undefined));

    await expect(checkRecordsAtRisk(20)).resolves.toMatchObject({ deviceBests: [{ modeId: "classic_10" }] });
  });
});
