-- Rollback for 20261104000000_remove_old_token_skins.sql
--
-- Puts the 34 removed token skins back on sale in the catalogue, with their original
-- names, prices and rarities (taken from the in-memory seed at the commit before the removal).
-- It restores CATALOGUE ROWS ONLY. What the migration deleted — who owned each skin, who was
-- wearing it, and the purchase/refund idempotency records — cannot be rebuilt from here; recover
-- those from a database backup taken before the migration ran.
--
-- Rows that were already inactive before the removal (the 7 from 20260929000000) come back inactive.
-- The server registry (shared/cosmetics.ts) and the client resolver must list these ids again
-- (git revert the removal commit), or assertCatalogIntegrity() will refuse to boot.

insert into public.cosmetic_catalog (id, category, name, description, price_coins, rarity, unlock_method, display_order, is_active)
values
  ('token_golden_crown', 'TOKEN_SKIN', 'Golden Crown Pawn', 'Crown-topped pawn adorned with royal gold trim.', 3000, 'EPIC', 'COIN_PURCHASE', 20, true),
  ('token_fireball_ludo', 'TOKEN_SKIN', 'Solar Flare Token', 'Corona flame ring orbiting a polished cosmic sphere.', 4500, 'LEGENDARY', 'COIN_PURCHASE', 30, true),
  ('token_neon_ring', 'TOKEN_SKIN', 'Cyber Pulse Ring', 'Neon ring hovering around the base of the player token.', 1500, 'RARE', 'COIN_PURCHASE', 40, false),
  ('token_diamond_elite', 'TOKEN_SKIN', 'Diamond Elite Pawn', 'Faceted crystal pawn refracting prismatic sparkle at every step.', 3800, 'EPIC', 'COIN_PURCHASE', 50, true),
  ('token_phoenix_wing', 'TOKEN_SKIN', 'Phoenix Wing Token', 'Rising phoenix silhouette wreathed in a trailing fire plume.', 5800, 'LEGENDARY', 'COIN_PURCHASE', 60, true),
  ('token_finish_polished_pearl', 'TOKEN_SKIN', 'Polished Pearl', 'Ultra-glossy hand-polished pawn with a luminous sheen.', 1800, 'RARE', 'COIN_PURCHASE', 70, false),
  ('token_finish_carved_grain', 'TOKEN_SKIN', 'Carved Grain', 'Fine hand-carved grain striations across a solid pawn.', 2000, 'RARE', 'COIN_PURCHASE', 80, false),
  ('token_finish_matte_noir', 'TOKEN_SKIN', 'Matte Noir', 'Sleek low-gloss matte finish with a minimalist trim.', 1700, 'RARE', 'COIN_PURCHASE', 90, false),
  ('token_finish_rose_glass', 'TOKEN_SKIN', 'Rose Glass', 'Soft translucent glass pawn with a gentle inner glow.', 2200, 'RARE', 'COIN_PURCHASE', 100, false),
  ('token_finish_crystal_facet', 'TOKEN_SKIN', 'Crystal Facet', 'Diamond-cut faceted crown atop a glassy smooth body.', 3400, 'EPIC', 'COIN_PURCHASE', 110, true),
  ('token_finish_chrome_mirror', 'TOKEN_SKIN', 'Chrome Mirror', 'Mirror-polished metallic sheen with sharp specular streaks.', 3200, 'EPIC', 'COIN_PURCHASE', 120, true),
  ('token_finish_ice_crystal', 'TOKEN_SKIN', 'Ice Crystal', 'Frosted translucent glass etched with fine crack lines.', 3000, 'EPIC', 'COIN_PURCHASE', 130, true),
  ('token_finish_veined_marble', 'TOKEN_SKIN', 'Veined Marble', 'Polished stone finish threaded with fine natural veins.', 3600, 'EPIC', 'COIN_PURCHASE', 140, false),
  ('token_finish_gem_cut', 'TOKEN_SKIN', 'Gem Cut', 'Full diamond-cut facets with a brilliant specular flash.', 4400, 'LEGENDARY', 'COIN_PURCHASE', 150, true),
  ('token_finish_molten_core', 'TOKEN_SKIN', 'Molten Core', 'Dark cracked shell glowing with a pulsing molten core.', 4600, 'LEGENDARY', 'COIN_PURCHASE', 160, true),
  ('token_finish_engraved_lattice', 'TOKEN_SKIN', 'Engraved Lattice', 'Hand-engraved gold lattice pattern with a capped crown.', 4800, 'LEGENDARY', 'COIN_PURCHASE', 170, true),
  ('token_finish_nebula_swirl', 'TOKEN_SKIN', 'Nebula Swirl', 'Deep cosmic gradient scattered with twinkling sparkle dust.', 5000, 'LEGENDARY', 'COIN_PURCHASE', 180, false),
  ('token_finish_holographic_shift', 'TOKEN_SKIN', 'Holographic Shift', 'Shimmering iridescent bands that shift as it catches the light.', 5400, 'LEGENDARY', 'COIN_PURCHASE', 190, true),
  ('token_theme_ninja', 'TOKEN_SKIN', 'Shadow Ninja', 'A steel shuriken badge for the stealthiest player at the table.', 3200, 'EPIC', 'COIN_PURCHASE', 200, true),
  ('token_theme_thunder_hammer', 'TOKEN_SKIN', 'Thunder Hammer', 'A warrior''s mallet crackling with a small bolt of lightning.', 3600, 'EPIC', 'COIN_PURCHASE', 210, true),
  ('token_theme_super_hero', 'TOKEN_SKIN', 'Super Hero', 'A flowing cape and a golden star emblem for the table''s champion.', 4200, 'LEGENDARY', 'COIN_PURCHASE', 220, true),
  ('token_theme_arcane_wizard', 'TOKEN_SKIN', 'Arcane Wizard', 'A pointed hat and a trail of golden sparkles for the board''s spellcaster.', 3400, 'EPIC', 'COIN_PURCHASE', 230, true),
  ('token_theme_star_voyager', 'TOKEN_SKIN', 'Star Voyager', 'A frosted helmet visor and drifting stars for an explorer of distant lanes.', 3000, 'EPIC', 'COIN_PURCHASE', 240, true),
  ('token_theme_dragon_knight', 'TOKEN_SKIN', 'Dragon Knight', 'Angular wing spikes framing an emerald-and-bronze shield emblem.', 4800, 'LEGENDARY', 'COIN_PURCHASE', 250, true),
  ('token_theme_pirate_captain', 'TOKEN_SKIN', 'Pirate Captain', 'A wide tricorn hat above a skull-and-crossbones badge.', 3300, 'EPIC', 'COIN_PURCHASE', 260, true),
  ('token_theme_cyber_bot', 'TOKEN_SKIN', 'Cyber Bot', 'A glowing cyan visor band and a blinking antenna light.', 3100, 'EPIC', 'COIN_PURCHASE', 270, true),
  ('token_theme_samurai', 'TOKEN_SKIN', 'Samurai', 'A gilded kabuto crescent crest and a katana hilt at the hip.', 4000, 'LEGENDARY', 'COIN_PURCHASE', 280, true),
  ('token_theme_vampire_count', 'TOKEN_SKIN', 'Vampire Count', 'A popped black collar and a small crimson bat-wing badge.', 3800, 'EPIC', 'COIN_PURCHASE', 290, true),
  ('token_theme_desert_sultan', 'TOKEN_SKIN', 'Desert Sultan', 'A draped ivory turban set with a crescent-and-gem front piece.', 4400, 'EPIC', 'COIN_PURCHASE', 300, true),
  ('token_theme_arctic_ranger', 'TOKEN_SKIN', 'Arctic Ranger', 'A scalloped fur hood trim and an icy snowflake badge.', 2800, 'EPIC', 'COIN_PURCHASE', 310, true),
  ('token_theme_steam_inventor', 'TOKEN_SKIN', 'Steam Inventor', 'Brass goggles with glass-blue lenses and a small clockwork gear.', 3500, 'EPIC', 'COIN_PURCHASE', 320, true),
  ('token_theme_jungle_scout', 'TOKEN_SKIN', 'Jungle Scout', 'A leaf headband above a brass compass badge with a red needle.', 2600, 'EPIC', 'COIN_PURCHASE', 330, true),
  ('token_theme_imperial_general', 'TOKEN_SKIN', 'Imperial General', 'A sweeping navy plume crest and a gold medal on a crimson ribbon.', 4600, 'LEGENDARY', 'COIN_PURCHASE', 340, true),
  ('token_theme_void_reaper', 'TOKEN_SKIN', 'Void Reaper', 'A deep hood with a faint violet glow and a small silver scythe.', 5200, 'LEGENDARY', 'COIN_PURCHASE', 350, true)
on conflict (id) do nothing;
