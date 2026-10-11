-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20261027000000_cosmetics_avatar_frames_carrom_coins.sql
-- Description: Adds two shop categories and 30 items:
--                AVATAR_FRAME     — 15 purchasable ring frames for the player's portrait
--                                   (scope GLOBAL, visible to everyone at the table),
--                                   plus the free default 'frame_none'.
--                CARROM_COIN_SET  — 15 purchasable Carrom coin sets (scope 'carrom', shown
--                                   on the owner's own board only), plus the free default
--                                   'carromcoin_classic'.
--              Both categories are presentation only: no game engine reads them.
--
--              The ids, names, prices and rarities below are generated from
--              shared/cosmeticsFramesAndCoins.ts, and a test (cosmeticsFramesAndCoins.test.ts)
--              fails if this file and that table ever disagree. Registry entries ship in the
--              same change, as CosmeticsService.assertCatalogIntegrity() requires — never run
--              this migration without the matching application code.
--
--              Widening a CHECK constraint is backwards compatible: every existing row still
--              satisfies it. Rolling back means deactivating the 30 rows (is_active = false),
--              not deleting them, so anyone who already bought one keeps it.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.cosmetic_catalog
  drop constraint if exists cosmetic_catalog_category_check;
alter table public.cosmetic_catalog
  add constraint cosmetic_catalog_category_check check (category in (
    'TABLE_THEME', 'DICE_SKIN', 'TOKEN_SKIN', 'CARD_BACK', 'AVATAR_AURA', 'PODIUM_TITLE',
    'AVATAR_FRAME', 'CARROM_COIN_SET'
  ));

alter table public.user_equipped_cosmetics
  drop constraint if exists user_equipped_cosmetics_category_check;
alter table public.user_equipped_cosmetics
  add constraint user_equipped_cosmetics_category_check check (category in (
    'TABLE_THEME', 'DICE_SKIN', 'TOKEN_SKIN', 'CARD_BACK', 'AVATAR_AURA', 'PODIUM_TITLE',
    'AVATAR_FRAME', 'CARROM_COIN_SET'
  ));

insert into public.cosmetic_catalog (id, category, name, description, price_coins, rarity, unlock_method, display_order)
values
  -- Avatar Frames (16: 1 default + 15 for sale)
  ('frame_none', 'AVATAR_FRAME', 'No Frame', 'Your portrait, uncluttered.', 0, 'COMMON', 'DEFAULT', 10),
  ('frame_marigold_band', 'AVATAR_FRAME', 'Marigold Band', 'A warm festival-garland ring in marigold gold.', 500, 'COMMON', 'COIN_PURCHASE', 20),
  ('frame_saffron_edge', 'AVATAR_FRAME', 'Saffron Edge', 'A clean saffron outline, bright on any table.', 500, 'COMMON', 'COIN_PURCHASE', 30),
  ('frame_kumkum_line', 'AVATAR_FRAME', 'Kumkum Line', 'A bold kumkum-red ring, easy to spot across a crowded room.', 600, 'COMMON', 'COIN_PURCHASE', 40),
  ('frame_peacock_teal', 'AVATAR_FRAME', 'Peacock Teal', 'A deep teal ring with a green-blue shimmer.', 700, 'COMMON', 'COIN_PURCHASE', 50),
  ('frame_indigo_twin', 'AVATAR_FRAME', 'Indigo Twin', 'Two thin indigo rings with a gap between, like an inlaid border.', 1400, 'RARE', 'COIN_PURCHASE', 60),
  ('frame_emerald_twin', 'AVATAR_FRAME', 'Emerald Twin', 'A double emerald ring with a bright inner edge.', 1500, 'RARE', 'COIN_PURCHASE', 70),
  ('frame_rose_gold', 'AVATAR_FRAME', 'Rose Gold', 'A soft pink-gold gradient that catches the light as the table moves.', 1800, 'RARE', 'COIN_PURCHASE', 80),
  ('frame_silver_chrome', 'AVATAR_FRAME', 'Silver Chrome', 'A polished mirror-silver ring with a sharp highlight.', 2000, 'RARE', 'COIN_PURCHASE', 90),
  ('frame_neon_pulse', 'AVATAR_FRAME', 'Neon Pulse', 'A cyan-magenta ring that breathes with a gentle glow.', 2400, 'RARE', 'COIN_PURCHASE', 100),
  ('frame_diwali_lights', 'AVATAR_FRAME', 'Diwali Lights', 'A ring of tiny festival lights in alternating gold and saffron.', 3000, 'EPIC', 'COIN_PURCHASE', 110),
  ('frame_rangoli_stars', 'AVATAR_FRAME', 'Rangoli Stars', 'A magenta-and-gold ring with four rangoli stars at the corners.', 3200, 'EPIC', 'COIN_PURCHASE', 120),
  ('frame_haunted_moon', 'AVATAR_FRAME', 'Haunted Moon', 'A violet-and-orange ring under a small pale moon.', 3600, 'EPIC', 'COIN_PURCHASE', 130),
  ('frame_royal_crown', 'AVATAR_FRAME', 'Royal Crown', 'A jewelled gold ring crowned with a small royal tiara.', 5000, 'LEGENDARY', 'COIN_PURCHASE', 140),
  ('frame_aurora_flow', 'AVATAR_FRAME', 'Aurora Flow', 'A slowly turning ring of green, blue and violet northern light.', 6000, 'LEGENDARY', 'COIN_PURCHASE', 150),
  ('frame_ember_dragon', 'AVATAR_FRAME', 'Ember Dragon', 'A smouldering red-gold ring with a flame at the crown.', 7500, 'LEGENDARY', 'COIN_PURCHASE', 160),
  -- Carrom Coin Sets (16: 1 default + 15 for sale)
  ('carromcoin_classic', 'CARROM_COIN_SET', 'Classic Ivory & Ebony', 'The traditional boxwood-and-ebony set.', 0, 'COMMON', 'DEFAULT', 10),
  ('carromcoin_cream_charcoal', 'CARROM_COIN_SET', 'Cream & Charcoal', 'Soft cream against deep charcoal, with fine grooves.', 500, 'COMMON', 'COIN_PURCHASE', 20),
  ('carromcoin_sand_slate', 'CARROM_COIN_SET', 'Sand & Slate', 'Warm desert sand against cool blue slate.', 600, 'COMMON', 'COIN_PURCHASE', 30),
  ('carromcoin_mint_plum', 'CARROM_COIN_SET', 'Mint & Plum', 'Fresh mint against ripe plum, ringed in brass.', 800, 'COMMON', 'COIN_PURCHASE', 40),
  ('carromcoin_peach_cocoa', 'CARROM_COIN_SET', 'Peach & Cocoa', 'Soft peach against dark cocoa, with a ring of tiny petals.', 700, 'COMMON', 'COIN_PURCHASE', 45),
  ('carromcoin_saffron_indigo', 'CARROM_COIN_SET', 'Saffron & Indigo', 'Bright saffron against midnight indigo, with a gold band.', 1400, 'RARE', 'COIN_PURCHASE', 50),
  ('carromcoin_lemon_forest', 'CARROM_COIN_SET', 'Lemon & Forest', 'Sunny lemon against forest green with concentric rings.', 1500, 'RARE', 'COIN_PURCHASE', 60),
  ('carromcoin_coral_navy', 'CARROM_COIN_SET', 'Coral & Navy', 'Coral pink against deep navy, striped like a seaside awning.', 1800, 'RARE', 'COIN_PURCHASE', 70),
  ('carromcoin_pearl_garnet', 'CARROM_COIN_SET', 'Pearl & Garnet', 'Lustrous pearl against deep garnet, studded with dots.', 2000, 'RARE', 'COIN_PURCHASE', 80),
  ('carromcoin_ice_ember', 'CARROM_COIN_SET', 'Ice & Ember', 'Frosted ice-blue against glowing ember red.', 2400, 'RARE', 'COIN_PURCHASE', 90),
  ('carromcoin_jade_obsidian', 'CARROM_COIN_SET', 'Jade & Obsidian', 'Polished jade against volcanic glass, with a lotus-petal ring.', 3000, 'EPIC', 'COIN_PURCHASE', 100),
  ('carromcoin_gold_onyx', 'CARROM_COIN_SET', 'Gold & Onyx', 'Hammered gold against black onyx with a star at the centre.', 3400, 'EPIC', 'COIN_PURCHASE', 110),
  ('carromcoin_sunrise_dusk', 'CARROM_COIN_SET', 'Sunrise & Dusk', 'Morning peach against evening violet, chevron-cut.', 3800, 'EPIC', 'COIN_PURCHASE', 120),
  ('carromcoin_royal_amethyst', 'CARROM_COIN_SET', 'Royal Amethyst', 'Pale lavender against deep amethyst, jewelled and rimmed in gold.', 5000, 'LEGENDARY', 'COIN_PURCHASE', 130),
  ('carromcoin_diamond_ruby', 'CARROM_COIN_SET', 'Diamond & Ruby', 'Faceted diamond-white against deep ruby, checkered like cut stone.', 6200, 'LEGENDARY', 'COIN_PURCHASE', 140),
  ('carromcoin_celestial', 'CARROM_COIN_SET', 'Celestial', 'Moonlit silver against midnight, scattered with stars.', 7500, 'LEGENDARY', 'COIN_PURCHASE', 150)
on conflict (id) do nothing;
