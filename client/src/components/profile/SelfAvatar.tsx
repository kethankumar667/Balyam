import { findAvatar } from "../../lib/avatars";
import { useRoomStore } from "../../store/roomStore";

/**
 * The signed-in-ish player's own face, wherever the app shows their identity.
 *
 * One component so the fallback is decided once. Every surface that used to
 * hard-code a silhouette now asks this instead, which means adding a second
 * avatar source later (an account photo, say) is one edit rather than a hunt.
 *
 * Scope is deliberately "you". Opponent seats are drawn from server state,
 * and the server carries no avatar field yet — rendering your photo beside
 * their initials would read as everyone else's avatar having failed to load.
 * Those stay initials until the room broadcast learns to send one.
 */
export interface SelfAvatarProps {
  /** Rendered when no avatar is chosen — usually the surface's own icon. */
  fallback: React.ReactNode;
  /** Tailwind size classes for the circle, e.g. "w-11 h-11". */
  className?: string;
  /**
   * Portraits put faces in the upper half, so a centred square crop inside a
   * circle shaves heads. Overridable for surfaces with different proportions.
   */
  objectPosition?: string;
}

export default function SelfAvatar({
  fallback,
  className = "",
  objectPosition = "50% 22%",
}: SelfAvatarProps) {
  const avatarId = useRoomStore((s) => s.avatarId);
  const avatar = findAvatar(avatarId);

  if (!avatar) return <>{fallback}</>;

  return (
    <img
      src={avatar.src}
      // Decorative here: every caller already labels the control it sits in
      // ("Your profile"), and a second announcement is noise, not information.
      alt=""
      className={`rounded-full object-cover ${className}`}
      style={{ objectPosition }}
      draggable={false}
    />
  );
}
