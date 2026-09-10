-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260921000000_cosmetics_remove_tables_auras_titles.sql
-- Description: Removes Table Themes, Avatar Auras, and Podium Titles from
--              the cosmetics shop by deactivating every non-default catalog
--              row in those three categories. `getCatalog()` (both
--              InMemoryCosmeticsRepository and SupabaseCosmeticsRepository)
--              already filters on `is_active = true`, so this alone removes
--              them from every shop listing/browse response.
--
--              Deliberately an UPDATE, not a DELETE:
--                - Each category's DEFAULT row (table_classic_green,
--                  aura_none, title_none) is left active. getDefaultCosmetic()
--                  and resolveEffectiveLoadout() require exactly one active
--                  default per category — every player's resolved loadout
--                  still needs a value for tableThemes/avatarAura/podiumTitle
--                  even with the shop gone.
--                - Anyone who had already purchased/equipped one of these
--                  keeps it (their `user_cosmetics` / `user_equipped_cosmetics`
--                  rows are untouched); it just can no longer be bought new.
--                - `title_early_bird` (STREAK_MILESTONE, never a shop
--                  purchase) is deactivated too, since the whole Titles tab
--                  is leaving the shop UI — the Day-7 streak grant itself
--                  (StreakService -> grant_cosmetic_entitlement) is
--                  untouched and still fires; the entitlement just has no
--                  shop UI to equip it from anymore.
-- ─────────────────────────────────────────────────────────────────────────────

update public.cosmetic_catalog
set is_active = false
where unlock_method <> 'DEFAULT'
  and category in ('TABLE_THEME', 'AVATAR_AURA', 'PODIUM_TITLE');
