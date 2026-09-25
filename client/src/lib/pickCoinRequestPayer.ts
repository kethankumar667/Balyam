import type { MandaliMember } from "@shared/mandali/types.js";

/**
 * Who an instant "Request Coins" tap is addressed to.
 *
 * Any active member can pay a coin request, but each one is still addressed
 * to someone, who gets the "asked you" banner so the request is not ignored by
 * everyone at once. When the requester does not choose, address it to whoever
 * runs the group: the owner, then an admin, then the
 * longest-standing member — a fixed order, so the same tap always asks the
 * same person instead of whoever happens to be first in a list. Never the
 * requester themselves, and never someone who is no longer an active member.
 *
 * Roles are compared as strings on purpose: the shared `MandaliRole` type is
 * the older seven-role model, while the database has only OWNER / ADMIN /
 * MEMBER, and a literal comparison against "ADMIN" does not type-check.
 */
export function pickCoinRequestPayer(
  members: readonly MandaliMember[],
  requesterId: string | null
): MandaliMember | undefined {
  const rank = (member: MandaliMember): number => {
    const role: string = member.role;
    if (role === "OWNER") return 0;
    if (role === "ADMIN") return 1;
    return 2;
  };

  return members
    .filter((m) => m.playerId !== requesterId && m.state === "ACTIVE")
    .sort((a, b) => rank(a) - rank(b) || a.joinedAt - b.joinedAt)[0];
}
