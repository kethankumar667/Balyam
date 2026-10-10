import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  GuestProvisioningThrottledError,
  guestProvisioningLimitPerMinute,
  resetGuestProvisioningGate,
  tryTakeGuestProvisioningSlot,
} from "../guestProvisioningGate.js";
import { clearGuestIdentityProvisioningCache, ensureGuestIdentityProvisioned, resolvePlayerIdentity } from "../identity.js";
import { mintGuestToken } from "../guestToken.js";

describe("guest provisioning gate", () => {
  const saved = process.env.GUEST_PROVISION_PER_MINUTE;

  beforeEach(() => {
    resetGuestProvisioningGate();
    clearGuestIdentityProvisioningCache();
  });

  afterEach(() => {
    if (saved === undefined) delete process.env.GUEST_PROVISION_PER_MINUTE;
    else process.env.GUEST_PROVISION_PER_MINUTE = saved;
    resetGuestProvisioningGate();
    vi.restoreAllMocks();
  });

  it("allows up to the limit in a minute and then refuses", () => {
    process.env.GUEST_PROVISION_PER_MINUTE = "3";

    const results = [1, 2, 3, 4, 5].map(() => tryTakeGuestProvisioningSlot(1_000));

    expect(results).toEqual([true, true, true, false, false]);
  });

  it("opens a fresh minute after the window passes", () => {
    process.env.GUEST_PROVISION_PER_MINUTE = "1";
    expect(tryTakeGuestProvisioningSlot(0)).toBe(true);
    expect(tryTakeGuestProvisioningSlot(30_000)).toBe(false);

    expect(tryTakeGuestProvisioningSlot(60_001)).toBe(true);
  });

  it("falls back to a sane default for a missing or invalid setting", () => {
    delete process.env.GUEST_PROVISION_PER_MINUTE;
    expect(guestProvisioningLimitPerMinute()).toBe(600);
    process.env.GUEST_PROVISION_PER_MINUTE = "banana";
    expect(guestProvisioningLimitPerMinute()).toBe(600);
    process.env.GUEST_PROVISION_PER_MINUTE = "-5";
    expect(guestProvisioningLimitPerMinute()).toBe(600);
  });

  it("refuses to write a new guest when the minute is used up", async () => {
    process.env.GUEST_PROVISION_PER_MINUTE = "1";
    tryTakeGuestProvisioningSlot();

    await expect(ensureGuestIdentityProvisioned("guest_flood_1")).rejects.toBeInstanceOf(GuestProvisioningThrottledError);
  });

  it("still treats a throttled guest as itself for that request, rather than as signed out", async () => {
    process.env.GUEST_PROVISION_PER_MINUTE = "1";
    tryTakeGuestProvisioningSlot();
    const guest = mintGuestToken();

    const identity = await resolvePlayerIdentity(guest.token);

    expect(identity).toEqual({ kind: "guest", playerId: guest.playerId });
  });
});
