import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import { resolveIdentity } from "../economyIdentity.js";
import { clearVerificationCache } from "../../lib/supabaseAuth.js";
import { clearGuestIdentityProvisioningCache } from "../../auth/identity.js";
import { mintGuestToken } from "../../auth/guestToken.js";
import { InMemoryProgressionRepository } from "../../persistence/InMemoryProgressionRepository.js";
import { setProgressionRepository, type ProgressionRepository } from "../../persistence/index.js";

/**
 * Phase 4 (guest socket identity): `resolveIdentity` now also verifies a
 * guest bearer token, the same signed token `attachPlayerIdentity` (HTTP)
 * verifies via the identical `verifyGuestToken` call — proving the socket
 * and HTTP layers resolve the SAME guest to the SAME id, not two identity
 * systems that happen to look similar.
 */

const JWT_SECRET = "test-jwt-secret-for-economy-identity";
const PROJECT_URL = "https://example.supabase.co";

function mintMemberToken(sub: string): string {
  const b64 = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url");
  const header = b64({ alg: "HS256", typ: "JWT" });
  const payload = b64({
    sub, aud: "authenticated", iss: `${PROJECT_URL}/auth/v1`, exp: Math.floor(Date.now() / 1000) + 3600,
  });
  const sig = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${sig}`;
}

const ENV_KEYS = ["SUPABASE_URL", "SUPABASE_JWT_SECRET"];
let saved: Record<string, string | undefined> = {};
let repo: InMemoryProgressionRepository;

beforeEach(() => {
  saved = {};
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  process.env.SUPABASE_JWT_SECRET = JWT_SECRET;
  process.env.SUPABASE_URL = PROJECT_URL;
  clearVerificationCache();
  clearGuestIdentityProvisioningCache();
  repo = new InMemoryProgressionRepository();
  setProgressionRepository(repo);
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  setProgressionRepository(null);
  vi.restoreAllMocks();
});

describe("resolveIdentity", () => {
  it("resolves a verified member token, unaffected by guest-token support existing alongside it", async () => {
    const sub = "11111111-2222-3333-4444-555555555555";
    const result = await resolveIdentity(mintMemberToken(sub), undefined);
    expect(result).toEqual({ kind: "member", identityId: sub });
  });

  it("provisions the member's player_identities row as a side effect (same path as the HTTP middleware) — closes the wallet '---' gap", async () => {
    const sub = "12121212-3434-5656-7878-909090909090";
    expect(await repo.getIdentity(sub)).toBeNull();

    await resolveIdentity(mintMemberToken(sub), undefined);

    const row = await repo.getIdentity(sub);
    expect(row?.kind).toBe("member");
    expect(row?.authUserId).toBe(sub);
  });

  it("a member provisioning failure degrades to identityId: null — RoomManager already rejects that cleanly rather than naming an identity whose row may not exist", async () => {
    const sub = "13131313-4545-6767-8989-101010101010";
    const failing = {
      upsertIdentity: async () => {
        throw new Error("simulated outage");
      },
    } as unknown as ProgressionRepository;
    setProgressionRepository(failing);

    const result = await resolveIdentity(mintMemberToken(sub), undefined);
    expect(result).toEqual({ kind: "member", identityId: null });
  });

  it("resolves a verified guest token to the id embedded in its signature", async () => {
    const { playerId, token } = mintGuestToken();
    const result = await resolveIdentity(undefined, token);
    expect(result).toEqual({ kind: "guest", identityId: playerId });
  });

  it("provisions the guest's player_identities row as a side effect (same path as the HTTP middleware)", async () => {
    const { playerId, token } = mintGuestToken();
    expect(await repo.getIdentity(playerId)).toBeNull();

    await resolveIdentity(undefined, token);

    const row = await repo.getIdentity(playerId);
    expect(row?.kind).toBe("guest");
  });

  it("member token wins when both are present (mirrors resolveAccountKind's own ordering)", async () => {
    const sub = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const { token: guestToken } = mintGuestToken();
    const result = await resolveIdentity(mintMemberToken(sub), guestToken);
    expect(result).toEqual({ kind: "member", identityId: sub });
  });

  it("a forged guest token (tampered signature) resolves to an unresolvable guest — never a fabricated identity", async () => {
    const { token } = mintGuestToken();
    const forged = token.slice(0, -4) + "AAAA";
    const result = await resolveIdentity(undefined, forged);
    expect(result).toEqual({ kind: "guest", identityId: null });
  });

  it("an expired guest token resolves to an unresolvable guest, safely — no throw", async () => {
    const expired = mintGuestToken(undefined, Date.now() - 31 * 24 * 60 * 60 * 1000);
    const result = await resolveIdentity(undefined, expired.token);
    expect(result).toEqual({ kind: "guest", identityId: null });
  });

  it("a forged token cannot claim another real guest's id", async () => {
    const real = mintGuestToken();
    // An attacker cannot construct a valid signature for `real.playerId`
    // without the server's key — simulate the only thing they CAN do:
    // present a syntactically token-shaped string naming the victim's id
    // with a bogus signature.
    const fake = `bg1.${Buffer.from(JSON.stringify({ pid: real.playerId, iat: Date.now(), exp: Date.now() + 1000 })).toString("base64url")}.not-a-real-signature`;
    const result = await resolveIdentity(undefined, fake);
    expect(result.identityId).not.toBe(real.playerId);
    expect(result.identityId).toBeNull();
  });

  it("no token of either kind resolves to an unresolvable guest, exactly as before this phase", async () => {
    const result = await resolveIdentity(undefined, undefined);
    expect(result).toEqual({ kind: "guest", identityId: null });
  });

  it("a provisioning failure degrades to identityId: null rather than naming an identity that may not have a durable row", async () => {
    const { token } = mintGuestToken();
    const failing = {
      upsertIdentity: async () => {
        throw new Error("simulated outage");
      },
    } as unknown as ProgressionRepository;
    setProgressionRepository(failing);

    const result = await resolveIdentity(undefined, token);
    expect(result).toEqual({ kind: "guest", identityId: null });
  });
});
