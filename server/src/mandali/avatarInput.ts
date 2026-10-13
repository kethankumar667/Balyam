import { AVATAR_FILES, sanitizeAvatar } from "@shared/avatars.js";

/** What a member gets when they send no avatar, or one that is not on the app's list. */
export const DEFAULT_MEMBER_AVATAR: string = AVATAR_FILES[0];

/**
 * The avatar to store for a Mandali member: the one they sent only if it is a file the app
 * actually ships, otherwise the default.
 *
 * ── Why this must be checked here ─────────────────────────────────────
 * A member's avatar is stored and then shown to EVERY other member as an image address. Left
 * unchecked, one member could set theirs to `https://their-server.example/pixel.png`, and every
 * other member's browser would fetch it — handing that server each viewer's IP address and
 * browser details, the same leak `shared/avatars.ts` describes for room seats. The rule there
 * is to validate against the closed list, never a permissive pattern, and to drop a bad value
 * silently rather than error. Table seats already do this; the Mandali routes did not.
 */
export function memberAvatar(sent: unknown): string {
  return sanitizeAvatar(sent) ?? DEFAULT_MEMBER_AVATAR;
}
