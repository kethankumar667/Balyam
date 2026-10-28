import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ReferralCodePrompt, { resetReferralPromptMemo } from "../ReferralCodePrompt";

const mocks = vi.hoisted(() => ({
  overview: vi.fn(),
  redeem: vi.fn(),
  check: vi.fn(),
  welcome: vi.fn(),
  meta: vi.fn(),
  clearMeta: vi.fn(),
}));

vi.mock("../../../store/authStore", async () => {
  const { create } = await import("zustand");
  return { useAuthStore: create(() => ({ userId: "member-a" as string | null, isMember: true })) };
});
vi.mock("../../../lib/economyApi", () => ({ getMemberWelcomeStatus: () => mocks.welcome() }));
vi.mock("../../../lib/referrals", async importOriginal => ({
  ...await importOriginal<typeof import("../../../lib/referrals")>(),
  fetchReferralOverview: () => mocks.overview(),
  redeemReferralCode: (code: string) => mocks.redeem(code),
  checkReferralCode: (code: string) => mocks.check(code),
  metadataReferralCode: () => mocks.meta(),
  clearMetadataReferralCode: () => mocks.clearMeta(),
}));

const campaign = { inviterBonus: 2000, inviteeBonus: 2000, windowDays: 30, rollingCap: 10, capWindowDays: 30, codeWindowDays: 7, target: 3 };
const dialog = () => screen.queryByRole("dialog");

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorage.clear();
  resetReferralPromptMemo();
  mocks.overview.mockResolvedValue({ canEnterCode: true, campaign });
  mocks.welcome.mockResolvedValue({ pending: true, amount: "5000" });
  mocks.check.mockResolvedValue({ valid: true });
  mocks.redeem.mockResolvedValue({ ok: true });
  mocks.meta.mockResolvedValue(null);
  mocks.clearMeta.mockResolvedValue(undefined);
});

describe("ReferralCodePrompt", () => {
  it("steps aside, without a dialog, for a member who cannot add a code", async () => {
    mocks.overview.mockResolvedValue({ canEnterCode: false, campaign });
    const onFinished = vi.fn();
    render(<ReferralCodePrompt onFinished={onFinished} />);
    await waitFor(() => expect(onFinished).toHaveBeenCalledOnce());
    expect(dialog()).not.toBeInTheDocument();
  });

  it("never interrupts when the server cannot be asked", async () => {
    mocks.overview.mockRejectedValue(new Error("down"));
    const onFinished = vi.fn();
    render(<ReferralCodePrompt onFinished={onFinished} />);
    await waitFor(() => expect(onFinished).toHaveBeenCalledOnce());
    expect(dialog()).not.toBeInTheDocument();
  });

  it("does not nag a member whose welcome has already been given", async () => {
    mocks.welcome.mockResolvedValue({ pending: false, amount: "0" });
    const onFinished = vi.fn();
    render(<ReferralCodePrompt onFinished={onFinished} />);
    await waitFor(() => expect(onFinished).toHaveBeenCalledOnce());
    expect(dialog()).not.toBeInTheDocument();
  });

  it("asks a brand-new member, and adds the code they type", async () => {
    const onFinished = vi.fn();
    render(<ReferralCodePrompt onFinished={onFinished} />);
    expect(await screen.findByRole("dialog", { name: /did a friend invite you/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/your friend's code/i), { target: { value: "bhalyam-k7m2p" } });
    await screen.findByText(/that code works/i);
    fireEvent.click(screen.getByRole("button", { name: /add code/i }));

    expect(await screen.findByRole("dialog", { name: /code added/i })).toBeInTheDocument();
    expect(mocks.redeem).toHaveBeenCalledWith("BHALYAM-K7M2P");
    expect(onFinished).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(onFinished).toHaveBeenCalledOnce();
  });

  it("lets the member skip, and forgets any code that was carried over", async () => {
    localStorage.setItem("bhalyam.referral.code", "not-a-code");
    const onFinished = vi.fn();
    render(<ReferralCodePrompt onFinished={onFinished} />);
    fireEvent.click(await screen.findByRole("button", { name: /not now/i }));
    expect(onFinished).toHaveBeenCalledOnce();
    expect(localStorage.getItem("bhalyam.referral.code")).toBeNull();
    expect(dialog()).not.toBeInTheDocument();
  });

  it("applies a code remembered from sign-up without asking again, then forgets it", async () => {
    localStorage.setItem("bhalyam.referral.code", "BHALYAM-K7M2P");
    render(<ReferralCodePrompt />);
    expect(await screen.findByRole("dialog", { name: /code added/i })).toBeInTheDocument();
    expect(mocks.redeem).toHaveBeenCalledWith("BHALYAM-K7M2P");
    expect(localStorage.getItem("bhalyam.referral.code")).toBeNull();
  });

  it("applies the code typed at sign-up on another device, from the account, and clears that copy", async () => {
    mocks.meta.mockResolvedValue("BHALYAM-K7M2P");
    render(<ReferralCodePrompt />);
    expect(await screen.findByRole("dialog", { name: /code added/i })).toBeInTheDocument();
    expect(mocks.redeem).toHaveBeenCalledWith("BHALYAM-K7M2P");
    expect(mocks.clearMeta).toHaveBeenCalledOnce();
  });

  it("prefers the code on this device over the one stored with the account", async () => {
    mocks.meta.mockResolvedValue("BHALYAM-ZZZZZ");
    localStorage.setItem("bhalyam.referral.code", "BHALYAM-K7M2P");
    render(<ReferralCodePrompt />);
    await screen.findByRole("dialog", { name: /code added/i });
    expect(mocks.redeem).toHaveBeenCalledWith("BHALYAM-K7M2P");
  });

  it("applies a remembered code even when the welcome was already given", async () => {
    mocks.welcome.mockResolvedValue({ pending: false, amount: "0" });
    localStorage.setItem("bhalyam.referral.code", "BHALYAM-K7M2P");
    render(<ReferralCodePrompt />);
    expect(await screen.findByRole("dialog", { name: /code added/i })).toBeInTheDocument();
  });

  it("drops a refused remembered code, says why, and lets the member correct it", async () => {
    mocks.redeem.mockResolvedValueOnce({ ok: false, code: "TOO_LATE" });
    localStorage.setItem("bhalyam.referral.code", "BHALYAM-K7M2P");
    render(<ReferralCodePrompt />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/first 7 days/i);
    expect(localStorage.getItem("bhalyam.referral.code")).toBeNull();
    expect(screen.getByLabelText(/your friend's code/i)).toHaveValue("BHALYAM-K7M2P");
  });

  it("asks the server only once per visit, however often it is re-mounted", async () => {
    const first = vi.fn();
    const { unmount } = render(<ReferralCodePrompt onFinished={first} />);
    fireEvent.click(await screen.findByRole("button", { name: /not now/i }));
    unmount();

    const second = vi.fn();
    render(<ReferralCodePrompt onFinished={second} />);
    await act(async () => { await Promise.resolve(); });
    expect(second).toHaveBeenCalledOnce();
    expect(mocks.overview).toHaveBeenCalledOnce();
  });
});
