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

/** Public path prefix. Matches the on-disk casing exactly. */
export const AVATAR_DIR = "/Avatars";

export interface AvatarOption {
  /** Stored value. The filename alone, so the folder can move. */
  id: string;
  /** Full public URL for an <img src>. */
  src: string;
  /** Screen-reader label. Positional by necessity — see the note above. */
  label: string;
}

const FILES: readonly string[] = [
  "file_0000000084c48208b1f893419d784cf2_1.jpg",
  "file_0000000084c48208b1f893419d784cf2_10.jpg",
  "file_0000000084c48208b1f893419d784cf2_11.jpg",
  "file_0000000084c48208b1f893419d784cf2_12.jpg",
  "file_0000000084c48208b1f893419d784cf2_2.jpg",
  "file_0000000084c48208b1f893419d784cf2_3.jpg",
  "file_0000000084c48208b1f893419d784cf2_4.jpg",
  "file_0000000084c48208b1f893419d784cf2_5.jpg",
  "file_0000000084c48208b1f893419d784cf2_8.jpg",
  "file_0000000084c48208b1f893419d784cf2_9.jpg",
  "file_0000000094008208a20f77270605d0d5_1.jpg",
  "file_0000000094008208a20f77270605d0d5_10.jpg",
  "file_0000000094008208a20f77270605d0d5_11.jpg",
  "file_0000000094008208a20f77270605d0d5_2.jpg",
  "file_0000000094008208a20f77270605d0d5_3.jpg",
  "file_0000000094008208a20f77270605d0d5_4.jpg",
  "file_0000000094008208a20f77270605d0d5_5.jpg",
  "file_0000000094008208a20f77270605d0d5_7.jpg",
  "file_0000000094008208a20f77270605d0d5_8.jpg",
  "file_0000000094008208a20f77270605d0d5_9.jpg",
  "file_00000000b39c8211b590a4382a7e3fc3_1.jpg",
  "file_00000000b39c8211b590a4382a7e3fc3_10.jpg",
  "file_00000000b39c8211b590a4382a7e3fc3_2.jpg",
  "file_00000000b39c8211b590a4382a7e3fc3_3.jpg",
  "file_00000000b39c8211b590a4382a7e3fc3_4.jpg",
  "file_00000000b39c8211b590a4382a7e3fc3_5.jpg",
  "file_00000000b39c8211b590a4382a7e3fc3_6.jpg",
  "file_00000000b39c8211b590a4382a7e3fc3_7.jpg",
  "file_00000000b39c8211b590a4382a7e3fc3_8.jpg",
  "file_00000000b39c8211b590a4382a7e3fc3_9.jpg",
  "file_00000000c1f48208810e59b5535e2d15_1.jpg",
  "file_00000000c1f48208810e59b5535e2d15_10.jpg",
  "file_00000000c1f48208810e59b5535e2d15_11.jpg",
  "file_00000000c1f48208810e59b5535e2d15_12.jpg",
  "file_00000000c1f48208810e59b5535e2d15_13.jpg",
  "file_00000000c1f48208810e59b5535e2d15_14.jpg",
  "file_00000000c1f48208810e59b5535e2d15_15.jpg",
  "file_00000000c1f48208810e59b5535e2d15_16.jpg",
  "file_00000000c1f48208810e59b5535e2d15_17.jpg",
  "file_00000000c1f48208810e59b5535e2d15_18.jpg",
  "file_00000000c1f48208810e59b5535e2d15_19.jpg",
  "file_00000000c1f48208810e59b5535e2d15_2.jpg",
  "file_00000000c1f48208810e59b5535e2d15_20.jpg",
  "file_00000000c1f48208810e59b5535e2d15_3.jpg",
  "file_00000000c1f48208810e59b5535e2d15_4.jpg",
  "file_00000000c1f48208810e59b5535e2d15_5.jpg",
  "file_00000000c1f48208810e59b5535e2d15_6.jpg",
  "file_00000000c1f48208810e59b5535e2d15_7.jpg",
  "file_00000000c1f48208810e59b5535e2d15_8.jpg",
  "file_00000000c1f48208810e59b5535e2d15_9.jpg",
];

export const AVATARS: readonly AvatarOption[] = FILES.map((file, i) => ({
  id: file,
  src: `${AVATAR_DIR}/${file}`,
  label: `Avatar ${i + 1}`,
}));

/** True when `id` is one we actually ship. Guards a stale or edited value. */
export function isKnownAvatar(id: string | null | undefined): id is string {
  return typeof id === "string" && FILES.includes(id);
}

/** The chosen avatar's record, or null when unset or no longer shipped. */
export function findAvatar(id: string | null | undefined): AvatarOption | null {
  if (!isKnownAvatar(id)) return null;
  return AVATARS.find((a) => a.id === id) ?? null;
}
