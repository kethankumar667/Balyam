import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import InvitePage from "../InvitePage";

const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("../../store/authStore", () => ({ useAuthStore: (select: (s: { isMember: boolean }) => unknown) => select({ isMember: false }) }));
vi.mock("../../hooks/useReferralProgress", () => ({ useReferralProgress: () => ({ error: null, notice: null, retry: vi.fn() }) }));
vi.mock("../../lib/referrals", () => ({
  referralRequest: mocks.request,
  REFERRAL_INTENT_KEY: "bhalyam.referral.intent",
  pendingReferralIntent: () => localStorage.getItem("bhalyam.referral.intent"),
  rememberReferralCode: (code: string) => localStorage.setItem("bhalyam.referral.code", code),
}));
const code = "00000000-0000-4000-8000-000000000001";
function AnotherInvite() {
  const navigate = useNavigate();
  return <button onClick={() => navigate("/invite/00000000-0000-4000-8000-000000000002")}>Another invitation</button>;
}
function open(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><AnotherInvite /><Routes><Route path="/invite/:code" element={<InvitePage />} /></Routes></MemoryRouter>);
}
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  mocks.request.mockImplementation((path: string) => Promise.resolve(path === "/accept" ? { token: "signed-intent", expiresAt: Date.now() + 10000 } : { valid: true }));
});
describe("explicit referral acceptance", () => {
  it("previews without creating an identity or storing anything; acceptance is deliberate", async () => {
    open(`/invite/${code}`);
    fireEvent.click(await screen.findByRole("button", { name: /accept invitation/i }));
    expect(mocks.request).toHaveBeenNthCalledWith(1, `/invite/${code}`, undefined, true);
    await waitFor(() => expect(localStorage.getItem("bhalyam.referral.intent")).toBe("signed-intent"));
    expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute("href", "/signup");
    expect(mocks.request).toHaveBeenCalledWith("/accept", { code }, true);
  });
  it("checks a short BHALYAM code publicly and remembers it only after the visitor accepts", async () => {
    open("/invite/BHALYAM-K7M2P");
    fireEvent.click(await screen.findByRole("button", { name: /accept invitation/i }));
    expect(mocks.request).toHaveBeenCalledWith("/code/BHALYAM-K7M2P", undefined, true);
    expect(mocks.request).not.toHaveBeenCalledWith("/accept", expect.anything(), true);
    await waitFor(() => expect(localStorage.getItem("bhalyam.referral.code")).toBe("BHALYAM-K7M2P"));
    expect(localStorage.getItem("bhalyam.referral.intent")).toBeNull();
    expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute("href", "/signup");
  });
  it("normalises a lower-case short code in the link", async () => {
    open("/invite/bhalyam-k7m2p");
    await screen.findByRole("button", { name: /accept invitation/i });
    expect(mocks.request).toHaveBeenCalledWith("/code/BHALYAM-K7M2P", undefined, true);
  });
  it("tells the visitor what both sides get and what the friend can see", async () => {
    open(`/invite/${code}`);
    await screen.findByRole("button", { name: /accept invitation/i });
    expect(screen.getByText(/each get 2,000 coins/i)).toBeInTheDocument();
    expect(screen.getByText(/display name and whether you have played/i)).toBeInTheDocument();
  });
  it("refuses a link that is neither a code nor a private invitation", async () => {
    open("/invite/not-a-code");
    expect(await screen.findByRole("alert")).toHaveTextContent(/no longer available/i);
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it("does not call a bare completion URL an accepted invitation", async () => {
    open("/invite/complete");
    expect(await screen.findByRole("alert")).toHaveTextContent(/no accepted invitation/i);
    expect(screen.queryByText(/invitation accepted/i)).not.toBeInTheDocument();
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it("captures an OAuth handoff without creating a new guest", async () => {
    open("/invite/complete?intent=oauth-signed-intent");
    await waitFor(() => expect(localStorage.getItem("bhalyam.referral.intent")).toBe("oauth-signed-intent"));
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it("requires a fresh acceptance when changing invitation links", async () => {
    open(`/invite/${code}`);
    fireEvent.click(await screen.findByRole("button", { name: /accept invitation/i }));
    await screen.findByRole("link", { name: "Create account" });
    fireEvent.click(screen.getByRole("button", { name: "Another invitation" }));
    expect(await screen.findByRole("button", { name: /accept invitation/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Create account" })).not.toBeInTheDocument();
  });
});
