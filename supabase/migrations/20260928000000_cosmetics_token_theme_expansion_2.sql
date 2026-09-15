-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260928000000_cosmetics_token_theme_expansion_2.sql
-- Description: Adds 10 more character-themed Token Skins (Pirate Captain,
--              Cyber Bot, Samurai, Vampire Count, Desert Sultan, Arctic
--              Ranger, Steam Inventor, Jungle Scout, Imperial General, Void
--              Reaper), continuing the accessory-badge category introduced
--              in 20260927000000_cosmetics_token_theme_expansion.sql — each
--              icon carries its own fixed signature colors, the pawn body
--              always renders in the player's own seat color (see
--              client/src/games/ludo/TokenThemeOverlay.tsx).
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
  ('token_theme_pirate_captain', 'TOKEN_SKIN', 'Pirate Captain', 'A wide tricorn hat above a skull-and-crossbones badge.', 3300, 'EPIC', 'COIN_PURCHASE', 260),
  ('token_theme_cyber_bot', 'TOKEN_SKIN', 'Cyber Bot', 'A glowing cyan visor band and a blinking antenna light.', 3100, 'EPIC', 'COIN_PURCHASE', 270),
  ('token_theme_samurai', 'TOKEN_SKIN', 'Samurai', 'A gilded kabuto crescent crest and a katana hilt at the hip.', 4000, 'LEGENDARY', 'COIN_PURCHASE', 280),
  ('token_theme_vampire_count', 'TOKEN_SKIN', 'Vampire Count', 'A popped black collar and a small crimson bat-wing badge.', 3800, 'EPIC', 'COIN_PURCHASE', 290),
  ('token_theme_desert_sultan', 'TOKEN_SKIN', 'Desert Sultan', 'A draped ivory turban set with a crescent-and-gem front piece.', 4400, 'EPIC', 'COIN_PURCHASE', 300),
  ('token_theme_arctic_ranger', 'TOKEN_SKIN', 'Arctic Ranger', 'A scalloped fur hood trim and an icy snowflake badge.', 2800, 'EPIC', 'COIN_PURCHASE', 310),
  ('token_theme_steam_inventor', 'TOKEN_SKIN', 'Steam Inventor', 'Brass goggles with glass-blue lenses and a small clockwork gear.', 3500, 'EPIC', 'COIN_PURCHASE', 320),
  ('token_theme_jungle_scout', 'TOKEN_SKIN', 'Jungle Scout', 'A leaf headband above a brass compass badge with a red needle.', 2600, 'EPIC', 'COIN_PURCHASE', 330),
  ('token_theme_imperial_general', 'TOKEN_SKIN', 'Imperial General', 'A sweeping navy plume crest and a gold medal on a crimson ribbon.', 4600, 'LEGENDARY', 'COIN_PURCHASE', 340),
  ('token_theme_void_reaper', 'TOKEN_SKIN', 'Void Reaper', 'A deep hood with a faint violet glow and a small silver scythe.', 5200, 'LEGENDARY', 'COIN_PURCHASE', 350)
on conflict (id) do nothing;
