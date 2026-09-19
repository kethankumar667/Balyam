import { describe, it, expect } from "vitest";
import { settlementViewFor } from "../settlementAccess.js";
import type { MatchEconomySettlementRecord } from "../../persistence/EconomyRepository.js";

/**
 * `GET /api/economy/settlements/:matchId` answered 403 to anyone but the room's
 * host, so when the JOINING player won, their result screen could never show the
 * prize. Every participant may read their own match's outcome; nobody else may,
 * and a participant never gets to see another player's internal identity id.
 */

const HOST = "aaaaaaaa-1111-2222-3333-444444444444";
const JOINER = "bbbbbbbb-1111-2222-3333-444444444444";
const STRANGER = "cccccccc-1111-2222-3333-444444444444";

function settlement(overrides: Partial<MatchEconomySettlementRecord> = {}): MatchEconomySettlementRecord {
  return {
    matchId: "m_TEST_1",
    roomCode: "TEST01",
    hostIdentityId: HOST,
    seatCount: 2,
    humanSeatCount: 2,
    botSeatCount: 0,
    costPerSeat: "100",
    totalCollected: "200",
    totalWalletRewarded: "160",
    totalGuestEscrow: "0",
    totalBotCollection: "0",
    totalWorldBankCut: "40",
    totalRefunded: "0",
    refundReason: null,
    status: "SETTLED",
    participantDebits: [
      { identityId: HOST, identityKind: "member", amountCoins: "100" },
      { identityId: JOINER, identityKind: "member", amountCoins: "100" },
    ],
    ...overrides,
  } as MatchEconomySettlementRecord;
}

describe("settlementViewFor", () => {
  it("gives the host the full record", () => {
    const s = settlement();
    const v = settlementViewFor(s, HOST);
    expect(v).toEqual({ access: "host", settlement: s });
  });

  it("gives a joining participant a view of their match — the case that used to be a 403", () => {
    const v = settlementViewFor(settlement(), JOINER);
    expect(v.access).toBe("participant");
    if (v.access !== "participant") return;
    expect(v.settlement.status).toBe("SETTLED");
    expect(v.settlement.totalCollected).toBe("200");
    expect(v.settlement.seatCount).toBe(2);
  });

  it("does not leak the host's internal id or the other players' debit rows to a participant", () => {
    const v = settlementViewFor(settlement(), JOINER);
    if (v.access !== "participant") throw new Error("expected participant access");
    expect(v.settlement.hostIdentityId).toBe("");
    expect(v.settlement.participantDebits).toEqual([{ identityId: JOINER, identityKind: "member", amountCoins: "100" }]);
    expect(JSON.stringify(v.settlement)).not.toContain(HOST);
  });

  it("refuses a caller who was not in the match", () => {
    expect(settlementViewFor(settlement(), STRANGER)).toEqual({ access: "none" });
  });

  it.each([undefined, null, ""])("refuses an unresolved caller (%p)", (caller) => {
    expect(settlementViewFor(settlement(), caller as never)).toEqual({ access: "none" });
  });

  it("falls back to host-only when the record lists no participants (older or minimal records)", () => {
    const bare = settlement({ participantDebits: undefined });
    expect(settlementViewFor(bare, HOST).access).toBe("host");
    expect(settlementViewFor(bare, JOINER)).toEqual({ access: "none" });
  });

  describe("participation proven by the caller's own ledger (the production path)", () => {
    // The Supabase repository does not read participant rows back into the
    // settlement record, so `participantDebits` is absent in production. Every
    // paying player does have a `match` ledger row for this match id, and the
    // caller-scoped ledger is already read in production.
    const noDebitList = () => settlement({ participantDebits: undefined });

    it("admits a caller whose own ledger has an entry for this match, with the redacted view", () => {
      const v = settlementViewFor(noDebitList(), JOINER, { hasOwnLedgerEntry: true });
      expect(v.access).toBe("participant");
      if (v.access !== "participant") return;
      expect(v.settlement.hostIdentityId).toBe("");
      expect(v.settlement.participantDebits).toBeUndefined();
      expect(v.settlement.status).toBe("SETTLED");
      expect(JSON.stringify(v.settlement)).not.toContain(HOST);
    });

    it("still refuses a caller with no ledger evidence", () => {
      expect(settlementViewFor(noDebitList(), STRANGER, { hasOwnLedgerEntry: false })).toEqual({ access: "none" });
      expect(settlementViewFor(noDebitList(), STRANGER)).toEqual({ access: "none" });
    });

    it("never lets the ledger flag override an unresolved caller", () => {
      expect(settlementViewFor(noDebitList(), "", { hasOwnLedgerEntry: true })).toEqual({ access: "none" });
    });

    it("keeps the host view full even when the ledger flag is also set", () => {
      const s = noDebitList();
      expect(settlementViewFor(s, HOST, { hasOwnLedgerEntry: true })).toEqual({ access: "host", settlement: s });
    });
  });

  it("does not mutate the stored record", () => {
    const s = settlement();
    const before = JSON.stringify(s);
    settlementViewFor(s, JOINER);
    expect(JSON.stringify(s)).toBe(before);
  });

  it("treats identity ids as exact strings, not prefixes or case variants", () => {
    expect(settlementViewFor(settlement(), JOINER.toUpperCase())).toEqual({ access: "none" });
    expect(settlementViewFor(settlement(), JOINER.slice(0, 8))).toEqual({ access: "none" });
  });
});
