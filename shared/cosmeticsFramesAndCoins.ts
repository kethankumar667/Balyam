/**
 * BHALYAM — Avatar Frames and Carrom Coin Sets: identity and commerce data.
 *
 * This file is the single place the 30 items below are written down. The registry in
 * `cosmetics.ts` (identity), the in-memory seed catalog on the server (commerce) and the
 * Supabase migration (commerce, durable) are all derived from, or checked against, these two
 * tables, so a price or a name cannot quietly differ between them. How an item LOOKS lives on
 * the client in `cosmeticsResolver.ts`, keyed by the same ids.
 *
 * Ids are permanent once shipped (see docs/cosmetics/CATALOG_SPECIFICATION.md): an owner's
 * entitlement and equip rows key off the literal string, so to change an item, add a new id and
 * leave the old one in place rather than renaming it.
 *
 * Nothing here is read by a game engine. Both categories are presentation only.
 */

export type ExpansionRarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";

export interface ExpansionCatalogEntry {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** Development seed price, pending economy-team sign-off like every other seed price. */
  readonly priceCoins: number;
  readonly rarity: ExpansionRarity;
  /** Position inside its own category's shelf; the default item is always first. */
  readonly displayOrder: number;
}

/** The "no frame" item. It is the default, free, and never shown as a purchase. */
export const AVATAR_FRAME_DEFAULT_ID = "frame_none";

/** The plain ivory-and-ebony set every player starts with. */
export const CARROM_COIN_SET_DEFAULT_ID = "carromcoin_classic";

/**
 * Fifteen purchasable frames, drawn as rings because every avatar in the product is a circle.
 * Four are plain colour rings so the cheapest shelf still has real choice; the dearer ones add
 * a second ring, a gradient, an ornament, or slow motion (which is switched off for anyone who
 * has asked their device for reduced motion).
 */
export const AVATAR_FRAME_CATALOG: readonly ExpansionCatalogEntry[] = [
  { id: "frame_none", name: "No Frame", description: "Your portrait, uncluttered.", priceCoins: 0, rarity: "COMMON", displayOrder: 10 },
  { id: "frame_marigold_band", name: "Marigold Band", description: "A warm festival-garland ring in marigold gold.", priceCoins: 500, rarity: "COMMON", displayOrder: 20 },
  { id: "frame_saffron_edge", name: "Saffron Edge", description: "A clean saffron outline, bright on any table.", priceCoins: 500, rarity: "COMMON", displayOrder: 30 },
  { id: "frame_kumkum_line", name: "Kumkum Line", description: "A bold kumkum-red ring, easy to spot across a crowded room.", priceCoins: 600, rarity: "COMMON", displayOrder: 40 },
  { id: "frame_peacock_teal", name: "Peacock Teal", description: "A deep teal ring with a green-blue shimmer.", priceCoins: 700, rarity: "COMMON", displayOrder: 50 },
  { id: "frame_indigo_twin", name: "Indigo Twin", description: "Two thin indigo rings with a gap between, like an inlaid border.", priceCoins: 1400, rarity: "RARE", displayOrder: 60 },
  { id: "frame_emerald_twin", name: "Emerald Twin", description: "A double emerald ring with a bright inner edge.", priceCoins: 1500, rarity: "RARE", displayOrder: 70 },
  { id: "frame_rose_gold", name: "Rose Gold", description: "A soft pink-gold gradient that catches the light as the table moves.", priceCoins: 1800, rarity: "RARE", displayOrder: 80 },
  { id: "frame_silver_chrome", name: "Silver Chrome", description: "A polished mirror-silver ring with a sharp highlight.", priceCoins: 2000, rarity: "RARE", displayOrder: 90 },
  { id: "frame_neon_pulse", name: "Neon Pulse", description: "A cyan-magenta ring that breathes with a gentle glow.", priceCoins: 2400, rarity: "RARE", displayOrder: 100 },
  { id: "frame_diwali_lights", name: "Diwali Lights", description: "A ring of tiny festival lights in alternating gold and saffron.", priceCoins: 3000, rarity: "EPIC", displayOrder: 110 },
  { id: "frame_rangoli_stars", name: "Rangoli Stars", description: "A magenta-and-gold ring with four rangoli stars at the corners.", priceCoins: 3200, rarity: "EPIC", displayOrder: 120 },
  { id: "frame_haunted_moon", name: "Haunted Moon", description: "A violet-and-orange ring under a small pale moon.", priceCoins: 3600, rarity: "EPIC", displayOrder: 130 },
  { id: "frame_royal_crown", name: "Royal Crown", description: "A jewelled gold ring crowned with a small royal tiara.", priceCoins: 5000, rarity: "LEGENDARY", displayOrder: 140 },
  { id: "frame_aurora_flow", name: "Aurora Flow", description: "A slowly turning ring of green, blue and violet northern light.", priceCoins: 6000, rarity: "LEGENDARY", displayOrder: 150 },
  { id: "frame_ember_dragon", name: "Ember Dragon", description: "A smouldering red-gold ring with a flame at the crown.", priceCoins: 7500, rarity: "LEGENDARY", displayOrder: 160 },
] as const;

/**
 * Fifteen purchasable coin sets for Carrom. A set restyles every coin on the board, and the
 * queen, as its owner sees them; nobody else's screen changes. Each set is a pair of sides that
 * stay clearly different from each other (checked by a test) because telling your coins from your
 * opponent's is the one thing a coin must never fail at.
 */
export const CARROM_COIN_SET_CATALOG: readonly ExpansionCatalogEntry[] = [
  { id: "carromcoin_classic", name: "Classic Ivory & Ebony", description: "The traditional boxwood-and-ebony set.", priceCoins: 0, rarity: "COMMON", displayOrder: 10 },
  { id: "carromcoin_cream_charcoal", name: "Cream & Charcoal", description: "Soft cream against deep charcoal, with fine grooves.", priceCoins: 500, rarity: "COMMON", displayOrder: 20 },
  { id: "carromcoin_sand_slate", name: "Sand & Slate", description: "Warm desert sand against cool blue slate.", priceCoins: 600, rarity: "COMMON", displayOrder: 30 },
  { id: "carromcoin_mint_plum", name: "Mint & Plum", description: "Fresh mint against ripe plum, ringed in brass.", priceCoins: 800, rarity: "COMMON", displayOrder: 40 },
  { id: "carromcoin_peach_cocoa", name: "Peach & Cocoa", description: "Soft peach against dark cocoa, with a ring of tiny petals.", priceCoins: 700, rarity: "COMMON", displayOrder: 45 },
  { id: "carromcoin_saffron_indigo", name: "Saffron & Indigo", description: "Bright saffron against midnight indigo, with a gold band.", priceCoins: 1400, rarity: "RARE", displayOrder: 50 },
  { id: "carromcoin_lemon_forest", name: "Lemon & Forest", description: "Sunny lemon against forest green with concentric rings.", priceCoins: 1500, rarity: "RARE", displayOrder: 60 },
  { id: "carromcoin_coral_navy", name: "Coral & Navy", description: "Coral pink against deep navy, striped like a seaside awning.", priceCoins: 1800, rarity: "RARE", displayOrder: 70 },
  { id: "carromcoin_pearl_garnet", name: "Pearl & Garnet", description: "Lustrous pearl against deep garnet, studded with dots.", priceCoins: 2000, rarity: "RARE", displayOrder: 80 },
  { id: "carromcoin_ice_ember", name: "Ice & Ember", description: "Frosted ice-blue against glowing ember red.", priceCoins: 2400, rarity: "RARE", displayOrder: 90 },
  { id: "carromcoin_jade_obsidian", name: "Jade & Obsidian", description: "Polished jade against volcanic glass, with a lotus-petal ring.", priceCoins: 3000, rarity: "EPIC", displayOrder: 100 },
  { id: "carromcoin_gold_onyx", name: "Gold & Onyx", description: "Hammered gold against black onyx with a star at the centre.", priceCoins: 3400, rarity: "EPIC", displayOrder: 110 },
  { id: "carromcoin_sunrise_dusk", name: "Sunrise & Dusk", description: "Morning peach against evening violet, chevron-cut.", priceCoins: 3800, rarity: "EPIC", displayOrder: 120 },
  { id: "carromcoin_royal_amethyst", name: "Royal Amethyst", description: "Pale lavender against deep amethyst, jewelled and rimmed in gold.", priceCoins: 5000, rarity: "LEGENDARY", displayOrder: 130 },
  { id: "carromcoin_diamond_ruby", name: "Diamond & Ruby", description: "Faceted diamond-white against deep ruby, checkered like cut stone.", priceCoins: 6200, rarity: "LEGENDARY", displayOrder: 140 },
  { id: "carromcoin_celestial", name: "Celestial", description: "Moonlit silver against midnight, scattered with stars.", priceCoins: 7500, rarity: "LEGENDARY", displayOrder: 150 },
] as const;
