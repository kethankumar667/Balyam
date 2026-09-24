import { sanitizeAvatar } from "@shared/avatars.js";
import { profileService } from "../profile/ProfileService.js";
import { PayloadValidator } from "../security/PayloadValidator.js";

/** The name and avatar other players see when the caller sends or accepts a friend request. */
export interface CallerPresentation {
  displayName: string;
  avatar?: string;
}

/**
 * How the caller appears to OTHER players, built from the server's own copy of
 * their profile — never from a request body.
 *
 * A request body is the caller talking, and whatever they say here is stored,
 * persisted and shown on somebody else's screen. Taking it as given lets one
 * player put ten thousand characters, or an avatar path that resolves off-site
 * and leaks every viewer's IP, in front of everyone they send a request to.
 * The profile name is clamped again here because `getOrCreateProfile` does not
 * clamp it, and the avatar goes through the same closed-set check the room
 * seats use.
 */
export function presentationFor(playerId: string): CallerPresentation {
  const profile = profileService.getProfile(playerId);
  const name = PayloadValidator.validatePlayerName(profile?.displayName);
  return {
    displayName: name.sanitized ?? "Player",
    avatar: sanitizeAvatar(profile?.avatar),
  };
}
