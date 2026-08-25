import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ProfileSheet, type NotificationItem } from "../ProfileSheet";
import { useAuthStore } from "../../../../store/authStore";

const NOTIFICATIONS: NotificationItem[] = [
  {
    id: "n1",
    type: "invite",
    title: "Priya invited you to a Rummy table",
    desc: "Room ANNA42",
    time: "2m ago",
    unread: true,
  },
];

function renderSheet(initialView: "profile" | "notifications" = "profile") {
  return render(
    <BrowserRouter>
      <ProfileSheet
        open
        onClose={() => {}}
        notifications={NOTIFICATIONS}
        onUpdateNotifications={() => {}}
        onOpenJoin={() => {}}
        initialView={initialView}
      />
    </BrowserRouter>,
  );
}

describe("ProfileSheet — Notifications visibility (guest vs member)", () => {
  beforeEach(() => {
    useAuthStore.setState({ isMember: false });
  });

  it("regression: a guest does not see the Notifications row or its unread badge on the profile card", () => {
    renderSheet("profile");
    expect(screen.queryByText("Notifications")).toBeNull();
    expect(screen.queryByText(/unread/)).toBeNull();
  });

  it("regression: a guest who reaches view=notifications (e.g. via the sidebar bell) falls back to the profile card, not the notifications feed", () => {
    renderSheet("notifications");
    // The notifications feed's back-button title is unique to that panel;
    // its absence confirms we fell through to the profile card instead.
    expect(screen.queryByTitle("Back to profile")).toBeNull();
    expect(screen.getByText("Add your name")).toBeDefined();
  });

  it("a signed-in member does see the Notifications row with its unread count", () => {
    useAuthStore.setState({ isMember: true });
    renderSheet("profile");
    expect(screen.getByText("Notifications")).toBeDefined();
    expect(screen.getByText("1 unread")).toBeDefined();
  });

  it("a signed-in member landing on view=notifications sees the real notifications feed", () => {
    useAuthStore.setState({ isMember: true });
    renderSheet("notifications");
    expect(screen.getByTitle("Back to profile")).toBeDefined();
    expect(screen.getByText("Priya invited you to a Rummy table")).toBeDefined();
  });
});
