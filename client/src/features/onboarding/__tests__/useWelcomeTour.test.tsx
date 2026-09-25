import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { recordConsent } from "../../../lib/privacy/consent";
import { journeyTracker } from "../PlayerJourneyTracker";
import { useWelcomeTour } from "../useWelcomeTour";

const ONBOARDING_KEY = "bhalyam.onboarding.state";
const AUTO_OPEN_MS = 1500;

describe("welcome tour: when it appears", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    sessionStorage.clear();
    journeyTracker.reset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens by itself once, a moment after the privacy question is answered", () => {
    recordConsent("granted");
    const { result } = renderHook(() => useWelcomeTour());

    expect(result.current.open).toBe(false);
    act(() => {
      vi.advanceTimersByTime(AUTO_OPEN_MS);
    });
    expect(result.current.open).toBe(true);
  });

  it("does not come back on a reload or a return to Home in the same visit", () => {
    recordConsent("granted");
    const first = renderHook(() => useWelcomeTour());
    act(() => {
      vi.advanceTimersByTime(AUTO_OPEN_MS);
    });
    expect(first.result.current.open).toBe(true);
    first.unmount();

    // A fresh mount is what a reload (or navigating back to Home) produces.
    const second = renderHook(() => useWelcomeTour());
    act(() => {
      vi.advanceTimersByTime(AUTO_OPEN_MS * 2);
    });
    expect(second.result.current.open).toBe(false);
    // ...but the way back stays on the page.
    expect(second.result.current.showPrompt).toBe(true);
  });

  it("waits while the privacy question is still open, then does not stack a second dialog on it", () => {
    const { result } = renderHook(() => useWelcomeTour());
    act(() => {
      vi.advanceTimersByTime(AUTO_OPEN_MS * 3);
    });
    expect(result.current.open).toBe(false);
    expect(result.current.showPrompt).toBe(false);

    recordConsent("granted");
    // The poll notices the answer, then the dialog waits its own moment before appearing.
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    act(() => {
      vi.advanceTimersByTime(AUTO_OPEN_MS);
    });
    expect(result.current.open).toBe(true);
  });

  it("never interrupts someone who chose 'Only what's essential'; offers a quiet prompt instead", () => {
    recordConsent("essential-only");
    const { result } = renderHook(() => useWelcomeTour());
    act(() => {
      vi.advanceTimersByTime(AUTO_OPEN_MS * 3);
    });
    expect(result.current.open).toBe(false);
    expect(result.current.showPrompt).toBe(true);

    act(() => result.current.start());
    expect(result.current.open).toBe(true);
  });

  it("'Not now' hides the prompt for the rest of the visit", () => {
    recordConsent("essential-only");
    const first = renderHook(() => useWelcomeTour());
    act(() => first.result.current.dismissPrompt());
    expect(first.result.current.showPrompt).toBe(false);
    first.unmount();

    const second = renderHook(() => useWelcomeTour());
    expect(second.result.current.showPrompt).toBe(false);
  });

  it("stays away once the tour is finished", () => {
    recordConsent("granted");
    journeyTracker.markWelcomeComplete();
    const { result } = renderHook(() => useWelcomeTour());
    act(() => {
      vi.advanceTimersByTime(AUTO_OPEN_MS * 3);
    });
    expect(result.current.open).toBe(false);
    expect(result.current.showPrompt).toBe(false);
  });

  it("does not open over something the person is already doing", () => {
    recordConsent("granted");
    const { result } = renderHook(() => useWelcomeTour({ suppressed: true }));
    act(() => {
      vi.advanceTimersByTime(AUTO_OPEN_MS * 3);
    });
    expect(result.current.open).toBe(false);
    expect(result.current.showPrompt).toBe(false);
  });
});

describe("welcome tour: where its 'seen' mark is kept", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    journeyTracker.reset();
  });

  it("is kept on the device for someone who has not opted out", () => {
    recordConsent("granted");
    journeyTracker.markWelcomeComplete();
    expect(JSON.parse(localStorage.getItem(ONBOARDING_KEY) ?? "{}").hasCompletedWelcome).toBe(true);
  });

  it("is kept only for the tab session after 'Only what's essential', never in localStorage", () => {
    recordConsent("essential-only");
    journeyTracker.markWelcomeComplete();

    expect(localStorage.getItem(ONBOARDING_KEY)).toBeNull();
    expect(JSON.parse(sessionStorage.getItem(ONBOARDING_KEY) ?? "{}").hasCompletedWelcome).toBe(true);
  });
});
