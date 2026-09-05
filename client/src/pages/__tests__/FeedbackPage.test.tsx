import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FeedbackPage from "../FeedbackPage";
import * as feedbackApi from "../../lib/feedbackApi";

function renderPage() {
  return render(
    <MemoryRouter>
      <FeedbackPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("FeedbackPage", () => {
  it("calls submitFeedback with the chosen category and message, and shows a success screen", async () => {
    const submitSpy = vi.spyOn(feedbackApi, "submitFeedback").mockResolvedValue({ id: "fb1" });

    renderPage();

    fireEvent.click(screen.getByRole("radio", { name: /Suggest an Idea/i }));
    fireEvent.change(screen.getByLabelText("Your message"), { target: { value: "Add dark mode to Ludo." } });
    fireEvent.click(screen.getByRole("button", { name: /Send Feedback/i }));

    await waitFor(() => {
      expect(submitSpy).toHaveBeenCalledWith({ category: "suggestion", message: "Add dark mode to Ludo.", email: undefined });
    });
    await waitFor(() => {
      expect(screen.getByText("Feedback received!")).toBeDefined();
    });
  });

  it("does not call submitFeedback when the message is empty", () => {
    const submitSpy = vi.spyOn(feedbackApi, "submitFeedback");
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Send Feedback/i }));
    expect(submitSpy).not.toHaveBeenCalled();
  });
});
