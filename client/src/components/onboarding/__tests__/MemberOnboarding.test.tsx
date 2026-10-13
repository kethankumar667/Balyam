import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { recordConsent } from "../../../lib/privacy/consent";
import { useAuthStore } from "../../../store/authStore";
import ConsentModal from "../../privacy/ConsentModal";
import MemberOnboarding from "../MemberOnboarding";

vi.mock("../../../store/authStore", async () => {
  const { create } = await import("zustand");
  return { useAuthStore: create(() => ({ userId: null as string | null })) };
});

// The two steps have their own tests; here they are markers, so these tests stay about the ORDER.
vi.mock("../../profile/ProfileCompletionPrompt", () => ({
  default: ({ onFinished }: { onFinished?: () => void }) => (
    <div role="dialog" aria-label="profile questions">
      <button type="button" onClick={onFinished}>
        finish profile
      </button>
    </div>
  ),
}));
vi.mock("../WelcomeCelebration", () => ({ default: () => <div role="dialog" aria-label="welcome" /> }));

const profile = () => screen.queryByRole("dialog", { name: "profile questions" });
const welcome = () => screen.queryByRole("dialog", { name: "welcome" });

/** Privacy, then the profile questions, then the welcome: one dialog at a time, each after the one before. */
describe("MemberOnboarding", () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    useAuthStore.setState({ userId: null });
  });

  it.each(["Allow all", "Only what's essential"])(
    "asks a newly signed-in member before profile questions after guest consent (%s)",
    async (choice) => {
      recordConsent("granted");
      render(<MemoryRouter><ConsentModal /><MemberOnboarding /></MemoryRouter>);
      expect(profile()).toBeInTheDocument();

      act(() => useAuthStore.setState({ userId: "member-a" }));

      expect(profile()).not.toBeInTheDocument();
      expect(await screen.findByRole("dialog", { name: "What BHALYAM keeps" })).toBeInTheDocument();
      expect(welcome()).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: choice }));

      expect(screen.queryByRole("dialog", { name: "What BHALYAM keeps" })).not.toBeInTheDocument();
      expect(profile()).toBeInTheDocument();
      expect(welcome()).not.toBeInTheDocument();
    },
  );

  it("shows nothing while the privacy choice is unanswered", () => {
    render(<MemberOnboarding />);

    expect(profile()).not.toBeInTheDocument();
    expect(welcome()).not.toBeInTheDocument();
  });

  it("shows the profile questions the moment the privacy choice is answered", () => {
    render(<MemberOnboarding />);

    act(() => {
      recordConsent("granted");
    });

    expect(profile()).toBeInTheDocument();
    expect(welcome()).not.toBeInTheDocument();
  });

  it("counts 'only what's essential' as an answer too", () => {
    render(<MemberOnboarding />);

    act(() => {
      recordConsent("essential-only");
    });

    expect(profile()).toBeInTheDocument();
  });

  it("goes straight to the profile questions for someone who already answered", () => {
    recordConsent("granted");

    render(<MemberOnboarding />);

    expect(profile()).toBeInTheDocument();
  });

  it("shows the welcome only after the profile step reports back, and never alongside it", () => {
    recordConsent("granted");
    render(<MemberOnboarding />);
    expect(welcome()).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "finish profile" }));

    expect(welcome()).toBeInTheDocument();
    expect(profile()).not.toBeInTheDocument();
  });

  it("never reaches the welcome while the privacy choice is still open", () => {
    render(<MemberOnboarding />);

    expect(screen.queryByRole("button", { name: "finish profile" })).not.toBeInTheDocument();
    expect(welcome()).not.toBeInTheDocument();
  });
});
