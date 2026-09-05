import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { startTestServer, type TestServer } from "../../testing/httpTestServer.js";
import { attachPlayerIdentity, clearGuestIdentityProvisioningCache } from "../../auth/identity.js";
import { mintGuestToken } from "../../auth/guestToken.js";
import { createReviewsRouter, createAdminReviewsRouter } from "../ReviewsController.js";
import { ReviewsService } from "../ReviewsService.js";
import { InMemoryReviewsRepository } from "../../persistence/InMemoryReviewsRepository.js";

/**
 * Real HTTP requests against the real router, the real `attachPlayerIdentity`
 * middleware, and a real (in-memory) `ReviewsService` — same discipline as
 * `economy/__tests__/EconomyController.test.ts`: prove the auth guard and the
 * anti-abuse constraint at the boundary a real client hits, not just at the
 * unit level.
 */

const OPS_KEY = "reviews-ops-key-of-sufficient-length-0001";
const ENV_KEYS = ["OPERATIONAL_SECRET", "ADMIN_USER_IDS", "NODE_ENV", "SESSION_SECRET"];
let saved: Record<string, string | undefined> = {};

let server: TestServer;

beforeEach(async () => {
  saved = {};
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  process.env.OPERATIONAL_SECRET = OPS_KEY;
  process.env.SESSION_SECRET = "deterministic-session-secret-for-reviews-api-tests";
  clearGuestIdentityProvisioningCache();

  const repo = new InMemoryReviewsRepository();
  const service = new ReviewsService(repo);
  server = await startTestServer((app) => {
    app.use(attachPlayerIdentity);
    app.use("/api/reviews", createReviewsRouter(service));
    app.use("/api/admin/reviews", createAdminReviewsRouter(service));
  });
});

afterEach(async () => {
  await server.close();
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

function guestToken(): string {
  return mintGuestToken().token;
}

describe("POST /api/reviews", () => {
  it("refuses an anonymous submission before the service is ever called", async () => {
    const res = await server.request("/api/reviews", {
      method: "POST",
      body: JSON.stringify({ rating: 5, body: "Great!" }),
    });
    expect(res.status).toBe(401);
  });

  it("lets a guest submit a platform-wide review", async () => {
    const res = await server.request("/api/reviews", {
      method: "POST",
      token: guestToken(),
      body: JSON.stringify({ rating: 5, body: "Great platform!" }),
    });
    expect(res.status).toBe(201);
    const body = res.body as { review: { status: string; gameId: string | null } };
    expect(body.review.status).toBe("pending");
    expect(body.review.gameId).toBeNull();
  });

  it("lets a guest submit a per-game review", async () => {
    const res = await server.request("/api/reviews", {
      method: "POST",
      token: guestToken(),
      body: JSON.stringify({ rating: 4, body: "Ludo is fun.", gameId: "ludo" }),
    });
    expect(res.status).toBe(201);
    const body = res.body as { review: { gameId: string | null } };
    expect(body.review.gameId).toBe("ludo");
  });

  it("refuses a second review of the same scope from the same guest with 409", async () => {
    const token = guestToken();
    const first = await server.request("/api/reviews", {
      method: "POST",
      token,
      body: JSON.stringify({ rating: 5, body: "First." }),
    });
    expect(first.status).toBe(201);

    const second = await server.request("/api/reviews", {
      method: "POST",
      token,
      body: JSON.stringify({ rating: 1, body: "Second." }),
    });
    expect(second.status).toBe(409);
    expect((second.body as { error: string }).error).toBe("AlreadyReviewed");
  });

  it("rejects an out-of-range rating with 400", async () => {
    const res = await server.request("/api/reviews", {
      method: "POST",
      token: guestToken(),
      body: JSON.stringify({ rating: 9, body: "Too high." }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects an unknown gameId with 400", async () => {
    const res = await server.request("/api/reviews", {
      method: "POST",
      token: guestToken(),
      body: JSON.stringify({ rating: 5, body: "Nice.", gameId: "not-a-real-game" }),
    });
    expect(res.status).toBe(400);
  });

  it("429s once the per-identity rate limit is exhausted", async () => {
    const token = guestToken();
    let lastStatus = 0;
    // Bucket capacity is 5 (see ReviewsController.ts's `submitRateLimit`).
    // Six DIFFERENT-game submissions are each legitimate on their own (no
    // duplicate-scope 409 to confuse with), so the 6th tripping the limiter
    // proves the limiter — not the uniqueness constraint — caused the 429.
    const games = ["ludo", "rummy", "uno", "chess", "carrom", "dotsboxes"];
    for (const gameId of games) {
      const res = await server.request("/api/reviews", {
        method: "POST",
        token,
        body: JSON.stringify({ rating: 5, body: "Review.", gameId }),
      });
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });
});

describe("GET /api/reviews/mine and public reads", () => {
  it("returns only the caller's own reviews from /mine", async () => {
    const token = guestToken();
    await server.request("/api/reviews", { method: "POST", token, body: JSON.stringify({ rating: 5, body: "Mine." }) });

    const res = await server.request("/api/reviews/mine", { token });
    expect(res.status).toBe(200);
    const body = res.body as { reviews: { body: string }[] };
    expect(body.reviews).toHaveLength(1);
    expect(body.reviews[0]?.body).toBe("Mine.");
  });

  it("does not include a pending review in the public game listing", async () => {
    await server.request("/api/reviews", {
      method: "POST",
      token: guestToken(),
      body: JSON.stringify({ rating: 5, body: "Pending.", gameId: "ludo" }),
    });
    const res = await server.request("/api/reviews/game/ludo");
    expect(res.status).toBe(200);
    const body = res.body as { reviews: unknown[] };
    expect(body.reviews).toHaveLength(0);
  });
});

describe("admin moderation surface", () => {
  it("refuses every admin route without operational credentials", async () => {
    const pending = await server.request("/api/admin/reviews/pending");
    expect(pending.status).toBe(401);
    const approve = await server.request("/api/admin/reviews/some-id/approve", { method: "POST" });
    expect(approve.status).toBe(401);
  });

  it("approves a pending review, which then appears publicly, and rejects an illegal re-moderation", async () => {
    const submit = await server.request("/api/reviews", {
      method: "POST",
      token: guestToken(),
      body: JSON.stringify({ rating: 5, body: "Approve me.", gameId: "ludo" }),
    });
    const reviewId = (submit.body as { review: { id: string } }).review.id;

    const pending = await server.request("/api/admin/reviews/pending", { headers: { "x-operational-key": OPS_KEY } });
    expect(pending.status).toBe(200);
    expect((pending.body as { reviews: { id: string }[] }).reviews.map((r) => r.id)).toContain(reviewId);

    const approve = await server.request(`/api/admin/reviews/${reviewId}/approve`, {
      method: "POST",
      headers: { "x-operational-key": OPS_KEY },
    });
    expect(approve.status).toBe(200);

    const publicListing = await server.request("/api/reviews/game/ludo");
    expect((publicListing.body as { reviews: { id: string }[] }).reviews.map((r) => r.id)).toContain(reviewId);

    const reapprove = await server.request(`/api/admin/reviews/${reviewId}/approve`, {
      method: "POST",
      headers: { "x-operational-key": OPS_KEY },
    });
    expect(reapprove.status).toBe(409);
  });

  it("features an approved review, and refuses featuring a still-pending one", async () => {
    const submit = await server.request("/api/reviews", {
      method: "POST",
      token: guestToken(),
      body: JSON.stringify({ rating: 5, body: "Feature me." }),
    });
    const reviewId = (submit.body as { review: { id: string } }).review.id;

    const featureWhilePending = await server.request(`/api/admin/reviews/${reviewId}/feature`, {
      method: "POST",
      headers: { "x-operational-key": OPS_KEY },
      body: JSON.stringify({ featured: true }),
    });
    expect(featureWhilePending.status).toBe(409);

    await server.request(`/api/admin/reviews/${reviewId}/approve`, {
      method: "POST",
      headers: { "x-operational-key": OPS_KEY },
    });

    const feature = await server.request(`/api/admin/reviews/${reviewId}/feature`, {
      method: "POST",
      headers: { "x-operational-key": OPS_KEY },
      body: JSON.stringify({ featured: true }),
    });
    expect(feature.status).toBe(200);

    const featured = await server.request("/api/reviews/featured");
    expect((featured.body as { reviews: { id: string }[] }).reviews.map((r) => r.id)).toContain(reviewId);
  });
});
