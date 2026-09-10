/**
 * BHALYAM — Supabase Cosmetics Persistence Repository
 * Implements CosmeticsRepository against Supabase PostgreSQL via PostgrestClient.
 */

import {
  type CosmeticCatalogItem,
  type CosmeticCategory,
  type CosmeticGameScope,
  type EquippedCosmeticsLoadout,
  getDefaultCosmetic,
} from "@shared/cosmetics.js";
import {
  type CosmeticsRepository,
  type PurchaseCosmeticInput,
  type PurchaseCosmeticResult,
} from "./CosmeticsRepository.js";
import { type PostgrestClient } from "../persistence/postgrest.js";

interface CosmeticCatalogRow {
  id: string;
  category: CosmeticCategory;
  name: string;
  description: string;
  price_coins: number;
  rarity: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
  unlock_method: "COIN_PURCHASE" | "STREAK_MILESTONE" | "DEFAULT";
  is_active: boolean;
  display_order: number;
}

interface UserCosmeticRow {
  cosmetic_id: string;
}

interface UserEquippedRow {
  category: CosmeticCategory;
  game_scope: CosmeticGameScope;
  cosmetic_id: string;
}

export class SupabaseCosmeticsRepository implements CosmeticsRepository {
  constructor(private readonly postgrest: PostgrestClient) {}

  async getCatalog(): Promise<CosmeticCatalogItem[]> {
    const rows = await this.postgrest.select<CosmeticCatalogRow>(
      "cosmetic_catalog",
      "is_active=eq.true&order=display_order.asc",
    );
    return rows.map((r) => ({
      id: r.id,
      category: r.category,
      name: r.name,
      description: r.description,
      priceCoins: Number(r.price_coins),
      rarity: r.rarity,
      unlockMethod: r.unlock_method,
      isActive: r.is_active,
      displayOrder: r.display_order,
    }));
  }

  async getUserEntitlements(userId: string): Promise<string[]> {
    const rows = await this.postgrest.select<UserCosmeticRow>(
      "user_cosmetics",
      `user_id=eq.${encodeURIComponent(userId)}`,
    );
    return rows.map((r) => r.cosmetic_id);
  }

  async getUserEquipped(userId: string): Promise<EquippedCosmeticsLoadout> {
    const rows = await this.postgrest.select<UserEquippedRow>(
      "user_equipped_cosmetics",
      `user_id=eq.${encodeURIComponent(userId)}`,
    );

    const loadout: EquippedCosmeticsLoadout = {
      tableThemes: {},
      diceSkins: {},
      tokenSkins: {},
      cardBacks: {},
    };

    for (const row of rows) {
      if (row.category === "TABLE_THEME") {
        loadout.tableThemes[row.game_scope] = row.cosmetic_id;
      } else if (row.category === "DICE_SKIN") {
        loadout.diceSkins[row.game_scope] = row.cosmetic_id;
      } else if (row.category === "TOKEN_SKIN") {
        loadout.tokenSkins[row.game_scope] = row.cosmetic_id;
      } else if (row.category === "CARD_BACK") {
        if (row.game_scope === "uno" || row.game_scope === "rummy") {
          loadout.cardBacks[row.game_scope] = row.cosmetic_id;
        }
      } else if (row.category === "AVATAR_AURA") {
        loadout.avatarAura = row.cosmetic_id;
      } else if (row.category === "PODIUM_TITLE") {
        loadout.podiumTitle = row.cosmetic_id;
      }
    }

    return loadout;
  }

  async purchaseCosmetic(input: PurchaseCosmeticInput): Promise<PurchaseCosmeticResult> {
    return this.postgrest.rpc<PurchaseCosmeticResult>("purchase_cosmetic_internal", {
      p_user_id: input.userId,
      p_cosmetic_id: input.cosmeticId,
      p_idempotency_key: input.idempotencyKey,
    });
  }

  async equipCosmetic(
    userId: string,
    category: CosmeticCategory,
    scope: CosmeticGameScope,
    cosmeticId: string,
    _isAdmin = false,
  ): Promise<void> {
    const defaultItem = getDefaultCosmetic(category, scope);
    if (cosmeticId === defaultItem.id) {
      // Restoring default: remove the row
      await this.unequipCosmetic(userId, category, scope);
      return;
    }

    await this.postgrest.upsert(
      "user_equipped_cosmetics",
      [
        {
          user_id: userId,
          category,
          game_scope: scope,
          cosmetic_id: cosmeticId,
          equipped_at: new Date().toISOString(),
        },
      ],
      "user_id,category,game_scope",
    );
  }

  async unequipCosmetic(
    userId: string,
    category: CosmeticCategory,
    scope: CosmeticGameScope,
  ): Promise<void> {
    await this.postgrest.delete(
      "user_equipped_cosmetics",
      `user_id=eq.${encodeURIComponent(userId)}&category=eq.${encodeURIComponent(category)}&game_scope=eq.${encodeURIComponent(scope)}`,
    );
  }

  async grantEntitlement(
    userId: string,
    cosmeticId: string,
    sourceType: string,
    sourceReference: string,
  ): Promise<boolean> {
    const res = await this.postgrest.rpc<{ success: boolean }>("grant_cosmetic_entitlement", {
      p_user_id: userId,
      p_cosmetic_id: cosmeticId,
      p_source_type: sourceType,
      p_source_reference: sourceReference,
    });
    return res?.success ?? false;
  }
}
