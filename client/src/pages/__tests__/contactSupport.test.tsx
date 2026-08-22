import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import ContactUsPage from "../ContactUsPage";

describe("ContactUsPage / Support Helpdesk Suite", () => {
  it("renders 8 help categories, 2-step layout, and sidebar cards", () => {
    render(
      <BrowserRouter>
        <ContactUsPage />
      </BrowserRouter>
    );

    // Hero title
    expect(screen.getByText("We're here to help you get back to playing.")).toBeDefined();

    // Step 1: What can we help you with?
    expect(screen.getByText("What can we help you with?")).toBeDefined();
    expect(screen.getByText("Game & Gameplay")).toBeDefined();
    expect(screen.getByText("Lounges & Multiplayer")).toBeDefined();
    expect(screen.getByText("Technical Problem")).toBeDefined();
    expect(screen.getByText("Account & Profile")).toBeDefined();
    expect(screen.getAllByText("Tournaments").length).toBeGreaterThan(0);
    expect(screen.getByText("Safety & Community")).toBeDefined();
    expect(screen.getByText("Feedback & Ideas")).toBeDefined();
    expect(screen.getByText("Something Else")).toBeDefined();

    // Step 2: Tell us more about the issue
    expect(screen.getByText("Tell us more about the issue")).toBeDefined();
    expect(screen.getByPlaceholderText("Score was incorrect at the end of the match")).toBeDefined();
    expect(screen.getByPlaceholderText("you@example.com")).toBeDefined();

    // Sidebar
    expect(screen.getByText("What happens next?")).toBeDefined();
    expect(screen.getByText("Support hours")).toBeDefined();
    expect(screen.getByText("Still need help?")).toBeDefined();
  });

  it("submits the ticket form and displays reference ID (BHY-XXXXXX)", async () => {
    render(
      <BrowserRouter>
        <ContactUsPage />
      </BrowserRouter>
    );

    // Fill in summary, description, email
    const summaryInput = screen.getByPlaceholderText("Score was incorrect at the end of the match");
    const descriptionInput = screen.getByPlaceholderText(/We played a 5 over match/i);
    const emailInput = screen.getByPlaceholderText("you@example.com");

    fireEvent.change(summaryInput, { target: { value: "Turn timer expired prematurely" } });
    fireEvent.change(descriptionInput, { target: { value: "Was on turn 4 in Rummy, had 15 seconds remaining when turn was auto-passed" } });
    fireEvent.change(emailInput, { target: { value: "player@example.com" } });

    const submitBtn = screen.getByRole("button", { name: /Send Support Request/i });
    fireEvent.click(submitBtn);

    // Should transition to success screen with BHY ticket
    await waitFor(() => {
      expect(screen.getByText(/Message Received!/i)).toBeDefined();
      expect(screen.getByText(/BHY-\d{6}/)).toBeDefined();
    }, { timeout: 3000 });
  });
});
