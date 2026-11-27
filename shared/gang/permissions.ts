import type { GangRole } from "./types.js";

export type GangCapability =
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

export const GANG_ROLE_PERMISSIONS: Record<GangRole, readonly GangCapability[]> = {
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
 * Evaluates whether a role has an explicit Gang capability (deny-by-default).
 */
export function hasGangPermission(
  role: GangRole | undefined | null,
  capability: GangCapability
): boolean {
  if (!role) return false;
  const permissions = GANG_ROLE_PERMISSIONS[role];
  return permissions ? permissions.includes(capability) : false;
}

/**
 * Returns a human-friendly display label for a Gang role.
 */
export function getRoleDisplayLabel(role: GangRole): string {
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
