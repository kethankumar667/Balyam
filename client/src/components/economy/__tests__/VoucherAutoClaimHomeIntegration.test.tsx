import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BhalyamHome from "../../../pages/BhalyamHome";
import { savePendingVoucher, getPendingVoucher, getPendingVouchers, clearPendingVoucher } from "../pendingVoucher";
import { useAuthStore } from "../../../store/authStore";

// Mock socket
vi.mock("../../../lib/socket", () => ({
  getSocket: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connected: true,
  })),
  getApiBaseUrl: vi.fn(() => "http://localhost:3000"),
}));

describe("Voucher Auto-Claim Post-Signup Home Flow", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    clearPendingVoucher();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    clearPendingVoucher();
  });

  it("automatically opens VoucherRedemptionModal on BhalyamHome when member lands with a pending voucher", async () => {
    // 1. Simulate guest user who won a match voucher and clicked 'Claim Coins'
    savePendingVoucher("VOUCH-CHAMP-888", "350");
    expect(getPendingVoucher()?.code).toBe("VOUCH-CHAMP-888");

    // 2. User successfully signs up and becomes a member
    useAuthStore.setState({
      isMember: true,
      kind: "member",
      email: "champ@example.com",
    });

    // Mock voucher endpoints
    global.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if (url.includes("/api/economy/vouchers/VOUCH-CHAMP-888")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            voucher: {
              status: "ACTIVE",
              coinAmount: "350",
            },
          }),
        } as Response);
      }
      if (url.includes("/api/economy/vouchers/redeem") && opts?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            applied: true,
            voucher: {
              id: 99,
              codeHash: "hash99",
              coinAmount: "350",
              status: "REDEEMED",
            },
            newBalance: "1350",
          }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);
    });

    // 3. Render BhalyamHome
    render(
      <MemoryRouter initialEntries={["/"]}>
        <BhalyamHome />
      </MemoryRouter>,
    );

    // 4. Verify the modal opens automatically with attractive and celebratory phrasing
    await waitFor(() => {
      expect(screen.getByText("Claim Your Match Coins!")).toBeDefined();
      expect(screen.getByText("✨ Welcome to BHALYAM Club")).toBeDefined();
      expect(screen.getByText("VOUCH-CHAMP-888")).toBeDefined();
      expect(screen.getByText("Auto-filled")).toBeDefined();
    });

    // 5. Verify auto-verification of the voucher
    await waitFor(() => {
      expect(screen.getByText("VERIFIED")).toBeDefined();
      expect(screen.getByText("350")).toBeDefined();
    });

    // 6. Next and only user action: clicking 'Claim Coins'
    const claimButton = screen.getByRole("button", { name: /claim coins/i });
    expect(claimButton).toBeDefined();
    fireEvent.click(claimButton);

    // 7. Verify celebratory success screen and wallet update
    await waitFor(() => {
      expect(screen.getByText("🎉 Coins Added to Wallet!")).toBeDefined();
      expect(screen.getByText("Let's Play!")).toBeDefined();
    });

    // 8. Pending storage should be cleared
    expect(getPendingVoucher()).toBeNull();

    // Reset auth store
    useAuthStore.setState({ isMember: false, kind: "guest", email: null });
  });

  it("queues a second unclaimed voucher instead of losing it, and auto-claims it right after the first", async () => {
    // 1. Guest wins TWICE before signing up — the exact flow that used to
    // silently drop the first voucher the moment the second was saved.
    savePendingVoucher("VOUCH-FIRST-111", "100");
    savePendingVoucher("VOUCH-SECOND-222", "200");
    expect(getPendingVouchers().map((v) => v.code)).toEqual([
      "VOUCH-FIRST-111",
      "VOUCH-SECOND-222",
    ]);

    // 2. Signs up and becomes a member
    useAuthStore.setState({ isMember: true, kind: "member", email: "twowins@example.com" });

    global.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if (url.includes("/api/economy/vouchers/VOUCH-FIRST-111")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ voucher: { status: "ACTIVE", coinAmount: "100" } }),
        } as Response);
      }
      if (url.includes("/api/economy/vouchers/VOUCH-SECOND-222")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ voucher: { status: "ACTIVE", coinAmount: "200" } }),
        } as Response);
      }
      if (url.includes("/api/economy/vouchers/redeem") && opts?.method === "POST") {
        const body = JSON.parse(String(opts.body ?? "{}")) as { code?: string };
        const redeemed = body.code === "VOUCH-FIRST-111"
          ? { coinAmount: "100", newBalance: "1100" }
          : { coinAmount: "200", newBalance: "1300" };
        return Promise.resolve({
          ok: true,
          json: async () => ({
            applied: true,
            voucher: { id: 1, codeHash: "hash", coinAmount: redeemed.coinAmount, status: "REDEEMED" },
            newBalance: redeemed.newBalance,
          }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => ({ success: true }) } as Response);
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <BhalyamHome />
      </MemoryRouter>,
    );

    // 3. First voucher shows and verifies
    await waitFor(() => {
      expect(screen.getByText("VOUCH-FIRST-111")).toBeDefined();
    });
    await waitFor(() => {
      expect(screen.getByText("VERIFIED")).toBeDefined();
    });

    // 4. Claim it
    fireEvent.click(screen.getByRole("button", { name: /claim coins/i }));
    await waitFor(() => {
      expect(screen.getByText("🎉 Coins Added to Wallet!")).toBeDefined();
    });

    // 5. The SECOND voucher must still be in the queue — this is the bug:
    // it used to be gone the moment the first was saved over it.
    expect(getPendingVouchers().map((v) => v.code)).toEqual(["VOUCH-SECOND-222"]);

    // 6. Dismissing the first's success screen reveals the second automatically
    fireEvent.click(screen.getByText("Let's Play!"));
    await waitFor(() => {
      expect(screen.getByText("VOUCH-SECOND-222")).toBeDefined();
    });
    await waitFor(() => {
      expect(screen.getByText("VERIFIED")).toBeDefined();
    });

    // 7. Claim the second one too
    fireEvent.click(screen.getByRole("button", { name: /claim coins/i }));
    await waitFor(() => {
      expect(screen.getByText("🎉 Coins Added to Wallet!")).toBeDefined();
    });

    // 8. Both are gone once both are claimed
    expect(getPendingVouchers()).toEqual([]);

    useAuthStore.setState({ isMember: false, kind: "guest", email: null });
  });
});
