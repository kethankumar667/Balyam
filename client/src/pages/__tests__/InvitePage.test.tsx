import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import InvitePage from "../InvitePage";

const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("../../store/authStore", () => ({ useAuthStore: (select: (s: { isMember: boolean }) => unknown) => select({ isMember: false }) }));
vi.mock("../../hooks/useReferralProgress", () => ({ useReferralProgress: () => ({ error: null, notice: null, retry: vi.fn() }) }));
vi.mock("../../lib/referrals", () => ({ referralRequest: mocks.request, REFERRAL_INTENT_KEY: "bhalyam.referral.intent", pendingReferralIntent: () => localStorage.getItem("bhalyam.referral.intent") }));
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
