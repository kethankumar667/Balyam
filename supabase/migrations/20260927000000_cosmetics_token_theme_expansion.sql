-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260927000000_cosmetics_token_theme_expansion.sql
-- Description: Adds 6 new character-themed Token Skins (Shadow Ninja,
--              Thunder Hammer, Super Hero, Arcane Wizard, Star Voyager,
--              Dragon Knight). A different category from the earlier
--              "craftsmanship finish" skins: each theme is an icon/badge
--              with its own fixed signature colors, layered on top of the
--              pawn — the SAME pattern the original Golden Crown / Solar
--              Flare / Cyber Pulse / Diamond Elite / Phoenix Wing skins
--              already use. The pawn's body still always renders in the
--              player's own seat color; only the badge itself is a fixed
--              hue (see client/src/games/ludo/TokenThemeOverlay.tsx).
--              Price tiers follow the enforced RARITY_PRICE_BANDS in
--              shared/cosmetics.ts (EPIC 2,000-4,500 / LEGENDARY 4,000-11,000)
--              — CosmeticsService.assertRarityPricing() checks every row
--              against its rarity's band at boot.
--              These IDs must already exist in the closed-set registry
--              (shared/cosmetics.ts BHALYAM_COSMETIC_REGISTRY) before this
--              runs — CosmeticsService.assertCatalogIntegrity() checks every
--              catalog row against that registry at boot and fails loudly if
--              a row has no matching registry entry.
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.cosmetic_catalog (id, category, name, description, price_coins, rarity, unlock_method, display_order)
values
  ('token_theme_ninja', 'TOKEN_SKIN', 'Shadow Ninja', 'A steel shuriken badge for the stealthiest player at the table.', 3200, 'EPIC', 'COIN_PURCHASE', 200),
  ('token_theme_thunder_hammer', 'TOKEN_SKIN', 'Thunder Hammer', 'A warrior''s mallet crackling with a small bolt of lightning.', 3600, 'EPIC', 'COIN_PURCHASE', 210),
  ('token_theme_super_hero', 'TOKEN_SKIN', 'Super Hero', 'A flowing cape and a golden star emblem for the table''s champion.', 4200, 'LEGENDARY', 'COIN_PURCHASE', 220),
  ('token_theme_arcane_wizard', 'TOKEN_SKIN', 'Arcane Wizard', 'A pointed hat and a trail of golden sparkles for the board''s spellcaster.', 3400, 'EPIC', 'COIN_PURCHASE', 230),
  ('token_theme_star_voyager', 'TOKEN_SKIN', 'Star Voyager', 'A frosted helmet visor and drifting stars for an explorer of distant lanes.', 3000, 'EPIC', 'COIN_PURCHASE', 240),
  ('token_theme_dragon_knight', 'TOKEN_SKIN', 'Dragon Knight', 'Angular wing spikes framing an emerald-and-bronze shield emblem.', 4800, 'LEGENDARY', 'COIN_PURCHASE', 250)
on conflict (id) do nothing;
