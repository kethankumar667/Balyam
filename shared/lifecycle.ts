/**
 * Explicit Room Lifecycle State Machine for BHALYAM.
 * Replaces implicit boolean phase flags with an authoritative, deterministic lifecycle taxonomy.
 */
export type RoomLifecycleState =
  | "CREATED"
  | "WAITING_FOR_PLAYERS"
  | "READY_CHECK"
  | "STARTING"
  | "IN_PROGRESS"
  | "RECOVERING"
  | "PAUSED"
  | "COMPLETED"
  | "ABANDONED"
  | "CLOSED";

/**
 * Validates whether a lifecycle transition is legally permitted.
 */
export function isValidLifecycleTransition(
  from: RoomLifecycleState,
  to: RoomLifecycleState
): boolean {
  if (from === to) return true;

  switch (from) {
    case "CREATED":
      return to === "WAITING_FOR_PLAYERS" || to === "READY_CHECK" || to === "CLOSED";
    case "WAITING_FOR_PLAYERS":
      return to === "READY_CHECK" || to === "STARTING" || to === "ABANDONED" || to === "CLOSED";
    case "READY_CHECK":
      return to === "WAITING_FOR_PLAYERS" || to === "STARTING" || to === "IN_PROGRESS" || to === "ABANDONED" || to === "CLOSED";
    case "STARTING":
      return to === "IN_PROGRESS" || to === "ABANDONED" || to === "CLOSED";
    case "IN_PROGRESS":
      return to === "PAUSED" || to === "RECOVERING" || to === "COMPLETED" || to === "ABANDONED" || to === "CLOSED";
    case "PAUSED":
      // A match can finish (bot/timeout-driven auto-move) while the table
      // is paused for a solo disconnected human — see RoomManager.finalizeMatch.
      return to === "IN_PROGRESS" || to === "RECOVERING" || to === "COMPLETED" || to === "ABANDONED" || to === "CLOSED";
    case "RECOVERING":
      // Same reasoning: other seats can keep playing (and finish the match)
      // while one seat is mid-grace-period recovery.
      return to === "IN_PROGRESS" || to === "PAUSED" || to === "COMPLETED" || to === "ABANDONED" || to === "CLOSED";
    case "COMPLETED":
      return to === "READY_CHECK" || to === "STARTING" || to === "IN_PROGRESS" || to === "ABANDONED" || to === "CLOSED";
    case "ABANDONED":
      return to === "CLOSED";
    case "CLOSED":
      return false; // Terminal state
    default:
      return false;
  }
}
