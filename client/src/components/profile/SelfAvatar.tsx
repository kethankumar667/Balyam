import SeatAvatar from "./SeatAvatar";
import { useRoomStore } from "../../store/roomStore";
import { useAuthStore, useIdentityPresentation } from "../../store/authStore";

/**
 * The signed-in-ish player's own face, wherever the app shows their identity.
 *
 * Delegating to `SeatAvatar` ensures consistent rendering across avatar IDs,
 * direct images, emojis, and initial fallbacks with warm background tones.
 */
export interface SelfAvatarProps {
  /** Rendered when no avatar is chosen — usually the surface's own icon. */
  fallback?: React.ReactNode;
  /** Tailwind size classes for the circle, e.g. "w-11 h-11". */
  className?: string;
  /** Font size for the fallback initial. */
  textClassName?: string;
  /**
   * Portraits put faces in the upper half, so a centred square crop inside a
   * circle shaves heads. Overridable for surfaces with different proportions.
   */
  objectPosition?: string;
}

export default function SelfAvatar({
  fallback,
  className = "",
  textClassName = "text-[11px]",
  objectPosition = "50% 22%",
}: SelfAvatarProps) {
  const avatarId = useRoomStore((s) => s.avatarId);
  const playerName = useRoomStore((s) => s.playerName);
  const identity = useIdentityPresentation();
  const displayName = playerName.trim() || identity.label;

  return (
    <SeatAvatar
      avatar={avatarId || undefined}
      name={displayName}
      className={className}
      textClassName={textClassName}
      objectPosition={objectPosition}
      fallback={fallback}
    />
  );
}
