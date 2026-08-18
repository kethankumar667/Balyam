import type { Party, PartyStatus } from "@shared/party/Party.js";

export class PartyEngine {
  private static VALID_TRANSITIONS: Record<PartyStatus, PartyStatus[]> = {
    CREATED: ["INVITING", "READY", "DISBANDED"],
    INVITING: ["READY", "IN_MATCH", "DISBANDED"],
    READY: ["IN_MATCH", "INVITING", "DISBANDED"],
    IN_MATCH: ["READY", "INVITING", "DISBANDED"],
    DISBANDED: [],
  };

  public static canTransition(from: PartyStatus, to: PartyStatus): boolean {
    return PartyEngine.VALID_TRANSITIONS[from]?.includes(to) || false;
  }

  public static transition(party: Party, to: PartyStatus): Party {
    if (!PartyEngine.canTransition(party.status, to)) {
      throw new Error(`Illegal party state transition from ${party.status} to ${to}`);
    }
    party.status = to;
    party.updatedAt = Date.now();
    return party;
  }
}
