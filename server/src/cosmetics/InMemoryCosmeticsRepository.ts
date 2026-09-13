/**
 * BHALYAM — In-Memory Cosmetics Persistence Repository
 * Deterministic single-process simulation for development and testing.
 * Wraps purchases in an atomic per-user mutex boundary matching Supabase RPC semantics.
 */

import {
  type CosmeticCatalogItem,
  type CosmeticCategory,
  type CosmeticGameScope,
  type EquippedCosmeticsLoadout,
  BHALYAM_COSMETIC_REGISTRY,
  isKnownCosmeticId,
  getDefaultCosmetic,
} from "@shared/cosmetics.js";
import {
  type CosmeticsRepository,
  type PurchaseCosmeticInput,
  type PurchaseCosmeticResult,
  UnownedCosmeticError,
  InvalidCosmeticError,
  CosmeticsDebitUnsupportedError,
} from "./CosmeticsRepository.js";
import {
  type EconomyRepository,
} from "../persistence/EconomyRepository.js";

class KeyedMutex {
  private readonly tails = new Map<string, Promise<void>>();

  async runExclusive<T>(key: string, fn: () => Promise<T> | T): Promise<T> {
    const previousTail = this.tails.get(key) ?? Promise.resolve();
    let release!: () => void;
    const myTail = new Promise<void>((resolve) => {
      release = resolve;
    });
    const chained = previousTail.then(() => myTail);
    this.tails.set(key, chained);

    await previousTail;
    try {
      return await fn();
    } finally {
      release();
      if (this.tails.get(key) === chained) {
        this.tails.delete(key);
      }
    }
  }
}

// Development seed catalog data (pending economy-team approval)
//
// Tables, Auras, and Titles are deliberately deactivated (isActive: false)
// rather than removed: each category's DEFAULT item (table_classic_green /
// aura_none / title_none) stays active because getDefaultCosmetic() /
// resolveEffectiveLoadout() require exactly one active default per
// category to exist at all times — every player's resolved loadout still
// needs a value for tableThemes/avatarAura/podiumTitle even with the shop
// gone. Deactivating (not deleting) also means nobody who had already
// purchased/equipped one of these loses it — it just can no longer be
// bought new. `getCatalog()` already filters on `isActive`, so this alone
// removes them from every shop listing/browse response.
const SEED_CATALOG: CosmeticCatalogItem[] = [
  // Table Themes — shop removed 2026-09-10; only the free default remains active.
  { id: "table_classic_green", category: "TABLE_THEME", name: "Classic Felt Green", description: "Traditional gaming lounge green felt with clean stitch border.", priceCoins: 0, rarity: "COMMON", unlockMethod: "DEFAULT", isActive: true, displayOrder: 10 },
  { id: "table_crt_neon_90s", category: "TABLE_THEME", name: "CRT Cyber Neon 90s", description: "Retro gridlines, arcade CRT glow, and synthwave backdrop.", priceCoins: 2500, rarity: "EPIC", unlockMethod: "COIN_PURCHASE", isActive: false, displayOrder: 20 },
  { id: "table_royal_mahogany", category: "TABLE_THEME", name: "Royal Mahogany Lounge", description: "Polished mahogany wood grain with regal gold-leaf flourishes.", priceCoins: 5000, rarity: "LEGENDARY", unlockMethod: "COIN_PURCHASE", isActive: false, displayOrder: 30 },
  { id: "table_midnight_velvet", category: "TABLE_THEME", name: "Midnight Velvet", description: "Deep sapphire blue velvet with soft ambient silver sheen.", priceCoins: 1200, rarity: "RARE", unlockMethod: "COIN_PURCHASE", isActive: false, displayOrder: 40 },

  // Dice Skins
  { id: "dice_classic_ivory", category: "DICE_SKIN", name: "Classic Ivory", description: "Smooth polished ivory resin with classic crimson ace pip.", priceCoins: 0, rarity: "COMMON", unlockMethod: "DEFAULT", isActive: true, displayOrder: 10 },
  { id: "dice_wooden_teak", category: "DICE_SKIN", name: "Carved Teak Wood", description: "Handcrafted teak wood block with natural grain and dark burned pips.", priceCoins: 800, rarity: "COMMON", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 20 },
  { id: "dice_golden_ember", category: "DICE_SKIN", name: "Golden Ember Dice", description: "Solid molten gold cube with ember heat glows and spark trails.", priceCoins: 3500, rarity: "EPIC", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 30 },
  { id: "dice_cyber_neon", category: "DICE_SKIN", name: "Cyber Neon Obsidian", description: "Matte obsidian body with electric cyan and magenta luminescent pips.", priceCoins: 5000, rarity: "LEGENDARY", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 40 },
  { id: "dice_sapphire_frost", category: "DICE_SKIN", name: "Sapphire Frost", description: "Frosted sapphire crystal with a cold internal glacier glow.", priceCoins: 4200, rarity: "EPIC", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 50 },
  { id: "dice_dragon_scale", category: "DICE_SKIN", name: "Dragon Scale Ember", description: "Obsidian dragon-scale plating with molten crimson veins.", priceCoins: 6500, rarity: "LEGENDARY", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 60 },

  // Luxury 3D Dice Collection (12 items)
  { id: "dice_porcelain_gold", category: "DICE_SKIN", name: "Royal White Porcelain", description: "Polished ivory porcelain cube with deep recessed 24K gold foil pips.", priceCoins: 1800, rarity: "RARE", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 70 },
  { id: "dice_obsidian_gold", category: "DICE_SKIN", name: "Obsidian Gold Trim", description: "Glossy piano-black obsidian cube with gilded gold edge trim and mirror gold pips.", priceCoins: 2000, rarity: "RARE", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 80 },
  { id: "dice_faceted_diamond", category: "DICE_SKIN", name: "Faceted Crystal Diamond", description: "Cut-crystal diamond glass facets refracting ambient light with recessed gold pips.", priceCoins: 3800, rarity: "EPIC", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 90 },
  { id: "dice_brushed_brass", category: "DICE_SKIN", name: "Brushed Brass Vintage", description: "Machined satin gold metal block with dark circular inset oxidized pips.", priceCoins: 1600, rarity: "RARE", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 100 },
  { id: "dice_ruby_gemstone", category: "DICE_SKIN", name: "Crimson Ruby Jewel", description: "Translucent glowing ruby gemstone with internal caustic refraction and gold pips.", priceCoins: 3500, rarity: "EPIC", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 110 },
  { id: "dice_sapphire_crystal", category: "DICE_SKIN", name: "Sapphire Cobalt Crystal", description: "Translucent electric-blue sapphire crystal with refractive core and gold pips.", priceCoins: 3600, rarity: "EPIC", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 120 },
  { id: "dice_black_gold_marble", category: "DICE_SKIN", name: "Nero Portoro Black Marble", description: "Polished black marble with dramatic gold Kintsugi lightning veins and gold pips.", priceCoins: 5500, rarity: "LEGENDARY", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 130 },
  { id: "dice_carved_walnut", category: "DICE_SKIN", name: "Carved Royal Walnut", description: "Natural dark walnut grain with satin finish and dark carved pips.", priceCoins: 1500, rarity: "RARE", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 140 },
  { id: "dice_cyber_neon_tron", category: "DICE_SKIN", name: "Cyber Neon Cyan", description: "Matte stealth black cube with glowing cyan-blue neon edge trim and luminescent pips.", priceCoins: 5200, rarity: "LEGENDARY", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 150 },
  { id: "dice_carrara_white_marble", category: "DICE_SKIN", name: "Carrara White Marble", description: "Italian white marble with delicate grey veins and recessed luxury gold pips.", priceCoins: 2200, rarity: "RARE", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 160 },
  { id: "dice_cosmic_nebula", category: "DICE_SKIN", name: "Deep Cosmic Nebula", description: "Translucent amethyst purple with swirling starry galaxy nebulae and gold pips.", priceCoins: 6000, rarity: "LEGENDARY", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 170 },
  { id: "dice_dragon_carbon_gold", category: "DICE_SKIN", name: "Dragon Carbon & Gold", description: "Textured carbon weave face framed in an ornate cast gold border with gold pips.", priceCoins: 5800, rarity: "LEGENDARY", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 180 },

  // Token Skins
  { id: "token_classic_pawn", category: "TOKEN_SKIN", name: "Standard Pawn", description: "Traditional 3D molded tournament pawn token.", priceCoins: 0, rarity: "COMMON", unlockMethod: "DEFAULT", isActive: true, displayOrder: 10 },
  { id: "token_golden_crown", category: "TOKEN_SKIN", name: "Golden Crown Pawn", description: "Crown-topped pawn adorned with royal gold trim.", priceCoins: 3000, rarity: "EPIC", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 20 },
  { id: "token_fireball_ludo", category: "TOKEN_SKIN", name: "Solar Flare Token", description: "Corona flame ring orbiting a polished cosmic sphere.", priceCoins: 4500, rarity: "LEGENDARY", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 30 },
  { id: "token_neon_ring", category: "TOKEN_SKIN", name: "Cyber Pulse Ring", description: "Neon ring hovering around the base of the player token.", priceCoins: 1500, rarity: "RARE", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 40 },
  { id: "token_diamond_elite", category: "TOKEN_SKIN", name: "Diamond Elite Pawn", description: "Faceted crystal pawn refracting prismatic sparkle at every step.", priceCoins: 3800, rarity: "EPIC", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 50 },
  { id: "token_phoenix_wing", category: "TOKEN_SKIN", name: "Phoenix Wing Token", description: "Rising phoenix silhouette wreathed in a trailing fire plume.", priceCoins: 5800, rarity: "LEGENDARY", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 60 },

  // Luxury 3D Pawn Token Collection (20 items)
  { id: "token_glossy_ruby", category: "TOKEN_SKIN", name: "Glossy Candy Ruby", description: "Candy-apple red lacquer, 24K gold neck collar and pedestal base.", priceCoins: 1800, rarity: "RARE", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 70 },
  { id: "token_sapphire_glass", category: "TOKEN_SKIN", name: "Liquid Sapphire Glass", description: "Translucent cobalt glass with internal caustic refraction, gold pedestal.", priceCoins: 3200, rarity: "EPIC", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 80 },
  { id: "token_faceted_emerald", category: "TOKEN_SKIN", name: "Faceted Emerald Gem", description: "Precision-cut geometric emerald crystal facets, gold pedestal base.", priceCoins: 3600, rarity: "EPIC", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 90 },
  { id: "token_amber_topaz", category: "TOKEN_SKIN", name: "Glowing Amber Topaz", description: "Translucent honey amber with warm internal golden shimmer, gold base.", priceCoins: 2400, rarity: "RARE", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 100 },
  { id: "token_faceted_amethyst", category: "TOKEN_SKIN", name: "Faceted Royal Amethyst", description: "Geometric cut deep purple amethyst gemstone, gold pedestal base.", priceCoins: 3500, rarity: "EPIC", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 110 },
  { id: "token_mother_of_pearl", category: "TOKEN_SKIN", name: "Mother of Pearl Ivory", description: "Lustrous warm cream ivory with iridescent pearlescent highlights.", priceCoins: 2000, rarity: "RARE", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 120 },
  { id: "token_piano_obsidian", category: "TOKEN_SKIN", name: "Glossy Piano Obsidian", description: "Ultra-reflective jet black lacquer with 24K gold collar and base.", priceCoins: 2200, rarity: "RARE", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 130 },
  { id: "token_faceted_ruby", category: "TOKEN_SKIN", name: "Faceted Crimson Ruby", description: "Diamond-cut geometric crimson ruby crystal, gold pedestal base.", priceCoins: 3800, rarity: "EPIC", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 140 },
  { id: "token_faceted_cobalt", category: "TOKEN_SKIN", name: "Faceted Cobalt Crystal", description: "Precision-cut royal cobalt sapphire crystal facets, gold base.", priceCoins: 3800, rarity: "EPIC", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 150 },
  { id: "token_green_malachite", category: "TOKEN_SKIN", name: "Malachite Swirl Jade", description: "Banded forest-green malachite concentric mineral veins, gold base.", priceCoins: 3400, rarity: "EPIC", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 160 },
  { id: "token_carved_walnut", category: "TOKEN_SKIN", name: "Carved Walnut Wood", description: "Natural organic dark walnut wood grain with satin finish and gold base.", priceCoins: 1600, rarity: "RARE", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 170 },
  { id: "token_polished_chrome", category: "TOKEN_SKIN", name: "Liquid Silver Chrome", description: "Mirror-finish chrome steel with matching polished silver pedestal base.", priceCoins: 2000, rarity: "RARE", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 180 },
  { id: "token_matte_slate", category: "TOKEN_SKIN", name: "Matte Anthracite Gold", description: "Velvety matte charcoal slate with gold pinstripe ring and gold base.", priceCoins: 1800, rarity: "RARE", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 190 },
  { id: "token_imperial_filigree", category: "TOKEN_SKIN", name: "Imperial Gold Filigree", description: "Solid 24K gold with etched diamond lattice geometric engraving.", priceCoins: 5000, rarity: "LEGENDARY", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 200 },
  { id: "token_rainbow_titanium", category: "TOKEN_SKIN", name: "Chameleon Titanium", description: "Rainbow iridescent pearlescent anodized titanium, gold base.", priceCoins: 5200, rarity: "LEGENDARY", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 210 },
  { id: "token_glacier_ice", category: "TOKEN_SKIN", name: "Glacier Frosted Crystal", description: "Translucent ice crystal with internal sub-zero fracture fissures, silver base.", priceCoins: 4200, rarity: "EPIC", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 220 },
  { id: "token_molten_magma", category: "TOKEN_SKIN", name: "Molten Magma Basalt", description: "Scorched basalt stone with glowing fiery orange lava fissures.", priceCoins: 6500, rarity: "LEGENDARY", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 230 },
  { id: "token_rose_quartz", category: "TOKEN_SKIN", name: "Blushing Rose Quartz", description: "Translucent pastel pink quartz with soft internal luminescence, gold base.", priceCoins: 2500, rarity: "RARE", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 240 },
  { id: "token_cosmic_galaxy", category: "TOKEN_SKIN", name: "Deep Celestial Galaxy", description: "Night-sky navy body dusted with twinkling galaxy nebulae and stars.", priceCoins: 6200, rarity: "LEGENDARY", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 250 },
  { id: "token_calacatta_marble", category: "TOKEN_SKIN", name: "Calacatta White Marble", description: "Luxurious Italian white marble with grey veining and gold pedestal.", priceCoins: 2400, rarity: "RARE", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 260 },

  // Card Backs
  { id: "cardback_classic_navy", category: "CARD_BACK", name: "Classic Navy Mandala", description: "Traditional Indian card room navy back with geometric mandala.", priceCoins: 0, rarity: "COMMON", unlockMethod: "DEFAULT", isActive: true, displayOrder: 10 },
  { id: "cardback_classic_uno", category: "CARD_BACK", name: "Classic Red Oval", description: "Iconic red oval card back.", priceCoins: 0, rarity: "COMMON", unlockMethod: "DEFAULT", isActive: true, displayOrder: 15 },
  { id: "cardback_vintage_velvet_rummy", category: "CARD_BACK", name: "Baroque Vintage Velvet", description: "Wine-red velvet background with intricate 24K gold filigree.", priceCoins: 2000, rarity: "RARE", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 20 },
  { id: "cardback_neon_cyber_uno", category: "CARD_BACK", name: "Synthwave Grid Cyber", description: "Futuristic neon horizon card back with retro 80s sunburst.", priceCoins: 3500, rarity: "EPIC", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 30 },
  { id: "cardback_royal_sapphire_rummy", category: "CARD_BACK", name: "Royal Sapphire Court", description: "Deep sapphire blue field with engraved silver royal filigree.", priceCoins: 3000, rarity: "EPIC", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 40 },
  { id: "cardback_dragon_ember_uno", category: "CARD_BACK", name: "Dragon Ember Blaze", description: "Obsidian-to-ember gradient with drifting dragon-fire particles.", priceCoins: 4500, rarity: "LEGENDARY", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 40 },

  // Card Backs — Rummy Artwork Collection (16, added 2026-09-14)
  { id: "cardback_ivory_diamond_crest_rummy", category: "CARD_BACK", name: "Ivory Diamond Crest", description: "Cream card stock framed in crimson-and-gold diamond filigree.", priceCoins: 2200, rarity: "RARE", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 50 },
  { id: "cardback_ivory_heart_jewel_rummy", category: "CARD_BACK", name: "Ivory Heart Jewel", description: "A ruby-red heart set in gold filigree on pale ivory.", priceCoins: 2200, rarity: "RARE", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 60 },
  { id: "cardback_regal_crimson_spade_rummy", category: "CARD_BACK", name: "Regal Crimson Spade", description: "A gilded spade medallion on a deep crimson field.", priceCoins: 2200, rarity: "RARE", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 70 },
  { id: "cardback_midnight_gold_club_rummy", category: "CARD_BACK", name: "Midnight Gold Club", description: "A gold club medallion set against deep midnight navy.", priceCoins: 2200, rarity: "RARE", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 80 },
  { id: "cardback_sapphire_filigree_rummy", category: "CARD_BACK", name: "Sapphire Filigree", description: "Ornate gold scrollwork wrapped around a royal-blue club crest.", priceCoins: 3200, rarity: "EPIC", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 90 },
  { id: "cardback_crimson_regalia_rummy", category: "CARD_BACK", name: "Crimson Regalia", description: "A golden spade crest wrapped in ornate crimson scrollwork.", priceCoins: 3200, rarity: "EPIC", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 100 },
  { id: "cardback_emerald_damask_rummy", category: "CARD_BACK", name: "Emerald Damask", description: "A gold spade medallion set in emerald damask scrollwork.", priceCoins: 3200, rarity: "EPIC", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 110 },
  { id: "cardback_teal_lotus_club_rummy", category: "CARD_BACK", name: "Teal Lotus Club", description: "A golden club crest blooming from a teal lotus pattern.", priceCoins: 3200, rarity: "EPIC", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 120 },
  { id: "cardback_blood_ruby_spade_rummy", category: "CARD_BACK", name: "Blood Ruby Spade", description: "A golden spade set in dark crimson leafwork on black.", priceCoins: 3200, rarity: "EPIC", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 130 },
  { id: "cardback_ruby_medallion_rummy", category: "CARD_BACK", name: "Ruby Medallion", description: "A faceted ruby diamond set in a gilded medallion on magenta.", priceCoins: 3200, rarity: "EPIC", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 140 },
  { id: "cardback_obsidian_cross_diamond_rummy", category: "CARD_BACK", name: "Obsidian Cross Diamond", description: "A ruby diamond at the heart of a black-and-gold geometric cross.", priceCoins: 3200, rarity: "EPIC", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 150 },
  { id: "cardback_art_deco_noir_rummy", category: "CARD_BACK", name: "Art Deco Noir", description: "Black lacquer and gold geometry in full art-deco regalia.", priceCoins: 4500, rarity: "LEGENDARY", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 160 },
  { id: "cardback_violet_lotus_heart_rummy", category: "CARD_BACK", name: "Violet Lotus Heart", description: "A golden heart blooming from a violet lotus mandala.", priceCoins: 4500, rarity: "LEGENDARY", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 170 },
  { id: "cardback_golden_tide_rummy", category: "CARD_BACK", name: "Golden Tide", description: "Molten gold currents swirling across a deep teal field.", priceCoins: 4500, rarity: "LEGENDARY", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 180 },
  { id: "cardback_amethyst_mandala_spade_rummy", category: "CARD_BACK", name: "Amethyst Mandala Spade", description: "A golden spade at the center of a jeweled amethyst mandala.", priceCoins: 4500, rarity: "LEGENDARY", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 190 },
  { id: "cardback_emerald_mandala_heart_rummy", category: "CARD_BACK", name: "Emerald Mandala Heart", description: "A golden heart at the center of a jeweled emerald mandala.", priceCoins: 4500, rarity: "LEGENDARY", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 200 },

  // Card Backs — UNO Artwork Collection (16, added 2026-09-14)
  { id: "cardback_retro_blocks_uno", category: "CARD_BACK", name: "Retro Blocks", description: "Flat retro color blocks scattered across a clean white field.", priceCoins: 2200, rarity: "RARE", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 210 },
  { id: "cardback_brush_strokes_uno", category: "CARD_BACK", name: "Brush Strokes", description: "Bold diagonal paint strokes in every UNO color.", priceCoins: 2200, rarity: "RARE", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 220 },
  { id: "cardback_hazard_stripes_uno", category: "CARD_BACK", name: "Hazard Stripes", description: "Bold black-and-gold caution stripes with a punchy logo.", priceCoins: 2200, rarity: "RARE", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 230 },
  { id: "cardback_confetti_shapes_uno", category: "CARD_BACK", name: "Confetti Shapes", description: "Scattered colorful shapes and confetti on jet black.", priceCoins: 2200, rarity: "RARE", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 240 },
  { id: "cardback_pigment_blast_uno", category: "CARD_BACK", name: "Pigment Blast", description: "A rainbow pigment explosion bursting from the center.", priceCoins: 3200, rarity: "EPIC", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 250 },
  { id: "cardback_rainbow_swirl_uno", category: "CARD_BACK", name: "Rainbow Swirl", description: "Painterly rainbow brush strokes swirling across black.", priceCoins: 3200, rarity: "EPIC", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 260 },
  { id: "cardback_action_pack_uno", category: "CARD_BACK", name: "Action Pack", description: "Skip, Reverse, and Wild icons scattered across the back.", priceCoins: 3200, rarity: "EPIC", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 270 },
  { id: "cardback_prism_shatter_uno", category: "CARD_BACK", name: "Prism Shatter", description: "A shattered low-poly prism of every UNO color.", priceCoins: 3200, rarity: "EPIC", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 280 },
  { id: "cardback_emerald_leaf_uno", category: "CARD_BACK", name: "Emerald Leaf", description: "Sweeping emerald leaf fronds curling across black.", priceCoins: 3200, rarity: "EPIC", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 290 },
  { id: "cardback_deep_blue_vortex_uno", category: "CARD_BACK", name: "Deep Blue Vortex", description: "A deep blue vortex swirling behind the classic logo.", priceCoins: 3200, rarity: "EPIC", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 300 },
  { id: "cardback_crimson_vortex_uno", category: "CARD_BACK", name: "Crimson Vortex", description: "A blazing crimson vortex swirling behind the classic logo.", priceCoins: 3200, rarity: "EPIC", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 310 },
  { id: "cardback_splash_burst_uno", category: "CARD_BACK", name: "Splash Burst", description: "A symmetric multicolor paint splatter bursting outward.", priceCoins: 3200, rarity: "EPIC", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 320 },
  { id: "cardback_golden_eclipse_uno", category: "CARD_BACK", name: "Golden Eclipse", description: "Polished gold bands eclipsing a starlit black field.", priceCoins: 4500, rarity: "LEGENDARY", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 330 },
  { id: "cardback_neon_vortex_uno", category: "CARD_BACK", name: "Neon Vortex", description: "Glowing neon light trails spiraling into a vortex.", priceCoins: 4500, rarity: "LEGENDARY", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 340 },
  { id: "cardback_gilded_swirl_uno", category: "CARD_BACK", name: "Gilded Swirl", description: "A gleaming gold swirl over a dotted midnight backdrop.", priceCoins: 4500, rarity: "LEGENDARY", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 350 },
  { id: "cardback_neon_streak_uno", category: "CARD_BACK", name: "Neon Streak", description: "Multicolor neon light streaks racing around the logo.", priceCoins: 4500, rarity: "LEGENDARY", unlockMethod: "COIN_PURCHASE", isActive: true, displayOrder: 360 },

  // Avatar Auras — shop removed 2026-09-10; only the free default remains active.
  { id: "aura_none", category: "AVATAR_AURA", name: "No Aura", description: "Standard clean avatar border.", priceCoins: 0, rarity: "COMMON", unlockMethod: "DEFAULT", isActive: true, displayOrder: 10 },
  { id: "aura_radiant_vanguard", category: "AVATAR_AURA", name: "Radiant Vanguard Aura", description: "Solar sunburst golden ring softly pulsing around your profile.", priceCoins: 4000, rarity: "EPIC", unlockMethod: "COIN_PURCHASE", isActive: false, displayOrder: 20 },
  { id: "aura_ludo_king", category: "AVATAR_AURA", name: "Royal Monarch Halo", description: "Crimson and gold dual orbiting planetary rings.", priceCoins: 6000, rarity: "LEGENDARY", unlockMethod: "COIN_PURCHASE", isActive: false, displayOrder: 30 },
  { id: "aura_rummy_maestro", category: "AVATAR_AURA", name: "Arcane Emerald Shimmer", description: "Glowing emerald runes floating in a hypnotic ambient swirl.", priceCoins: 3500, rarity: "EPIC", unlockMethod: "COIN_PURCHASE", isActive: false, displayOrder: 40 },

  // Podium Titles — shop removed 2026-09-10; only the free default remains
  // active. title_early_bird (STREAK_MILESTONE, not a shop purchase) is
  // ALSO deactivated here since the whole Titles category no longer has a
  // shop tab to equip it from — but the Day-7 streak grant mechanic itself
  // (StreakService -> grantCosmeticEntitlement) is untouched and still
  // fires; it just now grants an entitlement with no UI surface to use it.
  { id: "title_none", category: "PODIUM_TITLE", name: "Contender", description: "Standard match participant title.", priceCoins: 0, rarity: "COMMON", unlockMethod: "DEFAULT", isActive: true, displayOrder: 10 },
  { id: "title_early_bird", category: "PODIUM_TITLE", name: "Early Bird", description: "Earned by completing a 7-day daily login streak.", priceCoins: 0, rarity: "RARE", unlockMethod: "STREAK_MILESTONE", isActive: false, displayOrder: 20 },
  { id: "title_table_master", category: "PODIUM_TITLE", name: "Table Master", description: "Recognized veteran of the BHALYAM lounge tables.", priceCoins: 2500, rarity: "RARE", unlockMethod: "COIN_PURCHASE", isActive: false, displayOrder: 30 },
  { id: "title_grandmaster", category: "PODIUM_TITLE", name: "Grandmaster", description: "Elite lounge title displayed on victory podiums and player lists.", priceCoins: 10000, rarity: "LEGENDARY", unlockMethod: "COIN_PURCHASE", isActive: false, displayOrder: 40 },
];

export class InMemoryCosmeticsRepository implements CosmeticsRepository {
  private readonly mutex = new KeyedMutex();
  private readonly catalog = new Map<string, CosmeticCatalogItem>();
  // user_id -> Set of non-default cosmetic_id
  private readonly entitlements = new Map<string, Set<string>>();
  // user_id -> Map of "category:scope" -> cosmetic_id
  private readonly equipped = new Map<string, Map<string, string>>();
  // user_id -> Map of idempotencyKey -> { cosmeticId, result }
  private readonly purchaseRequests = new Map<string, Map<string, { cosmeticId: string; result: PurchaseCosmeticResult }>>();

  constructor(private readonly economyRepository: EconomyRepository) {
    for (const item of SEED_CATALOG) {
      this.catalog.set(item.id, { ...item });
    }
  }

  async getCatalog(): Promise<CosmeticCatalogItem[]> {
    return Array.from(this.catalog.values())
      .filter((item) => item.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  async getUserEntitlements(userId: string): Promise<string[]> {
    const userSet = this.entitlements.get(userId);
    return userSet ? Array.from(userSet) : [];
  }

  async getUserEquipped(userId: string): Promise<EquippedCosmeticsLoadout> {
    const userMap = this.equipped.get(userId);
    const loadout: EquippedCosmeticsLoadout = {
      tableThemes: {},
      diceSkins: {},
      tokenSkins: {},
      cardBacks: {},
    };

    if (!userMap) return loadout;

    for (const [key, cosmeticId] of userMap.entries()) {
      const [category, scope] = key.split(":") as [CosmeticCategory, CosmeticGameScope];
      if (category === "TABLE_THEME") {
        loadout.tableThemes[scope] = cosmeticId;
      } else if (category === "DICE_SKIN") {
        loadout.diceSkins[scope] = cosmeticId;
      } else if (category === "TOKEN_SKIN") {
        loadout.tokenSkins[scope] = cosmeticId;
      } else if (category === "CARD_BACK") {
        if (scope === "uno" || scope === "rummy") {
          loadout.cardBacks[scope] = cosmeticId;
        }
      } else if (category === "AVATAR_AURA") {
        loadout.avatarAura = cosmeticId;
      } else if (category === "PODIUM_TITLE") {
        loadout.podiumTitle = cosmeticId;
      }
    }

    return loadout;
  }

  async purchaseCosmetic(input: PurchaseCosmeticInput): Promise<PurchaseCosmeticResult> {
    return this.mutex.runExclusive(`wallet:${input.userId}`, async () => {
      // 1. Account-scoped idempotency check
      let userRequests = this.purchaseRequests.get(input.userId);
      if (!userRequests) {
        userRequests = new Map();
        this.purchaseRequests.set(input.userId, userRequests);
      }

      const existingReq = userRequests.get(input.idempotencyKey);
      if (existingReq) {
        if (existingReq.cosmeticId !== input.cosmeticId) {
          return {
            applied: false,
            code: "IDEMPOTENCY_MISMATCH",
            cosmeticId: input.cosmeticId,
            message: "Idempotency key replayed with a different cosmetic ID.",
          };
        }
        return {
          ...existingReq.result,
          applied: false,
        };
      }

      // 2. Validate cosmetic in catalog
      const item = this.catalog.get(input.cosmeticId);
      if (!item || !item.isActive) {
        return {
          applied: false,
          code: "INVALID_COSMETIC",
          cosmeticId: input.cosmeticId,
          message: "Cosmetic item does not exist or is inactive.",
        };
      }

      if (item.unlockMethod === "DEFAULT") {
        return {
          applied: false,
          code: "INVALID_COSMETIC",
          cosmeticId: input.cosmeticId,
          message: "Default cosmetics cannot be purchased.",
        };
      }

      // 3. Check ownership
      let userEnts = this.entitlements.get(input.userId);
      if (!userEnts) {
        userEnts = new Set();
        this.entitlements.set(input.userId, userEnts);
      }

      const currentWallet = await this.economyRepository.ensureWallet(input.userId);
      const currentBalance = currentWallet?.balance ?? "0";

      if (userEnts.has(input.cosmeticId)) {
        const result: PurchaseCosmeticResult = {
          applied: false,
          code: "ALREADY_OWNED",
          cosmeticId: input.cosmeticId,
          walletBalance: currentBalance,
          message: "You already own this cosmetic.",
        };
        userRequests.set(input.idempotencyKey, { cosmeticId: input.cosmeticId, result });
        return result;
      }

      // 4. Wallet checks
      if (!currentWallet) {
        return {
          applied: false,
          code: "ERROR",
          cosmeticId: input.cosmeticId,
          message: "User wallet not found.",
        };
      }

      if (currentWallet.isFrozen) {
        return {
          applied: false,
          code: "ERROR",
          cosmeticId: input.cosmeticId,
          message: "Wallet is frozen.",
        };
      }

      const priceBn = BigInt(item.priceCoins);
      const balanceBn = BigInt(currentBalance);

      if (balanceBn < priceBn) {
        return {
          applied: false,
          code: "INSUFFICIENT_FUNDS",
          cosmeticId: input.cosmeticId,
          walletBalance: currentBalance,
          message: `Insufficient balance (${currentBalance} coins; item costs ${item.priceCoins} coins).`,
        };
      }

      // 5. Debit wallet atomically. Refuse rather than silently faking a
      // debited balance if the active economy repository cannot actually
      // perform one — see CosmeticsDebitUnsupportedError's own doc comment.
      if (!this.economyRepository.debitWallet) {
        throw new CosmeticsDebitUnsupportedError(input.userId);
      }
      const debitOp = await this.economyRepository.debitWallet({
        identityId: input.userId,
        amountCoins: String(item.priceCoins),
        idempotencyKey: input.idempotencyKey,
        entryType: "COSMETIC_PURCHASE",
        reason: `Purchased cosmetic: ${item.name}`,
        sourceKind: "cosmetics",
        sourceId: input.cosmeticId,
      });
      const newBalance = debitOp.result.balance;

      // 6. Grant persistent entitlement
      userEnts.add(input.cosmeticId);

      // 7. Store purchase request record
      const successResult: PurchaseCosmeticResult = {
        applied: true,
        code: "PURCHASED",
        cosmeticId: input.cosmeticId,
        walletBalance: newBalance,
      };

      userRequests.set(input.idempotencyKey, {
        cosmeticId: input.cosmeticId,
        result: successResult,
      });

      return successResult;
    });
  }

  async equipCosmetic(
    userId: string,
    category: CosmeticCategory,
    scope: CosmeticGameScope,
    cosmeticId: string,
    isAdmin = false,
  ): Promise<void> {
    // Validate cosmetic
    if (!isKnownCosmeticId(cosmeticId)) {
      throw new InvalidCosmeticError(`${cosmeticId} is not a known cosmetic`);
    }

    const item = this.catalog.get(cosmeticId);
    const isDefault = item?.unlockMethod === "DEFAULT";

    if (!isDefault && !isAdmin) {
      const userEnts = this.entitlements.get(userId);
      if (!userEnts || !userEnts.has(cosmeticId)) {
        throw new UnownedCosmeticError(cosmeticId);
      }
    }

    let userEquipped = this.equipped.get(userId);
    if (!userEquipped) {
      userEquipped = new Map();
      this.equipped.set(userId, userEquipped);
    }

    // If equipping the default item for this category and scope, delete the override
    const defaultItem = getDefaultCosmetic(category, scope);
    if (cosmeticId === defaultItem.id) {
      userEquipped.delete(`${category}:${scope}`);
    } else {
      userEquipped.set(`${category}:${scope}`, cosmeticId);
    }
  }

  async unequipCosmetic(
    userId: string,
    category: CosmeticCategory,
    scope: CosmeticGameScope,
  ): Promise<void> {
    const userEquipped = this.equipped.get(userId);
    if (userEquipped) {
      userEquipped.delete(`${category}:${scope}`);
    }
  }

  async grantEntitlement(
    userId: string,
    cosmeticId: string,
    _sourceType: string,
    _sourceReference: string,
  ): Promise<boolean> {
    if (!isKnownCosmeticId(cosmeticId)) return false;
    let userEnts = this.entitlements.get(userId);
    if (!userEnts) {
      userEnts = new Set();
      this.entitlements.set(userId, userEnts);
    }
    userEnts.add(cosmeticId);
    return true;
  }
}
