/**
 * BHALYAM — Cosmetic Economy Sink & Aesthetic Customization System
 * Shared closed-set presentation registry, category/scope mappings, loadout shapes, and sanitizers.
 *
 * Inviolable Platform Laws:
 *   - Zero Pay-To-Win: Purely visual presentation. Game engines NEVER inspect, branch on, or import cosmetics.
 *   - Closed-Set Assets: Only vetted string IDs mapped to bundled assets are valid.
 *   - Server Authority: Prices and inventory entitlements verified strictly on server.
 */

export const COSMETIC_CATEGORIES = [
  "TABLE_THEME",
  "DICE_SKIN",
  "TOKEN_SKIN",
  "CARD_BACK",
  "AVATAR_AURA",
  "PODIUM_TITLE",
] as const;
export type CosmeticCategory = (typeof COSMETIC_CATEGORIES)[number];

export type CosmeticGameScope = "GLOBAL" | "uno" | "rummy" | "ludo" | "snl";
export type CosmeticRarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
export type UnlockMethod = "COIN_PURCHASE" | "STREAK_MILESTONE" | "DEFAULT";

/**
 * Immutable structural definition for a cosmetic in the closed-set registry.
 * Bundled code and rendering layers reference this registry.
 */
export interface RegistryCosmeticDef {
  readonly id: string;
  readonly category: CosmeticCategory;
  readonly supportedScopes: readonly CosmeticGameScope[];
  readonly bundledAssetKey: string;
  readonly isDefault: boolean;
}

/**
 * Closed-set registry of all valid cosmetic items in BHALYAM.
 * Any ID outside this registry is treated as invalid and rejected on server ingress.
 */
export const BHALYAM_COSMETIC_REGISTRY: readonly RegistryCosmeticDef[] = [
  // ── Table Themes ──
  {
    id: "table_classic_green",
    category: "TABLE_THEME",
    supportedScopes: ["GLOBAL"],
    bundledAssetKey: "felt-classic-green",
    isDefault: true,
  },
  {
    id: "table_crt_neon_90s",
    category: "TABLE_THEME",
    supportedScopes: ["GLOBAL"],
    bundledAssetKey: "felt-crt-neon",
    isDefault: false,
  },
  {
    id: "table_royal_mahogany",
    category: "TABLE_THEME",
    supportedScopes: ["GLOBAL"],
    bundledAssetKey: "felt-royal-mahogany",
    isDefault: false,
  },
  {
    id: "table_midnight_velvet",
    category: "TABLE_THEME",
    supportedScopes: ["GLOBAL"],
    bundledAssetKey: "felt-midnight-velvet",
    isDefault: false,
  },

  // ── Dice Skins ──
  {
    id: "dice_classic_ivory",
    category: "DICE_SKIN",
    supportedScopes: ["GLOBAL", "ludo", "snl"],
    bundledAssetKey: "dice-classic-ivory",
    isDefault: true,
  },
  {
    id: "dice_wooden_teak",
    category: "DICE_SKIN",
    supportedScopes: ["GLOBAL", "ludo", "snl"],
    bundledAssetKey: "dice-wooden-teak",
    isDefault: false,
  },
  {
    id: "dice_golden_ember",
    category: "DICE_SKIN",
    supportedScopes: ["GLOBAL", "ludo", "snl"],
    bundledAssetKey: "dice-golden-ember",
    isDefault: false,
  },
  {
    id: "dice_cyber_neon",
    category: "DICE_SKIN",
    supportedScopes: ["GLOBAL", "ludo", "snl"],
    bundledAssetKey: "dice-cyber-neon",
    isDefault: false,
  },
  {
    id: "dice_sapphire_frost",
    category: "DICE_SKIN",
    supportedScopes: ["GLOBAL", "ludo", "snl"],
    bundledAssetKey: "dice-sapphire-frost",
    isDefault: false,
  },
  {
    id: "dice_dragon_scale",
    category: "DICE_SKIN",
    supportedScopes: ["GLOBAL", "ludo", "snl"],
    bundledAssetKey: "dice-dragon-scale",
    isDefault: false,
  },
  {
    id: "dice_rosewood_carved",
    category: "DICE_SKIN",
    supportedScopes: ["GLOBAL", "ludo", "snl"],
    bundledAssetKey: "dice-rosewood-carved",
    isDefault: false,
  },
  {
    id: "dice_onyx_noir",
    category: "DICE_SKIN",
    supportedScopes: ["GLOBAL", "ludo", "snl"],
    bundledAssetKey: "dice-onyx-noir",
    isDefault: false,
  },
  {
    id: "dice_brushed_platinum",
    category: "DICE_SKIN",
    supportedScopes: ["GLOBAL", "ludo", "snl"],
    bundledAssetKey: "dice-brushed-platinum",
    isDefault: false,
  },
  {
    id: "dice_white_marble",
    category: "DICE_SKIN",
    supportedScopes: ["GLOBAL", "ludo", "snl"],
    bundledAssetKey: "dice-white-marble",
    isDefault: false,
  },
  {
    id: "dice_electric_indigo",
    category: "DICE_SKIN",
    supportedScopes: ["GLOBAL", "ludo", "snl"],
    bundledAssetKey: "dice-electric-indigo",
    isDefault: false,
  },
  {
    id: "dice_crystal_clear",
    category: "DICE_SKIN",
    supportedScopes: ["GLOBAL", "ludo", "snl"],
    bundledAssetKey: "dice-crystal-clear",
    isDefault: false,
  },
  {
    id: "dice_ruby_glass",
    category: "DICE_SKIN",
    supportedScopes: ["GLOBAL", "ludo", "snl"],
    bundledAssetKey: "dice-ruby-glass",
    isDefault: false,
  },
  {
    id: "dice_azure_glass",
    category: "DICE_SKIN",
    supportedScopes: ["GLOBAL", "ludo", "snl"],
    bundledAssetKey: "dice-azure-glass",
    isDefault: false,
  },
  {
    id: "dice_amethyst_glass",
    category: "DICE_SKIN",
    supportedScopes: ["GLOBAL", "ludo", "snl"],
    bundledAssetKey: "dice-amethyst-glass",
    isDefault: false,
  },
  {
    id: "dice_starlit_obsidian",
    category: "DICE_SKIN",
    supportedScopes: ["GLOBAL", "ludo", "snl"],
    bundledAssetKey: "dice-starlit-obsidian",
    isDefault: false,
  },
  {
    id: "dice_gilded_marble",
    category: "DICE_SKIN",
    supportedScopes: ["GLOBAL", "ludo", "snl"],
    bundledAssetKey: "dice-gilded-marble",
    isDefault: false,
  },
  {
    id: "dice_hammered_gold",
    category: "DICE_SKIN",
    supportedScopes: ["GLOBAL", "ludo", "snl"],
    bundledAssetKey: "dice-hammered-gold",
    isDefault: false,
  },

  // ── Token Skins (Ludo) ──
  {
    id: "token_classic_pawn",
    category: "TOKEN_SKIN",
    supportedScopes: ["ludo"],
    bundledAssetKey: "token-classic-pawn",
    isDefault: true,
  },
  {
    id: "token_golden_crown",
    category: "TOKEN_SKIN",
    supportedScopes: ["ludo"],
    bundledAssetKey: "token-golden-crown",
    isDefault: false,
  },
  {
    id: "token_fireball_ludo",
    category: "TOKEN_SKIN",
    supportedScopes: ["ludo"],
    bundledAssetKey: "token-fireball-ludo",
    isDefault: false,
  },
  {
    id: "token_neon_ring",
    category: "TOKEN_SKIN",
    supportedScopes: ["ludo"],
    bundledAssetKey: "token-neon-ring",
    isDefault: false,
  },
  {
    id: "token_diamond_elite",
    category: "TOKEN_SKIN",
    supportedScopes: ["ludo"],
    bundledAssetKey: "token-diamond-elite",
    isDefault: false,
  },
  {
    id: "token_phoenix_wing",
    category: "TOKEN_SKIN",
    supportedScopes: ["ludo"],
    bundledAssetKey: "token-phoenix-wing",
    isDefault: false,
  },

  // ── Token Skins (Ludo) — premium craftsmanship finishes, 2026-09-15.
  // Each renders in the player's own seat color; see TokenFinishOverlay. ──
  {
    id: "token_finish_polished_pearl",
    category: "TOKEN_SKIN",
    supportedScopes: ["ludo"],
    bundledAssetKey: "token-finish-polished-pearl",
    isDefault: false,
  },
  {
    id: "token_finish_carved_grain",
    category: "TOKEN_SKIN",
    supportedScopes: ["ludo"],
    bundledAssetKey: "token-finish-carved-grain",
    isDefault: false,
  },
  {
    id: "token_finish_matte_noir",
    category: "TOKEN_SKIN",
    supportedScopes: ["ludo"],
    bundledAssetKey: "token-finish-matte-noir",
    isDefault: false,
  },
  {
    id: "token_finish_rose_glass",
    category: "TOKEN_SKIN",
    supportedScopes: ["ludo"],
    bundledAssetKey: "token-finish-rose-glass",
    isDefault: false,
  },
  {
    id: "token_finish_crystal_facet",
    category: "TOKEN_SKIN",
    supportedScopes: ["ludo"],
    bundledAssetKey: "token-finish-crystal-facet",
    isDefault: false,
  },
  {
    id: "token_finish_chrome_mirror",
    category: "TOKEN_SKIN",
    supportedScopes: ["ludo"],
    bundledAssetKey: "token-finish-chrome-mirror",
    isDefault: false,
  },
  {
    id: "token_finish_ice_crystal",
    category: "TOKEN_SKIN",
    supportedScopes: ["ludo"],
    bundledAssetKey: "token-finish-ice-crystal",
    isDefault: false,
  },
  {
    id: "token_finish_veined_marble",
    category: "TOKEN_SKIN",
    supportedScopes: ["ludo"],
    bundledAssetKey: "token-finish-veined-marble",
    isDefault: false,
  },
  {
    id: "token_finish_gem_cut",
    category: "TOKEN_SKIN",
    supportedScopes: ["ludo"],
    bundledAssetKey: "token-finish-gem-cut",
    isDefault: false,
  },
  {
    id: "token_finish_molten_core",
    category: "TOKEN_SKIN",
    supportedScopes: ["ludo"],
    bundledAssetKey: "token-finish-molten-core",
    isDefault: false,
  },
  {
    id: "token_finish_engraved_lattice",
    category: "TOKEN_SKIN",
    supportedScopes: ["ludo"],
    bundledAssetKey: "token-finish-engraved-lattice",
    isDefault: false,
  },
  {
    id: "token_finish_nebula_swirl",
    category: "TOKEN_SKIN",
    supportedScopes: ["ludo"],
    bundledAssetKey: "token-finish-nebula-swirl",
    isDefault: false,
  },
  {
    id: "token_finish_holographic_shift",
    category: "TOKEN_SKIN",
    supportedScopes: ["ludo"],
    bundledAssetKey: "token-finish-holographic-shift",
    isDefault: false,
  },

  // ── Card Backs ──
  {
    id: "cardback_classic_navy",
    category: "CARD_BACK",
    supportedScopes: ["rummy"],
    bundledAssetKey: "cardback-classic-navy",
    isDefault: true,
  },
  {
    id: "cardback_classic_uno",
    category: "CARD_BACK",
    supportedScopes: ["uno"],
    bundledAssetKey: "cardback-classic-uno",
    isDefault: true,
  },
  {
    id: "cardback_vintage_velvet_rummy",
    category: "CARD_BACK",
    supportedScopes: ["rummy"],
    bundledAssetKey: "cardback-vintage-velvet",
    isDefault: false,
  },
  {
    id: "cardback_neon_cyber_uno",
    category: "CARD_BACK",
    supportedScopes: ["uno"],
    bundledAssetKey: "cardback-neon-cyber",
    isDefault: false,
  },
  {
    id: "cardback_royal_sapphire_rummy",
    category: "CARD_BACK",
    supportedScopes: ["rummy"],
    bundledAssetKey: "cardback-royal-sapphire",
    isDefault: false,
  },
  {
    id: "cardback_dragon_ember_uno",
    category: "CARD_BACK",
    supportedScopes: ["uno"],
    bundledAssetKey: "cardback-dragon-ember",
    isDefault: false,
  },

  // ── Card Backs — Rummy Artwork Collection (16, added 2026-09-14) ──
  { id: "cardback_art_deco_noir_rummy", category: "CARD_BACK", supportedScopes: ["rummy"], bundledAssetKey: "/rummy-card-backs/RUMMY1.png", isDefault: false },
  { id: "cardback_sapphire_filigree_rummy", category: "CARD_BACK", supportedScopes: ["rummy"], bundledAssetKey: "/rummy-card-backs/RUMMY2.png", isDefault: false },
  { id: "cardback_crimson_regalia_rummy", category: "CARD_BACK", supportedScopes: ["rummy"], bundledAssetKey: "/rummy-card-backs/RUMMY3.png", isDefault: false },
  { id: "cardback_emerald_damask_rummy", category: "CARD_BACK", supportedScopes: ["rummy"], bundledAssetKey: "/rummy-card-backs/RUMMY4.png", isDefault: false },
  { id: "cardback_violet_lotus_heart_rummy", category: "CARD_BACK", supportedScopes: ["rummy"], bundledAssetKey: "/rummy-card-backs/RUMMY5.png", isDefault: false },
  { id: "cardback_ivory_diamond_crest_rummy", category: "CARD_BACK", supportedScopes: ["rummy"], bundledAssetKey: "/rummy-card-backs/RUMMY6.png", isDefault: false },
  { id: "cardback_teal_lotus_club_rummy", category: "CARD_BACK", supportedScopes: ["rummy"], bundledAssetKey: "/rummy-card-backs/RUMMY7.png", isDefault: false },
  { id: "cardback_blood_ruby_spade_rummy", category: "CARD_BACK", supportedScopes: ["rummy"], bundledAssetKey: "/rummy-card-backs/RUMMY8.png", isDefault: false },
  { id: "cardback_ivory_heart_jewel_rummy", category: "CARD_BACK", supportedScopes: ["rummy"], bundledAssetKey: "/rummy-card-backs/RUMMY9.png", isDefault: false },
  { id: "cardback_golden_tide_rummy", category: "CARD_BACK", supportedScopes: ["rummy"], bundledAssetKey: "/rummy-card-backs/RUMMY10.png", isDefault: false },
  { id: "cardback_ruby_medallion_rummy", category: "CARD_BACK", supportedScopes: ["rummy"], bundledAssetKey: "/rummy-card-backs/RUMMY11.png", isDefault: false },
  { id: "cardback_regal_crimson_spade_rummy", category: "CARD_BACK", supportedScopes: ["rummy"], bundledAssetKey: "/rummy-card-backs/RUMMY12.png", isDefault: false },
  { id: "cardback_midnight_gold_club_rummy", category: "CARD_BACK", supportedScopes: ["rummy"], bundledAssetKey: "/rummy-card-backs/RUMMY13.png", isDefault: false },
  { id: "cardback_obsidian_cross_diamond_rummy", category: "CARD_BACK", supportedScopes: ["rummy"], bundledAssetKey: "/rummy-card-backs/RUMMY14.png", isDefault: false },
  { id: "cardback_amethyst_mandala_spade_rummy", category: "CARD_BACK", supportedScopes: ["rummy"], bundledAssetKey: "/rummy-card-backs/RUMMY15.png", isDefault: false },
  { id: "cardback_emerald_mandala_heart_rummy", category: "CARD_BACK", supportedScopes: ["rummy"], bundledAssetKey: "/rummy-card-backs/RUMMY16.png", isDefault: false },

  // ── Card Backs — UNO Artwork Collection (16, added 2026-09-14) ──
  { id: "cardback_pigment_blast_uno", category: "CARD_BACK", supportedScopes: ["uno"], bundledAssetKey: "/uno-card-backs/UNO1.png", isDefault: false },
  { id: "cardback_golden_eclipse_uno", category: "CARD_BACK", supportedScopes: ["uno"], bundledAssetKey: "/uno-card-backs/UNO2.png", isDefault: false },
  { id: "cardback_retro_blocks_uno", category: "CARD_BACK", supportedScopes: ["uno"], bundledAssetKey: "/uno-card-backs/UNO3.png", isDefault: false },
  { id: "cardback_rainbow_swirl_uno", category: "CARD_BACK", supportedScopes: ["uno"], bundledAssetKey: "/uno-card-backs/UNO4.png", isDefault: false },
  { id: "cardback_action_pack_uno", category: "CARD_BACK", supportedScopes: ["uno"], bundledAssetKey: "/uno-card-backs/UNO5.png", isDefault: false },
  { id: "cardback_neon_vortex_uno", category: "CARD_BACK", supportedScopes: ["uno"], bundledAssetKey: "/uno-card-backs/UNO6.png", isDefault: false },
  { id: "cardback_prism_shatter_uno", category: "CARD_BACK", supportedScopes: ["uno"], bundledAssetKey: "/uno-card-backs/UNO7.png", isDefault: false },
  { id: "cardback_brush_strokes_uno", category: "CARD_BACK", supportedScopes: ["uno"], bundledAssetKey: "/uno-card-backs/UNO8.png", isDefault: false },
  { id: "cardback_hazard_stripes_uno", category: "CARD_BACK", supportedScopes: ["uno"], bundledAssetKey: "/uno-card-backs/UNO9.png", isDefault: false },
  { id: "cardback_emerald_leaf_uno", category: "CARD_BACK", supportedScopes: ["uno"], bundledAssetKey: "/uno-card-backs/UNO10.png", isDefault: false },
  { id: "cardback_deep_blue_vortex_uno", category: "CARD_BACK", supportedScopes: ["uno"], bundledAssetKey: "/uno-card-backs/UNO11.png", isDefault: false },
  { id: "cardback_crimson_vortex_uno", category: "CARD_BACK", supportedScopes: ["uno"], bundledAssetKey: "/uno-card-backs/UNO12.png", isDefault: false },
  { id: "cardback_confetti_shapes_uno", category: "CARD_BACK", supportedScopes: ["uno"], bundledAssetKey: "/uno-card-backs/UNO13.png", isDefault: false },
  { id: "cardback_gilded_swirl_uno", category: "CARD_BACK", supportedScopes: ["uno"], bundledAssetKey: "/uno-card-backs/UNO14.png", isDefault: false },
  { id: "cardback_splash_burst_uno", category: "CARD_BACK", supportedScopes: ["uno"], bundledAssetKey: "/uno-card-backs/UNO15.png", isDefault: false },
  { id: "cardback_neon_streak_uno", category: "CARD_BACK", supportedScopes: ["uno"], bundledAssetKey: "/uno-card-backs/UNO16.png", isDefault: false },

  // ── Avatar Auras ──
  {
    id: "aura_none",
    category: "AVATAR_AURA",
    supportedScopes: ["GLOBAL"],
    bundledAssetKey: "aura-none",
    isDefault: true,
  },
  {
    id: "aura_radiant_vanguard",
    category: "AVATAR_AURA",
    supportedScopes: ["GLOBAL"],
    bundledAssetKey: "aura-radiant-vanguard",
    isDefault: false,
  },
  {
    id: "aura_ludo_king",
    category: "AVATAR_AURA",
    supportedScopes: ["GLOBAL"],
    bundledAssetKey: "aura-ludo-king",
    isDefault: false,
  },
  {
    id: "aura_rummy_maestro",
    category: "AVATAR_AURA",
    supportedScopes: ["GLOBAL"],
    bundledAssetKey: "aura-rummy-maestro",
    isDefault: false,
  },

  // ── Podium Titles ──
  {
    id: "title_none",
    category: "PODIUM_TITLE",
    supportedScopes: ["GLOBAL"],
    bundledAssetKey: "title-none",
    isDefault: true,
  },
  {
    id: "title_early_bird",
    category: "PODIUM_TITLE",
    supportedScopes: ["GLOBAL"],
    bundledAssetKey: "title-early-bird",
    isDefault: false,
  },
  {
    id: "title_table_master",
    category: "PODIUM_TITLE",
    supportedScopes: ["GLOBAL"],
    bundledAssetKey: "title-table-master",
    isDefault: false,
  },
  {
    id: "title_grandmaster",
    category: "PODIUM_TITLE",
    supportedScopes: ["GLOBAL"],
    bundledAssetKey: "title-grandmaster",
    isDefault: false,
  },
] as const;

const REGISTRY_BY_ID = new Map<string, RegistryCosmeticDef>(
  BHALYAM_COSMETIC_REGISTRY.map((def) => [def.id, def]),
);

/**
 * Dynamic catalog record returned from the database / API.
 * Prices are development-only seed values pending economy-team sign-off.
 */
export interface CosmeticCatalogItem {
  id: string;
  category: CosmeticCategory;
  name: string;
  description: string;
  priceCoins: number; // Development seed value
  rarity: CosmeticRarity;
  unlockMethod: UnlockMethod;
  isActive: boolean;
  displayOrder: number;
  requiredMilestone?: string;
}

/**
 * Scoped equipment loadout owned and configured by the player.
 */
export interface EquippedCosmeticsLoadout {
  tableThemes: Partial<Record<CosmeticGameScope, string>>;
  diceSkins: Partial<Record<CosmeticGameScope, string>>;
  tokenSkins: Partial<Record<CosmeticGameScope, string>>;
  cardBacks: Partial<Record<"uno" | "rummy", string>>;
  avatarAura?: string;
  podiumTitle?: string;
}

/**
 * Public, non-private presentation subset broadcast to other players in multiplayer rooms.
 * Zero private wallet balances, inventory, or unequipped cosmetics are ever included.
 */
export interface PublicPresentationLoadout {
  avatarAura?: string;
  podiumTitle?: string;
  tokenSkin?: string;
  diceSkin?: string;
}

/**
 * Fully resolved loadout with safe fallback defaults for every slot.
 */
export interface ResolvedCosmeticsLoadout {
  tableThemes: Record<CosmeticGameScope, string>;
  diceSkins: Record<CosmeticGameScope, string>;
  tokenSkins: Record<CosmeticGameScope, string>;
  cardBacks: Record<"uno" | "rummy", string>;
  avatarAura: string;
  podiumTitle: string;
}

// ── Validation & Sanitization Helpers ──

export function isKnownCosmeticId(id: unknown): id is string {
  return typeof id === "string" && REGISTRY_BY_ID.has(id);
}

export function getRegistryCosmetic(id: string): RegistryCosmeticDef | undefined {
  return REGISTRY_BY_ID.get(id);
}

export function getDefaultCosmetic(
  category: CosmeticCategory,
  scope: CosmeticGameScope = "GLOBAL",
): RegistryCosmeticDef {
  const match = BHALYAM_COSMETIC_REGISTRY.find(
    (item) =>
      item.category === category &&
      item.isDefault &&
      (scope === "GLOBAL" || item.supportedScopes.includes(scope) || item.supportedScopes.includes("GLOBAL")),
  );
  if (match) return match;
  const fallback = BHALYAM_COSMETIC_REGISTRY.find((item) => item.category === category && item.isDefault);
  if (!fallback) {
    throw new Error(`CRITICAL: No default cosmetic defined for category ${category}`);
  }
  return fallback;
}

export function sanitizeCosmeticId(
  id: unknown,
  category?: CosmeticCategory,
  scope?: CosmeticGameScope,
): string | undefined {
  if (!isKnownCosmeticId(id)) return undefined;
  const def = REGISTRY_BY_ID.get(id)!;
  if (category && def.category !== category) return undefined;
  if (scope && scope !== "GLOBAL" && !def.supportedScopes.includes(scope) && !def.supportedScopes.includes("GLOBAL")) {
    return undefined;
  }
  return def.id;
}

/**
 * Sanity bounds for a COIN_PURCHASE item's price, per its declared rarity.
 * Derived from the actual spread of prices already shipped across every
 * active catalog row (see docs/cosmetics/COSMETICS_TAXONOMY.md) — deliberately
 * wide enough to never flag a real, already-approved price, so a violation
 * always means a genuine authoring mistake (e.g. a LEGENDARY item priced
 * like a RARE one), not a false positive against normal pricing variance.
 * DEFAULT and STREAK_MILESTONE items are earned, not priced, and are exempt —
 * see `isPriceWithinRarityBand`.
 */
export const RARITY_PRICE_BANDS: Record<CosmeticRarity, { readonly minCoins: number; readonly maxCoins: number }> = {
  COMMON: { minCoins: 0, maxCoins: 1000 },
  RARE: { minCoins: 1000, maxCoins: 3000 },
  EPIC: { minCoins: 2000, maxCoins: 4500 },
  LEGENDARY: { minCoins: 4000, maxCoins: 11000 },
};

export function isPriceWithinRarityBand(
  item: Pick<CosmeticCatalogItem, "priceCoins" | "rarity" | "unlockMethod">,
): boolean {
  if (item.unlockMethod !== "COIN_PURCHASE") return true;
  const band = RARITY_PRICE_BANDS[item.rarity];
  return item.priceCoins >= band.minCoins && item.priceCoins <= band.maxCoins;
}

export function sanitizeEquippedLoadout(raw: unknown): EquippedCosmeticsLoadout {
  if (!raw || typeof raw !== "object") {
    return {
      tableThemes: {},
      diceSkins: {},
      tokenSkins: {},
      cardBacks: {},
    };
  }

  const obj = raw as Record<string, unknown>;
  const loadout: EquippedCosmeticsLoadout = {
    tableThemes: {},
    diceSkins: {},
    tokenSkins: {},
    cardBacks: {},
  };

  if (obj.tableThemes && typeof obj.tableThemes === "object") {
    for (const [scope, id] of Object.entries(obj.tableThemes as Record<string, unknown>)) {
      const sanitized = sanitizeCosmeticId(id, "TABLE_THEME", scope as CosmeticGameScope);
      if (sanitized) loadout.tableThemes[scope as CosmeticGameScope] = sanitized;
    }
  }

  if (obj.diceSkins && typeof obj.diceSkins === "object") {
    for (const [scope, id] of Object.entries(obj.diceSkins as Record<string, unknown>)) {
      const sanitized = sanitizeCosmeticId(id, "DICE_SKIN", scope as CosmeticGameScope);
      if (sanitized) loadout.diceSkins[scope as CosmeticGameScope] = sanitized;
    }
  }

  if (obj.tokenSkins && typeof obj.tokenSkins === "object") {
    for (const [scope, id] of Object.entries(obj.tokenSkins as Record<string, unknown>)) {
      const sanitized = sanitizeCosmeticId(id, "TOKEN_SKIN", scope as CosmeticGameScope);
      if (sanitized) loadout.tokenSkins[scope as CosmeticGameScope] = sanitized;
    }
  }

  if (obj.cardBacks && typeof obj.cardBacks === "object") {
    const unoBack = sanitizeCosmeticId((obj.cardBacks as Record<string, unknown>).uno, "CARD_BACK", "uno");
    if (unoBack) loadout.cardBacks.uno = unoBack;
    const rummyBack = sanitizeCosmeticId((obj.cardBacks as Record<string, unknown>).rummy, "CARD_BACK", "rummy");
    if (rummyBack) loadout.cardBacks.rummy = rummyBack;
  }

  if (obj.avatarAura) {
    const aura = sanitizeCosmeticId(obj.avatarAura, "AVATAR_AURA", "GLOBAL");
    if (aura) loadout.avatarAura = aura;
  }

  if (obj.podiumTitle) {
    const title = sanitizeCosmeticId(obj.podiumTitle, "PODIUM_TITLE", "GLOBAL");
    if (title) loadout.podiumTitle = title;
  }

  return loadout;
}

export function sanitizePublicPresentation(raw: unknown): PublicPresentationLoadout {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  const publicPresentation: PublicPresentationLoadout = {};

  if (obj.avatarAura) {
    const aura = sanitizeCosmeticId(obj.avatarAura, "AVATAR_AURA", "GLOBAL");
    if (aura) publicPresentation.avatarAura = aura;
  }
  if (obj.podiumTitle) {
    const title = sanitizeCosmeticId(obj.podiumTitle, "PODIUM_TITLE", "GLOBAL");
    if (title) publicPresentation.podiumTitle = title;
  }
  if (obj.tokenSkin) {
    const token = sanitizeCosmeticId(obj.tokenSkin, "TOKEN_SKIN", "ludo");
    if (token) publicPresentation.tokenSkin = token;
  }
  if (obj.diceSkin) {
    const dice = sanitizeCosmeticId(obj.diceSkin, "DICE_SKIN", "GLOBAL");
    if (dice) publicPresentation.diceSkin = dice;
  }

  return publicPresentation;
}

/**
 * Validates `id` against the exact (category, scope) it's about to resolve
 * into before trusting it, falling back otherwise.
 *
 * Without this, `resolveEffectiveLoadout` only checked whether a field was
 * `undefined` — an equipped id that exists in the catalog but for the WRONG
 * scope (e.g. a UNO-only card back written into the `rummy` slot, which
 * `CosmeticsService.equipCosmetic` used to allow) passed straight through
 * as "resolved", even though no rummy-specific renderer recognizes it and
 * silently falls back to the default look. Re-validating here — the one
 * place both the server's `/loadout` response and every client resolver
 * ultimately go through — makes any already-written bad data self-heal on
 * the very next load, instead of staying stuck until someone re-equips by
 * hand.
 */
function sanitizedOrDefault(
  id: string | undefined,
  category: CosmeticCategory,
  scope: CosmeticGameScope,
  fallback: string,
): string {
  if (!id) return fallback;
  return sanitizeCosmeticId(id, category, scope) ?? fallback;
}

export function resolveEffectiveLoadout(
  equipped?: Partial<EquippedCosmeticsLoadout>,
): ResolvedCosmeticsLoadout {
  const defaultTable = getDefaultCosmetic("TABLE_THEME").id;
  const defaultDice = getDefaultCosmetic("DICE_SKIN").id;
  const defaultToken = getDefaultCosmetic("TOKEN_SKIN", "ludo").id;
  const defaultRummyCardBack = getDefaultCosmetic("CARD_BACK", "rummy").id;
  const defaultUnoCardBack = getDefaultCosmetic("CARD_BACK", "uno").id;
  const defaultAura = getDefaultCosmetic("AVATAR_AURA").id;
  const defaultTitle = getDefaultCosmetic("PODIUM_TITLE").id;

  const tableGlobal = sanitizedOrDefault(equipped?.tableThemes?.GLOBAL, "TABLE_THEME", "GLOBAL", defaultTable);

  return {
    tableThemes: {
      GLOBAL: tableGlobal,
      uno: sanitizedOrDefault(equipped?.tableThemes?.uno, "TABLE_THEME", "uno", tableGlobal),
      rummy: sanitizedOrDefault(equipped?.tableThemes?.rummy, "TABLE_THEME", "rummy", tableGlobal),
      ludo: sanitizedOrDefault(equipped?.tableThemes?.ludo, "TABLE_THEME", "ludo", tableGlobal),
      snl: sanitizedOrDefault(equipped?.tableThemes?.snl, "TABLE_THEME", "snl", tableGlobal),
    },
    diceSkins: {
      GLOBAL: sanitizedOrDefault(equipped?.diceSkins?.GLOBAL, "DICE_SKIN", "GLOBAL", defaultDice),
      ludo: sanitizedOrDefault(
        equipped?.diceSkins?.ludo,
        "DICE_SKIN",
        "ludo",
        sanitizedOrDefault(equipped?.diceSkins?.GLOBAL, "DICE_SKIN", "GLOBAL", defaultDice),
      ),
      snl: sanitizedOrDefault(
        equipped?.diceSkins?.snl,
        "DICE_SKIN",
        "snl",
        sanitizedOrDefault(equipped?.diceSkins?.GLOBAL, "DICE_SKIN", "GLOBAL", defaultDice),
      ),
      uno: defaultDice,
      rummy: defaultDice,
    },
    tokenSkins: {
      GLOBAL: sanitizedOrDefault(equipped?.tokenSkins?.GLOBAL, "TOKEN_SKIN", "GLOBAL", defaultToken),
      ludo: sanitizedOrDefault(equipped?.tokenSkins?.ludo, "TOKEN_SKIN", "ludo", defaultToken),
      snl: defaultToken,
      uno: defaultToken,
      rummy: defaultToken,
    },
    cardBacks: {
      uno: sanitizedOrDefault(equipped?.cardBacks?.uno, "CARD_BACK", "uno", defaultUnoCardBack),
      rummy: sanitizedOrDefault(equipped?.cardBacks?.rummy, "CARD_BACK", "rummy", defaultRummyCardBack),
    },
    avatarAura: sanitizedOrDefault(equipped?.avatarAura, "AVATAR_AURA", "GLOBAL", defaultAura),
    podiumTitle: sanitizedOrDefault(equipped?.podiumTitle, "PODIUM_TITLE", "GLOBAL", defaultTitle),
  };
}

// ── Sockets & API DTO Contracts ──

export interface PurchaseCosmeticRequestPayload {
  cosmeticId: string;
  idempotencyKey: string;
}

export interface PurchaseCosmeticResponsePayload {
  success: boolean;
  applied?: boolean;
  code: "PURCHASED" | "ALREADY_OWNED" | "INSUFFICIENT_FUNDS" | "INVALID_COSMETIC" | "IDEMPOTENCY_MISMATCH" | "ERROR";
  message?: string;
  cosmeticId: string;
  walletBalance?: string;
}

export interface RefundCosmeticRequestPayload {
  cosmeticId: string;
  idempotencyKey: string;
}

export interface RefundCosmeticResponsePayload {
  success: boolean;
  applied?: boolean;
  code:
    | "REFUNDED"
    | "NOT_OWNED"
    | "NOT_REFUNDABLE"
    | "WINDOW_EXPIRED"
    | "INVALID_COSMETIC"
    | "IDEMPOTENCY_MISMATCH"
    | "ERROR";
  message?: string;
  cosmeticId: string;
  walletBalance?: string;
}

export interface EquipCosmeticRequestPayload {
  category: CosmeticCategory;
  scope: CosmeticGameScope;
  cosmeticId: string;
}

export interface EquipCosmeticResponsePayload {
  success: boolean;
  category: CosmeticCategory;
  scope: CosmeticGameScope;
  cosmeticId: string;
  loadout: EquippedCosmeticsLoadout;
}

export interface UnequipCosmeticRequestPayload {
  category: CosmeticCategory;
  scope: CosmeticGameScope;
}

export interface UnequipCosmeticResponsePayload {
  success: boolean;
  category: CosmeticCategory;
  scope: CosmeticGameScope;
  loadout: EquippedCosmeticsLoadout;
}

export interface CosmeticsStateResponsePayload {
  catalog: CosmeticCatalogItem[];
  ownedIds: string[];
  equipped: EquippedCosmeticsLoadout;
  resolved: ResolvedCosmeticsLoadout;
}
