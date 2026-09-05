import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { InMemoryReviewsRepository } from "../InMemoryReviewsRepository.js";
import { SupabaseReviewsRepository } from "../SupabaseReviewsRepository.js";
import { SupabaseProgressionRepository } from "../SupabaseProgressionRepository.js";
import { readPostgrestConfig } from "../postgrest.js";
import {
  AlreadyReviewedError,
  InvalidStatusTransitionError,
  ReviewNotFoundError,
  type ReviewsRepository,
} from "../ReviewsRepository.js";

/**
 * One suite, both implementations — mirrors `repositoryContract.test.ts`'s
 * own reasoning: the in-memory store deduplicates with a `Map`, Postgres
 * deduplicates with two partial unique indexes. Written once against the
 * INTERFACE so the two cannot silently disagree about what "already
 * reviewed" means.
 */

let seq = 0;
function freshGuestId(): string {
  seq += 1;
  return `guest_${seq.toString(16).padStart(4, "0")}${Date.now().toString(16)}${Math.random().toString(16).slice(2, 12)}`;
}

function contractSuite(name: string, make: () => Promise<ReviewsRepository>, seedIdentity: (id: string) => Promise<void>): void {
  describe(`ReviewsRepository contract — ${name}`, () => {
    let repo: ReviewsRepository;
    let PLAYER: string;
    let OTHER: string;

    beforeAll(async () => {
      repo = await make();
      await repo.ping();
    });

    beforeEach(async () => {
      PLAYER = freshGuestId();
      OTHER = freshGuestId();
      await seedIdentity(PLAYER);
      await seedIdentity(OTHER);
    });

    it("submits a platform-wide review, defaulting to pending and not featured", async () => {
      const review = await repo.submitReview({
        identityId: PLAYER,
        identityKind: "guest",
        gameId: null,
        rating: 5,
        body: "Great platform!",
      });
      expect(review.status).toBe("pending");
      expect(review.isFeatured).toBe(false);
      expect(review.gameId).toBeNull();
    });

    it("submits a per-game review independently of a platform-wide one from the same identity", async () => {
      await repo.submitReview({ identityId: PLAYER, identityKind: "guest", gameId: null, rating: 4, body: "Fun overall." });
      const gameReview = await repo.submitReview({
        identityId: PLAYER,
        identityKind: "guest",
        gameId: "ludo",
        rating: 3,
        body: "Ludo is fine.",
      });
      expect(gameReview.gameId).toBe("ludo");

      const mine = await repo.listReviewsForIdentity(PLAYER);
      expect(mine).toHaveLength(2);
    });

    it("throws AlreadyReviewedError (with the existing row) on a second platform-wide review from the same identity", async () => {
      const first = await repo.submitReview({ identityId: PLAYER, identityKind: "guest", gameId: null, rating: 5, body: "First." });
      await expect(
        repo.submitReview({ identityId: PLAYER, identityKind: "guest", gameId: null, rating: 1, body: "Second." }),
      ).rejects.toSatisfy((err: unknown) => {
        expect(err).toBeInstanceOf(AlreadyReviewedError);
        expect((err as AlreadyReviewedError).existing.id).toBe(first.id);
        return true;
      });
    });

    it("throws AlreadyReviewedError on a second review of the SAME game from the same identity, but allows a DIFFERENT game", async () => {
      await repo.submitReview({ identityId: PLAYER, identityKind: "guest", gameId: "rummy", rating: 5, body: "Love rummy." });
      await expect(
        repo.submitReview({ identityId: PLAYER, identityKind: "guest", gameId: "rummy", rating: 1, body: "Changed my mind." }),
      ).rejects.toBeInstanceOf(AlreadyReviewedError);

      const otherGame = await repo.submitReview({ identityId: PLAYER, identityKind: "guest", gameId: "uno", rating: 4, body: "Uno is great too." });
      expect(otherGame.gameId).toBe("uno");
    });

    it("lets two DIFFERENT identities each review the same scope", async () => {
      await repo.submitReview({ identityId: PLAYER, identityKind: "guest", gameId: null, rating: 5, body: "Player review." });
      const otherReview = await repo.submitReview({ identityId: OTHER, identityKind: "guest", gameId: null, rating: 2, body: "Other review." });
      expect(otherReview.identityId).toBe(OTHER);
    });

    it("does not show a pending review in any public listing", async () => {
      await repo.submitReview({ identityId: PLAYER, identityKind: "guest", gameId: "ludo", rating: 5, body: "Pending." });
      const { reviews } = await repo.listApprovedForGame("ludo");
      expect(reviews).toHaveLength(0);
    });

    it("moderates pending -> approved, and the approved review then appears in the public listing and aggregate", async () => {
      const review = await repo.submitReview({ identityId: PLAYER, identityKind: "guest", gameId: "ludo", rating: 4, body: "Good game." });
      const approved = await repo.moderateReview({ reviewId: review.id, newStatus: "approved", moderatorId: "mod-1" });
      expect(approved.status).toBe("approved");
      expect(approved.moderatorId).toBe("mod-1");

      const { reviews } = await repo.listApprovedForGame("ludo");
      expect(reviews.map((r) => r.id)).toContain(review.id);

      const aggregate = await repo.getAggregateForGame("ludo");
      expect(aggregate.count).toBeGreaterThanOrEqual(1);
      expect(aggregate.averageRating).toBeGreaterThan(0);
    });

    it("moderates pending -> rejected with a reason, and a rejected review never appears publicly", async () => {
      const review = await repo.submitReview({ identityId: PLAYER, identityKind: "guest", gameId: "rummy", rating: 1, body: "Bad." });
      const rejected = await repo.moderateReview({ reviewId: review.id, newStatus: "rejected", moderatorId: "mod-1", reason: "Spam" });
      expect(rejected.status).toBe("rejected");
      expect(rejected.rejectionReason).toBe("Spam");

      const { reviews } = await repo.listApprovedForGame("rummy");
      expect(reviews).toHaveLength(0);
    });

    it("throws InvalidStatusTransitionError moderating a review that is not pending", async () => {
      const review = await repo.submitReview({ identityId: PLAYER, identityKind: "guest", gameId: null, rating: 5, body: "Once." });
      await repo.moderateReview({ reviewId: review.id, newStatus: "approved", moderatorId: "mod-1" });
      await expect(
        repo.moderateReview({ reviewId: review.id, newStatus: "approved", moderatorId: "mod-2" }),
      ).rejects.toBeInstanceOf(InvalidStatusTransitionError);
    });

    it("throws ReviewNotFoundError moderating an id that does not exist", async () => {
      await expect(
        repo.moderateReview({ reviewId: "00000000-0000-0000-0000-000000000000", newStatus: "approved", moderatorId: "mod-1" }),
      ).rejects.toBeInstanceOf(ReviewNotFoundError);
    });

    it("requires status=approved before a review can be featured, and featured reviews appear in the Testimonials feed", async () => {
      const review = await repo.submitReview({ identityId: PLAYER, identityKind: "guest", gameId: null, rating: 5, body: "Featured me." });

      await expect(repo.setFeatured(review.id, true, "mod-1")).rejects.toBeInstanceOf(InvalidStatusTransitionError);

      await repo.moderateReview({ reviewId: review.id, newStatus: "approved", moderatorId: "mod-1" });
      const featured = await repo.setFeatured(review.id, true, "mod-1");
      expect(featured.isFeatured).toBe(true);

      const feed = await repo.listFeatured();
      expect(feed.map((r) => r.id)).toContain(review.id);
    });

    it("lists pending reviews oldest-first for the moderation queue", async () => {
      const first = await repo.submitReview({ identityId: PLAYER, identityKind: "guest", gameId: "chess", rating: 3, body: "First." });
      await new Promise((r) => setTimeout(r, 5));
      const second = await repo.submitReview({ identityId: OTHER, identityKind: "guest", gameId: "chess", rating: 4, body: "Second." });

      const { reviews } = await repo.listPending();
      const ids = reviews.map((r) => r.id);
      expect(ids.indexOf(first.id)).toBeLessThan(ids.indexOf(second.id));
    });
  });
}

/* ── In memory: always. ── */
contractSuite(
  "in memory",
  async () => new InMemoryReviewsRepository(),
  async () => {
    /* no FK to satisfy — the in-memory store doesn't enforce one. */
  },
);

/* ── Supabase Postgres: only when a real project is configured. ── */
const config = readPostgrestConfig();

if (config) {
  const progression = new SupabaseProgressionRepository(config);
  contractSuite(
    "supabase postgres",
    async () => new SupabaseReviewsRepository(config),
    async (id: string) => {
      await progression.upsertIdentity({ playerId: id, kind: "guest", authUserId: null, lastSeenAt: Date.now() });
    },
  );
} else {
  // Registering nothing (not `describe.skip`) keeps the anti-skip quality
  // gate (`scripts/quality-gates/testQualityAudit.mjs`) meaningful — see
  // `repositoryContract.test.ts`'s own comment for the full reasoning.
  console.warn(
    "[reviews] Supabase contract NOT run: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not both " +
      "set. Durability is UNVERIFIED by this run.",
  );
}
