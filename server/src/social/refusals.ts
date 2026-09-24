/**
 * The words used when a social action is refused.
 *
 * They are named constants, defined once, because the wording is part of the
 * privacy design: a refusal because the two players are blocked must be
 * indistinguishable from any other refusal on the same path. If the block
 * message were typed out separately it could drift into a slightly different
 * sentence, and the difference would tell the person on the receiving end that
 * somebody had blocked them.
 */

/** Friend request refused — a block, a decline cooldown, or a full friends list all say this. */
export const UNABLE_TO_SEND_REQUEST = "Unable to send friend request to this player";

/** Party invitation refused because of a block. */
export const UNABLE_TO_INVITE = "Unable to invite this player";

/** Block refused — yourself, or a player the server has never seen. */
export const UNABLE_TO_BLOCK = "Unable to block this player";

/** Report refused — yourself, or a player the server has never seen. */
export const UNABLE_TO_REPORT = "Unable to report this player";
