import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminReviewsPage from "../index";
import * as reviewsApi from "../../../../lib/reviewsApi";
import * as feedbackApi from "../../../../lib/feedbackApi";

function makeReview(overrides: Partial<reviewsApi.ReviewRecord> = {}): reviewsApi.ReviewRecord {
  return {
    id: "r1",
    identityId: "guest_1",
    identityKind: "guest",
    gameId: "ludo",
    rating: 4,
    body: "Fun game!",
    status: "pending",
    isFeatured: false,
    moderatorId: null,
    moderatedAt: null,
    rejectionReason: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminReviewsPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(feedbackApi, "adminListFeedback").mockResolvedValue({ submissions: [] });
});

describe("AdminReviewsPage", () => {
  it("lists pending reviews by default", async () => {
    vi.spyOn(reviewsApi, "adminListReviews").mockResolvedValue({ reviews: [makeReview()], total: 1 });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Fun game!")).toBeDefined();
    });
  });

  it("approves a pending review from the detail drawer", async () => {
    vi.spyOn(reviewsApi, "adminListReviews").mockResolvedValue({ reviews: [makeReview()], total: 1 });
    const approveSpy = vi.spyOn(reviewsApi, "adminApproveReview").mockResolvedValue({
      review: makeReview({ status: "approved" }),
    });

    renderPage();
    await waitFor(() => screen.getByText("Fun game!"));
    fireEvent.click(screen.getByText("Fun game!"));

    const approveButton = await screen.findByRole("button", { name: /Approve/i });
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(approveSpy).toHaveBeenCalledWith("r1");
    });
  });

  it("requires a reason before the reject button is enabled", async () => {
    vi.spyOn(reviewsApi, "adminListReviews").mockResolvedValue({ reviews: [makeReview()], total: 1 });
    renderPage();
    await waitFor(() => screen.getByText("Fun game!"));
    fireEvent.click(screen.getByText("Fun game!"));

    const rejectButton = await screen.findByRole("button", { name: /Reject/i });
    expect(rejectButton.hasAttribute("disabled")).toBe(true);

    fireEvent.change(screen.getByLabelText(/Rejection reason/i), { target: { value: "Spam" } });
    expect(rejectButton.hasAttribute("disabled")).toBe(false);
  });

  it("switches to the feedback inbox tab and lists submissions", async () => {
    vi.spyOn(reviewsApi, "adminListReviews").mockResolvedValue({ reviews: [], total: 0 });
    vi.spyOn(feedbackApi, "adminListFeedback").mockResolvedValue({
      submissions: [
        { id: "f1", category: "bug", message: "Dice animation glitches.", email: null, submitterId: null, createdAt: Date.now() },
      ],
    });

    renderPage();
    fireEvent.click(screen.getByRole("tab", { name: /Feedback Inbox/i }));

    await waitFor(() => {
      expect(screen.getByText("Dice animation glitches.")).toBeDefined();
    });
  });
});
