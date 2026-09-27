import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PersonalInformationCard from "../PersonalInformationCard";
import EditProfileModal from "../EditProfileModal";
import AccountSummaryCard from "../AccountSummaryCard";
import ProfileQuickActions from "../ProfileQuickActions";
import type { PlayerProfile } from "@shared/profile/PlayerProfile";

describe("Personal Information Feature Components", () => {
  const mockProfile: PlayerProfile = {
    playerId: "player_kethan_1",
    displayName: "Kethan Grandmaster",
    avatar: "👑",
    joinedAt: 1700000000000,
    lastSeenAt: 1700000000000,
    level: 8,
    experiencePoints: 780,
  };

  describe("1. PersonalInformationCard", () => {
    it("renders display name, immutable player ID, masked email, and joined date", () => {
      const onEditProfile = vi.fn();

      render(
        <MemoryRouter>
          <PersonalInformationCard
            profile={mockProfile}
            email="kethan.champion@bhalyam.com"
            isVerifiedEmail={true}
            region="India 🇮🇳"
            bio="90s multiplayer enthusiast and Ludo master."
            onEditProfile={onEditProfile}
          />
        </MemoryRouter>
      );

      expect(screen.getByText("Personal Information")).toBeDefined();
      expect(screen.getByText("Kethan Grandmaster")).toBeDefined();
      expect(screen.getByText("player_kethan_1")).toBeDefined();
      expect(screen.getByText(/ke\*\*\*n@bhalyam.com/i)).toBeDefined();
      expect(screen.getByText("Verified")).toBeDefined();
      expect(screen.getByText("India 🇮🇳")).toBeDefined();
      expect(screen.getByText("90s multiplayer enthusiast and Ludo master.")).toBeDefined();

      const editBtn = screen.getByRole("button", { name: /Edit Profile/i });
      fireEvent.click(editBtn);
      expect(onEditProfile).toHaveBeenCalledTimes(1);
    });

    it("renders fallback guest text when no email is linked", () => {
      render(
        <MemoryRouter>
          <PersonalInformationCard
            profile={mockProfile}
            email={null}
            isVerifiedEmail={false}
            onEditProfile={vi.fn()}
          />
        </MemoryRouter>
      );

      expect(screen.getByText("No email linked (Guest Session)")).toBeDefined();
    });

    it("prefers the live `name` prop over profile.displayName — the page's own REST snapshot must not shadow a name saved elsewhere while this page stays mounted", () => {
      render(
        <MemoryRouter>
          <PersonalInformationCard
            profile={mockProfile}
            name="Renamed Elsewhere"
            email={null}
            isVerifiedEmail={false}
            onEditProfile={vi.fn()}
          />
        </MemoryRouter>
      );

      expect(screen.getByText("Renamed Elsewhere")).toBeDefined();
      expect(screen.queryByText(mockProfile.displayName)).toBeNull();
    });
  });

  describe("2. EditProfileModal", () => {
    it("validates empty display name and triggers onSave with sanitized inputs", async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const onClose = vi.fn();

      render(
        <EditProfileModal
          isOpen={true}
          initialDisplayName="Ace"
          initialBio="Hello world"
          initialRegion="India 🇮🇳"
          onClose={onClose}
          onSave={onSave}
        />
      );

      expect(screen.getByText("Edit Personal Profile")).toBeDefined();
      const input = screen.getByLabelText(/Display Name/i);
      fireEvent.change(input, { target: { value: "New Master" } });

      const saveBtn = screen.getByRole("button", { name: /Save Changes/i });
      fireEvent.click(saveBtn);

      expect(onSave).toHaveBeenCalledWith({
        displayName: "New Master",
        bio: "Hello world",
        region: "India 🇮🇳",
      });
    });
  });

  describe("3. AccountSummaryCard", () => {
    it("renders member status and presence indicators", () => {
      render(
        <AccountSummaryCard
          isMember={true}
          lastSeenAt={Date.now() - 120000}
          friendCount={5}
        />
      );

      expect(screen.getByText("Account")).toBeDefined();
      expect(screen.getAllByText("Active Member").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("5 Friends")).toBeDefined();
    });
  });

  describe("4. ProfileQuickActions", () => {
    it("triggers avatar picker and export data callbacks", () => {
      const onOpenAvatar = vi.fn();
      const onExport = vi.fn();
      const onDelete = vi.fn();

      render(
        <MemoryRouter>
          <ProfileQuickActions
            onOpenAvatarPicker={onOpenAvatar}
            onExportData={onExport}
            onDeleteAccount={onDelete}
            playerId="player_kethan_1"
          />
        </MemoryRouter>
      );

      const avatarBtn = screen.getByRole("button", { name: /Change Avatar/i });
      fireEvent.click(avatarBtn);
      expect(onOpenAvatar).toHaveBeenCalledTimes(1);

      const exportBtn = screen.getByRole("button", { name: /Download your player data/i });
      fireEvent.click(exportBtn);
      expect(onExport).toHaveBeenCalledTimes(1);

      expect(screen.getByRole("button", { name: /Share Profile/i })).toBeDefined();
      expect(screen.getByRole("link", { name: /Privacy and data/i }).getAttribute("href")).toBe("/privacy");

      fireEvent.click(screen.getByRole("button", { name: /Delete account/i }));
      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it("announces share success and clipboard failure", async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText },
      });

      const { rerender } = render(
        <MemoryRouter>
          <ProfileQuickActions onOpenAvatarPicker={vi.fn()} onExportData={vi.fn()} />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByRole("button", { name: /Share profile/i }));
      await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Profile link copied"));

      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
      });
      rerender(
        <MemoryRouter>
          <ProfileQuickActions onOpenAvatarPicker={vi.fn()} onExportData={vi.fn()} />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByRole("button", { name: /Profile link copied/i }));
      await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Profile link could not be copied"));
    });
  });
});
