import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { startTestServer, mountRouter, type TestServer } from "../../testing/httpTestServer.js";
import { authRouter } from "../AuthController.js";
import { clearGuestIdentityProvisioningCache, ensureGuestIdentityProvisioned, touchGuestIdentity } from "../identity.js";
import { mintGuestToken } from "../guestToken.js";
import { InMemoryProgressionRepository } from "../../persistence/InMemoryProgressionRepository.js";
import { setProgressionRepository, progressionRepository } from "../../persistence/index.js";

/**
 * The idle purge removes wallet-less guests whose `last_seen_at` is old. Provisioning only writes that
 * column the first time a process sees a guest, so renewal is what keeps an ACTIVE guest from looking
 * idle. Without it, a guest holding a valid token could be purged.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
let repo: InMemoryProgressionRepository;

beforeEach(() => {
  repo = new InMemoryProgressionRepository();
  setProgressionRepository(repo);
  clearGuestIdentityProvisioningCache();
});

afterEach(() => {
  setProgressionRepository(null);
  vi.restoreAllMocks();
});

describe("touchGuestIdentity", () => {
  it("moves last-seen forward for a guest the process already knows", async () => {
    const guestId = "guest_active";
    const start = Date.now();
    await ensureGuestIdentityProvisioned(guestId);
    const first = (await progressionRepository().getIdentity(guestId))?.lastSeenAt ?? 0;

    vi.spyOn(Date, "now").mockReturnValue(start + 3 * DAY_MS);
    await touchGuestIdentity(guestId);

    const touched = (await progressionRepository().getIdentity(guestId))?.lastSeenAt ?? 0;
    expect(touched).toBeGreaterThanOrEqual(first + 3 * DAY_MS - 1000);
  });

  it("provisions a guest it has never seen, through the normal path rather than inventing a row", async () => {
    const spy = vi.spyOn(repo, "upsertIdentity");

    await touchGuestIdentity("guest_unseen");

    expect(spy).toHaveBeenCalledTimes(1);
    expect((await progressionRepository().getIdentity("guest_unseen"))?.kind).toBe("guest");
  });
});

describe("POST /api/auth/guest/renew keeps the purge in step", () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startTestServer(mountRouter("/api/auth", authRouter));
  });

  afterAll(async () => {
    await server.close();
  });

  it("refreshes the guest's last-seen when the token is renewed", async () => {
    const guest = mintGuestToken();
    await ensureGuestIdentityProvisioned(guest.playerId);
    const before = (await progressionRepository().getIdentity(guest.playerId))?.lastSeenAt ?? 0;
    vi.spyOn(Date, "now").mockReturnValue(before + 4 * DAY_MS);

    const res = await server.request("/api/auth/guest/renew", { method: "POST", token: guest.token });

    expect(res.status).toBe(200);
    expect((await progressionRepository().getIdentity(guest.playerId))?.lastSeenAt).toBeGreaterThan(before);
  });

  it("still renews when the last-seen write fails — a storage hiccup must not log a guest out", async () => {
    const guest = mintGuestToken();
    await ensureGuestIdentityProvisioned(guest.playerId);
    vi.spyOn(repo, "upsertIdentity").mockRejectedValue(new Error("simulated outage"));

    const res = await server.request("/api/auth/guest/renew", { method: "POST", token: guest.token });

    expect(res.status).toBe(200);
    expect((res.body as { playerId: string }).playerId).toBe(guest.playerId);
  });

  it("never touches anything for a token it refuses", async () => {
    const spy = vi.spyOn(repo, "upsertIdentity");
    const expired = mintGuestToken(undefined, Date.now() - 8 * DAY_MS);

    const res = await server.request("/api/auth/guest/renew", { method: "POST", token: expired.token });

    expect(res.status).toBe(401);
    expect(spy).not.toHaveBeenCalled();
  });
});
