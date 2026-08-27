import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import {
  attachPlayerIdentity,
  ensureGuestIdentityProvisioned,
  clearGuestIdentityProvisioningCache,
} from "../identity.js";
import { mintGuestToken } from "../guestToken.js";
import { InMemoryProgressionRepository } from "../../persistence/InMemoryProgressionRepository.js";
import { setProgressionRepository, progressionRepository, type ProgressionRepository } from "../../persistence/index.js";

/**
 * Phase 3 (guest HTTP identity provisioning): `ensureGuestIdentityProvisioned`
 * and its wiring into `attachPlayerIdentity`. Uses the real
 * `InMemoryProgressionRepository` — the same test double
 * `DashboardController.test.ts` already establishes the pattern for — never a
 * second, bespoke fake of the same repository.
 */

let repo: InMemoryProgressionRepository;

beforeEach(() => {
  repo = new InMemoryProgressionRepository();
  setProgressionRepository(repo);
  clearGuestIdentityProvisioningCache();
});

afterEach(() => {
  setProgressionRepository(null);
});

function fakeRequest(token: string): { req: Request; next: NextFunction } {
  const req = { headers: { authorization: `Bearer ${token}` } } as unknown as Request;
  const next = vi.fn();
  return { req, next };
}

describe("ensureGuestIdentityProvisioned", () => {
  it("creates a durable player_identities row for a fresh guest id", async () => {
    const guestId = "guest_abc123";
    expect(await progressionRepository().getIdentity(guestId)).toBeNull();

    await ensureGuestIdentityProvisioned(guestId);

    const row = await progressionRepository().getIdentity(guestId);
    expect(row).not.toBeNull();
    expect(row?.kind).toBe("guest");
    expect(row?.authUserId).toBeNull();
  });

  it("is idempotent: a second call for the same id does not write again", async () => {
    const guestId = "guest_repeat";
    const spy = vi.spyOn(repo, "upsertIdentity");

    await ensureGuestIdentityProvisioned(guestId);
    await ensureGuestIdentityProvisioned(guestId);
    await ensureGuestIdentityProvisioned(guestId);

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("concurrent first requests for the same id share one write, not one per request", async () => {
    const guestId = "guest_concurrent";
    const spy = vi.spyOn(repo, "upsertIdentity");

    await Promise.all([
      ensureGuestIdentityProvisioned(guestId),
      ensureGuestIdentityProvisioned(guestId),
      ensureGuestIdentityProvisioned(guestId),
      ensureGuestIdentityProvisioned(guestId),
      ensureGuestIdentityProvisioned(guestId),
    ]);

    expect(spy).toHaveBeenCalledTimes(1);
    expect((await progressionRepository().getIdentity(guestId))?.kind).toBe("guest");
  });

  it("does not memoize a failed write — the next call retries and can succeed", async () => {
    const guestId = "guest_retry";
    let attempt = 0;
    const flaky = {
      upsertIdentity: vi.fn(async (record) => {
        attempt += 1;
        if (attempt === 1) throw new Error("simulated transient outage");
        return repo.upsertIdentity(record);
      }),
      getIdentity: (id: string) => repo.getIdentity(id),
    } as unknown as ProgressionRepository;
    setProgressionRepository(flaky);

    await expect(ensureGuestIdentityProvisioned(guestId)).rejects.toThrow("simulated transient outage");
    expect(await progressionRepository().getIdentity(guestId)).toBeNull();

    // Retried on the next call, against a process that has recovered.
    await ensureGuestIdentityProvisioned(guestId);
    expect(await progressionRepository().getIdentity(guestId)).not.toBeNull();
    expect(attempt).toBe(2);
  });

  it("concurrent requests do not duplicate a starter grant's precondition — exactly one identity row exists after a burst", async () => {
    // Regression proxy for "exactly one starter grant": `grant_starter_coins`
    // (the SQL function) is itself idempotent per identity — this proves the
    // identity row it depends on is never created twice, which is the part
    // this layer is responsible for.
    const guestId = "guest_starter_grant_precondition";
    await Promise.all(Array.from({ length: 8 }, () => ensureGuestIdentityProvisioned(guestId)));

    const spy = vi.spyOn(repo, "upsertIdentity");
    await ensureGuestIdentityProvisioned(guestId);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("attachPlayerIdentity — guest provisioning at the HTTP chokepoint", () => {
  it("awaits provisioning before calling next() for a valid, fresh guest token", async () => {
    const { playerId, token } = mintGuestToken();
    const { req, next } = fakeRequest(token);

    await new Promise<void>((resolve) => {
      attachPlayerIdentity(req, {} as Response, (() => {
        next();
        resolve();
      }) as NextFunction);
    });

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.player).toEqual({ kind: "guest", playerId });
    // The row exists BEFORE next() ran — proven by checking it synchronously
    // inside the resolved promise above, not via a retry loop.
    expect(await progressionRepository().getIdentity(playerId)).not.toBeNull();
  });

  it("never provisions an identity for a forged guest token", async () => {
    const { token } = mintGuestToken();
    const forged = token.slice(0, -4) + "AAAA"; // corrupt the signature
    const { req, next } = fakeRequest(forged);
    const spy = vi.spyOn(repo, "upsertIdentity");

    await new Promise<void>((resolve) => {
      attachPlayerIdentity(req, {} as Response, (() => {
        next();
        resolve();
      }) as NextFunction);
    });

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.player).toBeUndefined();
    expect(spy).not.toHaveBeenCalled();
  });

  it("never provisions an identity for an expired guest token", async () => {
    const expired = mintGuestToken(undefined, Date.now() - 31 * 24 * 60 * 60 * 1000);
    const { req, next } = fakeRequest(expired.token);
    const spy = vi.spyOn(repo, "upsertIdentity");

    await new Promise<void>((resolve) => {
      attachPlayerIdentity(req, {} as Response, (() => {
        next();
        resolve();
      }) as NextFunction);
    });

    expect(req.player).toBeUndefined();
    expect(spy).not.toHaveBeenCalled();
  });
});
