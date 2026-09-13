-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260923000000_cosmetics_card_back_expansion.sql
-- Description: Adds 32 new illustrated Card Back items — 16 Rummy, 16 UNO —
--              sourced from real artwork assets (client/public/rummy-card-backs/,
--              client/public/uno-card-backs/). Three price tiers by visual
--              complexity: 2200/RARE, 3200/EPIC, 4500/LEGENDARY.
--              These IDs must already exist in the closed-set registry
--              (shared/cosmetics.ts BHALYAM_COSMETIC_REGISTRY) before this
--              runs — CosmeticsService.assertCatalogIntegrity() checks every
--              catalog row against that registry at boot and fails loudly if
--              a row has no matching registry entry.
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.cosmetic_catalog (id, category, name, description, price_coins, rarity, unlock_method, display_order)
values
  -- Card Backs — Rummy Artwork Collection (16)
  ('cardback_ivory_diamond_crest_rummy', 'CARD_BACK', 'Ivory Diamond Crest', 'Cream card stock framed in crimson-and-gold diamond filigree.', 2200, 'RARE', 'COIN_PURCHASE', 50),
  ('cardback_ivory_heart_jewel_rummy', 'CARD_BACK', 'Ivory Heart Jewel', 'A ruby-red heart set in gold filigree on pale ivory.', 2200, 'RARE', 'COIN_PURCHASE', 60),
  ('cardback_regal_crimson_spade_rummy', 'CARD_BACK', 'Regal Crimson Spade', 'A gilded spade medallion on a deep crimson field.', 2200, 'RARE', 'COIN_PURCHASE', 70),
  ('cardback_midnight_gold_club_rummy', 'CARD_BACK', 'Midnight Gold Club', 'A gold club medallion set against deep midnight navy.', 2200, 'RARE', 'COIN_PURCHASE', 80),
  ('cardback_sapphire_filigree_rummy', 'CARD_BACK', 'Sapphire Filigree', 'Ornate gold scrollwork wrapped around a royal-blue club crest.', 3200, 'EPIC', 'COIN_PURCHASE', 90),
  ('cardback_crimson_regalia_rummy', 'CARD_BACK', 'Crimson Regalia', 'A golden spade crest wrapped in ornate crimson scrollwork.', 3200, 'EPIC', 'COIN_PURCHASE', 100),
  ('cardback_emerald_damask_rummy', 'CARD_BACK', 'Emerald Damask', 'A gold spade medallion set in emerald damask scrollwork.', 3200, 'EPIC', 'COIN_PURCHASE', 110),
  ('cardback_teal_lotus_club_rummy', 'CARD_BACK', 'Teal Lotus Club', 'A golden club crest blooming from a teal lotus pattern.', 3200, 'EPIC', 'COIN_PURCHASE', 120),
  ('cardback_blood_ruby_spade_rummy', 'CARD_BACK', 'Blood Ruby Spade', 'A golden spade set in dark crimson leafwork on black.', 3200, 'EPIC', 'COIN_PURCHASE', 130),
  ('cardback_ruby_medallion_rummy', 'CARD_BACK', 'Ruby Medallion', 'A faceted ruby diamond set in a gilded medallion on magenta.', 3200, 'EPIC', 'COIN_PURCHASE', 140),
  ('cardback_obsidian_cross_diamond_rummy', 'CARD_BACK', 'Obsidian Cross Diamond', 'A ruby diamond at the heart of a black-and-gold geometric cross.', 3200, 'EPIC', 'COIN_PURCHASE', 150),
  ('cardback_art_deco_noir_rummy', 'CARD_BACK', 'Art Deco Noir', 'Black lacquer and gold geometry in full art-deco regalia.', 4500, 'LEGENDARY', 'COIN_PURCHASE', 160),
  ('cardback_violet_lotus_heart_rummy', 'CARD_BACK', 'Violet Lotus Heart', 'A golden heart blooming from a violet lotus mandala.', 4500, 'LEGENDARY', 'COIN_PURCHASE', 170),
  ('cardback_golden_tide_rummy', 'CARD_BACK', 'Golden Tide', 'Molten gold currents swirling across a deep teal field.', 4500, 'LEGENDARY', 'COIN_PURCHASE', 180),
  ('cardback_amethyst_mandala_spade_rummy', 'CARD_BACK', 'Amethyst Mandala Spade', 'A golden spade at the center of a jeweled amethyst mandala.', 4500, 'LEGENDARY', 'COIN_PURCHASE', 190),
  ('cardback_emerald_mandala_heart_rummy', 'CARD_BACK', 'Emerald Mandala Heart', 'A golden heart at the center of a jeweled emerald mandala.', 4500, 'LEGENDARY', 'COIN_PURCHASE', 200),

  -- Card Backs — UNO Artwork Collection (16)
  ('cardback_retro_blocks_uno', 'CARD_BACK', 'Retro Blocks', 'Flat retro color blocks scattered across a clean white field.', 2200, 'RARE', 'COIN_PURCHASE', 210),
  ('cardback_brush_strokes_uno', 'CARD_BACK', 'Brush Strokes', 'Bold diagonal paint strokes in every UNO color.', 2200, 'RARE', 'COIN_PURCHASE', 220),
  ('cardback_hazard_stripes_uno', 'CARD_BACK', 'Hazard Stripes', 'Bold black-and-gold caution stripes with a punchy logo.', 2200, 'RARE', 'COIN_PURCHASE', 230),
  ('cardback_confetti_shapes_uno', 'CARD_BACK', 'Confetti Shapes', 'Scattered colorful shapes and confetti on jet black.', 2200, 'RARE', 'COIN_PURCHASE', 240),
  ('cardback_pigment_blast_uno', 'CARD_BACK', 'Pigment Blast', 'A rainbow pigment explosion bursting from the center.', 3200, 'EPIC', 'COIN_PURCHASE', 250),
  ('cardback_rainbow_swirl_uno', 'CARD_BACK', 'Rainbow Swirl', 'Painterly rainbow brush strokes swirling across black.', 3200, 'EPIC', 'COIN_PURCHASE', 260),
  ('cardback_action_pack_uno', 'CARD_BACK', 'Action Pack', 'Skip, Reverse, and Wild icons scattered across the back.', 3200, 'EPIC', 'COIN_PURCHASE', 270),
  ('cardback_prism_shatter_uno', 'CARD_BACK', 'Prism Shatter', 'A shattered low-poly prism of every UNO color.', 3200, 'EPIC', 'COIN_PURCHASE', 280),
  ('cardback_emerald_leaf_uno', 'CARD_BACK', 'Emerald Leaf', 'Sweeping emerald leaf fronds curling across black.', 3200, 'EPIC', 'COIN_PURCHASE', 290),
  ('cardback_deep_blue_vortex_uno', 'CARD_BACK', 'Deep Blue Vortex', 'A deep blue vortex swirling behind the classic logo.', 3200, 'EPIC', 'COIN_PURCHASE', 300),
  ('cardback_crimson_vortex_uno', 'CARD_BACK', 'Crimson Vortex', 'A blazing crimson vortex swirling behind the classic logo.', 3200, 'EPIC', 'COIN_PURCHASE', 310),
  ('cardback_splash_burst_uno', 'CARD_BACK', 'Splash Burst', 'A symmetric multicolor paint splatter bursting outward.', 3200, 'EPIC', 'COIN_PURCHASE', 320),
  ('cardback_golden_eclipse_uno', 'CARD_BACK', 'Golden Eclipse', 'Polished gold bands eclipsing a starlit black field.', 4500, 'LEGENDARY', 'COIN_PURCHASE', 330),
  ('cardback_neon_vortex_uno', 'CARD_BACK', 'Neon Vortex', 'Glowing neon light trails spiraling into a vortex.', 4500, 'LEGENDARY', 'COIN_PURCHASE', 340),
  ('cardback_gilded_swirl_uno', 'CARD_BACK', 'Gilded Swirl', 'A gleaming gold swirl over a dotted midnight backdrop.', 4500, 'LEGENDARY', 'COIN_PURCHASE', 350),
  ('cardback_neon_streak_uno', 'CARD_BACK', 'Neon Streak', 'Multicolor neon light streaks racing around the logo.', 4500, 'LEGENDARY', 'COIN_PURCHASE', 360)
on conflict (id) do nothing;
