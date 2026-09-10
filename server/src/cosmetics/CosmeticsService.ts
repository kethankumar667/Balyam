/**
 * BHALYAM — Cosmetics Service
 * Authoritative business orchestrator for cosmetics catalog, atomic purchases,
 * game-scoped equipment, and achievement grants.
 */

import { logger } from "../lib/logger.js";
import {
  type CosmeticCatalogItem,
  type CosmeticCategory,
  type CosmeticGameScope,
  type CosmeticsStateResponsePayload,
  type EquipCosmeticResponsePayload,
  type PurchaseCosmeticResponsePayload,
  type UnequipCosmeticResponsePayload,
  BHALYAM_COSMETIC_REGISTRY,
  isKnownCosmeticId,
  resolveEffectiveLoadout,
  getDefaultCosmetic,
} from "@shared/cosmetics.js";
import {
  type CosmeticsRepository,
  UnownedCosmeticError,
  InvalidCosmeticError,
} from "./CosmeticsRepository.js";
import { InMemoryCosmeticsRepository } from "./InMemoryCosmeticsRepository.js";
import { SupabaseCosmeticsRepository } from "./SupabaseCosmeticsRepository.js";
import { type EconomyRepository } from "../persistence/EconomyRepository.js";
import { PostgrestClient, readPostgrestConfig, type PostgrestConfig } from "../persistence/postgrest.js";

export interface CosmeticsServiceOptions {
  repository?: CosmeticsRepository;
  economyRepository?: EconomyRepository;
  postgrestConfig?: PostgrestConfig | null;
}

export class CosmeticsService {
  private readonly repository: CosmeticsRepository;

  constructor(options: CosmeticsServiceOptions = {}) {
    if (options.repository) {
      this.repository = options.repository;
    } else if (options.postgrestConfig) {
      const postgrest = new PostgrestClient(options.postgrestConfig);
      this.repository = new SupabaseCosmeticsRepository(postgrest);
    } else if (options.economyRepository) {
      this.repository = new InMemoryCosmeticsRepository(options.economyRepository);
    } else {
      const config = options.postgrestConfig === null ? null : readPostgrestConfig();
      if (config) {
        const postgrest = new PostgrestClient(config);
        this.repository = new SupabaseCosmeticsRepository(postgrest);
      } else {
        throw new Error("CosmeticsService requires either postgrestConfig or economyRepository for in-memory fallback");
      }
    }
  }

  /**
   * Asserts that every active database catalog item exists in the shared closed-set registry.
   */
  async assertCatalogIntegrity(): Promise<void> {
    const catalog = await this.repository.getCatalog();
    for (const item of catalog) {
      if (!isKnownCosmeticId(item.id)) {
        throw new Error(`CATALOG_INTEGRITY_VIOLATION: Database item ${item.id} not in BHALYAM_COSMETIC_REGISTRY`);
      }
    }
  }

  async getCatalog(): Promise<CosmeticCatalogItem[]> {
    return this.repository.getCatalog();
  }

  async getUserLoadout(userId: string, isAdmin = false): Promise<CosmeticsStateResponsePayload> {
    if (!userId || userId.trim().length === 0) {
      const defaultLoadout = resolveEffectiveLoadout({});
      return {
        catalog: await this.getCatalog(),
        ownedIds: [],
        equipped: {
          tableThemes: {},
          diceSkins: {},
          tokenSkins: {},
          cardBacks: {},
        },
        resolved: defaultLoadout,
      };
    }

    const [catalog, ownedIds, equipped] = await Promise.all([
      this.repository.getCatalog(),
      this.repository.getUserEntitlements(userId),
      this.repository.getUserEquipped(userId),
    ]);

    // Admin and super admin have all items in the catalog unlocked for free
    const effectiveOwnedIds = isAdmin ? catalog.map((c) => c.id) : ownedIds;

    const resolved = resolveEffectiveLoadout(equipped);

    return {
      catalog,
      ownedIds: effectiveOwnedIds,
      equipped,
      resolved,
    };
  }

  async getState(userId: string, isAdmin = false): Promise<CosmeticsStateResponsePayload> {
    return this.getUserLoadout(userId, isAdmin);
  }

  async purchaseCosmetic(
    userId: string,
    cosmeticId: string,
    idempotencyKey: string,
  ): Promise<PurchaseCosmeticResponsePayload> {
    if (!userId || userId.trim().length === 0) {
      return {
        success: false,
        applied: false,
        code: "ERROR",
        cosmeticId,
        message: "Authentication required to purchase cosmetics.",
      };
    }

    if (!isKnownCosmeticId(cosmeticId)) {
      return {
        success: false,
        applied: false,
        code: "INVALID_COSMETIC",
        cosmeticId,
        message: `Unknown cosmetic item: ${cosmeticId}`,
      };
    }

    if (!idempotencyKey || idempotencyKey.trim().length === 0) {
      return {
        success: false,
        applied: false,
        code: "ERROR",
        cosmeticId,
        message: "An idempotency key is required.",
      };
    }

    try {
      const result = await this.repository.purchaseCosmetic({
        userId,
        cosmeticId,
        idempotencyKey,
      });

      return {
        success: result.applied,
        applied: result.applied,
        code: result.code,
        cosmeticId: result.cosmeticId,
        walletBalance: result.walletBalance,
        message: result.message,
      };
    } catch (err) {
      logger.error({
        message: `Purchase cosmetic error for ${userId} (item: ${cosmeticId}): ${String(err)}`,
        module: "COSMETICS",
      });
      return {
        success: false,
        applied: false,
        code: "ERROR",
        cosmeticId,
        message: "Purchase failed due to an internal server error.",
      };
    }
  }

  async equipCosmetic(
    userId: string,
    category: CosmeticCategory,
    scope: CosmeticGameScope,
    cosmeticId: string,
    isAdmin = false,
  ): Promise<EquipCosmeticResponsePayload> {
    if (!isKnownCosmeticId(cosmeticId)) {
      throw new InvalidCosmeticError(`${cosmeticId} does not exist.`);
    }

    // Default items and admins are always permissible; non-defaults for regular users require ownership verification
    const defaultDef = getDefaultCosmetic(category, scope);
    if (!isAdmin && cosmeticId !== defaultDef.id) {
      const ownedIds = await this.repository.getUserEntitlements(userId);
      if (!ownedIds.includes(cosmeticId)) {
        throw new UnownedCosmeticError(cosmeticId);
      }
    }

    await this.repository.equipCosmetic(userId, category, scope, cosmeticId, isAdmin);
    const updatedLoadout = await this.repository.getUserEquipped(userId);

    return {
      success: true,
      category,
      scope,
      cosmeticId,
      loadout: updatedLoadout,
    };
  }

  async unequipCosmetic(
    userId: string,
    category: CosmeticCategory,
    scope: CosmeticGameScope,
  ): Promise<UnequipCosmeticResponsePayload> {
    await this.repository.unequipCosmetic(userId, category, scope);
    const updatedLoadout = await this.repository.getUserEquipped(userId);

    return {
      success: true,
      category,
      scope,
      loadout: updatedLoadout,
    };
  }

  /**
   * Authoritatively grants an achievement cosmetic entitlement.
   * Called only by internal systems (such as StreakService).
   */
  async grantCosmeticEntitlement(input: {
    userId: string;
    cosmeticId: string;
    sourceType: string;
    sourceReference: string;
  }): Promise<boolean> {
    try {
      return await this.repository.grantEntitlement(
        input.userId,
        input.cosmeticId,
        input.sourceType,
        input.sourceReference,
      );
    } catch (err) {
      logger.error({
        message: `Failed to grant achievement cosmetic ${input.cosmeticId} to ${input.userId}: ${String(err)}`,
        module: "COSMETICS",
      });
      return false;
    }
  }
}
