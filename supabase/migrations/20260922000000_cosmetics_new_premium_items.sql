-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260922000000_cosmetics_new_premium_items.sql
-- Description: Adds 6 new premium catalog items — 2 each to Dice Skins,
--              Token Skins, and Card Backs, the three categories that remain
--              in the shop after 20260921000000 removed Tables/Auras/Titles.
--              These IDs must already exist in the closed-set registry
--              (shared/cosmetics.ts BHALYAM_COSMETIC_REGISTRY) before this
--              runs — CosmeticsService.assertCatalogIntegrity() checks every
--              catalog row against that registry at boot and fails loudly if
--              a row has no matching registry entry.
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.cosmetic_catalog (id, category, name, description, price_coins, rarity, unlock_method, display_order)
values
  -- Dice Skins
  ('dice_sapphire_frost', 'DICE_SKIN', 'Sapphire Frost', 'Frosted sapphire crystal with a cold internal glacier glow.', 4200, 'EPIC', 'COIN_PURCHASE', 50),
  ('dice_dragon_scale', 'DICE_SKIN', 'Dragon Scale Ember', 'Obsidian dragon-scale plating with molten crimson veins.', 6500, 'LEGENDARY', 'COIN_PURCHASE', 60),

  -- Token Skins (Ludo)
  ('token_diamond_elite', 'TOKEN_SKIN', 'Diamond Elite Pawn', 'Faceted crystal pawn refracting prismatic sparkle at every step.', 3800, 'EPIC', 'COIN_PURCHASE', 50),
  ('token_phoenix_wing', 'TOKEN_SKIN', 'Phoenix Wing Token', 'Rising phoenix silhouette wreathed in a trailing fire plume.', 5800, 'LEGENDARY', 'COIN_PURCHASE', 60),

  -- Card Backs
  ('cardback_royal_sapphire_rummy', 'CARD_BACK', 'Royal Sapphire Court', 'Deep sapphire blue field with engraved silver royal filigree.', 3000, 'EPIC', 'COIN_PURCHASE', 40),
  ('cardback_dragon_ember_uno', 'CARD_BACK', 'Dragon Ember Blaze', 'Obsidian-to-ember gradient with drifting dragon-fire particles.', 4500, 'LEGENDARY', 'COIN_PURCHASE', 40)
on conflict (id) do nothing;
