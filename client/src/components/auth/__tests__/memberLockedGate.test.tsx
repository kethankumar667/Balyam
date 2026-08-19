import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MemberLockedGate from "../MemberLockedGate";

describe("MemberLockedGate", () => {
  it("renders locked state for Tournaments", () => {
    render(
      <MemoryRouter>
        <MemberLockedGate feature="tournaments" />
      </MemoryRouter>
    );

    expect(screen.getByText(/Tournaments are Locked for Guests/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: /Create Free Account/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Sign In/i })).toBeTruthy();
  });

  it("renders locked state for Leaderboard", () => {
    render(
      <MemoryRouter>
        <MemberLockedGate feature="leaderboard" />
      </MemoryRouter>
    );

    expect(screen.getByText(/Leaderboards are Locked for Guests/i)).toBeTruthy();
  });

  it("renders locked state for Profile", () => {
    render(
      <MemoryRouter>
        <MemberLockedGate feature="profile" />
      </MemoryRouter>
    );

    expect(screen.getByText(/Player Profile is Locked for Guests/i)).toBeTruthy();
  });

  it("renders locked state for Personal Information", () => {
    render(
      <MemoryRouter>
        <MemberLockedGate feature="personal" />
      </MemoryRouter>
    );

    expect(screen.getByText(/Personal Information is Locked for Guests/i)).toBeTruthy();
  });
});

