import type { NotificationLevel } from "@shared/gang/notifications.js";

/**
 * When a live Gang message is allowed to interrupt.
 *
 * Eight people chatting must not become eight pop-ups. The rule is: a room
 * invitation is something to act on, so it always gets its own toast; ordinary
 * chat gets ONE toast per Gang, updated in place while it is on screen, and
 * then stays quiet for a while — the bell keeps the full count either way.
 */

/** After a chat toast for a Gang, the next one waits this long. */
export const CHAT_TOAST_COOLDOWN_MS = 2 * 60 * 1000;

export type ToastDecision =
  | "none"
  /** A room was shared: its own toast, with a Join button. */
  | "invite"
  /** Something happened in the group that is not chat — e.g. a new member joined. */
  | "notice"
  /** First chat toast for this Gang in a while. */
  | "chat-new"
  /** A chat toast for this Gang is still on screen — update its count. */
  | "chat-update";

export interface ToastContext {
  level: NotificationLevel;
  isInvite: boolean;
  /** A group event rather than a message — "Charan joined the Gang". */
  isNotice?: boolean;
  /** The member is looking at this Gang's chat right now. */
  isViewingThisGang: boolean;
  /** The member is inside a room — never interrupt a match. */
  isInRoom: boolean;
  chatToastOnScreen: boolean;
  lastChatToastAt: number | null;
  now: number;
}

export function decideToast(ctx: ToastContext): ToastDecision {
  if (ctx.level === "MUTED") return "none";
  if (ctx.isInRoom) return "none";
  if (ctx.isViewingThisGang) return "none";

  // Notices are a courtesy, so they follow the loudest setting only.
  if (ctx.isNotice) return ctx.level === "ALL" ? "notice" : "none";

  if (ctx.isInvite) return "invite";

  if (ctx.level === "INVITES_ONLY") return "none";
  if (ctx.chatToastOnScreen) return "chat-update";
  if (ctx.lastChatToastAt !== null && ctx.now - ctx.lastChatToastAt < CHAT_TOAST_COOLDOWN_MS) return "none";
  return "chat-new";
}
