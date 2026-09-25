/**
 * Which leatherette cloth a Mandali's album wears.
 *
 * A pure function of the Mandali's id, so a group looks the same on every phone
 * and every visit, and nothing has to be stored or chosen. The CSS classes live
 * in album.css (`album-cloth-<name>`). The first, maroon, is BHALYAM's own
 * "temple maroon" and is also the answer when there is no id to hash.
 */

export const COVER_CLOTHS = ["maroon", "indigo", "green", "umber", "plum"] as const;
export type CoverCloth = (typeof COVER_CLOTHS)[number];

/** FNV-1a: small, dependency-free, and spreads similar ids (m_1, m_2…) well. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function coverClothFor(mandaliId: string | undefined): CoverCloth {
  if (!mandaliId) return "maroon";
  return COVER_CLOTHS[hash(mandaliId) % COVER_CLOTHS.length];
}

export const coverClothClass = (mandaliId: string | undefined): string =>
  `album-cloth-${coverClothFor(mandaliId)}`;
