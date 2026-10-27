import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { WalletState } from "../../../hooks/useEconomy";
import type { CoinLedgerEntryRecord } from "../../../lib/economyApi";

const mocks = vi.hoisted(() => ({ wallet: vi.fn(), ledger: vi.fn() }));
vi.mock("../../../hooks/useEconomy", () => ({ useWallet: mocks.wallet, useLedger: mocks.ledger }));
vi.mock("../../../store/authStore", () => ({
  useAuthStore: () => true,
  useIdentityPresentation: () => ({ isVerifiedMember: true, isLocalFallback: false, label: "Member" }),
}));
vi.mock("../../carryover/CarryOverCard", () => ({ CarryOverCard: () => null }));
vi.mock("../../faucet/FaucetClaimRow", () => ({ FaucetClaimRow: () => null }));
vi.mock("../../layout/PlayerIdentityFooter", () => ({ default: () => null }));
vi.mock("../WalletActivityChart", () => ({ WalletActivityChart: () => null }));
import { WalletDrawer } from "../WalletDrawer";

const sourceId = `match:${"a".repeat(160)}`;
const entry: CoinLedgerEntryRecord = {
  id: 9007199254740991, walletId: "fixture-member", entryType: "MATCH_PRIZE_CREDIT",
  amount: "9007199254740993", balanceBefore: "9007199254740993", balanceAfter: "18014398509481986",
  walletVersionBefore: 1, walletVersionAfter: 2, sourceKind: "MATCH", sourceId,
  idempotencyKey: "fixture-entry", description: "x".repeat(200), gameKind: "rummy", createdAt: Date.now(),
};

beforeEach(() => {
  mocks.wallet.mockReturnValue({
    wallet: null, balance: null, status: "unavailable", isLoading: false, error: "Wallet offline",
    correlationId: "fixture-ref", refetch: vi.fn(async () => {}),
  } satisfies WalletState);
  mocks.ledger.mockReturnValue({ entries: [entry], isLoading: false, hasMore: false, error: null, refetch: vi.fn(), loadMore: vi.fn() });
});

describe("wallet drawer state consistency", () => {
  it.each([
    ["1600", "MATCH_PRIZE_CREDIT", "Credit", "+1,600"],
    ["-1000", "ROOM_ENTRY_DEBIT", "Debit", "-1,000"],
    ["9007199254740993", "MATCH_PRIZE_CREDIT", "Credit", "+9,007,199,254,740,993"],
  ])("keeps the full %s coin delta in an unbroken badge", (amount, entryType, direction, formatted) => {
    mocks.ledger.mockReturnValue({
      entries: [{ ...entry, amount, entryType }], isLoading: false, hasMore: false,
      error: null, refetch: vi.fn(), loadMore: vi.fn(),
    });
    render(<WalletDrawer isOpen onClose={vi.fn()} />);
    const badge = screen.getByLabelText(new RegExp(`^${direction} of .* coins$`));
    expect(badge.textContent).toBe(formatted);
    expect(badge.className).toContain("whitespace-nowrap");
    expect(badge.parentElement?.className).not.toContain("break-all");
    expect(badge.parentElement?.parentElement?.className).toContain("shrink-0");
  });

  it("uses readable fixed-dark error ink even in the light theme", () => {
    render(<WalletDrawer isOpen onClose={vi.fn()} />);
    expect(screen.getByText("Wallet Unavailable").parentElement?.className).toContain("text-red-300");
    expect(screen.queryByText("Your wallet balance is 0.")).toBeNull();
  });

  it("leaves source identifiers fully readable instead of truncating the audit detail", async () => {
    render(<WalletDrawer isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Match Prize/ }));
    const dialog = await screen.findByRole("dialog", { name: "Ledger Entry Details" });
    const source = within(dialog).getByText(sourceId);
    expect(source.className).not.toContain("truncate");
    expect(source.closest("[data-ledger-details]")?.className).toContain("[overflow-wrap:anywhere]");
    expect(within(dialog).getByLabelText("18,014,398,509,481,986 coins")).toBeDefined();
  });

  it("closes only the detail dialog on Escape and restores the ledger-row focus", async () => {
    const onClose = vi.fn();
    render(<WalletDrawer isOpen onClose={onClose} />);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close wallet drawer" })));
    const row = screen.getByRole("button", { name: /Match Prize/ });
    row.focus();
    fireEvent.click(row);
    await screen.findByRole("dialog", { name: "Ledger Entry Details" });
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Ledger Entry Details" })).toBeNull());
    expect(onClose).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(row);
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("provides a full-height ledger retry target", () => {
    mocks.ledger.mockReturnValue({ entries: [], isLoading: false, hasMore: false, error: "Ledger offline", refetch: vi.fn(), loadMore: vi.fn() });
    render(<WalletDrawer isOpen onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Retry Ledger" }).className).toContain("min-h-11");
  });
});
