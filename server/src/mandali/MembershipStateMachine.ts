import type {
  ApplicationState,
  InvitationState,
  MembershipState,
  OwnershipTransferState,
  MandaliAuditLog,
} from "@shared/mandali/types.js";

export interface TransitionResult<T> {
  success: boolean;
  newState?: T;
  error?: string;
  auditEntry?: Omit<MandaliAuditLog, "logId">;
}

export class MembershipStateMachine {
  /**
   * Application State Machine
   * Allowed transitions:
   * DRAFT -> SUBMITTED
   * SUBMITTED -> UNDER_REVIEW | WITHDRAWN | EXPIRED
   * UNDER_REVIEW -> APPROVED | REJECTED | WITHDRAWN
   */
  public static transitionApplication(
    currentState: ApplicationState,
    targetState: ApplicationState,
    actorId: string,
    actorName: string,
    mandaliId: string,
    subjectId: string,
    reason?: string
  ): TransitionResult<ApplicationState> {
    const validMoves: Record<ApplicationState, ApplicationState[]> = {
      DRAFT: ["SUBMITTED"],
      SUBMITTED: ["UNDER_REVIEW", "WITHDRAWN", "EXPIRED", "APPROVED", "REJECTED"],
      UNDER_REVIEW: ["APPROVED", "REJECTED", "WITHDRAWN"],
      APPROVED: [],
      REJECTED: [],
      WITHDRAWN: [],
      EXPIRED: [],
    };

    if (!validMoves[currentState]?.includes(targetState)) {
      return {
        success: false,
        error: `Illegal application state transition from ${currentState} to ${targetState}`,
      };
    }

    return {
      success: true,
      newState: targetState,
      auditEntry: {
        mandaliId,
        actorId,
        actorName,
        action: `APPLICATION_${targetState}`,
        subjectId,
        reason,
        details: `Application transitioned from ${currentState} to ${targetState}`,
        timestamp: Date.now(),
      },
    };
  }

  /**
   * Invitation State Machine
   * Allowed transitions:
   * CREATED -> SENT
   * SENT -> ACCEPTED | DECLINED | REVOKED | EXPIRED
   */
  public static transitionInvitation(
    currentState: InvitationState,
    targetState: InvitationState,
    actorId: string,
    actorName: string,
    mandaliId: string,
    subjectId: string,
    reason?: string
  ): TransitionResult<InvitationState> {
    const validMoves: Record<InvitationState, InvitationState[]> = {
      CREATED: ["SENT"],
      SENT: ["ACCEPTED", "DECLINED", "REVOKED", "EXPIRED"],
      ACCEPTED: [],
      DECLINED: [],
      REVOKED: [],
      EXPIRED: [],
    };

    if (!validMoves[currentState]?.includes(targetState)) {
      return {
        success: false,
        error: `Illegal invitation state transition from ${currentState} to ${targetState}`,
      };
    }

    return {
      success: true,
      newState: targetState,
      auditEntry: {
        mandaliId,
        actorId,
        actorName,
        action: `INVITATION_${targetState}`,
        subjectId,
        reason,
        details: `Invitation transitioned from ${currentState} to ${targetState}`,
        timestamp: Date.now(),
      },
    };
  }

  /**
   * Membership State Machine
   * Allowed transitions:
   * PENDING -> ACTIVE | LEFT
   * ACTIVE -> SUSPENDED | LEFT | REMOVED | BANNED
   * SUSPENDED -> ACTIVE | REMOVED | BANNED
   * LEFT -> PENDING | ACTIVE (rejoining under normal eligibility)
   * REMOVED -> PENDING | ACTIVE (under re-application)
   * BANNED -> (Cannot rejoin without explicit administrative UNBAN action)
   */
  public static transitionMembership(
    currentState: MembershipState,
    targetState: MembershipState,
    actorId: string,
    actorName: string,
    mandaliId: string,
    subjectId: string,
    reason?: string
  ): TransitionResult<MembershipState> {
    if (currentState === "BANNED" && targetState !== "REMOVED" && targetState !== "LEFT") {
      return {
        success: false,
        error: "Banned members cannot be activated without an explicit administrative pardon.",
      };
    }

    const validMoves: Record<MembershipState, MembershipState[]> = {
      PENDING: ["ACTIVE", "LEFT"],
      ACTIVE: ["SUSPENDED", "LEFT", "REMOVED", "BANNED"],
      SUSPENDED: ["ACTIVE", "REMOVED", "BANNED"],
      LEFT: ["PENDING", "ACTIVE"],
      REMOVED: ["PENDING", "ACTIVE"],
      BANNED: ["REMOVED"], // unban transitions to removed/neutral state
    };

    if (!validMoves[currentState]?.includes(targetState)) {
      return {
        success: false,
        error: `Illegal membership transition from ${currentState} to ${targetState}`,
      };
    }

    return {
      success: true,
      newState: targetState,
      auditEntry: {
        mandaliId,
        actorId,
        actorName,
        action: `MEMBERSHIP_${targetState}`,
        subjectId,
        reason,
        details: `Membership transitioned from ${currentState} to ${targetState}. Reason: ${reason || "N/A"}`,
        timestamp: Date.now(),
      },
    };
  }

  /**
   * Ownership Transfer Safeguards
   * Prevents leaving a Mandali ownerless or transferring without explicit validation.
   */
  public static transitionOwnership(
    currentState: OwnershipTransferState,
    targetState: OwnershipTransferState,
    actorId: string,
    actorName: string,
    mandaliId: string,
    targetOwnerId: string,
    reason?: string
  ): TransitionResult<OwnershipTransferState> {
    const validMoves: Record<OwnershipTransferState, OwnershipTransferState[]> = {
      REQUESTED: ["VERIFIED", "CANCELLED", "FAILED"],
      VERIFIED: ["EFFECTIVE", "CANCELLED", "FAILED"],
      EFFECTIVE: [],
      CANCELLED: [],
      FAILED: [],
    };

    if (!validMoves[currentState]?.includes(targetState)) {
      return {
        success: false,
        error: `Illegal ownership transfer transition from ${currentState} to ${targetState}`,
      };
    }

    return {
      success: true,
      newState: targetState,
      auditEntry: {
        mandaliId,
        actorId,
        actorName,
        action: `OWNERSHIP_TRANSFER_${targetState}`,
        subjectId: targetOwnerId,
        reason,
        details: `Ownership transfer transitioned from ${currentState} to ${targetState} towards player ${targetOwnerId}`,
        timestamp: Date.now(),
      },
    };
  }
}
