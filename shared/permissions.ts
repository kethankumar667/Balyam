/**
 * Who is allowed to do what.
 *
 * One table, imported by both sides, so the button the client hides and the
 * action the server refuses are never two separate opinions that drift apart.
 * Every gate in the product reads `capabilitiesFor(kind)` — there are no
 * `if (isGuest)` checks scattered through the UI, because the third one of
 * those always ends up meaning something slightly different from the first two.
 *
 * ── The product rule, in one line ─────────────────────────────────────
 * A guest can play. A guest cannot gather people.
 *
 * Everything below follows from that. Solo-vs-bots and Pass & Play both stay
 * open because neither one summons anybody: the bots are ours, and Pass & Play
 * is four people already sitting around one phone. What closes is the ability
 * to open a table that a stranger on another device can walk into — creating a
 * shareable room, handing out its code, or typing someone else's code to go
 * looking for a table. A guest gets into a room exactly one way: somebody with
 * an account invites them.
 *
 * ── On how much this is worth ─────────────────────────────────────────
 * `AccountKind` is CLIENT-ASSERTED today. The browser tells the server which
 * kind it is on `room:create`, and the server believes it, because there is no
 * account store yet to check the claim against (the /login screens are real
 * screens with nothing behind them). So this is a product rule the honest path
 * obeys, not a security boundary — anyone willing to open devtools can send
 * `hostKind: "member"` and host a shared room.
 *
 * That is a deliberate, accepted trade, and it is worth being exact about what
 * it does and does not cost. It costs nothing in privacy: a guest who forges
 * the claim gets a normal room, not somebody else's data, and the seat tokens
 * in lib/seatToken still stop the actual seat-hijack attack independently of
 * anything here. What it buys is that the seam exists and every call site is
 * already routed through it — the day sign-in is server-verified, `hostKind`
 * stops being read off the payload and starts being read off the session, and
 * this file does not change at all.
 */

import type { AccountKind } from "./types.js";

export interface Capabilities {
  /**
   * Open a room other devices can join. The single most important gate:
   * everything a guest cannot do downstream (sharing a code, inviting, being
   * findable) falls out of the room never being shareable in the first place.
   */
  hostSharedRoom: boolean;
  /** Type a code into a box to go find somebody else's table. */
  joinByCode: boolean;
  /**
   * Scan a host's QR to get into their room. Open to everyone, and the line
   * between this and `joinByCode` is the point rather than a loophole: a QR
   * has to be held up by the person running the table, which makes scanning
   * one the in-person form of being invited. A code box is the opposite — it
   * is the affordance for going and finding a room on your own.
   *
   * Mechanically they end in the same place, so this buys no security. What
   * it buys is that the party in someone's living room still works for the
   * friend who has not signed up, which is most of what BHALYAM is for.
   */
  scanInvite: boolean;
  /** Follow an invite link into a member's room. Open to everyone. */
  acceptInvite: boolean;
  /** A sealed table against bots, or a solo-arcade game. Open to everyone. */
  soloVsBots: boolean;
  /** Several humans, one device, no code involved. Open to everyone. */
  passAndPlay: boolean;
  /** Change display name and avatar. Open to everyone — it is how a guest
   *  becomes a person at the table rather than "Player 3". */
  editProfile: boolean;
  /** Voice chat while in a room. Open to everyone; being in the room at all
   *  already required an invite. */
  voiceChat: boolean;
  /** Attach a big screen to a room (`/tv/:code`) without taking a seat.
   *  Member-only: it is a code-led way into a room, same as `joinByCode`. */
  spectate: boolean;
  /** Participate in or browse competitive tournaments. Member-only. */
  viewTournaments: boolean;
  /** View global leaderboards and seasonal rankings. Member-only. */
  viewLeaderboards: boolean;
  /** View persistent career profile and personal stats. Member-only. */
  viewProfile: boolean;
  /** Access the Social Hub — friends, parties, shared history. Member-only. */
  viewSocial: boolean;
  /** Access the Operational Admin Console (/admin/*). Admin/Super Admin only. */
  accessAdminPanel: boolean;
  /** Bypass game maintenance/coming-soon gates to test and play all catalog items. */
  bypassMaintenance: boolean;
  /** Unlock all platform features, experimental modes, and testing sandboxes. */
  unlockAllFeatures: boolean;
}

const GUEST: Capabilities = {
  hostSharedRoom: true,
  joinByCode: true,
  scanInvite: true,
  acceptInvite: true,
  soloVsBots: true,
  passAndPlay: true,
  editProfile: true,
  voiceChat: true,
  spectate: true,
  viewTournaments: false,
  viewLeaderboards: false,
  viewProfile: false,
  viewSocial: false,
  accessAdminPanel: false,
  bypassMaintenance: false,
  unlockAllFeatures: false,
};

const MEMBER: Capabilities = {
  hostSharedRoom: true,
  joinByCode: true,
  scanInvite: true,
  acceptInvite: true,
  soloVsBots: true,
  passAndPlay: true,
  editProfile: true,
  voiceChat: true,
  spectate: true,
  viewTournaments: true,
  viewLeaderboards: true,
  viewProfile: true,
  viewSocial: true,
  accessAdminPanel: false,
  bypassMaintenance: false,
  unlockAllFeatures: false,
};

const SUPER_ADMIN: Capabilities = {
  hostSharedRoom: true,
  joinByCode: true,
  scanInvite: true,
  acceptInvite: true,
  soloVsBots: true,
  passAndPlay: true,
  editProfile: true,
  voiceChat: true,
  spectate: true,
  viewTournaments: true,
  viewLeaderboards: true,
  viewProfile: true,
  viewSocial: true,
  accessAdminPanel: true,
  bypassMaintenance: true,
  unlockAllFeatures: true,
};

export function capabilitiesFor(kind: AccountKind): Capabilities {
  if (kind === "super_admin" || kind === "admin") return SUPER_ADMIN;
  return kind === "member" ? MEMBER : GUEST;
}

/**
 * What the server says when someone knocks on a sealed table.
 *
 * Deliberately describes the ROOM and not the person who made it. "The host is
 * only a guest" would be both an insult and an information leak; "this table
 * isn't taking players" is the truth and reads as a property of the table.
 */
export const SEALED_ROOM_ERROR = "This table isn't open to other players";

/**
 * The one sentence a guest sees on every locked control.
 *
 * Kept here rather than typed into each gate so the promise stays identical
 * everywhere — a gate that phrases the offer differently on the third screen
 * reads as three different products.
 */
export const SIGN_IN_PITCH = "Create a free account to play with friends";
