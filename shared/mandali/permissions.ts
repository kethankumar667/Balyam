import type { MandaliRole } from "./types.js";

export type MandaliCapability =
  | "MANAGE_SETTINGS"
  | "INVITE_MEMBERS"
  | "APPROVE_APPLICATIONS"
  | "KICK_MEMBERS"
  | "BAN_MEMBERS"
  | "MANAGE_ROLES"
  | "CREATE_CHANNELS"
  | "DELETE_MESSAGES"
  | "PIN_MESSAGES"
  | "CREATE_EVENTS"
  | "LAUNCH_PARTIES"
  | "TRANSFER_OWNERSHIP"
  | "VIEW_AUDIT_LOG";

export const MANDALI_ROLE_PERMISSIONS: Record<MandaliRole, readonly MandaliCapability[]> = {
  OWNER: [
    "MANAGE_SETTINGS",
    "INVITE_MEMBERS",
    "APPROVE_APPLICATIONS",
    "KICK_MEMBERS",
    "BAN_MEMBERS",
    "MANAGE_ROLES",
    "CREATE_CHANNELS",
    "DELETE_MESSAGES",
    "PIN_MESSAGES",
    "CREATE_EVENTS",
    "LAUNCH_PARTIES",
    "TRANSFER_OWNERSHIP",
    "VIEW_AUDIT_LOG",
  ],
  LEADER: [
    "MANAGE_SETTINGS",
    "INVITE_MEMBERS",
    "APPROVE_APPLICATIONS",
    "KICK_MEMBERS",
    "BAN_MEMBERS",
    "MANAGE_ROLES",
    "CREATE_CHANNELS",
    "DELETE_MESSAGES",
    "PIN_MESSAGES",
    "CREATE_EVENTS",
    "LAUNCH_PARTIES",
    "VIEW_AUDIT_LOG",
  ],
  OFFICER: [
    "INVITE_MEMBERS",
    "APPROVE_APPLICATIONS",
    "KICK_MEMBERS",
    "PIN_MESSAGES",
    "DELETE_MESSAGES",
    "CREATE_EVENTS",
    "LAUNCH_PARTIES",
    "VIEW_AUDIT_LOG",
  ],
  EVENT_HOST: [
    "CREATE_EVENTS",
    "LAUNCH_PARTIES",
    "PIN_MESSAGES",
  ],
  MODERATOR: [
    "DELETE_MESSAGES",
    "PIN_MESSAGES",
    "KICK_MEMBERS",
    "VIEW_AUDIT_LOG",
  ],
  MEMBER: [
    "LAUNCH_PARTIES",
    "INVITE_MEMBERS",
  ],
  TRIAL: [],
};

/**
 * Evaluates whether a role has an explicit Mandali capability (deny-by-default).
 */
export function hasMandaliPermission(
  role: MandaliRole | undefined | null,
  capability: MandaliCapability
): boolean {
  if (!role) return false;
  const permissions = MANDALI_ROLE_PERMISSIONS[role];
  return permissions ? permissions.includes(capability) : false;
}

/**
 * Returns a human-friendly display label for a Mandali role.
 */
export function getRoleDisplayLabel(role: MandaliRole): string {
  switch (role) {
    case "OWNER":
      return "Founder / Owner";
    case "LEADER":
      return "Community Leader";
    case "OFFICER":
      return "Officer";
    case "EVENT_HOST":
      return "Event Host";
    case "MODERATOR":
      return "Moderator";
    case "MEMBER":
      return "Member";
    case "TRIAL":
      return "Guest / Trial";
    default:
      return String(role);
  }
}
