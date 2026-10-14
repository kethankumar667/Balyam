-- Rollback for 20261102000000_ludo_collectible_tokens.sql
--
-- Deactivates the 16 collectible tokens instead of deleting them, so a player who
-- already bought one keeps it in their inventory (the catalog row is what an
-- owned item points at). They simply stop appearing in the shop.

update public.cosmetic_catalog
   set is_active = false
 where id in (
  'token_imperial_sovereign',
  'token_scepter_radiance',
  'token_throne_valor',
  'token_signet_empire',
  'token_draco_inferno',
  'token_phoenix_rebirth',
  'token_airavata_royale',
  'token_bengal_vyaghra',
  'token_neo_valkyrie',
  'token_celestial_shard',
  'token_supernova_core',
  'token_astral_voyager',
  'token_aegis_champion',
  'token_samurai_shogun',
  'token_sacred_trishula',
  'token_retro_handset'
);
