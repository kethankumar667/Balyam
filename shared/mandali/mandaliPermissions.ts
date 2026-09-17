/**
 * Mandali role permissions — the same one-table discipline as
 * shared/permissions.ts: the button the client hides and the action the
 * server refuses are one opinion, not two that drift.
 *
 * Admins cannot remove the owner or modify peer admins. Group roles never
 * grant platform-admin or wallet powers: no role here can spend another
 * person's wallet.
 */
import type { MandaliRole } from "./Mandali";

export interface MandaliCapabilities {
  /** Read chat and member list. Outsiders/pending get nothing. */
  read: boolean;
  /** Send text, coin requests, game shares, and donate from own wallet. */
  post: boolean;
  /** Approve/reject join requests. */
  review: boolean;
  /** Remove or ban ordinary members; moderate content. */
  moderate: boolean;
  /** Appoint/demote admins, transfer ownership, archive the group. Owner only. */
  administer: boolean;
}

const OWNER: MandaliCapabilities = {
  read: true,
  post: true,
  review: true,
  moderate: true,
  administer: true,
};

const ADMIN: MandaliCapabilities = {
  read: true,
  post: true,
  review: true,
  moderate: true,
  administer: false,
};

const MEMBER: MandaliCapabilities = {
  read: true,
  post: true,
  review: false,
  moderate: false,
  administer: false,
};

export function mandaliCapabilitiesFor(role: MandaliRole): MandaliCapabilities {
  if (role === "OWNER") return OWNER;
  return role === "ADMIN" ? ADMIN : MEMBER;
}
