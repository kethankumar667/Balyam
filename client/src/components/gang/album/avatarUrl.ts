/** Where the BHALYAM logo lives; the picture of last resort when an avatar is missing or fails to load. */
export const FALLBACK_AVATAR = "/Bhalyam-logo.png";

/** A file inside the avatar folder, and nothing that can climb out of it (no leading dot, no slashes after). */
const AVATAR_FOLDER_PATH = /^\/Avatars\/[A-Za-z0-9_-][A-Za-z0-9._-]*$/;
/** A plain file name: letters, digits, `_ - .`, not starting with a dot, no folders, no scheme. */
const BARE_NAME = /^[A-Za-z0-9_-][A-Za-z0-9._-]*$/;
const HAS_IMAGE_EXTENSION = /\.(jpg|png|webp|svg)$/;

/**
 * Turn whatever the server stored as a member's avatar into an image URL.
 * A bare filename goes under /Avatars (and is assumed to be a .png if it has no extension);
 * a path already inside /Avatars, and the logo, pass through. Empty means the logo.
 *
 * ── Anything else becomes the logo — on purpose ────────────────────────
 * This value is shown to every other member as an image address. It used to let ANY text that
 * began with `http` or `/` straight through, so one member could point theirs at an address on
 * their own server, and every other member's browser would fetch it — giving that server each
 * viewer's IP address and browser details. (`//host/x` began with `/` too.) The server now only
 * stores avatars from the app's own list, but a value stored before that, or a future route that
 * forgets to check, must still be harmless where it is displayed.
 */
export function getAvatarUrl(avatar?: string): string {
  if (!avatar) return FALLBACK_AVATAR;
  if (avatar === FALLBACK_AVATAR || AVATAR_FOLDER_PATH.test(avatar)) return avatar;
  if (!BARE_NAME.test(avatar)) return FALLBACK_AVATAR;
  return HAS_IMAGE_EXTENSION.test(avatar) ? `/Avatars/${avatar}` : `/Avatars/${avatar}.png`;
}
