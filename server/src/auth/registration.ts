import { logger } from "../lib/logger.js";
import { progressionRepository } from "../persistence/index.js";

/**
 * When did this member register? The one answer behind both "new member" waits
 * (`shared/newMember.ts`): the day-one streak hold and the first free-coins hour.
 *
 * It is the moment the server first wrote their `player_identities` row, which
 * happens on their first authenticated request — the same instant the app first
 * shows them as signed in. Nothing here is supplied by the client.
 *
 * ── Fails open, on purpose ────────────────────────────────────────────
 * If the row is missing or the store does not answer, this returns `null` and the
 * caller treats the member as established. The waits are a welcome pacing rule,
 * not a defence: refusing a long-standing member their reward because a lookup
 * hiccuped would be a far worse failure than letting a new one claim an hour early.
 * The anti-farming protections live in the reward gateway, not here.
 */
export type RegisteredAtLookup = (playerId: string) => Promise<number | null>;

export const memberRegisteredAt: RegisteredAtLookup = async (playerId) => {
  try {
    const identity = await progressionRepository().getIdentity(playerId);
    return identity?.createdAt ?? null;
  } catch (err) {
    logger.warn({
      message: `Could not read when ${playerId} registered; treating them as established: ${String(err)}`,
      module: "AUTH",
    });
    return null;
  }
};
