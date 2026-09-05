import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import WriteReviewPage from "../WriteReviewPage";
import * as reviewsApi from "../../lib/reviewsApi";

/**
 * `ContactUsPage.tsx`'s submit handler is a `setTimeout` mock that never
 * calls the server — this test exists specifically to catch that
 * regression here: submitting must call the real API, not fabricate a
 * success screen.
 */

function renderPage() {
  return render(
    <MemoryRouter>
      <WriteReviewPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("WriteReviewPage", () => {
  it("calls submitReview with the chosen rating and body, and shows a success screen", async () => {
    const submitSpy = vi.spyOn(reviewsApi, "submitReview").mockResolvedValue({
      review: {
        id: "r1",
        identityId: "guest_1",
        identityKind: "guest",
        gameId: null,
        rating: 5,
        body: "Loved it!",
        status: "pending",
        isFeatured: false,
        moderatorId: null,
        moderatedAt: null,
        rejectionReason: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    });

    renderPage();

    fireEvent.click(screen.getByRole("radio", { name: "5 stars" }));
    fireEvent.change(screen.getByLabelText("Your review"), { target: { value: "Loved it!" } });
    fireEvent.click(screen.getByRole("button", { name: /Submit Review/i }));

    await waitFor(() => {
      expect(submitSpy).toHaveBeenCalledWith({ rating: 5, body: "Loved it!", gameId: null });
    });
    await waitFor(() => {
      expect(screen.getByText("Review submitted!")).toBeDefined();
    });
  });

  it("shows a friendly message instead of an error when the identity already reviewed this scope", async () => {
    vi.spyOn(reviewsApi, "submitReview").mockRejectedValue(
      new reviewsApi.ReviewsClientError(409, "AlreadyReviewed", "already reviewed"),
    );

    renderPage();
    fireEvent.click(screen.getByRole("radio", { name: "4 stars" }));
    fireEvent.change(screen.getByLabelText("Your review"), { target: { value: "Second try." } });
    fireEvent.click(screen.getByRole("button", { name: /Submit Review/i }));

    await waitFor(() => {
      expect(screen.getByText("Review submitted!")).toBeDefined();
    });
  });

  it("does not call submitReview when no rating has been chosen", () => {
    const submitSpy = vi.spyOn(reviewsApi, "submitReview");
    renderPage();
    fireEvent.change(screen.getByLabelText("Your review"), { target: { value: "No rating given." } });
    fireEvent.click(screen.getByRole("button", { name: /Submit Review/i }));
    expect(submitSpy).not.toHaveBeenCalled();
    expect(screen.getByText("Please choose a star rating.")).toBeDefined();
  });
});
