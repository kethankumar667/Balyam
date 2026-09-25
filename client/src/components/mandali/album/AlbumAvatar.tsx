import { FALLBACK_AVATAR, getAvatarUrl } from "./avatarUrl";

const SIZES = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-14 h-14",
} as const;

export interface AlbumAvatarProps {
  avatar?: string;
  /** Read out by screen readers; pass an empty string when the name is already written beside it. */
  name: string;
  size?: keyof typeof SIZES;
  /** Draws the small presence dot. Leave undefined where presence is not shown. */
  online?: boolean;
  className?: string;
}

/**
 * A person's picture. Round, hairline-ringed, and never broken: a failed image
 * quietly becomes the BHALYAM logo. The presence dot pairs colour with a ring
 * so it does not rely on hue alone.
 */
export function AlbumAvatar({ avatar, name, size = "md", online, className = "" }: AlbumAvatarProps) {
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
      {online !== undefined && (
        <span
          aria-hidden="true"
          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-album-page ${
            online ? "bg-album-success" : "bg-album-ink3/60"
          }`}
        />
      )}
    </span>
  );
}
