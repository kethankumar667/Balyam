import type { TranslationKey } from "../../../i18n/types";

/**
 * Three words are enough for a group of friends: the Host, an Admin, a Member.
 * The server has finer-grained roles (leader, officer, moderator, event host…);
 * to the people in the group they are all "someone who helps run it".
 */
const ADMIN_ROLES = new Set(["ADMIN", "LEADER", "OFFICER", "MODERATOR", "EVENT_HOST"]);

export function roleLabelKey(role: string | undefined): TranslationKey | string {
  if (role === "OWNER") return "mandali.role.host";
  if (role && ADMIN_ROLES.has(role)) return "mandali.role.admin";
  return "mandali.role.member";
}
