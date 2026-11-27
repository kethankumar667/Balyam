import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AudioProvider } from "../../../context/AudioContext";
import MemberLockedGate from "../MemberLockedGate";

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <AudioProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </AudioProvider>
  );
}

describe("MemberLockedGate", () => {
  it("renders locked state for Leaderboard", () => {
    renderWithProviders(<MemberLockedGate feature="leaderboard" />);

    expect(screen.getByText(/Leaderboards are Locked for Guests/i)).toBeTruthy();
  });

  it("renders locked state for Profile", () => {
    renderWithProviders(<MemberLockedGate feature="profile" />);

    expect(screen.getByText(/Player Profile is Locked for Guests/i)).toBeTruthy();
  });

  it("renders locked state for Personal Information", () => {
    renderWithProviders(<MemberLockedGate feature="personal" />);

    expect(screen.getByText(/Personal Information is Locked for Guests/i)).toBeTruthy();
  });
});

