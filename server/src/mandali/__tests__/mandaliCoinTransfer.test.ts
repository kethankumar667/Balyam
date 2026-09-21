import { describe, it, expect, beforeEach } from "vitest";
import { MandaliRepository } from "../MandaliRepository.js";
import { MandaliService } from "../MandaliService.js";

describe("Mandali Coin Transfers & Clan Economy", () => {
  let repository: MandaliRepository;
  let service: MandaliService;

  beforeEach(() => {
    repository = new MandaliRepository();
    service = new MandaliService(repository);
  });

  it("allows active members to send coins to each other", async () => {
    // Both members exist in default seed mandali_ludo_kings (ownerId: p_rajesh_ludo, member: p_sai_kittu)
    const result = await service.transferCoins("mandali_ludo_kings", "p_rajesh_ludo", {
      toPlayerId: "p_sai_kittu",
      amount: 150,
      type: "SEND",
      note: "Prize for Ludo victory!",
    });

    expect(result.success).toBe(true);
    expect(result.transfer).toBeDefined();
    expect(result.transfer?.amount).toBe(150);
    expect(result.transfer?.type).toBe("SEND");
    expect(result.transfer?.status).toBe("COMPLETED");
    expect(result.transfer?.fromPlayerName).toBe("Rajesh Maharajah");

    // History check
    const transfers = service.getCoinTransfers("mandali_ludo_kings");
    expect(transfers.length).toBeGreaterThanOrEqual(1);
    expect(transfers[0].amount).toBe(150);
  });

  it("allows active members to request coins from each other", async () => {
    const result = await service.transferCoins("mandali_ludo_kings", "p_sai_kittu", {
      toPlayerId: "p_rajesh_ludo",
      amount: 75,
      type: "REQUEST",
      note: "Need entry fee for squad match",
    });

    expect(result.success).toBe(true);
    expect(result.transfer?.type).toBe("REQUEST");
    expect(result.transfer?.status).toBe("PENDING");
    expect(result.transfer?.amount).toBe(75);
  });

  it("refuses coin transfers to oneself", async () => {
    const result = await service.transferCoins("mandali_ludo_kings", "p_rajesh_ludo", {
      toPlayerId: "p_rajesh_ludo",
      amount: 100,
      type: "SEND",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Cannot transfer coins to yourself");
  });

  it("refuses transfers from non-members or non-active members", async () => {
    const result = await service.transferCoins("mandali_ludo_kings", "stranger_1", {
      toPlayerId: "p_rajesh_ludo",
      amount: 50,
      type: "SEND",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("must be an active member");
  });

  it("refuses invalid transfer amounts", async () => {
    const result = await service.transferCoins("mandali_ludo_kings", "p_rajesh_ludo", {
      toPlayerId: "p_sai_kittu",
      amount: -25,
      type: "SEND",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("must be a positive integer");
  });
});
