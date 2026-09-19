import type { MatchEconomySettlementRecord } from "../persistence/EconomyRepository.js";

/**
 * Who may read a match's settlement, and how much of it they see.
 *
 * `GET /api/economy/settlements/:matchId` used to compare the caller with the
 * settlement's `hostIdentityId` and answer 403 to everybody else. The joining
 * player is a paying participant too: when they won, their result screen asked
 * for the settlement to show the prize, was refused, and showed nothing.
 *
 * Membership is read from the record's own `participantDebits` (every seat that
 * was charged at commit time), so no new repository read is needed. A record
 * that carries no debit list falls back to host-only, exactly the old rule.
 *
 * A participant gets a REDACTED view: their own debit row only, and no host
 * identity id. Those are internal ids of other people, and the player has no use
 * for them — the result screen needs only the status and the pot.
 */
export type SettlementView =
  | { access: "host"; settlement: MatchEconomySettlementRecord }
  | { access: "participant"; settlement: MatchEconomySettlementRecord }
  | { access: "none" };

export interface SettlementAccessEvidence {
  /**
   * The caller's OWN wallet ledger has a `match` entry for this match id. This is
   * the evidence that works in production: the Supabase repository does not read
   * participant rows back into the settlement record (so `participantDebits` is
   * absent there), but every paying player has a ledger row for the match, and the
   * caller-scoped ledger is already read in production.
   */
  hasOwnLedgerEntry?: boolean;
}

export function settlementViewFor(
  settlement: MatchEconomySettlementRecord,
  callerIdentityId: string | null | undefined,
  evidence: SettlementAccessEvidence = {},
): SettlementView {
  if (!callerIdentityId) return { access: "none" };
  if (settlement.hostIdentityId === callerIdentityId) return { access: "host", settlement };

  const ownDebits = (settlement.participantDebits ?? []).filter((d) => d.identityId === callerIdentityId);
  if (ownDebits.length === 0 && !evidence.hasOwnLedgerEntry) return { access: "none" };

  return {
    access: "participant",
    settlement: {
      ...settlement,
      hostIdentityId: "",
      participantDebits: ownDebits.length > 0 ? ownDebits : undefined,
    },
  };
}
