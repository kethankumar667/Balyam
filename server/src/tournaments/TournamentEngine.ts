import type { TournamentStatus, Tournament } from "@shared/tournaments/Tournament.js";

export class TournamentEngine {
  private static readonly VALID_TRANSITIONS: Record<TournamentStatus, TournamentStatus[]> = {
    DRAFT: ["REGISTRATION_OPEN", "ARCHIVED"],
    REGISTRATION_OPEN: ["REGISTRATION_CLOSED", "CHECK_IN_OPEN", "ARCHIVED"],
    REGISTRATION_CLOSED: ["CHECK_IN_OPEN", "IN_PROGRESS", "ARCHIVED"],
    CHECK_IN_OPEN: ["IN_PROGRESS", "REGISTRATION_OPEN", "ARCHIVED"],
    IN_PROGRESS: ["FINISHED", "ARCHIVED"],
    FINISHED: ["ARCHIVED"],
    ARCHIVED: [],
  };

  /**
   * Validates whether a tournament lifecycle transition is legal.
   */
  public static canTransition(current: TournamentStatus, next: TournamentStatus): boolean {
    const allowed = this.VALID_TRANSITIONS[current] || [];
    return allowed.includes(next);
  }

  /**
   * Evaluates check-in completion and filters active checked-in participants.
   */
  public static processCheckIns(tournament: Tournament): {
    checkedInCount: number;
    disqualifiedCount: number;
  } {
    let checkedIn = 0;
    let disqualified = 0;

    for (const p of tournament.participants) {
      if (p.checkedIn) {
        p.status = "ACTIVE";
        checkedIn++;
      } else {
        p.status = "DISQUALIFIED";
        disqualified++;
      }
    }

    return { checkedInCount: checkedIn, disqualifiedCount: disqualified };
  }
}
