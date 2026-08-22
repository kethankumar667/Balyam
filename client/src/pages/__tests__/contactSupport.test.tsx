import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import ContactUsPage from "../ContactUsPage";

describe("ContactUsPage / Support Helpdesk Suite", () => {
  it("renders help categories, form inputs, and hero title", () => {
    render(
      <BrowserRouter>
        <ContactUsPage />
      </BrowserRouter>
    );

    expect(screen.getByText("We're here to help.")).toBeDefined();
    expect(screen.getAllByText("Game & Gameplay").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Rooms & Multiplayer").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Technical Issue").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Feedback & Suggestions").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Safety & Community").length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText("you@example.com")).toBeDefined();
  });

  it("submits the form and displays ticket reference ID (BHY-XXXXXX)", async () => {
    render(
      <BrowserRouter>
        <ContactUsPage />
      </BrowserRouter>
    );

    // Fill in subject, message, email
    const subjectInput = screen.getByPlaceholderText(/Ludo roll stuck/i);
    const messageInput = screen.getByPlaceholderText(/Please provide details/i);
    const emailInput = screen.getByPlaceholderText("you@example.com");

    fireEvent.change(subjectInput, { target: { value: "Connection dropped in Uno" } });
    fireEvent.change(messageInput, { target: { value: "Was playing Uno match when Wi-Fi reconnected and seat was lost" } });
    fireEvent.change(emailInput, { target: { value: "player@example.com" } });

    const submitBtn = screen.getByRole("button", { name: /Send Message/i });
    fireEvent.click(submitBtn);

    // Should transition to success screen with BHY ticket
    await waitFor(() => {
      expect(screen.getByText(/Message Received!/i)).toBeDefined();
      expect(screen.getByText(/BHY-\d{6}/)).toBeDefined();
    }, { timeout: 2000 });
  });
});
