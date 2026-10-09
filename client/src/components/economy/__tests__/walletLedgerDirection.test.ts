import { describe, it, expect } from "vitest";
import { mapEntryToDeltaType } from "../WalletDrawer";

describe("wallet ledger direction", () => {
  it("shows a Mandali send as a debit — the sender's coins went out", () => {
    expect(mapEntryToDeltaType("P2P_TRANSFER_SEND", "-100")).toEqual({ type: "DEBIT", label: "Coins Sent" });
  });

  it("shows a Mandali receive as a credit", () => {
    expect(mapEntryToDeltaType("P2P_TRANSFER_RECEIVE", "100")).toEqual({ type: "CREDIT", label: "Coins Received" });
  });

  it("does not let the entry type override the ledger's sign for types it has never heard of", () => {
    expect(mapEntryToDeltaType("SOME_FUTURE_SPEND", "-40").type).toBe("DEBIT");
    expect(mapEntryToDeltaType("SOME_FUTURE_GRANT", "40").type).toBe("CREDIT");
  });

  it("keeps the existing types unchanged", () => {
    expect(mapEntryToDeltaType("ROOM_ENTRY_DEBIT", "-50").type).toBe("DEBIT");
    expect(mapEntryToDeltaType("MATCH_PRIZE_CREDIT", "200").type).toBe("CREDIT");
    expect(mapEntryToDeltaType("MATCH_REFUND", "50").type).toBe("REFUND");
  });

  it("labels a free-coins claim as an Hourly Reward, not a generic Adjustment", () => {
    expect(mapEntryToDeltaType("ADMIN_ADJUSTMENT", "100", "system:hourly_faucet")).toEqual({
      type: "CREDIT",
      label: "Hourly Reward",
    });
  });

  it("keeps the Adjustment label for a real admin top-up", () => {
    expect(mapEntryToDeltaType("ADMIN_ADJUSTMENT", "100", "admin_42")).toEqual({ type: "CREDIT", label: "Adjustment" });
    expect(mapEntryToDeltaType("ADMIN_ADJUSTMENT", "100")).toEqual({ type: "CREDIT", label: "Adjustment" });
  });
});
