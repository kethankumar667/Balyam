import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { MockInstance } from "vitest";
import { FAUCET_AMOUNT_COINS, FAUCET_COOLDOWN_MS, type FaucetClaimResult, type FaucetStatus } from "@shared/faucet";
import * as playerIdentity from "../../lib/playerIdentity";
import * as useEconomy from "../../hooks/useEconomy";
import { formatCountdown, secondsUntil, useFaucetStore } from "../faucetStore";

const SERVER_NOW = 1_800_000_000_000;

const available: FaucetStatus = {
  eligible: true,
  amount: FAUCET_AMOUNT_COINS,
  cooldownMs: FAUCET_COOLDOWN_MS,
  nextClaimAt: null,
  serverNow: SERVER_NOW,
  canClaim: true,
};

describe("faucetStore", () => {
  let apiJson: MockInstance;
  let refreshWallet: MockInstance;

  beforeEach(() => {
    useFaucetStore.getState().reset();
    apiJson = vi.spyOn(playerIdentity, "apiJson");
    refreshWallet = vi.spyOn(useEconomy, "refreshCurrentWallet").mockResolvedValue(undefined as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps what the server said about the faucet", async () => {
    apiJson.mockResolvedValue(available);

    await useFaucetStore.getState().fetchStatus();

    expect(useFaucetStore.getState().status).toEqual(available);
  });

  it("anchors the countdown to the server clock, not the device clock", async () => {
    vi.spyOn(Date, "now").mockReturnValue(SERVER_NOW - 7 * 60 * 60 * 1_000);
    apiJson.mockResolvedValue(available);

    await useFaucetStore.getState().fetchStatus();

    expect(useFaucetStore.getState().clockOffsetMs).toBe(7 * 60 * 60 * 1_000);
  });

  it("claims with a POST and no body, then shows the wait and refreshes the wallet", async () => {
    useFaucetStore.setState({ status: available });
    const paid: FaucetClaimResult = {
      ok: true,
      amount: FAUCET_AMOUNT_COINS,
      nextClaimAt: SERVER_NOW + FAUCET_COOLDOWN_MS,
      paidNow: true,
      vestingUntil: null,
      serverNow: SERVER_NOW,
    };
    apiJson.mockResolvedValue(paid);

    await useFaucetStore.getState().claim();

    expect(apiJson).toHaveBeenCalledWith("/api/faucet/claim", { method: "POST" });
    const state = useFaucetStore.getState();
    expect(state.justClaimed).toBe(FAUCET_AMOUNT_COINS);
    expect(state.status).toMatchObject({ canClaim: false, nextClaimAt: SERVER_NOW + FAUCET_COOLDOWN_MS });
    expect(refreshWallet).toHaveBeenCalledTimes(1);
  });

  it("does not say +100 for a claim that is accepted but not yet in the wallet", async () => {
    useFaucetStore.setState({ status: available });
    apiJson.mockResolvedValue({
      ok: true,
      amount: FAUCET_AMOUNT_COINS,
      nextClaimAt: SERVER_NOW + FAUCET_COOLDOWN_MS,
      paidNow: false,
      vestingUntil: null,
      serverNow: SERVER_NOW,
    } satisfies FaucetClaimResult);

    await useFaucetStore.getState().claim();

    const state = useFaucetStore.getState();
    expect(state.justClaimed).toBeNull();
    expect(state.message).toBe("Your free coins are on their way.");
    expect(state.status).toMatchObject({ canClaim: false, nextClaimAt: SERVER_NOW + FAUCET_COOLDOWN_MS });
  });

  it("takes the server's wait when a claim comes too early", async () => {
    useFaucetStore.setState({ status: available });
    apiJson.mockResolvedValue({
      ok: false,
      code: "COOLDOWN",
      message: "Your next free coins aren't ready yet.",
      nextClaimAt: SERVER_NOW + 60_000,
      serverNow: SERVER_NOW,
    } satisfies FaucetClaimResult);

    await useFaucetStore.getState().claim();

    const state = useFaucetStore.getState();
    expect(state.status).toMatchObject({ canClaim: false, nextClaimAt: SERVER_NOW + 60_000 });
    expect(state.message).toBe("Your next free coins aren't ready yet.");
    expect(state.justClaimed).toBeNull();
    expect(refreshWallet).not.toHaveBeenCalled();
  });

  it("leaves the button usable when the faucet is only temporarily unavailable", async () => {
    useFaucetStore.setState({ status: available });
    apiJson.mockResolvedValue({
      ok: false,
      code: "UNAVAILABLE",
      message: "Free coins are temporarily unavailable. Try again in a moment.",
      nextClaimAt: null,
      serverNow: SERVER_NOW,
    } satisfies FaucetClaimResult);

    await useFaucetStore.getState().claim();

    expect(useFaucetStore.getState().status?.canClaim).toBe(true);
  });

  it("reports a network failure instead of staying silent", async () => {
    useFaucetStore.setState({ status: available });
    apiJson.mockResolvedValue(null);

    const result = await useFaucetStore.getState().claim();

    expect(result).toBeNull();
    expect(useFaucetStore.getState().message).toMatch(/temporarily unavailable/i);
  });

  it("ignores a second tap while a claim is in flight", async () => {
    useFaucetStore.setState({ status: available });
    let release: (value: FaucetClaimResult) => void = () => undefined;
    apiJson.mockImplementation(() => new Promise<FaucetClaimResult>((resolve) => { release = resolve; }));

    const first = useFaucetStore.getState().claim();
    const second = await useFaucetStore.getState().claim();
    release({ ok: false, code: "COOLDOWN", message: "x", nextClaimAt: SERVER_NOW + 1_000, serverNow: SERVER_NOW });
    await first;

    expect(second).toBeNull();
    expect(apiJson).toHaveBeenCalledTimes(1);
  });

  describe("countdown helpers", () => {
    it("counts whole seconds up to the next claim on the server's clock", () => {
      expect(secondsUntil(SERVER_NOW + 90_500, 0, SERVER_NOW)).toBe(91);
      expect(secondsUntil(SERVER_NOW + 90_500, 5_000, SERVER_NOW)).toBe(86);
    });

    it("never goes negative and treats no wait as zero", () => {
      expect(secondsUntil(SERVER_NOW - 5_000, 0, SERVER_NOW)).toBe(0);
      expect(secondsUntil(null, 0, SERVER_NOW)).toBe(0);
    });

    it("formats hours only when there are hours", () => {
      expect(formatCountdown(4 * 3_600)).toBe("4:00:00");
      expect(formatCountdown(3_599)).toBe("59:59");
      expect(formatCountdown(5)).toBe("00:05");
    });
  });
});
