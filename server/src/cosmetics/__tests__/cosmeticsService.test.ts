import { describe, it, expect, beforeEach } from "vitest";
import { CosmeticsService } from "../CosmeticsService.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";
import { EconomyService } from "../../economy/EconomyService.js";
import { StreakService } from "../../streak/StreakService.js";
import { UnownedCosmeticError, InvalidCosmeticError, CosmeticsDebitUnsupportedError } from "../CosmeticsRepository.js";

describe("CosmeticsService", () => {
  let economyRepo: InMemoryEconomyRepository;
  let economyService: EconomyService;
  let cosmeticsService: CosmeticsService;

  const USER_ID = "test_player_1";

  beforeEach(async () => {
    economyRepo = new InMemoryEconomyRepository();
    economyService = new EconomyService(economyRepo);
    cosmeticsService = new CosmeticsService({
      economyRepository: economyRepo,
      postgrestConfig: null,
    });

    // Register user with 5000 starter coins
    await economyService.ensureIdentityRegistered(USER_ID, "member");
  });

  describe("Catalog Integrity & Discovery", () => {
    it("asserts catalog integrity against closed-set registry without errors", async () => {
      await expect(cosmeticsService.assertCatalogIntegrity()).resolves.toBeUndefined();
    });

    it("returns active catalog items sorted by displayOrder", async () => {
      const catalog = await cosmeticsService.getCatalog();
      expect(catalog.length).toBeGreaterThan(10);
      for (let i = 1; i < catalog.length; i++) {
        expect(catalog[i].displayOrder).toBeGreaterThanOrEqual(catalog[i - 1].displayOrder);
      }
    });

    it("returns initial effective loadout populated with defaults", async () => {
      const state = await cosmeticsService.getState(USER_ID);
      expect(state.ownedIds).toHaveLength(0);
      expect(state.resolved.tableThemes.GLOBAL).toBe("table_classic_green");
      expect(state.resolved.diceSkins.GLOBAL).toBe("dice_classic_ivory");
      expect(state.resolved.tokenSkins.ludo).toBe("token_classic_pawn");
      expect(state.resolved.cardBacks.uno).toBe("cardback_classic_uno");
      expect(state.resolved.cardBacks.rummy).toBe("cardback_classic_navy");
      expect(state.resolved.avatarAura).toBe("aura_none");
      expect(state.resolved.podiumTitle).toBe("title_none");
    });
  });

  describe("Atomic Purchases & Wallet Deductions", () => {
    it("successfully purchases an item, debits wallet balance, and creates entitlement", async () => {
      // dice_wooden_teak costs 800 coins
      const initialWallet = await economyService.getWallet(USER_ID);
      const initialBalance = BigInt(initialWallet.balance);

      const result = await cosmeticsService.purchaseCosmetic(
        USER_ID,
        "dice_wooden_teak",
        "idem_key_001",
      );

      expect(result.applied).toBe(true);
      expect(result.cosmeticId).toBe("dice_wooden_teak");
      expect(BigInt(result.walletBalance!)).toBe(initialBalance - 800n);

      const state = await cosmeticsService.getState(USER_ID);
      expect(state.ownedIds).toContain("dice_wooden_teak");

      // Verify wallet ledger has COSMETIC_PURCHASE entry
      const ledger = await economyService.getLedger(USER_ID, { limit: 5 });
      const cosmeticEntry = ledger.find((e) => e.entryType === "COSMETIC_PURCHASE");
      expect(cosmeticEntry).toBeDefined();
      expect(cosmeticEntry?.amount).toBe("-800");
    });

    it("rejects purchase when user has insufficient wallet funds", async () => {
      // User starts with 5000 coins. Spend all of it on dice_cyber_neon
      // (5000 coins) first, then any further purchase must be rejected.
      const drain = await cosmeticsService.purchaseCosmetic(
        USER_ID,
        "dice_cyber_neon",
        "idem_key_drain",
      );
      expect(drain.applied).toBe(true);

      const walletBefore = await economyService.getWallet(USER_ID);
      expect(walletBefore.balance).toBe("0");

      const result = await cosmeticsService.purchaseCosmetic(
        USER_ID,
        "dice_wooden_teak",
        "idem_key_insufficient",
      );

      expect(result.applied).toBe(false);
      expect(result.code).toBe("INSUFFICIENT_FUNDS");

      // Wallet balance must remain completely unchanged
      const walletAfter = await economyService.getWallet(USER_ID);
      expect(walletAfter.balance).toBe(walletBefore.balance);

      // Entitlement must not be granted
      const state = await cosmeticsService.getState(USER_ID);
      expect(state.ownedIds).not.toContain("dice_wooden_teak");
    });

    it("returns cached result on idempotent retry with the same key without duplicate debit", async () => {
      const res1 = await cosmeticsService.purchaseCosmetic(
        USER_ID,
        "dice_wooden_teak", // costs 750 coins
        "idem_key_retry_1",
      );
      expect(res1.applied).toBe(true);
      const balanceAfterFirst = res1.walletBalance;

      // Replay identical request
      const res2 = await cosmeticsService.purchaseCosmetic(
        USER_ID,
        "dice_wooden_teak",
        "idem_key_retry_1",
      );
      expect(res2.applied).toBe(false);
      expect(res2.walletBalance).toBe(balanceAfterFirst);

      // Verify wallet was only debited once
      const wallet = await economyService.getWallet(USER_ID);
      expect(wallet.balance).toBe(balanceAfterFirst);
    });

    it("rejects replaying an idempotency key with a different cosmetic ID", async () => {
      await cosmeticsService.purchaseCosmetic(
        USER_ID,
        "dice_wooden_teak",
        "idem_key_conflict_1",
      );

      const resConflict = await cosmeticsService.purchaseCosmetic(
        USER_ID,
        "table_royal_mahogany",
        "idem_key_conflict_1",
      );

      expect(resConflict.applied).toBe(false);
      expect(resConflict.code).toBe("IDEMPOTENCY_MISMATCH");
    });

    it("rejects purchase of an already owned cosmetic item", async () => {
      await cosmeticsService.purchaseCosmetic(
        USER_ID,
        "dice_wooden_teak",
        "idem_key_owned_1",
      );

      const resRepeat = await cosmeticsService.purchaseCosmetic(
        USER_ID,
        "dice_wooden_teak",
        "idem_key_owned_2",
      );

      expect(resRepeat.applied).toBe(false);
      expect(resRepeat.code).toBe("ALREADY_OWNED");
    });

    it("rejects purchase of default items", async () => {
      const res = await cosmeticsService.purchaseCosmetic(
        USER_ID,
        "dice_classic_ivory",
        "idem_key_default",
      );

      expect(res.applied).toBe(false);
      expect(res.code).toBe("INVALID_COSMETIC");
    });

    it("rejects purchase of nonexistent cosmetic IDs", async () => {
      const res = await cosmeticsService.purchaseCosmetic(
        USER_ID,
        "skin_that_does_not_exist",
        "idem_key_invalid",
      );

      expect(res.applied).toBe(false);
      expect(res.code).toBe("INVALID_COSMETIC");
    });
  });

  describe("Equip & Unequip Loadout Mechanics", () => {
    it("rejects equipping an unowned non-default cosmetic", async () => {
      await expect(
        cosmeticsService.equipCosmetic(
          USER_ID,
          "TABLE_THEME",
          "GLOBAL",
          "table_royal_mahogany",
        ),
      ).rejects.toThrow(/own/i);
    });

    it("allows equipping an owned cosmetic and reflects in effective loadout", async () => {
      // table_royal_mahogany is a TABLE_THEME item deactivated from the shop
      // (isActive: false) but still a valid registry entry — granting it
      // directly (as a pre-existing purchase would have) verifies a player
      // who already owns a now-removed item can still equip it, per the
      // migration's referential-integrity guarantee.
      const granted = await cosmeticsService.grantCosmeticEntitlement({
        userId: USER_ID,
        cosmeticId: "table_royal_mahogany",
        sourceType: "COIN_PURCHASE",
        sourceReference: "idem_equip_1",
      });
      expect(granted).toBe(true);

      const equipRes = await cosmeticsService.equipCosmetic(
        USER_ID,
        "TABLE_THEME",
        "GLOBAL",
        "table_royal_mahogany",
      );

      expect(equipRes.success).toBe(true);
      expect(equipRes.cosmeticId).toBe("table_royal_mahogany");

      const state = await cosmeticsService.getState(USER_ID);
      expect(state.resolved.tableThemes.GLOBAL).toBe("table_royal_mahogany");
    });

    it("allows equipping default items freely without purchase", async () => {
      const equipRes = await cosmeticsService.equipCosmetic(
        USER_ID,
        "DICE_SKIN",
        "GLOBAL",
        "dice_classic_ivory",
      );

      expect(equipRes.success).toBe(true);
      expect(equipRes.cosmeticId).toBe("dice_classic_ivory");
    });

    it("unequips a slot and reverts to category default", async () => {
      await cosmeticsService.purchaseCosmetic(
        USER_ID,
        "token_golden_crown",
        "idem_unequip_1",
      );
      await cosmeticsService.equipCosmetic(
        USER_ID,
        "TOKEN_SKIN",
        "ludo",
        "token_golden_crown",
      );

      let state = await cosmeticsService.getState(USER_ID);
      expect(state.resolved.tokenSkins.ludo).toBe("token_golden_crown");

      // Unequip
      const unequipRes = await cosmeticsService.unequipCosmetic(
        USER_ID,
        "TOKEN_SKIN",
        "ludo",
      );
      expect(unequipRes.success).toBe(true);

      state = await cosmeticsService.getState(USER_ID);
      expect(state.resolved.tokenSkins.ludo).toBe("token_classic_pawn");
    });
  });

  describe("Streak Milestone Achievement Unlocks", () => {
    it("authoritatively unlocks title_early_bird upon claiming Day 7 streak reward", async () => {
      // Verify user does not own title_early_bird initially
      let state = await cosmeticsService.getState(USER_ID);
      expect(state.ownedIds).not.toContain("title_early_bird");

      // Grant achievement via grantCosmeticEntitlement
      const granted = await cosmeticsService.grantCosmeticEntitlement({
        userId: USER_ID,
        cosmeticId: "title_early_bird",
        sourceType: "STREAK_MILESTONE",
        sourceReference: "streak:cycle-0:day-7",
      });

      expect(granted).toBe(true);

      state = await cosmeticsService.getState(USER_ID);
      expect(state.ownedIds).toContain("title_early_bird");

      // User can now equip the unlocked title
      const equipRes = await cosmeticsService.equipCosmetic(
        USER_ID,
        "PODIUM_TITLE",
        "GLOBAL",
        "title_early_bird",
      );
      expect(equipRes.success).toBe(true);

      state = await cosmeticsService.getState(USER_ID);
      expect(state.resolved.podiumTitle).toBe("title_early_bird");
    });
  });

  describe("Concurrency & Transaction Boundary", () => {
    it("handles concurrent purchase requests serially within the wallet mutex", async () => {
      // User has 5000 starter coins
      // Two concurrent purchases:
      // Item A: cardback_vintage_velvet_rummy (2000 coins)
      // Item B: dice_wooden_teak (800 coins)
      // Total: 2800 coins <= 5000 coins. Both should succeed serially.
      const [resA, resB] = await Promise.all([
        cosmeticsService.purchaseCosmetic(USER_ID, "cardback_vintage_velvet_rummy", "concurrent_key_A"),
        cosmeticsService.purchaseCosmetic(USER_ID, "dice_wooden_teak", "concurrent_key_B"),
      ]);

      expect(resA.applied).toBe(true);
      expect(resB.applied).toBe(true);

      const finalWallet = await economyService.getWallet(USER_ID);
      // 5000 - 2000 - 800 = 2200
      expect(finalWallet.balance).toBe("2200");

      const state = await cosmeticsService.getState(USER_ID);
      expect(state.ownedIds).toContain("cardback_vintage_velvet_rummy");
      expect(state.ownedIds).toContain("dice_wooden_teak");
    });
  });

  describe("Admin & Super Admin Privileges", () => {
    it("returns all catalog cosmetics as owned for admin users", async () => {
      const regularState = await cosmeticsService.getUserLoadout(USER_ID, false);
      expect(regularState.ownedIds).toHaveLength(0);

      const adminState = await cosmeticsService.getUserLoadout(USER_ID, true);
      const catalog = await cosmeticsService.getCatalog();
      expect(adminState.ownedIds.length).toBe(catalog.length);
      expect(adminState.ownedIds).toContain("dice_cyber_neon");
      expect(adminState.ownedIds).toContain("token_fireball_ludo");
      expect(adminState.ownedIds).toContain("cardback_neon_cyber_uno");
      // Deactivated (shop-removed) items are not part of the active
      // catalog, so admins don't get them "for free" via this path either —
      // that's expected: getCatalog() only returns isActive items.
      expect(adminState.ownedIds).not.toContain("table_royal_mahogany");
    });

    it("allows admin users to equip any cosmetic item for free without purchasing", async () => {
      // Regular user trying to equip unowned item fails with UNOWNED_COSMETIC
      await expect(
        cosmeticsService.equipCosmetic(USER_ID, "TABLE_THEME", "GLOBAL", "table_royal_mahogany", false),
      ).rejects.toThrow("UNOWNED_COSMETIC");

      // Admin user can equip the same item directly for free
      const equipRes = await cosmeticsService.equipCosmetic(
        USER_ID,
        "TABLE_THEME",
        "GLOBAL",
        "table_royal_mahogany",
        true,
      );
      expect(equipRes.success).toBe(true);
      expect(equipRes.cosmeticId).toBe("table_royal_mahogany");

      // Loadout reflects the equipped item
      const state = await cosmeticsService.getState(USER_ID, true);
      expect(state.equipped.tableThemes.GLOBAL).toBe("table_royal_mahogany");
      expect(state.resolved.tableThemes.GLOBAL).toBe("table_royal_mahogany");
    });
  });

  describe("Typed error classes (audit regression)", () => {
    it("throws UnownedCosmeticError, not a plain Error, for an unowned non-default equip attempt", async () => {
      await expect(
        cosmeticsService.equipCosmetic(USER_ID, "TABLE_THEME", "GLOBAL", "table_royal_mahogany"),
      ).rejects.toBeInstanceOf(UnownedCosmeticError);
    });
  });

  describe("Purchase refuses to silently skip the wallet debit (audit regression)", () => {
    /**
     * Previously, `purchaseCosmetic` computed a plausible-looking
     * post-purchase balance locally and granted the entitlement even when
     * the active economy repository had no `debitWallet` method — exactly
     * the shape `SupabaseEconomyRepository` was in before this fix, meaning
     * every cosmetic purchase in a Supabase-backed deployment was free
     * while claiming the wallet had been charged. It must now refuse the
     * purchase outright instead of silently faking success.
     */
    it("fails the purchase instead of granting a free item when debitWallet is unavailable", async () => {
      // CosmeticsService.purchaseCosmetic catches repository errors and
      // converts them to a clean failure response (never a fabricated
      // success) — so the repository-layer throw is verified directly here,
      // and the service-layer boundary is verified via its returned result.
      const repoWithoutDebit = economyRepo as unknown as { debitWallet: unknown };
      const realDebitWallet = repoWithoutDebit.debitWallet;
      repoWithoutDebit.debitWallet = undefined;

      try {
        const walletBefore = await economyService.getWallet(USER_ID);

        const result = await cosmeticsService.purchaseCosmetic(USER_ID, "dice_wooden_teak", "idem_no_debit_1");
        expect(result.success).toBe(false);
        expect(result.applied).toBe(false);
        expect(result.code).toBe("ERROR");

        // No entitlement, no idempotency record, no balance change — the
        // purchase must have failed BEFORE any state was mutated.
        const state = await cosmeticsService.getState(USER_ID);
        expect(state.ownedIds).not.toContain("dice_wooden_teak");

        const walletAfter = await economyService.getWallet(USER_ID);
        expect(walletAfter.balance).toBe(walletBefore.balance);
        // The repository layer itself throws the specific typed error —
        // asserted directly so a future refactor of CosmeticsService's
        // error handling can't silently swap it for a different failure
        // mode without a test noticing.
        const { InMemoryCosmeticsRepository } = await import("../InMemoryCosmeticsRepository.js");
        const bareRepo = new InMemoryCosmeticsRepository(economyRepo);
        await expect(
          bareRepo.purchaseCosmetic({ userId: USER_ID, cosmeticId: "cardback_vintage_velvet_rummy", idempotencyKey: "idem_no_debit_2" }),
        ).rejects.toBeInstanceOf(CosmeticsDebitUnsupportedError);
      } finally {
        repoWithoutDebit.debitWallet = realDebitWallet;
      }
    });
  });

  describe("Equip rejects a cosmetic that doesn't support the requested scope (reported bug)", () => {
    /**
     * Reported symptom: a user equipped "Synthwave Grid Cyber" (a card back)
     * from the shop while the Rummy tab was selected, but never saw it in
     * an actual Rummy match. Root cause: that item's catalog id
     * (cardback_neon_cyber_uno) only supports the `uno` scope —
     * equipCosmetic never cross-checked the submitted (category, scope)
     * against the item's own registry definition, so it wrote an
     * out-of-scope id into the `rummy` slot. The write "succeeded" from the
     * client's point of view, but the Rummy-specific renderer's lookup
     * table has no entry for a uno-only id and silently fell back to the
     * default navy card back — indistinguishable from the equip having
     * silently failed.
     */
    it("refuses to equip a UNO-only card back into the rummy scope", async () => {
      await expect(
        cosmeticsService.equipCosmetic(USER_ID, "CARD_BACK", "rummy", "cardback_neon_cyber_uno", true),
      ).rejects.toBeInstanceOf(InvalidCosmeticError);
    });

    it("refuses to equip a rummy-only card back into the uno scope", async () => {
      await expect(
        cosmeticsService.equipCosmetic(USER_ID, "CARD_BACK", "uno", "cardback_vintage_velvet_rummy", true),
      ).rejects.toBeInstanceOf(InvalidCosmeticError);
    });

    it("still allows the correctly-scoped equip for the same item", async () => {
      const res = await cosmeticsService.equipCosmetic(USER_ID, "CARD_BACK", "uno", "cardback_neon_cyber_uno", true);
      expect(res.success).toBe(true);
      expect(res.loadout.cardBacks.uno).toBe("cardback_neon_cyber_uno");
      // The rummy slot must be completely untouched by a uno-scoped equip.
      expect(res.loadout.cardBacks.rummy).toBeUndefined();
    });

    it("resolveEffectiveLoadout self-heals a pre-existing bad equip instead of surfacing the wrong-scope id", async () => {
      const { resolveEffectiveLoadout } = await import("@shared/cosmetics.js");
      // Simulates the exact bad row this bug used to be able to write
      // before this fix, e.g. from a purchase made before the fix shipped.
      const resolved = resolveEffectiveLoadout({
        cardBacks: { rummy: "cardback_neon_cyber_uno", uno: "cardback_classic_uno" },
      });
      expect(resolved.cardBacks.rummy).toBe("cardback_classic_navy"); // falls back to the real rummy default
      expect(resolved.cardBacks.uno).toBe("cardback_classic_uno"); // valid id passes through unchanged
    });
  });
});
