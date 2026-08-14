/**
 * The avatars a player can choose from, generated from `public/Avatars`.
 *
 * A manifest rather than a directory read, because these files live in
 * `public/` — Vite copies that folder verbatim and never scans it, so
 * `import.meta.glob` cannot see them and the browser has no way to list a
 * remote directory. The list has to be written down somewhere; here is that
 * somewhere.
 *
 * ── Two things to keep right ──────────────────────────────────────────
 * 1. The folder is `Avatars`, capital A. Windows resolves `/avatars/x.jpg`
 *    happily and Render's Linux static hosting does not, so a lower-cased
 *    path is a bug that only ever appears in production.
 * 2. The filenames carry no meaning, so the labels are positional ("Avatar
 *    7"). Inventing descriptions for images nobody has described would put
 *    wrong words in a screen reader's mouth, which is worse than a plain
 *    number.
 *
 * Regenerate after adding files — see the script in this file's git history,
 * or simply append the new filename.
 */

/* AVATAR_DIR and the filename list now live in shared/avatars.ts, because
   the SERVER has to validate ids against the same list — see the note there.
   Re-exported so existing client imports keep working unchanged. */
import { AVATAR_DIR, AVATAR_FILES, isKnownAvatar } from "@shared/avatars";
export { AVATAR_DIR, isKnownAvatar };

export interface AvatarOption {
  /** Stored value. The filename alone, so the folder can move. */
  id: string;
  /** Full public URL for an <img src>. */
  src: string;
  /** Screen-reader label. Positional by necessity — see the note above. */
  label: string;
}

export const AVATARS: readonly AvatarOption[] = AVATAR_FILES.map((file, i) => ({
  id: file,
  src: `${AVATAR_DIR}/${file}`,
  label: `Avatar ${i + 1}`,
}));

/** The chosen avatar's record, or null when unset or no longer shipped. */
export function findAvatar(id: string | null | undefined): AvatarOption | null {
  if (!isKnownAvatar(id)) return null;
  return AVATARS.find((a) => a.id === id) ?? null;
}
