import { progressionRepository } from "../persistence/index.js";

/**
 * Whether the server has ever seen this player — i.e. they have an identity
 * row, which every sign-in (guest or member) leaves behind.
 *
 * Blocking and reporting name another player by id, and that id comes from a
 * client. Without this check a request could name anything, and persisting it
 * would either fail on the foreign key (losing the block silently) or, if the
 * store obligingly created an identity for it, let one request mint junk rows.
 */
export async function isKnownPlayer(playerId: string): Promise<boolean> {
  return (await progressionRepository().getIdentity(playerId)) !== null;
}
