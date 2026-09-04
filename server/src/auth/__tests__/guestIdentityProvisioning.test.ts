import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import {
  attachPlayerIdentity,
  ensureGuestIdentityProvisioned,
  ensureMemberIdentityProvisioned,
  clearGuestIdentityProvisioningCache,
} from "../identity.js";
import { mintGuestToken } from "../guestToken.js";
import { clearVerificationCache } from "../../lib/supabaseAuth.js";
import { InMemoryProgressionRepository } from "../../persistence/InMemoryProgressionRepository.js";
import { setProgressionRepository, progressionRepository, type ProgressionRepository } from "../../persistence/index.js";

/**
 * Phase 3 (guest HTTP identity provisioning): `ensureGuestIdentityProvisioned`
 * and its wiring into `attachPlayerIdentity`. Uses the real
 * `InMemoryProgressionRepository` — the same test double
 * `DashboardController.test.ts` already establishes the pattern for — never a
 * second, bespoke fake of the same repository.
 *
 * Also covers `ensureMemberIdentityProvisioned` — the member counterpart
 * added to close the "brand-new member's wallet chip stuck on '---'" gap: a
 * member session is entirely client-side (Supabase's own SDK), so nothing
 * had ever written their `player_identities` row before their first
 * `GET /wallet` call, and `ensure_wallet()` refuses to create it inline.
 */

const JWT_SECRET = "test-jwt-secret-for-identity-provisioning";
const PROJECT_URL = "https://example.supabase.co";
const ENV_KEYS = ["SUPABASE_URL", "SUPABASE_JWT_SECRET"];
let savedEnv: Record<string, string | undefined> = {};
let repo: InMemoryProgressionRepository;

function mintMemberToken(sub: string): string {
  const b64 = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url");
  const header = b64({ alg: "HS256", typ: "JWT" });
  const payload = b64({
    sub, aud: "authenticated", iss: `${PROJECT_URL}/auth/v1`, exp: Math.floor(Date.now() / 1000) + 3600,
  });
  const sig = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${sig}`;
}

beforeEach(() => {
  savedEnv = {};
  for (const k of ENV_KEYS) {
    savedEnv[k] = process.env[k];
    delete process.env[k];
  }
  process.env.SUPABASE_JWT_SECRET = JWT_SECRET;
  process.env.SUPABASE_URL = PROJECT_URL;
  clearVerificationCache();
  repo = new InMemoryProgressionRepository();
  setProgressionRepository(repo);
  clearGuestIdentityProvisioningCache();
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
  setProgressionRepository(null);
  vi.restoreAllMocks();
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

describe("ensureMemberIdentityProvisioned", () => {
  it("creates a durable player_identities row for a fresh member id", async () => {
    const userId = "11111111-2222-3333-4444-555555555555";
    expect(await progressionRepository().getIdentity(userId)).toBeNull();

    await ensureMemberIdentityProvisioned(userId);

    const row = await progressionRepository().getIdentity(userId);
    expect(row).not.toBeNull();
    expect(row?.kind).toBe("member");
    expect(row?.authUserId).toBe(userId);
  });

  it("is idempotent: a second call for the same id does not write again", async () => {
    const userId = "22222222-3333-4444-5555-666666666666";
    const spy = vi.spyOn(repo, "upsertIdentity");

    await ensureMemberIdentityProvisioned(userId);
    await ensureMemberIdentityProvisioned(userId);
    await ensureMemberIdentityProvisioned(userId);

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("concurrent first requests for the same id share one write, not one per request", async () => {
    const userId = "33333333-4444-5555-6666-777777777777";
    const spy = vi.spyOn(repo, "upsertIdentity");

    await Promise.all([
      ensureMemberIdentityProvisioned(userId),
      ensureMemberIdentityProvisioned(userId),
      ensureMemberIdentityProvisioned(userId),
      ensureMemberIdentityProvisioned(userId),
      ensureMemberIdentityProvisioned(userId),
    ]);

    expect(spy).toHaveBeenCalledTimes(1);
    expect((await progressionRepository().getIdentity(userId))?.kind).toBe("member");
  });

  it("does not memoize a failed write — the next call retries and can succeed", async () => {
    const userId = "44444444-5555-6666-7777-888888888888";
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

    await expect(ensureMemberIdentityProvisioned(userId)).rejects.toThrow("simulated transient outage");
    expect(await progressionRepository().getIdentity(userId)).toBeNull();

    await ensureMemberIdentityProvisioned(userId);
    expect(await progressionRepository().getIdentity(userId)).not.toBeNull();
    expect(attempt).toBe(2);
  });
});

describe("attachPlayerIdentity — member provisioning at the HTTP chokepoint", () => {
  it("awaits provisioning before calling next() for a valid, fresh member token — the root cause of the '---' wallet chip", async () => {
    const userId = "55555555-6666-7777-8888-999999999999";
    const { req, next } = fakeRequest(mintMemberToken(userId));

    expect(await progressionRepository().getIdentity(userId)).toBeNull();

    await new Promise<void>((resolve) => {
      attachPlayerIdentity(req, {} as Response, (() => {
        next();
        resolve();
      }) as NextFunction);
    });

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.player).toEqual({ kind: "member", playerId: userId, email: null });
    // The row exists BEFORE next() ran — a subsequent ensure_wallet() call
    // for this identity (e.g. from GET /wallet) would no longer 404.
    expect(await progressionRepository().getIdentity(userId)).not.toBeNull();
  });

  it("still resolves the caller for THIS request even when provisioning fails, retrying on the next request", async () => {
    const userId = "66666666-7777-8888-9999-aaaaaaaaaaaa";
    const failing = {
      upsertIdentity: async () => {
        throw new Error("simulated outage");
      },
      getIdentity: (id: string) => repo.getIdentity(id),
    } as unknown as ProgressionRepository;
    setProgressionRepository(failing);
    const { req, next } = fakeRequest(mintMemberToken(userId));

    await new Promise<void>((resolve) => {
      attachPlayerIdentity(req, {} as Response, (() => {
        next();
        resolve();
      }) as NextFunction);
    });

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.player).toEqual({ kind: "member", playerId: userId, email: null });
  });

  it("never provisions an identity for a forged member token", async () => {
    const userId = "77777777-8888-9999-aaaa-bbbbbbbbbbbb";
    const token = mintMemberToken(userId);
    const forged = token.slice(0, -4) + "AAAA";
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
});
