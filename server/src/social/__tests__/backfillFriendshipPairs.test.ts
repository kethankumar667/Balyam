import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  backfillContext,
  backfillFriendshipPairs,
  isVerifiedIdentityId,
  readStoredMatches,
  type BackfillMatch,
} from "../backfillFriendshipPairs.js";
import { FriendshipHistoryService } from "../FriendshipHistoryService.js";
import { orderedPair } from "../friendshipMath.js";
import { InMemoryProgressionRepository } from "../../persistence/InMemoryProgressionRepository.js";

const A = "aaaaaaaa-1111-2222-3333-444444444444";
const B = "bbbbbbbb-1111-2222-3333-444444444444";
const C = "cccccccc-1111-2222-3333-444444444444";
const GUEST_ID = "guest_0123456789abcdef";
const T0 = Date.UTC(2026, 2, 10, 10, 0, 0);
const DAY = 86_400_000;

const part = (playerId: string, over: Partial<{ isBot: boolean; isWinner: boolean }> = {}) => ({
  playerId,
  isBot: false,
  isWinner: false,
  ...over,
});

const stored = (id: string, at: number, participants: BackfillMatch["participants"]): BackfillMatch => ({
  id,
  startedAt: at,
  finishedAt: at + 600_000,
  participants,
});

describe("isVerifiedIdentityId", () => {
  it.each([
    [A, true],
    [GUEST_ID, true],
    ["GUEST_ABC", false],
    ["AAAAAAAA-1111-2222-3333-444444444444", false],
    ["p_1700000000000_abc123", false],
    ["", false],
    ["acct-a", false],
    ["guest_xyz", false],
  ])("%s → %s", (id, expected) => {
    expect(isVerifiedIdentityId(id)).toBe(expected);
  });
});

describe("backfillFriendshipPairs", () => {
  let repo: InMemoryProgressionRepository;
  let service: FriendshipHistoryService;

  const pairOf = (x: string, y: string) => {
    const { low, high } = orderedPair(x, y);
    return repo.getFriendshipPair(low, high);
  };

  beforeEach(() => {
    repo = new InMemoryProgressionRepository();
    service = new FriendshipHistoryService(() => repo);
  });

  it("builds a pair for every two verified humans in a stored match", async () => {
    const report = await backfillFriendshipPairs([stored("m_1", T0, [part(A), part(B), part(C)])], service);

    expect(report).toMatchObject({ matchesSeen: 1, matchesCounted: 1, pairsUpdated: 3 });
    expect((await pairOf(A, B))?.matchesTogether).toBe(1);
    expect((await pairOf(B, C))?.matchesTogether).toBe(1);
  });

  it("counts a win together only when both players are marked winners", async () => {
    await backfillFriendshipPairs(
      [stored("m_1", T0, [part(A, { isWinner: true }), part(B, { isWinner: true }), part(C)])],
      service,
    );

    expect((await pairOf(A, B))?.winsTogether).toBe(1);
    expect((await pairOf(A, C))?.winsTogether).toBe(0);
  });

  it("leaves out bots, and reports seat ids as history it cannot recover", async () => {
    const report = await backfillFriendshipPairs(
      [
        stored("m_1", T0, [part(A), part(B), part("bot-1", { isBot: true }), part("p_1700000000000_abc123")]),
      ],
      service,
    );

    expect(report.participantsUnverifiable).toBe(1);
    expect(report.pairsUpdated).toBe(1);
    expect(await pairOf(A, "bot-1")).toBeNull();
  });

  it("skips a match with fewer than two verified players, and says so", async () => {
    const report = await backfillFriendshipPairs(
      [
        stored("m_seats", T0, [part("p_1_aaa"), part("p_2_bbb")]),
        stored("m_one", T0, [part(A), part("p_3_ccc")]),
      ],
      service,
    );

    expect(report.matchesTooFewVerified).toBe(2);
    expect(report.matchesCounted).toBe(0);
    expect(report.participantsUnverifiable).toBe(3);
  });

  it("leaves matches on or after the cutoff to the live path", async () => {
    const cutoff = T0 + DAY;
    const report = await backfillFriendshipPairs(
      [
        stored("m_before", T0, [part(A), part(B)]),
        stored("m_at", cutoff, [part(A), part(B)]),
        stored("m_after", cutoff + DAY, [part(A), part(B)]),
      ],
      service,
      { before: cutoff },
    );

    expect(report).toMatchObject({ matchesCounted: 1, matchesAfterCutoff: 2 });
    expect((await pairOf(A, B))?.matchesTogether).toBe(1);
  });

  it("is safe to run twice: the second run counts nothing new", async () => {
    const matches = [stored("m_1", T0, [part(A), part(B)]), stored("m_2", T0 + DAY, [part(A), part(B)])];

    const first = await backfillFriendshipPairs(matches, service);
    const second = await backfillFriendshipPairs(matches, service);

    expect(first.matchesCounted).toBe(2);
    expect(second).toMatchObject({ matchesCounted: 0, matchesAlreadyCounted: 2, pairsUpdated: 0 });
    expect((await pairOf(A, B))?.matchesTogether).toBe(2);
  });

  it("does not double count a match the live path already counted", async () => {
    await service.recordMatch({
      matchId: "m_live",
      playedAt: T0,
      participants: [{ identityId: A }, { identityId: B }],
      winnerIdentityIds: [],
    });

    const report = await backfillFriendshipPairs([stored("m_live", T0, [part(A), part(B)])], service);

    expect(report.matchesAlreadyCounted).toBe(1);
    expect((await pairOf(A, B))?.matchesTogether).toBe(1);
  });

  it("builds streaks and milestones from matches fed oldest first", async () => {
    const report = await backfillFriendshipPairs(
      [
        stored("m_d1", T0, [part(A), part(B)]),
        stored("m_d2", T0 + DAY, [part(A), part(B)]),
        stored("m_d3", T0 + 2 * DAY, [part(A), part(B)]),
      ],
      service,
    );

    expect(report.matchesCounted).toBe(3);
    const pair = await pairOf(A, B);
    expect(pair?.bestDailyStreak).toBe(3);
    const { low, high } = orderedPair(A, B);
    expect((await repo.listFriendshipMilestones(low, high)).map((m) => m.kind)).toContain("FIRST_MATCH");
  });

  it("accepts guests as verified identities", async () => {
    const report = await backfillFriendshipPairs([stored("m_g", T0, [part(GUEST_ID), part(A)])], service);

    expect(report.pairsUpdated).toBe(1);
  });

  it("works with an async source, as the database reader is", async () => {
    async function* source(): AsyncGenerator<BackfillMatch> {
      yield stored("m_1", T0, [part(A), part(B)]);
    }

    const report = await backfillFriendshipPairs(source(), service);

    expect(report.matchesCounted).toBe(1);
  });
});

describe("backfillContext", () => {
  it("a DRY run never writes to the real store", async () => {
    const real = new InMemoryProgressionRepository();
    const claim = vi.spyOn(real, "claimFriendshipMatch");
    const save = vi.spyOn(real, "saveFriendshipPair");
    const identity = vi.spyOn(real, "upsertIdentity");

    const dry = backfillContext(real, true);
    const report = await backfillFriendshipPairs(
      [{ id: "m_1", startedAt: T0, finishedAt: T0 + 1, participants: [part(A), part(B)] }],
      dry.service,
    );

    expect(report.matchesCounted).toBe(1);
    expect(dry.repository).not.toBe(real);
    expect(claim).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
    expect(identity).not.toHaveBeenCalled();
  });

  it("an APPLY run writes to the real store", async () => {
    const real = new InMemoryProgressionRepository();
    const apply = backfillContext(real, false);

    await backfillFriendshipPairs(
      [{ id: "m_1", startedAt: T0, finishedAt: T0 + 1, participants: [part(A), part(B)] }],
      apply.service,
    );

    expect(apply.repository).toBe(real);
    const { low, high } = orderedPair(A, B);
    expect((await real.getFriendshipPair(low, high))?.matchesTogether).toBe(1);
  });
});

describe("readStoredMatches", () => {
  const row = (id: string, startedAt: number) => ({
    id,
    started_at: new Date(startedAt).toISOString(),
    finished_at: new Date(startedAt + 600_000).toISOString(),
    match_participants: [{ player_id: A, is_bot: false, is_winner: true }],
  });

  const collect = async (it: AsyncGenerator<BackfillMatch>) => {
    const out: BackfillMatch[] = [];
    for await (const m of it) out.push(m);
    return out;
  };

  it("maps rows to matches, with times in milliseconds", async () => {
    const db = { select: vi.fn().mockResolvedValue([row("m_1", T0)]) };

    const [match] = await collect(readStoredMatches(db as never));

    expect(match).toEqual({
      id: "m_1",
      startedAt: T0,
      finishedAt: T0 + 600_000,
      participants: [{ playerId: A, isBot: false, isWinner: true }],
    });
  });

  it("asks for the oldest first, in a stable order, and never for everything at once", async () => {
    const db = { select: vi.fn().mockResolvedValue([]) };

    await collect(readStoredMatches(db as never));

    const [table, query] = db.select.mock.calls[0];
    expect(table).toBe("match_summaries");
    expect(query).toContain("order=started_at.asc,id.asc");
    expect(query).toMatch(/limit=\d+/);
    expect(query).toContain("match_participants(player_id,is_bot,is_winner)");
  });

  it("pages through until a short page, asking for each offset in turn", async () => {
    const full = Array.from({ length: 500 }, (_, i) => row(`m_${i}`, T0 + i));
    const db = {
      select: vi.fn().mockResolvedValueOnce(full).mockResolvedValueOnce([row("m_last", T0 + 999)]),
    };

    const matches = await collect(readStoredMatches(db as never));

    expect(matches).toHaveLength(501);
    expect(db.select).toHaveBeenCalledTimes(2);
    expect(db.select.mock.calls[0][1]).toContain("offset=0");
    expect(db.select.mock.calls[1][1]).toContain("offset=500");
  });

  it("filters to matches that started before the cutoff, when there is one", async () => {
    const db = { select: vi.fn().mockResolvedValue([]) };

    await collect(readStoredMatches(db as never, { before: T0 }));

    expect(db.select.mock.calls[0][1]).toContain(`started_at=lt.${encodeURIComponent(new Date(T0).toISOString())}`);
  });

  it("treats a match with no participants as having none", async () => {
    const db = { select: vi.fn().mockResolvedValue([{ id: "m_x", started_at: new Date(T0).toISOString(), finished_at: new Date(T0).toISOString() }]) };

    const [match] = await collect(readStoredMatches(db as never));

    expect(match.participants).toEqual([]);
  });
});
