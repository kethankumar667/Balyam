/**
 * The one list of avatar filenames, shared by the client and the server.
 *
 * It lives here rather than in the client because the server has to VALIDATE
 * against it. A player's avatar id is broadcast to everyone at the table and
 * rendered by their browsers as `<img src={"/Avatars/" + id}>`. An id the
 * server never checked is therefore a string one player gets to inject into
 * every other player's page: `../../` walks out of the folder, and anything
 * resolving off-site would hand a stranger's server the IP address of every
 * person in the room — the same class of leak already flagged for STUN under
 * the DPDP work. So the server accepts an avatar only if it is on this list,
 * and drops it silently otherwise.
 *
 * The files themselves live in `client/public/Avatars` — capital A, which
 * Windows forgives and Render's Linux hosting does not. See the note in
 * client/src/lib/avatars.ts.
 *
 * Regenerate after adding files: append the new filename here, and nowhere
 * else.
 */

/** Public path prefix. Matches the on-disk casing exactly. */
export const AVATAR_DIR = "/Avatars";

export const AVATAR_FILES: readonly string[] = [
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

const KNOWN = new Set(AVATAR_FILES);

/**
 * True only for a filename on the list above.
 *
 * Deliberately an exact set membership test rather than a pattern match: a
 * regex permissive enough to accept these names is also permissive enough to
 * accept names nobody vetted, and the whole point is that the server chooses
 * from a closed set.
 */
export function isKnownAvatar(id: string | null | undefined): id is string {
  return typeof id === "string" && KNOWN.has(id);
}

/**
 * The id if it is real, otherwise undefined — the shape the server wants when
 * sanitising an inbound payload.
 */
export function sanitizeAvatar(id: unknown): string | undefined {
  return typeof id === "string" && KNOWN.has(id) ? id : undefined;
}

/**
 * A stable avatar for a bot, chosen from its name.
 *
 * ── Why "matching the name" can only mean "stable", not "on-theme" ─────
 * The 50 files above are AI-generated, undescribed, and interchangeable —
 * see the file header. Nobody has looked at them and tagged which one
 * "looks like a Sachin" or a "Kanakam", so there is no thematic pairing to
 * do here. What IS achievable, and what this gives every bot: the SAME
 * name always renders the SAME face, room after room, session after
 * session — matching the exact precedent `SeatAvatar.tsx`'s `toneFor`
 * already sets for the initials-circle fallback ("same name always lands
 * on the same colour, so a player who reconnects does not visibly change
 * identity"). This is that same idea, one level up: a bot's face is part
 * of its identity the moment it has a name at all, instead of every bot
 * everywhere falling back to a bare initial.
 *
 * Same `h = h*31 + charCode` polynomial hash already used for this exact
 * purpose elsewhere (Rummy's/Ludo's/UNO's own per-seat Avatar components) —
 * kept here, not duplicated, because bot avatars are assigned server-side
 * at creation time and need to agree with nothing else, just be stable.
 */
export function pickAvatarForName(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_FILES[Math.abs(h) % AVATAR_FILES.length];
}
