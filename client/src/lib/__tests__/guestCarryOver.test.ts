import { describe, it, expect, vi, beforeEach } from "vitest";

const apiJson = vi.fn();
const clearGuestIdentity = vi.fn();
const currentGuestToken = vi.fn();
const refreshCurrentWallet = vi.fn();

vi.mock("../playerIdentity", () => ({
  apiJson: (...args: unknown[]) => apiJson(...args),
  clearGuestIdentity: () => clearGuestIdentity(),
  currentGuestToken: () => currentGuestToken(),
}));
vi.mock("../../hooks/useEconomy", () => ({ refreshCurrentWallet: () => refreshCurrentWallet() }));
vi.mock("../../store/authStore", () => ({ useAuthStore: () => null }));

import { resetGuestCarryOverAttempt, runGuestCarryOver } from "../guestCarryOver";

const NO_BONUS = { ok: false, code: "NOTHING_TO_CLAIM", message: "" };

describe("runGuestCarryOver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetGuestCarryOverAttempt();
    currentGuestToken.mockReturnValue("bg1.token");
    apiJson.mockImplementation(async (path: string) =>
      path.endsWith("/bonus") ? NO_BONUS : { ok: true, amount: 3000, replay: false, vestingUntil: 1 },
    );
  });

  const claimAnswers = (claim: unknown) =>
    apiJson.mockImplementation(async (path: string) => (path.endsWith("/bonus") ? NO_BONUS : claim));

  it("sends the stored guest token and drops it once the coins have come over", async () => {
    await runGuestCarryOver("user-1");

    expect(apiJson).toHaveBeenCalledWith("/api/carryover/claim", { method: "POST", body: JSON.stringify({ guestToken: "bg1.token" }) });
    expect(clearGuestIdentity).toHaveBeenCalledTimes(1);
    expect(refreshCurrentWallet).toHaveBeenCalledTimes(1);
  });

  it("keeps the guest token when the email is not confirmed yet, so a later visit can retry", async () => {
    claimAnswers({ ok: false, code: "EMAIL_NOT_CONFIRMED", message: "" });

    await runGuestCarryOver("user-1");

    expect(clearGuestIdentity).not.toHaveBeenCalled();
  });

  it("keeps the guest token when this account already brought a different guest over", async () => {
    claimAnswers({ ok: false, code: "MEMBER_ALREADY_CLAIMED", message: "" });

    await runGuestCarryOver("user-1");

    expect(clearGuestIdentity).not.toHaveBeenCalled();
  });

  it("drops a guest token the server says is already spent", async () => {
    claimAnswers({ ok: false, code: "GUEST_ALREADY_CLAIMED", message: "" });

    await runGuestCarryOver("user-1");

    expect(clearGuestIdentity).toHaveBeenCalledTimes(1);
  });

  it("keeps the guest token when the server could not be reached", async () => {
    claimAnswers(null);

    await runGuestCarryOver("user-1");

    expect(clearGuestIdentity).not.toHaveBeenCalled();
  });

  it("skips the claim route when this device has no guest, but still asks about the bonus", async () => {
    currentGuestToken.mockReturnValue(undefined);

    await runGuestCarryOver("user-1");

    expect(apiJson).toHaveBeenCalledTimes(1);
    expect(apiJson).toHaveBeenCalledWith("/api/carryover/bonus", { method: "POST" });
  });

  it("refreshes the wallet when the bonus is paid", async () => {
    currentGuestToken.mockReturnValue(undefined);
    apiJson.mockResolvedValue({ ok: true, amount: 5000, vestingUntil: null });

    await runGuestCarryOver("user-1");

    expect(refreshCurrentWallet).toHaveBeenCalledTimes(1);
  });

  it("tries only once per signed-in account", async () => {
    await runGuestCarryOver("user-1");
    await runGuestCarryOver("user-1");

    expect(apiJson).toHaveBeenCalledTimes(2); // claim + bonus, once
  });
});
