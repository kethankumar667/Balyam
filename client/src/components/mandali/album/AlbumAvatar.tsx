import type { ReactNode } from "react";
import { FALLBACK_AVATAR, getAvatarUrl } from "./avatarUrl";

const SIZES = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-14 h-14",
  xl: "w-24 h-24",
} as const;

/** The presence badge grows with the picture, so it stays readable on a large portrait. */
const BADGE_SIZE: Record<keyof typeof SIZES, { box: string; glyph: string }> = {
  sm: { box: "h-3.5 w-3.5", glyph: "h-2.5 w-2.5" },
  md: { box: "h-3.5 w-3.5", glyph: "h-2.5 w-2.5" },
  lg: { box: "h-3.5 w-3.5", glyph: "h-2.5 w-2.5" },
  xl: { box: "h-6 w-6", glyph: "h-4 w-4" },
};

export interface AlbumAvatarProps {
  avatar?: string;
  /** Read out by screen readers; pass an empty string when the name is already written beside it. */
  name: string;
  size?: keyof typeof SIZES;
  /** Draws the presence badge. Leave undefined where presence is not shown. */
  presence?: AvatarPresence;
  className?: string;
}

export type AvatarPresence = "online" | "in-game" | "idle" | "offline";

/**
 * The badge the way Teams draws it. Each state has its own fill AND its own mark, so it
 * reads the same to someone who cannot tell green from red: a tick for around, a bar for
 * busy in a game, a clock for away, and an empty ring with a cross for not here.
 */
const BADGE: Record<AvatarPresence, { fill: string; mark: ReactNode }> = {
  online: {
    fill: "bg-album-success text-white",
    mark: <path d="M2.2 5.2 4.2 7.2 7.8 3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />,
  },
  "in-game": {
    fill: "bg-album-danger text-white",
    mark: <path d="M2.4 5h5.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />,
  },
  idle: {
    fill: "bg-album-foilfill text-album-onfoil",
    mark: <path d="M5 2.6V5l1.7 1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />,
  },
  offline: {
    fill: "bg-album-page border-[1.5px] border-album-ink3/70 text-album-ink3",
    mark: <path d="M3.2 3.2 6.8 6.8M6.8 3.2 3.2 6.8" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />,
  },
};

/**
 * A person's picture. Round, hairline-ringed, and never broken: a failed image
 * quietly becomes the BHALYAM logo.
 */
export function AlbumAvatar({ avatar, name, size = "md", presence, className = "" }: AlbumAvatarProps) {
  return (
    <span className={`relative inline-flex flex-shrink-0 ${className}`}>
      <img
        src={getAvatarUrl(avatar)}
        alt={name}
        className={`${SIZES[size]} rounded-full object-cover bg-album-field ring-1 ring-album-line`}
        onError={(event) => {
          const img = event.currentTarget;
          if (!img.src.endsWith(FALLBACK_AVATAR)) img.src = FALLBACK_AVATAR;
        }}
      />
      {presence !== undefined && (
        <span
          aria-hidden="true"
          data-presence={presence}
          className={`absolute -bottom-0.5 -right-0.5 flex ${BADGE_SIZE[size].box} items-center justify-center rounded-full ring-2 ${size === "xl" ? "ring-album-raised" : "ring-album-page"} ${BADGE[presence].fill}`}
        >
          <svg viewBox="0 0 10 10" className={BADGE_SIZE[size].glyph}>
            {BADGE[presence].mark}
          </svg>
        </span>
      )}
    </span>
  );
}
