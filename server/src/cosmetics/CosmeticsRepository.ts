/**
 * BHALYAM — Cosmetics Persistence Repository Interface
 * Defines the contract for catalog reads, user entitlement queries,
 * atomic purchases, game-scoped equipment, and achievement grants.
 */

import {
  type CosmeticCatalogItem,
  type CosmeticCategory,
  type CosmeticGameScope,
  type EquippedCosmeticsLoadout,
} from "@shared/cosmetics.js";

/** Equip was requested for a cosmetic the caller does not own and is not a default. */
export class UnownedCosmeticError extends Error {
  constructor(public readonly cosmeticId: string) {
    super(`UNOWNED_COSMETIC: You do not own ${cosmeticId}.`);
    this.name = "UnownedCosmeticError";
  }
}

/** A category/scope/cosmeticId combination that does not exist in the catalog. */
export class InvalidCosmeticError extends Error {
  constructor(message: string) {
    super(`INVALID_COSMETIC: ${message}`);
    this.name = "InvalidCosmeticError";
  }
}

/**
 * The active `EconomyRepository` has no `debitWallet` implementation.
 * `debitWallet` is optional on `EconomyRepository` (Supabase's atomic
 * `purchase_cosmetic_internal` RPC never needs it — it debits inside the
 * same transaction as the entitlement grant), but `InMemoryCosmeticsRepository`
 * calls it directly to move real coins. A purchase used to silently
 * compute a plausible-looking "new balance" for the response without ever
 * persisting the debit when this method was missing — granting the item for
 * free while claiming the wallet had been charged. Refusing the purchase
 * outright is the only safe behavior once that path is reached at all.
 */
export class CosmeticsDebitUnsupportedError extends Error {
  constructor(identityId: string) {
    super(
      `COSMETICS_DEBIT_UNSUPPORTED: the active economy repository has no debitWallet for ${identityId} — refusing to grant a cosmetic without an authoritative coin debit.`,
    );
    this.name = "CosmeticsDebitUnsupportedError";
  }
}

export interface PurchaseCosmeticInput {
  userId: string;
  cosmeticId: string;
  idempotencyKey: string;
}

export interface PurchaseCosmeticResult {
  applied: boolean;
  code: "PURCHASED" | "ALREADY_OWNED" | "INSUFFICIENT_FUNDS" | "INVALID_COSMETIC" | "IDEMPOTENCY_MISMATCH" | "ERROR";
  cosmeticId: string;
  walletBalance?: string;
  message?: string;
}

export interface CosmeticsRepository {
  /** Retrieves all active items in the cosmetic catalog */
  getCatalog(): Promise<CosmeticCatalogItem[]>;

  /** Retrieves non-default cosmetic item IDs owned by this user */
  getUserEntitlements(userId: string): Promise<string[]>;

  /** Retrieves game-scoped equipped loadout for this user */
  getUserEquipped(userId: string): Promise<EquippedCosmeticsLoadout>;

  /**
   * Executes atomic cosmetic purchase:
   * verifies catalog & price, checks account-scoped idempotency,
   * validates non-frozen wallet balance, debits wallet, writes ledger,
   * stores persistent entitlement and purchase record.
   */
  purchaseCosmetic(input: PurchaseCosmeticInput): Promise<PurchaseCosmeticResult>;

  /** Equips a cosmetic into a (category, game_scope) slot */
  equipCosmetic(
    userId: string,
    category: CosmeticCategory,
    scope: CosmeticGameScope,
    cosmeticId: string,
    isAdmin?: boolean,
  ): Promise<void>;

  /** Restores default for a (category, game_scope) slot by removing the equipped row */
  unequipCosmetic(
    userId: string,
    category: CosmeticCategory,
    scope: CosmeticGameScope,
  ): Promise<void>;

  /**
   * Authoritatively grants an achievement cosmetic entitlement (e.g. daily streak milestone).
   * Called only by internal server services.
   */
  grantEntitlement(
    userId: string,
    cosmeticId: string,
    sourceType: string,
    sourceReference: string,
  ): Promise<boolean>;
}
