import { useEffect, useState } from "react";
import { findAvatar } from "../../lib/avatars";

/**
 * Any player's face at the table — theirs as well as yours.
 *
 * The sibling of `SelfAvatar`, which draws only the local player because for a
 * long time that was the only avatar that existed anywhere. Now that `Player`
 * carries an `avatar` field the whole table has faces, and the choice of which
 * one to draw belongs to whoever owns the seat, not to this device.
 *
 * ── The fallback is the interesting part ──────────────────────────────
 * Most seats will have no avatar for a while yet, so the no-photo case is the
 * common case and has to look deliberate rather than broken. It draws the
 * player's initial on a colour derived from their name, which gives every seat
 * at a table a different-looking token without needing a palette assignment
 * from the server. Same name always lands on the same colour, so a player who
 * reconnects does not visibly change identity.
 *
 * The image can also fail after it starts loading — an avatar dropped from
 * `shared/avatars.ts` between releases still sits in someone's localStorage —
 * so a load error falls back to exactly the same initial rather than leaving a
 * browser's broken-image glyph in a seat.
 */

/** Warm tones that sit on both the cream and the dark room panels. */
const TONES = [
  "#B3541E", "#1F6F54", "#2C5A8A", "#7B4A9E",
  "#A03050", "#4A6B1F", "#8A5A11", "#5A4A8A",
] as const;

/**
 * Sum of code units rather than anything cleverer: the only requirements are
 * that it is stable across reloads and spreads short Telugu and Latin names
 * across the list, and a hash with better avalanche behaviour would not change
 * what anyone sees.
 */
function toneFor(name: string): string {
  let n = 0;
  for (let i = 0; i < name.length; i++) n = (n + name.charCodeAt(i)) % TONES.length;
  return TONES[n];
}

function initialOf(name: string): string {
  const trimmed = name.trim();
  // `[...str]` rather than `str[0]`, so a name starting with an astral
  // character (or a Telugu cluster) is not sliced through the middle of a
  // surrogate pair into a replacement glyph.
  return trimmed ? [...trimmed][0].toUpperCase() : "?";
}

export interface SeatAvatarProps {
  /** The seat's chosen avatar filename, from server state. */
  avatar?: string;
  /** Used for the initial and for picking the fallback colour. */
  name: string;
  /** Tailwind size classes for the circle, e.g. "w-8 h-8". */
  className?: string;
  /** Font size for the fallback initial. Matched to the circle by the caller. */
  textClassName?: string;
  /**
   * Portraits put faces in the upper half, so a centred square crop inside a
   * circle shaves heads.
   */
  objectPosition?: string;
}

export default function SeatAvatar({
  avatar,
  name,
  className = "w-8 h-8",
  textClassName = "text-[11px]",
  objectPosition = "50% 22%",
}: SeatAvatarProps) {
  const option = findAvatar(avatar);
  const [failed, setFailed] = useState(false);

  // A seat can change hands (host migration, a reconnect with a new choice),
  // and a stale `failed` would hide the incoming player's perfectly good
  // avatar behind the previous occupant's failure.
  useEffect(() => setFailed(false), [option?.src]);

  if (!option || failed) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-full
                    font-bold text-white flex-shrink-0 select-none
                    ${className} ${textClassName}`}
        style={{ backgroundColor: toneFor(name) }}
        aria-hidden
      >
        {initialOf(name)}
      </span>
    );
  }

  return (
    <img
      src={option.src}
      /* Decorative: the player's name is rendered immediately beside this in
         every caller, so announcing "Avatar 12" would add a number the player
         never chose and cannot act on. */
      alt=""
      aria-hidden
      className={`rounded-full object-cover flex-shrink-0 ${className}`}
      style={{ objectPosition }}
      onError={() => setFailed(true)}
      draggable={false}
    />
  );
}
