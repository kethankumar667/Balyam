import { afterEach, describe, expect, it, vi } from "vitest";
import { InMemoryEconomyRepository } from "../InMemoryEconomyRepository.js";

afterEach(() => { vi.restoreAllMocks(); });

describe("complete wallet activity", () => {
  it("includes opening balances, all rows beyond pagination, UTC boundaries, exact bigint totals and no other wallet", async () => {
    const clock = vi.spyOn(Date, "now");
    const repo = new InMemoryEconomyRepository();
    const now = Date.UTC(2026, 10, 30, 12);
    const start = Date.UTC(2026, 10, 1);
    repo.testFixture.seedIdentity("member_alice", "member");
    clock.mockReturnValue(start - 1);
    await repo.ensureWallet("member_alice");
    repo.testFixture.seedIdentity("member_bob", "member");
    await repo.ensureWallet("member_bob");
    const adjust = (amount: string, key: string) => repo.adminAdjustWallet({
      identityId: "member_alice", amountCoins: amount, reason: "Activity test",
      adminPrincipalId: "operator", idempotencyKey: key,
    });
    clock.mockReturnValue(start);
    await adjust("9007199254740993", "big");
    clock.mockReturnValue(start + 86_400_000);
    for (let i = 0; i < 125; i++) await adjust("1", `small-${i}`);
    clock.mockReturnValue(now);
    await repo.debitWallet({ identityId: "member_alice", amountCoins: "100", reason: "Activity debit", idempotencyKey: "debit", entryType: "ROOM_ENTRY_DEBIT" });
    const days = await repo.getWalletActivity("member_alice", now);
    expect(days).toHaveLength(30);
    expect(days[0]).toEqual({ date: "2026-11-01", credited: "9007199254740993", spent: "0", balance: "9007199254745993" });
    expect(days[1]).toEqual({ date: "2026-11-02", credited: "125", spent: "0", balance: "9007199254746118" });
    expect(days[28].balance).toBe("9007199254746118");
    expect(days[29]).toEqual({ date: "2026-11-30", credited: "0", spent: "100", balance: "9007199254746018" });
    clock.mockReturnValue(now + 1);
    await adjust("999", "future");
    expect(await repo.getWalletActivity("member_alice", now)).toEqual(days);
  });

  it("returns 30 zero days without provisioning an unknown wallet", async () => {
    const repo = new InMemoryEconomyRepository();
    const days = await repo.getWalletActivity("unknown", Date.UTC(2026, 0, 2));
    expect(days[0].date).toBe("2025-12-04");
    expect(days[29].date).toBe("2026-01-02");
    expect(days.every((day) => day.balance === "0" && day.credited === "0" && day.spent === "0")).toBe(true);
    expect(await repo.getWallet("unknown")).toBeNull();
  });
});
