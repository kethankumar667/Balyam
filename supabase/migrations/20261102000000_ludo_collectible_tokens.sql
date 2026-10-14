-- ─────────────────────────────────────────────────────────────────
-- Migration: 20261102000000_ludo_collectible_tokens.sql
-- Description: Adds the 3D Collectible Token set for Ludo — 16 original
--              figurines (client/src/games/ludo/tokens/). Each row mirrors an
--              entry in the closed-set registry (shared/cosmetics.ts
--              BHALYAM_COSMETIC_REGISTRY): CosmeticsService.assertCatalogIntegrity()
--              refuses to boot if a catalog row has no registry entry, and
--              assertRarityPricing() refuses to boot if a price falls outside its
--              rarity band, so this list must stay identical to the in-memory seed
--              (server/src/cosmetics/InMemoryCosmeticsRepository.ts).
--              Rollback: supabase/rollbacks/20261102000000_ludo_collectible_tokens.sql
-- ─────────────────────────────────────────────────────────────────

insert into public.cosmetic_catalog (id, category, name, description, price_coins, rarity, unlock_method, display_order)
values
  ('token_imperial_sovereign', 'TOKEN_SKIN', 'Imperial Sovereign', 'Full 3D coronation crown with seat-colored velvet cushion & ruby studs.', 4500, 'LEGENDARY', 'COIN_PURCHASE', 400),
  ('token_scepter_radiance', 'TOKEN_SKIN', 'Scepter of Radiance', 'Gilded ceremonial monarch scepter cradling a floating sapphire celestial orb.', 3600, 'EPIC', 'COIN_PURCHASE', 410),
  ('token_throne_valor', 'TOKEN_SKIN', 'Throne of Valor', '3D sculptured golden monarch throne with ruby velvet backrest & lion armrests.', 4200, 'LEGENDARY', 'COIN_PURCHASE', 420),
  ('token_signet_empire', 'TOKEN_SKIN', 'Signet of Empire', 'Massive beveled golden signet ring bearing an embossed imperial seal crest.', 2800, 'RARE', 'COIN_PURCHASE', 430),
  ('token_draco_inferno', 'TOKEN_SKIN', 'Draco Inferno', 'Sculpted miniature coiled wyrm with volcanic rock plinth & glowing gold horns.', 5000, 'LEGENDARY', 'COIN_PURCHASE', 440),
  ('token_phoenix_rebirth', 'TOKEN_SKIN', 'Phoenix Rebirth', 'Majestic golden solar firebird spreading flaming wings rising from an ash nest.', 4600, 'LEGENDARY', 'COIN_PURCHASE', 450),
  ('token_airavata_royale', 'TOKEN_SKIN', 'Airavata Royale', 'Gilded ceremonial temple elephant with jeweled howdah & raised fortune trunk.', 4800, 'LEGENDARY', 'COIN_PURCHASE', 460),
  ('token_bengal_vyaghra', 'TOKEN_SKIN', 'Bengal Vyaghra', 'Crouching golden predator with obsidian stripes and glowing emerald eyes.', 3900, 'EPIC', 'COIN_PURCHASE', 470),
  ('token_neo_valkyrie', 'TOKEN_SKIN', 'Neo Valkyrie', 'Floating robotic core with dual cyan plasma thrusters & holographic ground ring.', 3800, 'EPIC', 'COIN_PURCHASE', 480),
  ('token_celestial_shard', 'TOKEN_SKIN', 'Celestial Shard', 'Geometric multi-faceted gemstone suspended in spinning golden orbital gimbals.', 3200, 'EPIC', 'COIN_PURCHASE', 490),
  ('token_supernova_core', 'TOKEN_SKIN', 'Supernova Core', 'Pulsing celestial plasma core bound by 4 titanium magnetic containment pylons.', 4400, 'LEGENDARY', 'COIN_PURCHASE', 500),
  ('token_astral_voyager', 'TOKEN_SKIN', 'Astral Voyager', 'Pressurized space helmet with gold reflective visor and aerospace collar.', 3400, 'EPIC', 'COIN_PURCHASE', 510),
  ('token_aegis_champion', 'TOKEN_SKIN', 'Aegis Champion', 'Sculpted bronze Corinthian battle helmet with flowing crimson horsehair crest.', 2800, 'RARE', 'COIN_PURCHASE', 520),
  ('token_samurai_shogun', 'TOKEN_SKIN', 'Samurai Shogun', 'Black lacquer samurai battle helmet with sweeping golden Kuwagata horns.', 3500, 'EPIC', 'COIN_PURCHASE', 530),
  ('token_sacred_trishula', 'TOKEN_SKIN', 'Sacred Trishula', 'Radiant golden sacred trident adorned with damru drum & celestial flame tips.', 4600, 'LEGENDARY', 'COIN_PURCHASE', 540),
  ('token_retro_handset', 'TOKEN_SKIN', 'Retro Handset', 'Sculpted 3D miniature retro handheld phone featuring playable snake pixel screen.', 3000, 'RARE', 'COIN_PURCHASE', 550)
on conflict (id) do nothing;
