import { describe, expect, it } from "vitest";
import { firstStreakClaimAt } from "@shared/newMember.js";
import { StreakService } from "../StreakService.js";

const ME = "player_streak_new";
const REGISTERED = Date.UTC(2026, 9, 12, 10, 0, 0);
const TOMORROW = Date.UTC(2026, 9, 13, 0, 0, 0);

const serviceAt = (now: number, registeredAt: number | null = REGISTERED) =>
  new StreakService({ postgrestConfig: null, now: () => now, registeredAt: async () => registeredAt });

/** A member who registered today does not start their streak today; it starts tomorrow, UTC. */
describe("daily streak for a new member", () => {
  it("opens the first claim at midnight UTC after registration", () => {
    expect(firstStreakClaimAt(REGISTERED)).toBe(TOMORROW);
    expect(firstStreakClaimAt(Date.UTC(2026, 9, 12, 23, 59, 59))).toBe(TOMORROW);
    expect(firstStreakClaimAt(Date.UTC(2026, 9, 12, 0, 0, 0))).toBe(TOMORROW);
  });

  it("is not claimable on the day of registration, with every day locked", async () => {
    const state = await serviceAt(Date.UTC(2026, 9, 12, 22, 0, 0)).getStreak(ME, "member");

    expect(state.isClaimableToday).toBe(false);
    expect(state.firstClaimAt).toBe(TOMORROW);
    expect(state.nextResetAt).toBe(TOMORROW);
    expect(state.schedule.every((day) => day.status === "LOCKED")).toBe(true);
  });

  it("refuses a claim on the day of registration, and records nothing", async () => {
    const service = serviceAt(Date.UTC(2026, 9, 12, 22, 0, 0));

    const result = await service.claimStreak(ME, "member");

    expect(result).toMatchObject({ success: false, code: "NOT_YET", coinsAwarded: 0, newStreak: 0 });
    expect((await service.getStreak(ME, "member")).currentStreak).toBe(0);
  });

  it("is claimable from the first second of the next UTC day", async () => {
    const state = await serviceAt(TOMORROW).getStreak(ME, "member");

    expect(state.isClaimableToday).toBe(true);
    expect(state.firstClaimAt).toBeUndefined();
    expect(state.activeDayInCycle).toBe(1);
  });

  it("is held until midnight even when registration was a minute before it", async () => {
    const lateRegistration = Date.UTC(2026, 9, 12, 23, 59, 0);

    const state = await serviceAt(Date.UTC(2026, 9, 12, 23, 59, 30), lateRegistration).getStreak(ME, "member");

    expect(state.isClaimableToday).toBe(false);
  });

  it("never holds back a member who registered long ago", async () => {
    const state = await serviceAt(REGISTERED, Date.UTC(2026, 0, 1)).getStreak(ME, "member");

    expect(state.isClaimableToday).toBe(true);
  });

  it("does not hold back a member whose registration time is unknown", async () => {
    const state = await serviceAt(REGISTERED, null).getStreak(ME, "member");

    expect(state.isClaimableToday).toBe(true);
  });

  it("does not apply to a guest, who has no registration to wait from", async () => {
    const state = await serviceAt(REGISTERED).getStreak("guest_abc", "guest");

    expect(state.isClaimableToday).toBe(true);
  });
});
