import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { recordConsent } from "../../../lib/privacy/consent";
import { recordAgeAnswer } from "../../../lib/privacy/ageGate";
import { useAuthStore } from "../../../store/authStore";
import ConsentModal from "../../privacy/ConsentModal";
import MemberOnboarding from "../MemberOnboarding";

vi.mock("../../../store/authStore", async () => {
  const { create } = await import("zustand");
  return { useAuthStore: create(() => ({ userId: null as string | null, profileReady: true })) };
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
  afterEach(() => { vi.useRealTimers(); });
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    // The age question is asked before the privacy choice; these tests are about what comes after it.
    recordAgeAnswer("adult", false);
    useAuthStore.setState({ userId: null, profileReady: true });
  });

  it("waits for profile recovery before showing any onboarding dialog", () => {
    recordConsent("granted", new Date(), "member-a");
    useAuthStore.setState({ userId: "member-a", profileReady: false });
    render(<MemberOnboarding />);
    expect(profile()).not.toBeInTheDocument();
    expect(welcome()).not.toBeInTheDocument();
    act(() => useAuthStore.setState({ profileReady: true }));
    expect(profile()).toBeInTheDocument();
  });

  it("opens the notice in a separate tab and announces it without answering consent", async () => {
    render(<MemoryRouter><ConsentModal /></MemoryRouter>);
    const link = await screen.findByRole("link", { name: /Read the full privacy notice/ });
    expect(link).toHaveAttribute("href", "/privacy");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    link.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(link);
    expect(screen.getByRole("status")).toHaveTextContent("Privacy notice opened in a new tab");
    expect(screen.getByRole("dialog", { name: "What BHALYAM keeps" })).toBeInTheDocument();
  });

  it("does not cover the privacy notice tab with the unanswered consent dialog", async () => {
    vi.useFakeTimers();
    render(<MemoryRouter initialEntries={["/privacy"]}><ConsentModal /></MemoryRouter>);
    await act(async () => { vi.advanceTimersByTime(600); });
    expect(screen.queryByRole("dialog", { name: "What BHALYAM keeps" })).not.toBeInTheDocument();
    vi.useRealTimers();
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
