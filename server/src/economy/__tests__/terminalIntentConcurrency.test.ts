import { describe, it, expect } from "vitest";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";
import {
  EconomyService,
} from "../EconomyService.js";
import {
  InvalidTerminalIntentPayloadError,
  type SettlementIntentPayload,
  type RefundIntentPayload,
  type TerminalIntentOperationKind,
  type CreateTerminalIntentResult,
} from "../../persistence/EconomyRepository.js";

const MEMBER_A = "11111111-1111-1111-1111-111111111111";
const MEMBER_B = "22222222-2222-2222-2222-222222222222";
const MEMBER_C = "33333333-3333-3333-3333-333333333333";

function freshRepo(): InMemoryEconomyRepository {
  const r = new InMemoryEconomyRepository();
  r.testFixture.seedIdentity(MEMBER_A, "member");
  r.testFixture.seedIdentity(MEMBER_B, "member");
  r.testFixture.seedIdentity(MEMBER_C, "member");
  return r;
}

function freshService(repo: InMemoryEconomyRepository): EconomyService {
  return new EconomyService(repo);
}

async function commitMatch(service: EconomyService, matchId: string, host = MEMBER_A) {
  return service.commitMatchEntry({
    matchId,
    roomCode: "TEST01",
    hostIdentityId: host,
    seatCount: 2,
    humanSeatCount: 2,
    botSeatCount: 0,
    isSolo: false,
  });
}

function settlementPayload(matchId: string, first = MEMBER_A, second = MEMBER_B): SettlementIntentPayload {
  return {
    operationKind: "SETTLEMENT",
    matchId,
    isValidRanking: true,
    participants: [
      { identityId: first, identityKind: "member", placement: 1 },
      { identityId: second, identityKind: "member", placement: 2 },
    ],
  };
}

describe("Blocker 06.1A — Terminal Intent Concurrency & Conflict Detection", () => {
  it("1. Sequential identical duplicate creation returns idempotent existing intent", async () => {
    const repo = freshRepo();
    const service = freshService(repo);
    const matchId = "m_seq_dup_01";
    await commitMatch(service, matchId);

    const payload = settlementPayload(matchId);
    const first = await service.createTerminalIntent({
      matchId,
      operationKind: "SETTLEMENT",
      payload,
    });

    expect(first.created).toBe(true);
    expect(first.conflict).toBe(false);
    expect(first.intent.matchId).toBe(matchId);
    expect(first.intent.operationKind).toBe("SETTLEMENT");

    const second = await service.createTerminalIntent({
      matchId,
      operationKind: "SETTLEMENT",
      payload,
    });

    expect(second.created).toBe(false);
    expect(second.conflict).toBe(false);
    expect(second.intent.id).toBe(first.intent.id);
    expect(second.intent.payload).toEqual(first.intent.payload);

    const rows = await service.listTerminalIntents({ status: "PENDING" });
    expect(rows.filter((r) => r.matchId === matchId)).toHaveLength(1);
  });

  it("2. Concurrent identical creation using Promise.all returns exactly one created:true and N created:false (no raw unique constraint error)", async () => {
    const repo = freshRepo();
    const service = freshService(repo);
    const matchId = "m_concurrent_identical_01";
    await commitMatch(service, matchId);

    const payload = settlementPayload(matchId);
    const callersCount = 8;
    const promises = Array.from({ length: callersCount }, () =>
      service.createTerminalIntent({
        matchId,
        operationKind: "SETTLEMENT",
        payload,
      }),
    );

    const results = await Promise.all(promises);

    const createdList = results.filter((r) => r.created && !r.conflict);
    const idempotentList = results.filter((r) => !r.created && !r.conflict);
    const conflictList = results.filter((r) => r.conflict);

    expect(createdList).toHaveLength(1);
    expect(idempotentList).toHaveLength(callersCount - 1);
    expect(conflictList).toHaveLength(0);

    const winnerId = createdList[0].intent.id;
    for (const res of results) {
      expect(res.intent.id).toBe(winnerId);
      expect(res.intent.matchId).toBe(matchId);
      expect(res.intent.operationKind).toBe("SETTLEMENT");
    }

    const rows = await service.listTerminalIntents({});
    expect(rows.filter((r) => r.matchId === matchId)).toHaveLength(1);
  });

  it("3. Concurrent different operation kinds for one new match returns explicit conflict for losing callers", async () => {
    const repo = freshRepo();
    const service = freshService(repo);
    const matchId = "m_concurrent_diff_kinds_01";
    await commitMatch(service, matchId);

    const settleReq = {
      matchId,
      operationKind: "SETTLEMENT" as const,
      payload: settlementPayload(matchId),
    };
    const refundReq = {
      matchId,
      operationKind: "REFUND" as const,
      payload: { operationKind: "REFUND" as const, matchId, reason: "host disconnected" },
    };
    const forfeitReq = {
      matchId,
      operationKind: "FORFEITURE" as const,
      payload: { operationKind: "FORFEITURE" as const, matchId, reason: "abandonment" },
    };

    const results = await Promise.all([
      service.createTerminalIntent(settleReq),
      service.createTerminalIntent(refundReq),
      service.createTerminalIntent(forfeitReq),
    ]);

    const createdList = results.filter((r) => r.created && !r.conflict);
    const conflictList = results.filter((r) => !r.created && r.conflict);

    expect(createdList).toHaveLength(1);
    expect(conflictList).toHaveLength(2);

    const winner = createdList[0].intent;
    for (const res of results) {
      expect(res.intent.id).toBe(winner.id);
      expect(res.intent.operationKind).toBe(winner.operationKind);
    }

    const rows = await service.listTerminalIntents({});
    expect(rows.filter((r) => r.matchId === matchId)).toHaveLength(1);
  });

  it("4. Concurrent same-kind, different-payload creation returns explicit conflict for differing payload", async () => {
    const repo = freshRepo();
    const service = freshService(repo);
    const matchId = "m_concurrent_diff_payload_01";
    await commitMatch(service, matchId);

    // Payload A: Alice is 1st, Bob is 2nd
    const payloadA = settlementPayload(matchId, MEMBER_A, MEMBER_B);
    // Payload B: Bob is 1st, Alice is 2nd (conflicting ranking!)
    const payloadB = settlementPayload(matchId, MEMBER_B, MEMBER_A);

    const results = await Promise.all([
      service.createTerminalIntent({ matchId, operationKind: "SETTLEMENT", payload: payloadA }),
      service.createTerminalIntent({ matchId, operationKind: "SETTLEMENT", payload: payloadB }),
    ]);

    const createdList = results.filter((r) => r.created && !r.conflict);
    const conflictList = results.filter((r) => !r.created && r.conflict);

    expect(createdList).toHaveLength(1);
    expect(conflictList).toHaveLength(1);

    const winningIntent = createdList[0].intent;
    const losingResult = conflictList[0];

    expect(losingResult.intent.id).toBe(winningIntent.id);
    const winningRanking = winningIntent.payload as SettlementIntentPayload;
    expect(winningRanking.participants[0].identityId).toBe(
      winningRanking.participants[0].identityId === MEMBER_A ? MEMBER_A : MEMBER_B,
    );

    const rows = await service.listTerminalIntents({});
    expect(rows.filter((r) => r.matchId === matchId)).toHaveLength(1);
  });

  it("5. Concurrent different payload versions returns explicit conflict", async () => {
    const repo = freshRepo();
    const service = freshService(repo);
    const matchId = "m_concurrent_diff_versions_01";
    await commitMatch(service, matchId);

    const payload = settlementPayload(matchId);

    const results = await Promise.all([
      service.createTerminalIntent({ matchId, operationKind: "SETTLEMENT", payload, payloadVersion: 1 }),
      service.createTerminalIntent({ matchId, operationKind: "SETTLEMENT", payload, payloadVersion: 2 }),
    ]);

    const createdList = results.filter((r) => r.created && !r.conflict);
    const conflictList = results.filter((r) => !r.created && r.conflict);

    expect(createdList).toHaveLength(1);
    expect(conflictList).toHaveLength(1);

    const winner = createdList[0].intent;
    expect(conflictList[0].intent.id).toBe(winner.id);
    expect(conflictList[0].intent.payloadVersion).toBe(winner.payloadVersion);
  });

  it("6. Semantic payload equality recognizes key-order permutations as identical (no false conflict)", async () => {
    const repo = freshRepo();
    const service = freshService(repo);
    const matchId = "m_key_order_perm_01";
    await commitMatch(service, matchId);

    const payload1: RefundIntentPayload = {
      operationKind: "REFUND",
      matchId,
      reason: "player abandoned",
    };
    const payload2: RefundIntentPayload = {
      reason: "player abandoned",
      matchId,
      operationKind: "REFUND",
    };

    const first = await service.createTerminalIntent({ matchId, operationKind: "REFUND", payload: payload1 });
    expect(first.created).toBe(true);

    const second = await service.createTerminalIntent({ matchId, operationKind: "REFUND", payload: payload2 });
    expect(second.created).toBe(false);
    expect(second.conflict).toBe(false); // correctly detected as identical payload!
    expect(second.intent.id).toBe(first.intent.id);
  });

  it("7. Original intent remains unchanged after multiple conflicting attempts", async () => {
    const repo = freshRepo();
    const service = freshService(repo);
    const matchId = "m_original_unchanged_01";
    await commitMatch(service, matchId);

    const originalPayload = settlementPayload(matchId);
    const original = await service.createTerminalIntent({
      matchId,
      operationKind: "SETTLEMENT",
      payload: originalPayload,
    });
    expect(original.created).toBe(true);

    // Conflict 1: different operationKind
    const conflict1 = await service.createTerminalIntent({
      matchId,
      operationKind: "REFUND",
      payload: { operationKind: "REFUND", matchId, reason: "test refund" },
    });
    expect(conflict1.conflict).toBe(true);

    // Conflict 2: different participants ranking
    const conflict2 = await service.createTerminalIntent({
      matchId,
      operationKind: "SETTLEMENT",
      payload: settlementPayload(matchId, MEMBER_B, MEMBER_A),
    });
    expect(conflict2.conflict).toBe(true);

    // Conflict 3: different payload version
    const conflict3 = await service.createTerminalIntent({
      matchId,
      operationKind: "SETTLEMENT",
      payload: originalPayload,
      payloadVersion: 99,
    });
    expect(conflict3.conflict).toBe(true);

    // Re-read authoritative intent from repository
    const stored = await service.getTerminalIntent(original.intent.id);
    expect(stored?.operationKind).toBe("SETTLEMENT");
    expect(stored?.payloadVersion).toBe(1);
    expect(stored?.payload).toEqual(originalPayload);
    expect(stored?.status).toBe("PENDING");
  });

  it("8. Exactly one terminal intent row exists across repeated sequential and concurrent attempts", async () => {
    const repo = freshRepo();
    const service = freshService(repo);
    const matchId = "m_single_row_integrity_01";
    await commitMatch(service, matchId);

    const payload = settlementPayload(matchId);

    // Run 20 mixed calls: some identical, some conflicting
    const calls: Promise<CreateTerminalIntentResult>[] = [];
    for (let i = 0; i < 10; i++) {
      calls.push(service.createTerminalIntent({ matchId, operationKind: "SETTLEMENT", payload }));
    }
    for (let i = 0; i < 5; i++) {
      calls.push(
        service.createTerminalIntent({
          matchId,
          operationKind: "REFUND",
          payload: { operationKind: "REFUND", matchId, reason: `conflicting ${i}` },
        }),
      );
    }
    for (let i = 0; i < 5; i++) {
      calls.push(
        service.createTerminalIntent({
          matchId,
          operationKind: "SETTLEMENT",
          payload: settlementPayload(matchId, MEMBER_B, MEMBER_A),
        }),
      );
    }

    const outcomes = await Promise.all(calls);
    expect(outcomes).toHaveLength(20);

    const all = await service.listTerminalIntents({});
    const matchIntents = all.filter((i) => i.matchId === matchId);
    expect(matchIntents).toHaveLength(1);
  });

  it("9. Input validation rejects empty matchId, invalid operationKind, and invalid payloadVersion", async () => {
    const repo = freshRepo();
    const service = freshService(repo);

    // Empty matchId at service level throws InvalidRequestError
    await expect(
      service.createTerminalIntent({
        matchId: "",
        operationKind: "SETTLEMENT",
        payload: settlementPayload("m_1"),
      }),
    ).rejects.toThrow();

    // Empty matchId at repository level throws InvalidTerminalIntentPayloadError
    await expect(
      repo.createTerminalIntent({
        matchId: "",
        operationKind: "SETTLEMENT",
        payload: settlementPayload("m_1"),
      }),
    ).rejects.toThrow(InvalidTerminalIntentPayloadError);

    // Invalid operationKind at repository level throws InvalidTerminalIntentPayloadError
    const badKind = "INVALID_KIND" as unknown as TerminalIntentOperationKind;
    const badPayload = { operationKind: badKind, matchId: "m_1" } as unknown as SettlementIntentPayload;
    await expect(
      repo.createTerminalIntent({
        matchId: "m_1",
        operationKind: badKind,
        payload: badPayload,
      }),
    ).rejects.toThrow(InvalidTerminalIntentPayloadError);

    // Invalid payloadVersion < 1 at repository level throws InvalidTerminalIntentPayloadError
    await expect(
      repo.createTerminalIntent({
        matchId: "m_1",
        operationKind: "SETTLEMENT",
        payload: settlementPayload("m_1"),
        payloadVersion: 0,
      }),
    ).rejects.toThrow(InvalidTerminalIntentPayloadError);
  });
});
