-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260924000000_cosmetics_dice_token_expansion.sql
-- Description: Adds 32 luxury 3D cosmetics — 12 Dice Skins and 20 Token Skins —
--              sourced from high-DPI rendered assets (client/public/dice-skins/,
--              client/public/token-skins/). Tiered by visual rarity and prestige.
--              These IDs exist in the closed-set registry (shared/cosmetics.ts).
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.cosmetic_catalog (id, category, name, description, price_coins, rarity, unlock_method, display_order)
values
  -- Luxury 3D Dice Collection (12)
  ('dice_porcelain_gold', 'DICE_SKIN', 'Royal White Porcelain', 'Polished ivory porcelain cube with deep recessed 24K gold foil pips.', 1800, 'RARE', 'COIN_PURCHASE', 70),
  ('dice_obsidian_gold', 'DICE_SKIN', 'Obsidian Gold Trim', 'Glossy piano-black obsidian cube with gilded gold edge trim and mirror gold pips.', 2000, 'RARE', 'COIN_PURCHASE', 80),
  ('dice_faceted_diamond', 'DICE_SKIN', 'Faceted Crystal Diamond', 'Cut-crystal diamond glass facets refracting ambient light with recessed gold pips.', 3800, 'EPIC', 'COIN_PURCHASE', 90),
  ('dice_brushed_brass', 'DICE_SKIN', 'Brushed Brass Vintage', 'Machined satin gold metal block with dark circular inset oxidized pips.', 1600, 'RARE', 'COIN_PURCHASE', 100),
  ('dice_ruby_gemstone', 'DICE_SKIN', 'Crimson Ruby Jewel', 'Translucent glowing ruby gemstone with internal caustic refraction and gold pips.', 3500, 'EPIC', 'COIN_PURCHASE', 110),
  ('dice_sapphire_crystal', 'DICE_SKIN', 'Sapphire Cobalt Crystal', 'Translucent electric-blue sapphire crystal with refractive core and gold pips.', 3600, 'EPIC', 'COIN_PURCHASE', 120),
  ('dice_black_gold_marble', 'DICE_SKIN', 'Nero Portoro Black Marble', 'Polished black marble with dramatic gold Kintsugi lightning veins and gold pips.', 5500, 'LEGENDARY', 'COIN_PURCHASE', 130),
  ('dice_carved_walnut', 'DICE_SKIN', 'Carved Royal Walnut', 'Natural dark walnut grain with satin finish and dark carved pips.', 1500, 'RARE', 'COIN_PURCHASE', 140),
  ('dice_cyber_neon_tron', 'DICE_SKIN', 'Cyber Neon Cyan', 'Matte stealth black cube with glowing cyan-blue neon edge trim and luminescent pips.', 5200, 'LEGENDARY', 'COIN_PURCHASE', 150),
  ('dice_carrara_white_marble', 'DICE_SKIN', 'Carrara White Marble', 'Italian white marble with delicate grey veins and recessed luxury gold pips.', 2200, 'RARE', 'COIN_PURCHASE', 160),
  ('dice_cosmic_nebula', 'DICE_SKIN', 'Deep Cosmic Nebula', 'Translucent amethyst purple with swirling starry galaxy nebulae and gold pips.', 6000, 'LEGENDARY', 'COIN_PURCHASE', 170),
  ('dice_dragon_carbon_gold', 'DICE_SKIN', 'Dragon Carbon & Gold', 'Textured carbon weave face framed in an ornate cast gold border with gold pips.', 5800, 'LEGENDARY', 'COIN_PURCHASE', 180),

  -- Luxury 3D Pawn Token Collection (20)
  ('token_glossy_ruby', 'TOKEN_SKIN', 'Glossy Candy Ruby', 'Candy-apple red lacquer, 24K gold neck collar and pedestal base.', 1800, 'RARE', 'COIN_PURCHASE', 70),
  ('token_sapphire_glass', 'TOKEN_SKIN', 'Liquid Sapphire Glass', 'Translucent cobalt glass with internal caustic refraction, gold pedestal.', 3200, 'EPIC', 'COIN_PURCHASE', 80),
  ('token_faceted_emerald', 'TOKEN_SKIN', 'Faceted Emerald Gem', 'Precision-cut geometric emerald crystal facets, gold pedestal base.', 3600, 'EPIC', 'COIN_PURCHASE', 90),
  ('token_amber_topaz', 'TOKEN_SKIN', 'Glowing Amber Topaz', 'Translucent honey amber with warm internal golden shimmer, gold base.', 2400, 'RARE', 'COIN_PURCHASE', 100),
  ('token_faceted_amethyst', 'TOKEN_SKIN', 'Faceted Royal Amethyst', 'Geometric cut deep purple amethyst gemstone, gold pedestal base.', 3500, 'EPIC', 'COIN_PURCHASE', 110),
  ('token_mother_of_pearl', 'TOKEN_SKIN', 'Mother of Pearl Ivory', 'Lustrous warm cream ivory with iridescent pearlescent highlights.', 2000, 'RARE', 'COIN_PURCHASE', 120),
  ('token_piano_obsidian', 'TOKEN_SKIN', 'Glossy Piano Obsidian', 'Ultra-reflective jet black lacquer with 24K gold collar and base.', 2200, 'RARE', 'COIN_PURCHASE', 130),
  ('token_faceted_ruby', 'TOKEN_SKIN', 'Faceted Crimson Ruby', 'Diamond-cut geometric crimson ruby crystal, gold pedestal base.', 3800, 'EPIC', 'COIN_PURCHASE', 140),
  ('token_faceted_cobalt', 'TOKEN_SKIN', 'Faceted Cobalt Crystal', 'Precision-cut royal cobalt sapphire crystal facets, gold base.', 3800, 'EPIC', 'COIN_PURCHASE', 150),
  ('token_green_malachite', 'TOKEN_SKIN', 'Malachite Swirl Jade', 'Banded forest-green malachite concentric mineral veins, gold base.', 3400, 'EPIC', 'COIN_PURCHASE', 160),
  ('token_carved_walnut', 'TOKEN_SKIN', 'Carved Walnut Wood', 'Natural organic dark walnut wood grain with satin finish and gold base.', 1600, 'RARE', 'COIN_PURCHASE', 170),
  ('token_polished_chrome', 'TOKEN_SKIN', 'Liquid Silver Chrome', 'Mirror-finish chrome steel with matching polished silver pedestal base.', 2000, 'RARE', 'COIN_PURCHASE', 180),
  ('token_matte_slate', 'TOKEN_SKIN', 'Matte Anthracite Gold', 'Velvety matte charcoal slate with gold pinstripe ring and gold base.', 1800, 'RARE', 'COIN_PURCHASE', 190),
  ('token_imperial_filigree', 'TOKEN_SKIN', 'Imperial Gold Filigree', 'Solid 24K gold with etched diamond lattice geometric engraving.', 5000, 'LEGENDARY', 'COIN_PURCHASE', 200),
  ('token_rainbow_titanium', 'TOKEN_SKIN', 'Chameleon Titanium', 'Rainbow iridescent pearlescent anodized titanium, gold base.', 5200, 'LEGENDARY', 'COIN_PURCHASE', 210),
  ('token_glacier_ice', 'TOKEN_SKIN', 'Glacier Frosted Crystal', 'Translucent ice crystal with internal sub-zero fracture fissures, silver base.', 4200, 'EPIC', 'COIN_PURCHASE', 220),
  ('token_molten_magma', 'TOKEN_SKIN', 'Molten Magma Basalt', 'Scorched basalt stone with glowing fiery orange lava fissures.', 6500, 'LEGENDARY', 'COIN_PURCHASE', 230),
  ('token_rose_quartz', 'TOKEN_SKIN', 'Blushing Rose Quartz', 'Translucent pastel pink quartz with soft internal luminescence, gold base.', 2500, 'RARE', 'COIN_PURCHASE', 240),
  ('token_cosmic_galaxy', 'TOKEN_SKIN', 'Deep Celestial Galaxy', 'Night-sky navy body dusted with twinkling galaxy nebulae and stars.', 6200, 'LEGENDARY', 'COIN_PURCHASE', 250),
  ('token_calacatta_marble', 'TOKEN_SKIN', 'Calacatta White Marble', 'Luxurious Italian white marble with grey veining and gold pedestal.', 2400, 'RARE', 'COIN_PURCHASE', 260)
on conflict (id) do nothing;
