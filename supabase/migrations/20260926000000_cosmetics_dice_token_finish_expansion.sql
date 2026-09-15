-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260926000000_cosmetics_dice_token_finish_expansion.sql
-- Description: Adds 12 new premium Dice Skins and 13 new premium Token Skin
--              "craftsmanship finishes". Unlike earlier token skins, these
--              finishes carry no fixed color of their own — Token.tsx always
--              renders them in the player's own seat color (see
--              client/src/games/ludo/TokenFinishOverlay.tsx's own header for
--              why: seat-color identity must never be overridden by a
--              purchased skin). Dice have no seat/ownership concept, so
--              their 12 new entries are plain CSS materials like the
--              existing 6.
--              Price tiers follow the enforced RARITY_PRICE_BANDS in
--              shared/cosmetics.ts (RARE 1,000-3,000 / EPIC 2,000-4,500 /
--              LEGENDARY 4,000-11,000) — CosmeticsService.assertRarityPricing()
--              checks every row against its rarity's band at boot.
--              These IDs must already exist in the closed-set registry
--              (shared/cosmetics.ts BHALYAM_COSMETIC_REGISTRY) before this
--              runs — CosmeticsService.assertCatalogIntegrity() checks every
--              catalog row against that registry at boot and fails loudly if
--              a row has no matching registry entry.
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.cosmetic_catalog (id, category, name, description, price_coins, rarity, unlock_method, display_order)
values
  -- Dice Skins — premium expansion (12)
  ('dice_rosewood_carved', 'DICE_SKIN', 'Rosewood Carved', 'Hand-carved dark rosewood block with warm cream pips.', 1200, 'RARE', 'COIN_PURCHASE', 70),
  ('dice_onyx_noir', 'DICE_SKIN', 'Onyx Noir', 'Glossy black onyx cube with gleaming gold pips.', 1400, 'RARE', 'COIN_PURCHASE', 80),
  ('dice_brushed_platinum', 'DICE_SKIN', 'Brushed Platinum', 'Cool brushed platinum metal with sharp black pips.', 1600, 'RARE', 'COIN_PURCHASE', 90),
  ('dice_white_marble', 'DICE_SKIN', 'White Marble', 'Pale veined marble block with polished gold pips.', 1800, 'RARE', 'COIN_PURCHASE', 100),
  ('dice_electric_indigo', 'DICE_SKIN', 'Electric Indigo', 'Neon indigo glow outline on matte black, violet pips.', 2800, 'EPIC', 'COIN_PURCHASE', 110),
  ('dice_crystal_clear', 'DICE_SKIN', 'Crystal Clear', 'Flawless clear-cut crystal glass with golden pips.', 3000, 'EPIC', 'COIN_PURCHASE', 120),
  ('dice_ruby_glass', 'DICE_SKIN', 'Ruby Glass', 'Translucent deep ruby glass with a warm inner glow.', 3200, 'EPIC', 'COIN_PURCHASE', 130),
  ('dice_azure_glass', 'DICE_SKIN', 'Azure Glass', 'Translucent deep azure glass with a cool inner glow.', 3200, 'EPIC', 'COIN_PURCHASE', 140),
  ('dice_amethyst_glass', 'DICE_SKIN', 'Amethyst Glass', 'Translucent violet glass with a soft mystic glow.', 3400, 'EPIC', 'COIN_PURCHASE', 150),
  ('dice_starlit_obsidian', 'DICE_SKIN', 'Starlit Obsidian', 'Deep obsidian black flecked with tiny golden stars.', 4200, 'LEGENDARY', 'COIN_PURCHASE', 160),
  ('dice_gilded_marble', 'DICE_SKIN', 'Gilded Marble', 'Black marble veined with molten gold, gold pips.', 4400, 'LEGENDARY', 'COIN_PURCHASE', 170),
  ('dice_hammered_gold', 'DICE_SKIN', 'Hammered Gold', 'Textured hand-hammered gold frame with onyx pips.', 4800, 'LEGENDARY', 'COIN_PURCHASE', 180),

  -- Token Skins — premium craftsmanship finishes (13), seat-color rendered
  ('token_finish_polished_pearl', 'TOKEN_SKIN', 'Polished Pearl', 'Ultra-glossy hand-polished pawn with a luminous sheen.', 1800, 'RARE', 'COIN_PURCHASE', 70),
  ('token_finish_carved_grain', 'TOKEN_SKIN', 'Carved Grain', 'Fine hand-carved grain striations across a solid pawn.', 2000, 'RARE', 'COIN_PURCHASE', 80),
  ('token_finish_matte_noir', 'TOKEN_SKIN', 'Matte Noir', 'Sleek low-gloss matte finish with a minimalist trim.', 1700, 'RARE', 'COIN_PURCHASE', 90),
  ('token_finish_rose_glass', 'TOKEN_SKIN', 'Rose Glass', 'Soft translucent glass pawn with a gentle inner glow.', 2200, 'RARE', 'COIN_PURCHASE', 100),
  ('token_finish_crystal_facet', 'TOKEN_SKIN', 'Crystal Facet', 'Diamond-cut faceted crown atop a glassy smooth body.', 3400, 'EPIC', 'COIN_PURCHASE', 110),
  ('token_finish_chrome_mirror', 'TOKEN_SKIN', 'Chrome Mirror', 'Mirror-polished metallic sheen with sharp specular streaks.', 3200, 'EPIC', 'COIN_PURCHASE', 120),
  ('token_finish_ice_crystal', 'TOKEN_SKIN', 'Ice Crystal', 'Frosted translucent glass etched with fine crack lines.', 3000, 'EPIC', 'COIN_PURCHASE', 130),
  ('token_finish_veined_marble', 'TOKEN_SKIN', 'Veined Marble', 'Polished stone finish threaded with fine natural veins.', 3600, 'EPIC', 'COIN_PURCHASE', 140),
  ('token_finish_gem_cut', 'TOKEN_SKIN', 'Gem Cut', 'Full diamond-cut facets with a brilliant specular flash.', 4400, 'LEGENDARY', 'COIN_PURCHASE', 150),
  ('token_finish_molten_core', 'TOKEN_SKIN', 'Molten Core', 'Dark cracked shell glowing with a pulsing molten core.', 4600, 'LEGENDARY', 'COIN_PURCHASE', 160),
  ('token_finish_engraved_lattice', 'TOKEN_SKIN', 'Engraved Lattice', 'Hand-engraved gold lattice pattern with a capped crown.', 4800, 'LEGENDARY', 'COIN_PURCHASE', 170),
  ('token_finish_nebula_swirl', 'TOKEN_SKIN', 'Nebula Swirl', 'Deep cosmic gradient scattered with twinkling sparkle dust.', 5000, 'LEGENDARY', 'COIN_PURCHASE', 180),
  ('token_finish_holographic_shift', 'TOKEN_SKIN', 'Holographic Shift', 'Shimmering iridescent bands that shift as it catches the light.', 5400, 'LEGENDARY', 'COIN_PURCHASE', 190)
on conflict (id) do nothing;
