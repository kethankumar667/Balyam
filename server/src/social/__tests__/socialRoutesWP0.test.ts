import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import crypto from "crypto";
import { startTestServer, type TestServer } from "../../testing/httpTestServer.js";
import { attachPlayerIdentity } from "../../auth/identity.js";
import socialRouter from "../SocialController.js";
import { rankingRouter } from "../../ranking/RankingController.js";
import { profileService } from "../../profile/ProfileService.js";
import { AVATAR_FILES } from "@shared/avatars.js";
import { friendRequestsService } from "../FriendRequestsService.js";
import { friendsService } from "../FriendsService.js";
import { InMemoryProgressionRepository } from "../../persistence/InMemoryProgressionRepository.js";
import { setProgressionRepository } from "../../persistence/index.js";
import { progressionSync } from "../../persistence/ProgressionSync.js";

const JWT_SECRET = "test-jwt-secret-for-hs256-signing-wp0";
const ALICE = "11111111-1111-2222-3333-444444444444";
const BOB = "22222222-1111-2222-3333-444444444444";
const CHARLIE = "33333333-1111-2222-3333-444444444444";

function mintToken(sub: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      sub,
      exp: Math.floor(Date.now() / 1000) + 3600,
      role: "authenticated",
      aud: "authenticated",
    }),
  ).toString("base64url");
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${signature}`;
}

describe("WP0 — Social Controller Cancel Route & Security Matrix", () => {
  let server: TestServer;
  let repo: InMemoryProgressionRepository;
  const originalSecret = process.env.SUPABASE_JWT_SECRET;

  beforeEach(async () => {
    process.env.SUPABASE_JWT_SECRET = JWT_SECRET;
    repo = new InMemoryProgressionRepository();
    setProgressionRepository(repo);
    friendsService.clear();
    friendRequestsService.clear();

    server = await startTestServer((app) => {
      app.use(attachPlayerIdentity);
      app.use("/api/social", socialRouter);
      app.use("/api/ranking", rankingRouter);
    });
  });

  afterEach(async () => {
    vi.useRealTimers();
    await server.close();
    if (originalSecret === undefined) delete process.env.SUPABASE_JWT_SECRET;
    else process.env.SUPABASE_JWT_SECRET = originalSecret;
  });

  it("unauthenticated request to cancel returns 401", async () => {
    const res = await server.request("/api/social/requests/req_test/cancel", {
      method: "POST",
    });
    expect(res.status).toBe(401);
  });

  it("cancelling a request as a third-party (not the sender) returns 403", async () => {
    // Alice sends to Bob
    const req = friendRequestsService.sendRequest(ALICE, "Alice", BOB);

    // Charlie tries to cancel Alice's request
    const res = await server.request(`/api/social/requests/${req.id}/cancel`, {
      method: "POST",
      token: mintToken(CHARLIE),
    });
    expect(res.status).toBe(403);
    expect((res.body as { error: string }).error).toMatch(/not sent by you/i);
  });

  it("recipient (Bob) trying to cancel returns 403 (recipient must decline, not cancel)", async () => {
    const req = friendRequestsService.sendRequest(ALICE, "Alice", BOB);

    const res = await server.request(`/api/social/requests/${req.id}/cancel`, {
      method: "POST",
      token: mintToken(BOB),
    });
    expect(res.status).toBe(403);
  });

  it("cancelling a non-existent request returns 404", async () => {
    const res = await server.request("/api/social/requests/non_existent_id/cancel", {
      method: "POST",
      token: mintToken(ALICE),
    });
    expect(res.status).toBe(404);
  });

  it("sender successfully cancels pending request -> 200, CANCELLED, persisted", async () => {
    const req = friendRequestsService.sendRequest(ALICE, "Alice", BOB);
    await progressionSync.drain();

    const res = await server.request(`/api/social/requests/${req.id}/cancel`, {
      method: "POST",
      token: mintToken(ALICE),
    });
    expect(res.status).toBe(200);
    const body = res.body as { success: boolean; request: { status: string } };
    expect(body.success).toBe(true);
    expect(body.request.status).toBe("CANCELLED");

    await progressionSync.drain();
    const persisted = await repo.getFriendRequest(req.id);
    expect(persisted?.status).toBe("CANCELLED");

    // Second call to cancel already-cancelled request returns 400
    const repeated = await server.request(`/api/social/requests/${req.id}/cancel`, {
      method: "POST",
      token: mintToken(ALICE),
    });
    expect(repeated.status).toBe(400);
  });

  describe("F8 — Security Matrix (Forged senderId ignored)", () => {
    it("POST /requests/send ignores forged senderId in body and uses verified callerId", async () => {
      // Alice calls with body claiming senderId is CHARLIE
      const res = await server.request("/api/social/requests/send", {
        method: "POST",
        token: mintToken(ALICE),
        body: JSON.stringify({
          senderId: CHARLIE,
          recipientId: BOB,
          senderName: "Alice Real",
        }),
      });

      expect(res.status).toBe(200);
      const body = res.body as { success: boolean; request: { senderId: string; recipientId: string } };
      expect(body.success).toBe(true);
      // Sender must be ALICE (the caller), never CHARLIE (the forged body param)
      expect(body.request.senderId).toBe(ALICE);
      expect(body.request.recipientId).toBe(BOB);
    });

    it("POST /requests/:requestId/cancel ignores forged senderId in body", async () => {
      // Alice sends request to Bob
      const req = friendRequestsService.sendRequest(ALICE, "Alice", BOB);

      // Charlie tries to cancel, putting Alice's id in body
      const res = await server.request(`/api/social/requests/${req.id}/cancel`, {
        method: "POST",
        token: mintToken(CHARLIE),
        body: JSON.stringify({ senderId: ALICE }),
      });

      // Still 403 because caller is Charlie
      expect(res.status).toBe(403);
    });
  });

  describe("F3 — Rate Limiting & 7-Day Decline Cooldown", () => {
    it("enforces 5/minute burst limit on POST /requests/send -> 6th returns 429", async () => {
      const BURST_USER = "44444444-1111-2222-3333-444444444444";
      // Sends 5 requests to distinct recipients (allowed by burst bucket)
      for (let i = 0; i < 5; i++) {
        const res = await server.request("/api/social/requests/send", {
          method: "POST",
          token: mintToken(BURST_USER),
          body: JSON.stringify({
            recipientId: `burst_target_user_${i}`,
            senderName: "BurstUser",
          }),
        });
        expect(res.status).toBe(200);
      }

      // 6th request within the same minute should be rejected with 429
      const sixth = await server.request("/api/social/requests/send", {
        method: "POST",
        token: mintToken(BURST_USER),
        body: JSON.stringify({
          recipientId: "burst_target_user_5",
          senderName: "BurstUser",
        }),
      });
      expect(sixth.status).toBe(429);
      expect((sixth.body as { error: string }).error).toBe("TooManyRequests");
    });

    it("enforces rate limit on cancel route -> 21st returns 429", async () => {
      const CANCEL_USER = "55555555-1111-2222-3333-444444444444";
      // Setup 21 requests directly via service to bypass send rate limiter
      const requestIds: string[] = [];
      for (let i = 0; i < 21; i++) {
        const req = friendRequestsService.sendRequest(CANCEL_USER, "CancelUser", `cancel_target_${i}`);
        requestIds.push(req.id);
      }

      // Cancel 20 requests (burst capacity is 20)
      for (let i = 0; i < 20; i++) {
        const res = await server.request(`/api/social/requests/${requestIds[i]}/cancel`, {
          method: "POST",
          token: mintToken(CANCEL_USER),
        });
        expect(res.status).toBe(200);
      }

      // 21st cancel exceeds burst bucket -> 429
      const twentyFirst = await server.request(`/api/social/requests/${requestIds[20]}/cancel`, {
        method: "POST",
        token: mintToken(CANCEL_USER),
      });
      expect(twentyFirst.status).toBe(429);
      expect((twentyFirst.body as { error: string }).error).toBe("TooManyRequests");
    });

    it("enforces 7-day cooldown after recipient declines, then allows after 7 days", async () => {
      const COOLDOWN_ALICE = "66666666-1111-2222-3333-444444444444";
      const COOLDOWN_BOB = "77777777-1111-2222-3333-444444444444";

      // 1. Alice sends request to Bob
      const req = friendRequestsService.sendRequest(COOLDOWN_ALICE, "Alice", COOLDOWN_BOB);

      // 2. Bob declines request
      const declineRes = await server.request(`/api/social/requests/${req.id}/decline`, {
        method: "POST",
        token: mintToken(COOLDOWN_BOB),
      });
      expect(declineRes.status).toBe(200);

      // 3. Alice tries to resend immediately -> 400 with generic error (R3.5)
      const resendRes = await server.request("/api/social/requests/send", {
        method: "POST",
        token: mintToken(COOLDOWN_ALICE),
        body: JSON.stringify({
          recipientId: COOLDOWN_BOB,
          senderName: "Alice",
        }),
      });
      expect(resendRes.status).toBe(400);
      expect((resendRes.body as { error: string }).error).toBe("Unable to send friend request to this player");

      // 4. Advance the clock past the 7-day cooldown. Only Date is faked: the
      // HTTP server still needs real timers.
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(Date.now() + 7 * 24 * 60 * 60 * 1000 + 5000);

      // 5. Alice resends after 7 days -> allowed!
      const allowedRes = await server.request("/api/social/requests/send", {
        method: "POST",
        token: mintToken(COOLDOWN_ALICE),
        body: JSON.stringify({
          recipientId: COOLDOWN_BOB,
          senderName: "Alice",
        }),
      });
      expect(allowedRes.status).toBe(200);
      expect((allowedRes.body as { success: boolean }).success).toBe(true);
    });
  });

  describe("G1 — one shared send limit across the social AND ranking routes", () => {
    const sendViaSocial = (sender: string, recipient: string) =>
      server.request("/api/social/requests/send", {
        method: "POST",
        token: mintToken(sender),
        body: JSON.stringify({ recipientId: recipient }),
      });
    const sendViaRanking = (sender: string, recipient: string) =>
      server.request(`/api/ranking/friends/${sender}`, {
        method: "POST",
        token: mintToken(sender),
        body: JSON.stringify({ friendId: recipient }),
      });

    it("counts both routes against the same 5/minute bucket", async () => {
      const MIXED = "88888888-1111-2222-3333-444444444444";
      for (let i = 0; i < 3; i++) expect((await sendViaSocial(MIXED, `mixed_a_${i}`)).status).toBe(200);
      for (let i = 0; i < 2; i++) expect((await sendViaRanking(MIXED, `mixed_b_${i}`)).status).toBe(200);

      expect((await sendViaSocial(MIXED, "mixed_over_1")).status).toBe(429);
      expect((await sendViaRanking(MIXED, "mixed_over_2")).status).toBe(429);
    });

    it("enforces the 20/day limit even when the per-minute bucket keeps refilling", async () => {
      const DAILY = "99999999-1111-2222-3333-444444444444";
      // Only Date is faked: the HTTP server still needs real timers.
      vi.useFakeTimers({ toFake: ["Date"] });
      const start = Date.now();

      for (let i = 0; i < 20; i++) {
        // 15 s apart refills the minute bucket faster than it drains.
        vi.setSystemTime(start + i * 15_000);
        expect((await sendViaSocial(DAILY, `daily_target_${i}`)).status).toBe(200);
      }

      vi.setSystemTime(start + 20 * 15_000);
      const twentyFirst = await sendViaSocial(DAILY, "daily_target_over");
      expect(twentyFirst.status).toBe(429);
    });

    it("ranking add-friend creates a PENDING request, never a friendship", async () => {
      const ASKER = "aaaaaaaa-1111-2222-3333-444444444444";
      const res = await sendViaRanking(ASKER, "ranking_target");
      expect(res.status).toBe(200);
      const body = res.body as { success: boolean; request: { status: string } };
      expect(body.request.status).toBe("PENDING");
      expect(friendsService.isFriend(ASKER, "ranking_target")).toBe(false);
    });
  });

  describe("G3 — display text comes from the server, never from the request body", () => {
    const HOSTILE_NAME = "x".repeat(10_000);
    const HOSTILE_AVATAR = "../../evil";

    it("send: ignores body senderName/senderAvatar and uses the caller's profile", async () => {
      const P = "bbbbbbbb-1111-2222-3333-444444444444";
      profileService.getOrCreateProfile(P, "Real Name");

      const res = await server.request("/api/social/requests/send", {
        method: "POST",
        token: mintToken(P),
        body: JSON.stringify({
          recipientId: "g3_recipient_1",
          senderName: HOSTILE_NAME,
          senderAvatar: HOSTILE_AVATAR,
        }),
      });

      expect(res.status).toBe(200);
      const { request } = res.body as { request: { senderName: string; senderAvatar?: string } };
      expect(request.senderName).toBe("Real Name");
      expect(request.senderAvatar).toBeUndefined();
    });

    it("send: falls back to 'Player' when the caller has no profile", async () => {
      const res = await server.request("/api/social/requests/send", {
        method: "POST",
        token: mintToken("cccccccc-1111-2222-3333-444444444444"),
        body: JSON.stringify({ recipientId: "g3_recipient_2", senderName: HOSTILE_NAME }),
      });
      const { request } = res.body as { request: { senderName: string } };
      expect(request.senderName).toBe("Player");
    });

    it("send: clamps an over-long stored profile name and passes a known avatar through", async () => {
      const P = "dddddddd-1111-2222-3333-444444444444";
      profileService.getOrCreateProfile(P, "n".repeat(60), AVATAR_FILES[0]);

      const res = await server.request("/api/social/requests/send", {
        method: "POST",
        token: mintToken(P),
        body: JSON.stringify({ recipientId: "g3_recipient_3" }),
      });
      const { request } = res.body as { request: { senderName: string; senderAvatar?: string } };
      expect(request.senderName).toBe("n".repeat(24));
      expect(request.senderAvatar).toBe(AVATAR_FILES[0]);
    });

    it("accept: ignores body recipientName/recipientAvatar when creating the friendship", async () => {
      const SENDER = "eeeeeeee-1111-2222-3333-444444444444";
      const RECIPIENT = "ffffffff-1111-2222-3333-444444444444";
      profileService.getOrCreateProfile(SENDER, "Sender Real");
      profileService.getOrCreateProfile(RECIPIENT, "Recipient Real");
      const req = friendRequestsService.sendRequest(SENDER, "Sender Real", RECIPIENT);

      const res = await server.request(`/api/social/requests/${req.id}/accept`, {
        method: "POST",
        token: mintToken(RECIPIENT),
        body: JSON.stringify({ recipientName: HOSTILE_NAME, recipientAvatar: HOSTILE_AVATAR }),
      });

      expect(res.status).toBe(200);
      const [edge] = friendsService.getFriends(SENDER);
      expect(edge.displayName).toBe("Recipient Real");
      expect(edge.avatar).toBeUndefined();
    });
  });
});
