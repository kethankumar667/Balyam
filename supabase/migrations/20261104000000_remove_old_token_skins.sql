-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20261104000000_remove_old_token_skins.sql
-- Description: Removes the 34 token skins that pre-date the 3D collectible set,
--              leaving the Tokens shop as the default pawn plus the 16 collectibles
--              (20261102000000). The removed skins were:
--                - 5 legacy accessory pawns: golden_crown, fireball_ludo,
--                  neon_ring, diamond_elite, phoenix_wing
--                - 13 material finishes: token_finish_*
--                - 16 character themes: token_theme_*
--
--              THIS DELETES, on the owner's explicit instruction. Unlike
--              20260929000000_cosmetics_token_curation.sql (which only deactivated
--              rows so owners kept what they bought), nobody keeps these. There is
--              NO REFUND: a player who owns one loses it, and a player wearing one
--              goes back to the default pawn. The coin ledger is untouched — a past
--              purchase stays on the ledger as spent coins.
--
--              Rows are removed child-first because three tables reference the
--              catalogue with `on delete restrict`:
--                user_equipped_cosmetics  (what is worn)
--                user_cosmetics           (what is owned)
--                cosmetic_purchase_requests / cosmetic_refund_requests
--                                         (idempotency records for those items)
--
--              ORDER OF DEPLOY: apply this BEFORE shipping the server build whose
--              registry no longer lists these ids. CosmeticsService
--              .assertCatalogIntegrity() refuses to boot when an ACTIVE catalogue row
--              has no registry entry, and 27 of the 34 rows below are still active.
--
--              Rollback: supabase/rollbacks/20261104000000_remove_old_token_skins.sql
--              (restores the catalogue rows only; owned items cannot come back).
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  removed_ids constant text[] := array[
    'token_golden_crown', 'token_fireball_ludo', 'token_neon_ring', 'token_diamond_elite', 'token_phoenix_wing',
    'token_finish_polished_pearl', 'token_finish_carved_grain', 'token_finish_matte_noir', 'token_finish_rose_glass',
    'token_finish_crystal_facet', 'token_finish_chrome_mirror', 'token_finish_ice_crystal', 'token_finish_veined_marble',
    'token_finish_gem_cut', 'token_finish_molten_core', 'token_finish_engraved_lattice', 'token_finish_nebula_swirl',
    'token_finish_holographic_shift',
    'token_theme_ninja', 'token_theme_thunder_hammer', 'token_theme_super_hero', 'token_theme_arcane_wizard',
    'token_theme_star_voyager', 'token_theme_dragon_knight', 'token_theme_pirate_captain', 'token_theme_cyber_bot',
    'token_theme_samurai', 'token_theme_vampire_count', 'token_theme_desert_sultan', 'token_theme_arctic_ranger',
    'token_theme_steam_inventor', 'token_theme_jungle_scout', 'token_theme_imperial_general', 'token_theme_void_reaper'
  ];
begin
  delete from public.user_equipped_cosmetics    where cosmetic_id = any (removed_ids);
  delete from public.user_cosmetics             where cosmetic_id = any (removed_ids);
  delete from public.cosmetic_purchase_requests where cosmetic_id = any (removed_ids);
  delete from public.cosmetic_refund_requests   where cosmetic_id = any (removed_ids);
  delete from public.cosmetic_catalog           where id          = any (removed_ids);
end
$$;
