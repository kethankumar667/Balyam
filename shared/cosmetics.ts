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
