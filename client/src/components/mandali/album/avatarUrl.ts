/** Where the BHALYAM logo lives; the picture of last resort when an avatar is missing or fails to load. */
export const FALLBACK_AVATAR = "/Bhalyam-logo.png";

/**
 * Turn whatever the server stored as a member's avatar into an image URL.
 * Absolute paths and URLs pass through, bare filenames go under /Avatars, and a
 * bare name is assumed to be a .png there. Empty means the logo.
 */
export function getAvatarUrl(avatar?: string): string {
  if (!avatar) return FALLBACK_AVATAR;
  if (avatar.startsWith("/") || avatar.startsWith("http")) return avatar;
  if (/\.(jpg|png|webp|svg)$/.test(avatar)) return `/Avatars/${avatar}`;
  return `/Avatars/${avatar}.png`;
}
