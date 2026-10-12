import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useAuthStore } from "../../../store/authStore";
import { readConsent, needsConsent } from "../../../lib/privacy/consent";
import { useSignUp } from "../useAccountAuth";
import SignInInvitation from "../SignInInvitation";
import { resetSignInInviteForTests } from "../../../hooks/useSignInInvite";

const flags = vi.hoisted(() => ({ configured: true }));

vi.mock("../../../lib/supabase/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../lib/supabase/client")>();
  return Object.defineProperty({ ...actual }, "isSupabaseConfigured", {
    get: () => flags.configured,
    enumerable: true,
  });
});
vi.mock("../../../lib/privacy/consent", () => ({ readConsent: vi.fn(), needsConsent: vi.fn() }));
vi.mock("../useAccountAuth", () => ({ useSignUp: vi.fn() }));

const mockReadConsent = vi.mocked(readConsent);
const mockNeedsConsent = vi.mocked(needsConsent);
const mockUseSignUp = vi.mocked(useSignUp);

const TWO_MINUTES = 120_000;
const withGoogle = vi.fn();

function signUpState(over: Partial<ReturnType<typeof useSignUp>> = {}) {
  return { loading: false, error: null, configured: true, withGoogle, ...over } as unknown as ReturnType<typeof useSignUp>;
}

function renderAt(path = "/games") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SignInInvitation />
    </MemoryRouter>,
  );
}

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
}

describe("SignInInvitation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    resetSignInInviteForTests();
    flags.configured = true;
    setVisibility("visible");
    mockReadConsent.mockReturnValue(null); // never answered the consent dialog → first visit
    mockNeedsConsent.mockReturnValue(false);
    mockUseSignUp.mockReturnValue(signUpState());
    useAuthStore.setState({ ready: true, isMember: false, userId: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("when it appears", () => {
    it("invites a first-time guest after two minutes, and not a moment before", () => {
      renderAt();

      advance(TWO_MINUTES - 1_000);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      advance(1_000);
      expect(screen.getByRole("dialog", { name: /your table is waiting/i })).toBeInTheDocument();
    });

    it("counts only the time the tab is actually in front of the visitor", () => {
      renderAt();

      setVisibility("hidden");
      advance(TWO_MINUTES * 3);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      setVisibility("visible");
      advance(TWO_MINUTES);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("never invites someone who is already signed in", () => {
      useAuthStore.setState({ isMember: true, userId: "u1" });
      renderAt();

      advance(TWO_MINUTES * 2);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("never invites a returning visitor", () => {
      mockReadConsent.mockReturnValue({ choice: "granted", at: "2026-10-01T00:00:00.000Z", noticeVersion: 3 });
      renderAt();

      advance(TWO_MINUTES * 2);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("waits for the consent question to be answered rather than stacking two dialogs", () => {
      mockNeedsConsent.mockReturnValue(true);
      renderAt();

      advance(TWO_MINUTES * 2);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      mockNeedsConsent.mockReturnValue(false);
      advance(1_000);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("stays quiet on the sign-in pages and at a live table", () => {
      const login = renderAt("/login");
      advance(TWO_MINUTES * 2);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      login.unmount();

      resetSignInInviteForTests();
      renderAt("/room/ABC123");
      advance(TWO_MINUTES * 2);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("does nothing in a build where accounts are not connected", () => {
      flags.configured = false;
      renderAt();

      advance(TWO_MINUTES * 2);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("does not guess before the session check has finished", () => {
      useAuthStore.setState({ ready: false });
      renderAt();

      advance(TWO_MINUTES * 2);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("what it says", () => {
    beforeEach(() => {
      renderAt();
      advance(TWO_MINUTES);
    });

    it("speaks about family and friends, and the benefits that are really true", () => {
      expect(screen.getByRole("heading", { name: /your table is waiting/i })).toBeInTheDocument();
      expect(screen.getByText(/your own room, one link away/i)).toBeInTheDocument();
      // Numbers come from the shared constants, so they cannot drift from what is paid.
      expect(screen.getByText(/5,000 welcome coins/i)).toBeInTheDocument();
      expect(screen.getByText(/free 100 every 4 hours/i)).toBeInTheDocument();
      expect(screen.getByText(/your wins travel with you/i)).toBeInTheDocument();
    });

    it("says plainly what it takes from Google, and links the privacy notice", () => {
      expect(screen.getByText(/only receive your name and email from google/i)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /privacy/i })).toHaveAttribute("href", "/privacy");
    });

    it("offers a no-pressure way out in plain words", () => {
      expect(screen.getByRole("button", { name: /maybe later/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
    });
  });

  describe("what it does", () => {
    it("starts Google sign-in from the main button", () => {
      renderAt();
      advance(TWO_MINUTES);

      fireEvent.click(screen.getByRole("button", { name: /continue with google/i }));

      expect(withGoogle).toHaveBeenCalledTimes(1);
    });

    it("does not start Google sign-in twice while it is already opening", () => {
      mockUseSignUp.mockReturnValue(signUpState({ loading: true }));
      renderAt();
      advance(TWO_MINUTES);

      fireEvent.click(screen.getByRole("button", { name: /opening google/i }));

      expect(withGoogle).not.toHaveBeenCalled();
    });

    it("shows the reason when Google could not be opened", () => {
      mockUseSignUp.mockReturnValue(signUpState({ error: "Google sign-in isn't connected in this build." }));
      renderAt();
      advance(TWO_MINUTES);

      expect(screen.getByRole("alert")).toHaveTextContent(/isn't connected/i);
    });

    it("sends email sign-ups to the sign-up page and sign-ins to the login page", () => {
      renderAt();
      advance(TWO_MINUTES);

      expect(screen.getByRole("link", { name: /sign up with email/i })).toHaveAttribute("href", "/signup");
      expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute("href", "/login");
    });

    it("closes on Maybe later, and does not come back this visit", () => {
      renderAt();
      advance(TWO_MINUTES);

      fireEvent.click(screen.getByRole("button", { name: /maybe later/i }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      advance(TWO_MINUTES * 5);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("closes on Escape", () => {
      renderAt();
      advance(TWO_MINUTES);

      fireEvent.keyDown(document, { key: "Escape" });

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
