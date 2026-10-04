import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { MatchHistoryItem } from "@shared/profile/MatchHistory.js";
import {
  COLLUSION_WINDOW_MS,
  FEEDER_CONCENTRATION,
  MIN_PAIR_MATCHES,
  findFeedingPatterns,
} from "../CollusionReport.js";
import { createRiskAdminRouter } from "../../admin/RiskAdminController.js";
import { startTestServer, mountRouter, type TestServer } from "../../testing/httpTestServer.js";
import { RewardGateway } from "../RewardGateway.js";
import { InMemoryRewardRepository } from "../InMemoryRewardRepository.js";
import { RiskService } from "../RiskService.js";
import { TrustService } from "../TrustService.js";
import { EconomyService } from "../../economy/EconomyService.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";

const NOW = 1_800_000_000_000;
const MIN = 60_000;

/** One two-person match, held once under each player the way the match history holds it. */
function duel(n: number, winner: string, loser: string, at = NOW - n * MIN, durationMs = 3 * MIN): Array<[string, MatchHistoryItem]> {
  const base = {
    matchId: `m${n}`,
    roomCode: `ROOM${n}`,
    game: "rps" as const,
    startedAt: at - durationMs,
    finishedAt: at,
    durationMs,
    replayAvailable: false,
  };
  const participants = [
    { playerId: winner, name: winner, isWinner: true, isMember: true },
    { playerId: loser, name: loser, isWinner: false, isMember: true },
  ] as never;
  return [
    [winner, { ...base, result: "WIN", participants } as MatchHistoryItem],
    [loser, { ...base, result: "LOSS", participants } as MatchHistoryItem],
  ];
}

function history(entries: Array<[string, MatchHistoryItem]>): Map<string, MatchHistoryItem[]> {
  const map = new Map<string, MatchHistoryItem[]>();
  for (const [id, item] of entries) map.set(id, [...(map.get(id) ?? []), item]);
  return map;
}

const repeat = (count: number, make: (n: number) => Array<[string, MatchHistoryItem]>, from = 0) =>
  Array.from({ length: count }, (_, i) => make(from + i)).flat();

describe("finding accounts that look fed by others", () => {
  it("reports a feeder: games almost all against one account, almost all lost", () => {
    const matches = history(repeat(MIN_PAIR_MATCHES, (n) => duel(n, "main", "burner")));

    const [finding] = findFeedingPatterns(matches, NOW);

    expect(finding?.beneficiaryId).toBe("main");
    expect(finding?.feeders).toEqual([
      { playerId: "burner", matches: MIN_PAIR_MATCHES, beneficiaryWins: MIN_PAIR_MATCHES, concentration: 1 },
    ]);
    expect(finding?.summary).toContain("main");
  });

  it("reads friends who play each other a lot and trade wins as the product working, not a finding", () => {
    const matches = history(repeat(20, (n) => (n % 2 === 0 ? duel(n, "asha", "ravi") : duel(n, "ravi", "asha"))));

    expect(findFeedingPatterns(matches, NOW)).toEqual([]);
  });

  it("does not report a better player who beats a friend who also plays plenty of other people", () => {
    const vsMain = repeat(MIN_PAIR_MATCHES, (n) => duel(n, "main", "friend"));
    const vsOthers = repeat(40, (n) => duel(n, `other${n % 8}`, "friend"), 100);

    // The friend lost every game to main, but only a fraction of their games were against main.
    expect(findFeedingPatterns(history([...vsMain, ...vsOthers]), NOW)).toEqual([]);
  });

  it("needs enough games to mean anything", () => {
    expect(findFeedingPatterns(history(repeat(MIN_PAIR_MATCHES - 1, (n) => duel(n, "main", "burner"))), NOW)).toEqual([]);
  });

  it("ignores games outside the window", () => {
    const old = repeat(MIN_PAIR_MATCHES, (n) => duel(n, "main", "burner", NOW - COLLUSION_WINDOW_MS - (n + 1) * MIN));

    expect(findFeedingPatterns(history(old), NOW)).toEqual([]);
  });

  it("ignores matches too short to have been played, which are the cheapest way to fake a pattern", () => {
    const instant = repeat(MIN_PAIR_MATCHES, (n) => duel(n, "main", "burner", NOW - n * MIN, 1_000));

    expect(findFeedingPatterns(history(instant), NOW)).toEqual([]);
  });

  it("counts a match once even though it is stored under both players", () => {
    // One short of the minimum, each stored twice: if every copy counted it would read as 22 and be reported.
    const matches = history(repeat(MIN_PAIR_MATCHES - 1, (n) => duel(n, "main", "burner")));

    expect(findFeedingPatterns(matches, NOW)).toEqual([]);
  });

  it("does not count guests as accounts", () => {
    const entries = repeat(MIN_PAIR_MATCHES, (n) => duel(n, "main", "guest_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")).map(
      ([id, item]) => [id, { ...item, participants: (item.participants as unknown as Array<Record<string, unknown>>).map((p) => ({ ...p, isMember: p.playerId === "main" })) } as unknown as MatchHistoryItem] as [string, MatchHistoryItem],
    );

    expect(findFeedingPatterns(history(entries), NOW)).toEqual([]);
  });

  it("lists the most one-sided case first, and every feeder of one beneficiary together", () => {
    const entries = [
      ...repeat(MIN_PAIR_MATCHES, (n) => duel(n, "main", "burnerA")),
      ...repeat(MIN_PAIR_MATCHES + 6, (n) => duel(n, "main", "burnerB"), 100),
      ...repeat(MIN_PAIR_MATCHES, (n) => duel(n, "other", "burnerC"), 200),
    ];

    const findings = findFeedingPatterns(history(entries), NOW);

    expect(findings.map((f) => f.beneficiaryId)).toEqual(["main", "other"]);
    expect(findings[0]?.feeders.map((f) => f.playerId)).toEqual(["burnerB", "burnerA"]);
    expect(findings[0]?.matches).toBe(MIN_PAIR_MATCHES * 2 + 6);
  });

  it("keeps the concentration threshold where the explanation says it is", () => {
    expect(FEEDER_CONCENTRATION).toBeGreaterThan(0.5);
  });
});

describe("collusion report endpoint", () => {
  const OPS_KEY = "test-collusion-operational-key-0001";
  const originalSecret = process.env.OPERATIONAL_SECRET;
  let server: TestServer;

  beforeEach(async () => {
    process.env.OPERATIONAL_SECRET = OPS_KEY;
    const repository = new InMemoryRewardRepository();
    const risk = new RiskService();
    const trust = new TrustService();
    const gateway = new RewardGateway({ economy: new EconomyService(new InMemoryEconomyRepository()), repository, risk, trust });
    const matches = history(repeat(MIN_PAIR_MATCHES, (n) => duel(n, "main", "burner")));
    server = await startTestServer(
      mountRouter(
        "/api/admin/risk",
        createRiskAdminRouter({ gateway, repository, risk, trust, collusion: () => findFeedingPatterns(matches, NOW) }),
      ),
    );
  });

  afterEach(async () => {
    await server.close();
    process.env.OPERATIONAL_SECRET = originalSecret;
  });

  it("is operator-only", async () => {
    expect((await server.request("/api/admin/risk/collusion")).status).toBe(401);
  });

  it("returns the findings, and is not mistaken for a player id", async () => {
    const res = await server.request("/api/admin/risk/collusion", { headers: { "x-operational-key": OPS_KEY } });

    expect(res.status).toBe(200);
    const body = res.body as { count: number; findings: Array<{ beneficiaryId: string }> };
    expect(body.count).toBe(1);
    expect(body.findings[0]?.beneficiaryId).toBe("main");
  });

  it("changes no account's state: it only reports", async () => {
    await server.request("/api/admin/risk/collusion", { headers: { "x-operational-key": OPS_KEY } });
    const listing = await server.request("/api/admin/risk", { headers: { "x-operational-key": OPS_KEY } });

    expect((listing.body as { accounts: unknown[] }).accounts).toEqual([]);
  });
});
