import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { clearAgeAnswer, recordAgeAnswer } from "../../../lib/privacy/ageGate";
import { needsConsent, NOTICE_VERSION, optionalKeys, readConsent, recordConsent, resetConsentSession } from "../../../lib/privacy/consent";
import { useAuthStore } from "../../../store/authStore";
import ConsentModal from "../ConsentModal";

const build = vi.hoisted(() => ({ hasAccounts: true }));

vi.mock("../../../store/authStore", async () => {
  const { create } = await import("zustand");
  return { useAuthStore: create(() => ({ userId: null as string | null, profileReady: true })) };
});
vi.mock("../../../lib/supabase/client", () => ({
  get isSupabaseConfigured() { return build.hasAccounts; },
}));

function renderAt(path = "/") {
  render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ConsentModal />
    </MemoryRouter>,
  );
  act(() => { vi.advanceTimersByTime(650); });
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  resetConsentSession();
  recordAgeAnswer("adult", false);
  build.hasAccounts = true;
  useAuthStore.setState({ userId: null, profileReady: true });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  resetConsentSession();
  vi.useRealTimers();
});

describe("ConsentModal Safety Gateway", () => {
  it("bounds the panel to the padded viewport and scrolls long disclosures inside it", () => {
    renderAt();
    expect(screen.getByRole("dialog", { name: "What BHALYAM keeps" }))
      .toHaveClass("max-h-full", "overflow-y-auto", "overscroll-contain");
  });

  it("uses neutral heading focus and equally styled, unselected consent choices", () => {
    renderAt();
    const dialog = screen.getByRole("dialog", { name: "What BHALYAM keeps" });
    expect(dialog).toHaveClass("safety-gateway");
    expect(screen.getByRole("heading", { name: "What BHALYAM keeps" })).toHaveFocus();
    const allow = screen.getByRole("button", { name: "Allow all" });
    const essential = screen.getByRole("button", { name: "Only what's essential" });
    expect(allow.className).toBe(essential.className);
    expect(allow).not.toHaveAttribute("aria-pressed");
    expect(essential).not.toHaveAttribute("aria-pressed");
    expect(readConsent()).toBeNull();
  });

  it("keeps all disclosures visible in labelled essential and optional sections", () => {
    renderAt();
    expect(within(screen.getByRole("region", { name: "Required for play" })).getByText(/random player id/)).toBeInTheDocument();
    const optional = screen.getByRole("region", { name: "Optional on this device" });
    expect(within(optional).getByText(/sound and language settings/)).toBeInTheDocument();
    expect(within(optional).getByText(/no tracking and no advertising/)).toBeInTheDocument();
    expect(screen.getByText(/including after sign-out/)).toBeInTheDocument();
    expect(screen.getByText(/An account is optional and separate from this choice/)).toBeInTheDocument();
    expect(screen.getByText(/You can change this any time/)).toBeInTheDocument();
  });

  it("waits for the age answer", () => {
    clearAgeAnswer();
    renderAt();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("retains the separate disclosure for a build without accounts", () => {
    build.hasAccounts = false;
    renderAt();
    expect(screen.getByText("There are no accounts in this build at all.")).toBeInTheDocument();
    expect(screen.queryByText(/creating one later asks for an email/)).not.toBeInTheDocument();
  });

  it("waits for member profile recovery", () => {
    useAuthStore.setState({ userId: "member-a", profileReady: false });
    renderAt();
    expect(screen.queryByRole("dialog")).toBeNull();
    act(() => useAuthStore.setState({ profileReady: true }));
    expect(screen.getByRole("heading", { name: "What BHALYAM keeps" })).toHaveFocus();
  });

  it("does not cover the privacy notice page", () => {
    renderAt("/privacy");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(readConsent()).toBeNull();
  });

  it("cannot be answered by Escape or backdrop and locks background scrolling", () => {
    renderAt();
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.mouseDown(screen.getByRole("dialog").parentElement!);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /close/i })).not.toBeInTheDocument();
    expect(readConsent()).toBeNull();
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("contains keyboard focus between the notice link and the final decision", () => {
    renderAt();
    const link = screen.getByRole("link", { name: /Read the full privacy notice/ });
    const essential = screen.getByRole("button", { name: "Only what's essential" });
    link.focus();
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(essential).toHaveFocus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(link).toHaveFocus();
  });

  it("announces the separate privacy notice tab without recording a decision", () => {
    renderAt();
    const link = screen.getByRole("link", { name: /Read the full privacy notice/ });
    expect(link).toHaveAttribute("href", "/privacy");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    link.addEventListener("click", (event) => event.preventDefault());
    link.focus();
    fireEvent.click(link);
    expect(screen.getByRole("status")).toHaveTextContent("Privacy notice opened in a new tab");
    expect(link).toHaveFocus();
    expect(readConsent()).toBeNull();
  });

  it.each([
    ["Allow all", "granted"],
    ["Only what's essential", "essential-only"],
  ] as const)("records %s through the existing consent store", (label, choice) => {
    const key = optionalKeys()[0];
    localStorage.setItem(key, "optional-fixture");
    renderAt();
    fireEvent.click(screen.getByRole("button", { name: label }));
    expect(readConsent()).toMatchObject({ choice, noticeVersion: NOTICE_VERSION });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(localStorage.getItem(key)).toBe(choice === "granted" ? "optional-fixture" : null);
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("records the member acknowledgement without changing the notice version", () => {
    recordConsent("granted");
    useAuthStore.setState({ userId: "member-a" });
    renderAt();
    fireEvent.click(screen.getByRole("button", { name: "Only what's essential" }));
    expect(readConsent()).toMatchObject({ choice: "essential-only", memberIds: ["member-a"], noticeVersion: NOTICE_VERSION });
    expect(needsConsent("member-a")).toBe(false);
    expect(needsConsent("member-b")).toBe(true);
  });

  it("does not ask again after the current member has answered", () => {
    recordConsent("essential-only", new Date(), "member-a");
    useAuthStore.setState({ userId: "member-a" });
    renderAt();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("still completes the decision for this session when storage is refused", () => {
    renderAt();
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => { throw new Error("QuotaExceededError"); });
    fireEvent.click(screen.getByRole("button", { name: "Only what's essential" }));
    expect(needsConsent()).toBe(false);
    expect(readConsent()).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
