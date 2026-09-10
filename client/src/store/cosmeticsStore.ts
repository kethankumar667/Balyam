/**
 * BHALYAM — Cosmetics Store (Zustand)
 *
 * Client state management for the Cosmetics Boutique:
 * catalog discovery, user entitlements, game-scoped equipment loadouts,
 * preview selection, and atomic purchase/equip mutations.
 *
 * Strictly follows platform tenets:
 * - Decoupled presentation: returns typed action outcomes, zero audio/haptics triggers inside store.
 * - Single source of truth for loadout resolution.
 * - Idempotent purchases with client-generated UUID keys.
 */

import { create } from "zustand";
import {
  type CosmeticCatalogItem,
  type CosmeticCategory,
  type CosmeticGameScope,
  type EquippedCosmeticsLoadout,
  type ResolvedCosmeticsLoadout,
  type CosmeticsStateResponsePayload,
  type PurchaseCosmeticResponsePayload,
  type EquipCosmeticResponsePayload,
  type UnequipCosmeticResponsePayload,
  COSMETIC_CATEGORIES,
  resolveEffectiveLoadout,
  getDefaultCosmetic,
} from "@shared/cosmetics";
import { apiFetch, apiJson } from "../lib/playerIdentity";
import { refreshCurrentWallet } from "../hooks/useEconomy";
import { getSocket } from "../lib/socket";
import { useRoomStore } from "./roomStore";
import { useAuthStore } from "./authStore";

export interface CosmeticsStore {
  // State
  catalog: CosmeticCatalogItem[];
  ownedIds: Set<string>;
  equipped: EquippedCosmeticsLoadout;
  resolved: ResolvedCosmeticsLoadout;
  selectedCategory: CosmeticCategory;
  selectedScope: CosmeticGameScope;
  selectedItemId: string | null;
  isOpen: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  errorMessage: string | null;

  // Actions
  fetchCosmetics: () => Promise<void>;
  openStore: (category?: CosmeticCategory, scope?: CosmeticGameScope) => void;
  closeStore: () => void;
  selectCategory: (category: CosmeticCategory) => void;
  selectScope: (scope: CosmeticGameScope) => void;
  selectItem: (itemId: string | null) => void;
  purchaseItem: (cosmeticId: string) => Promise<PurchaseCosmeticResponsePayload>;
  equipItem: (category: CosmeticCategory, scope: CosmeticGameScope, cosmeticId: string) => Promise<boolean>;
  unequipItem: (category: CosmeticCategory, scope: CosmeticGameScope) => Promise<boolean>;
}

const initialEquipped: EquippedCosmeticsLoadout = {
  tableThemes: {},
  diceSkins: {},
  tokenSkins: {},
  cardBacks: {},
};

function syncRoomCosmetics(resolved: ResolvedCosmeticsLoadout) {
  try {
    const roomState = useRoomStore.getState().roomState;
    if (roomState) {
      const gameScope = (roomState.game as CosmeticGameScope) ?? "GLOBAL";
      getSocket().emit("room:setCosmetics", {
        avatarAura: resolved.avatarAura !== "aura_none" ? resolved.avatarAura : undefined,
        podiumTitle: resolved.podiumTitle !== "title_none" ? resolved.podiumTitle : undefined,
        tokenSkin: resolved.tokenSkins[gameScope] ?? resolved.tokenSkins.GLOBAL,
        diceSkin: resolved.diceSkins[gameScope] ?? resolved.diceSkins.GLOBAL,
      });
    }
  } catch {
    // Socket may not be initialized yet
  }
}

export const useCosmeticsStore = create<CosmeticsStore>((set, get) => ({
  catalog: [],
  ownedIds: new Set<string>(),
  equipped: initialEquipped,
  resolved: resolveEffectiveLoadout(initialEquipped),
  selectedCategory: "DICE_SKIN",
  selectedScope: "GLOBAL",
  selectedItemId: null,
  isOpen: false,
  isLoading: false,
  isSubmitting: false,
  errorMessage: null,

  fetchCosmetics: async () => {
    set({ isLoading: true, errorMessage: null });
    try {
      const data = await apiJson<CosmeticsStateResponsePayload>("/api/cosmetics/loadout");
      const auth = useAuthStore.getState();
      const isAdmin = auth.isAdmin || auth.isSuperAdmin;

      if (data) {
        const catalog = data.catalog || [];
        const ownedIds = isAdmin
          ? new Set(catalog.map((c) => c.id))
          : new Set(data.ownedIds || []);

        set({
          catalog,
          ownedIds,
          equipped: data.equipped || initialEquipped,
          resolved: data.resolved || resolveEffectiveLoadout(data.equipped),
        });
      } else {
        // Fallback: public catalog only
        const catalogOnly = await apiJson<CosmeticCatalogItem[]>("/api/cosmetics/catalog");
        if (catalogOnly) {
          const ownedIds = isAdmin
            ? new Set(catalogOnly.map((c) => c.id))
            : new Set<string>();
          set({ catalog: catalogOnly, ownedIds });
        }
      }
    } catch (err) {
      set({ errorMessage: "Failed to load cosmetics catalog. Please try again." });
    } finally {
      set({ isLoading: false });
    }
  },

  openStore: (category?: CosmeticCategory, scope?: CosmeticGameScope) => {
    const nextCategory = category ?? get().selectedCategory;
    const nextScope = scope ?? "GLOBAL";
    set({
      isOpen: true,
      selectedCategory: nextCategory,
      selectedScope: nextScope,
      errorMessage: null,
    });
    void get().fetchCosmetics();
  },

  closeStore: () => {
    set({ isOpen: false, errorMessage: null });
  },

  selectCategory: (category: CosmeticCategory) => {
    const scope: CosmeticGameScope =
      category === "TOKEN_SKIN"
        ? "ludo"
        : category === "CARD_BACK"
          ? "rummy"
          : "GLOBAL";

    set({
      selectedCategory: category,
      selectedScope: scope,
      selectedItemId: null,
      errorMessage: null,
    });
  },

  selectScope: (scope: CosmeticGameScope) => {
    set({ selectedScope: scope, selectedItemId: null });
  },

  selectItem: (itemId: string | null) => {
    set({ selectedItemId: itemId, errorMessage: null });
  },

  purchaseItem: async (cosmeticId: string): Promise<PurchaseCosmeticResponsePayload> => {
    if (get().isSubmitting) {
      return {
        success: false,
        applied: false,
        code: "ERROR",
        cosmeticId,
        message: "A purchase is currently in progress.",
      };
    }

    set({ isSubmitting: true, errorMessage: null });
    const idempotencyKey = crypto.randomUUID ? crypto.randomUUID() : `purchase_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    try {
      const res = await apiFetch("/api/cosmetics/purchase", {
        method: "POST",
        body: JSON.stringify({ cosmeticId, idempotencyKey }),
      });

      const data = (await res.json()) as PurchaseCosmeticResponsePayload;

      if (data && (data.success || data.code === "PURCHASED" || data.code === "ALREADY_OWNED")) {
        // Update local owned items
        set((state) => {
          const nextOwned = new Set(state.ownedIds);
          nextOwned.add(cosmeticId);
          return { ownedIds: nextOwned };
        });

        // Trigger wallet balance re-fetch across app
        void refreshCurrentWallet();
      } else if (data?.message) {
        set({ errorMessage: data.message });
      }

      return data;
    } catch (err) {
      const errorPayload: PurchaseCosmeticResponsePayload = {
        success: false,
        applied: false,
        code: "ERROR",
        cosmeticId,
        message: "Failed to connect to cosmetics boutique.",
      };
      set({ errorMessage: errorPayload.message });
      return errorPayload;
    } finally {
      set({ isSubmitting: false });
    }
  },

  equipItem: async (
    category: CosmeticCategory,
    scope: CosmeticGameScope,
    cosmeticId: string,
  ): Promise<boolean> => {
    if (get().isSubmitting) return false;

    set({ isSubmitting: true, errorMessage: null });
    try {
      const res = await apiFetch("/api/cosmetics/equip", {
        method: "POST",
        body: JSON.stringify({ category, scope, cosmeticId }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        set({ errorMessage: errorData.message || "Failed to equip cosmetic item." });
        return false;
      }

      const data = (await res.json()) as EquipCosmeticResponsePayload;
      if (data && data.success && data.loadout) {
        const newResolved = resolveEffectiveLoadout(data.loadout);
        set({
          equipped: data.loadout,
          resolved: newResolved,
        });
        syncRoomCosmetics(newResolved);
        return true;
      }

      return false;
    } catch (err) {
      set({ errorMessage: "Network error while equipping cosmetic item." });
      return false;
    } finally {
      set({ isSubmitting: false });
    }
  },

  unequipItem: async (
    category: CosmeticCategory,
    scope: CosmeticGameScope,
  ): Promise<boolean> => {
    if (get().isSubmitting) return false;

    set({ isSubmitting: true, errorMessage: null });
    try {
      const res = await apiFetch("/api/cosmetics/unequip", {
        method: "POST",
        body: JSON.stringify({ category, scope }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        set({ errorMessage: errorData.message || "Failed to restore default cosmetic." });
        return false;
      }

      const data = (await res.json()) as UnequipCosmeticResponsePayload;
      if (data && data.success && data.loadout) {
        const newResolved = resolveEffectiveLoadout(data.loadout);
        set({
          equipped: data.loadout,
          resolved: newResolved,
        });
        syncRoomCosmetics(newResolved);
        return true;
      }

      return false;
    } catch (err) {
      set({ errorMessage: "Network error while restoring default cosmetic." });
      return false;
    } finally {
      set({ isSubmitting: false });
    }
  },
}));
