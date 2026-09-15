-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260929000000_cosmetics_token_curation.sql
-- Description: Curates the Token Skin shop down to its strongest designs.
--              Between the legacy accessory skins, the 13 material-finish
--              skins, and the 16 character-theme skins, the Token tab had
--              grown to 35 items — many of the material finishes read as too
--              subtle or too similar to each other at real in-game pawn
--              size, especially next to the bold character-theme icons.
--              Deactivates the 7 weakest/most redundant designs:
--                - token_neon_ring (Cyber Pulse Ring) — just a glow ring,
--                  the least distinctive of the 5 legacy accessories.
--                - token_finish_polished_pearl — too close to the plain
--                  default gloss to read as a distinct purchase.
--                - token_finish_carved_grain — subtle grain lines, easily
--                  missed at board scale.
--                - token_finish_matte_noir — a flat matte look reads as
--                  "no finish" to most players.
--                - token_finish_rose_glass — redundant with the stronger
--                  crystalFacet/gemCut glass aesthetic.
--                - token_finish_veined_marble — subtle veining, easily
--                  missed at board scale.
--                - token_finish_nebula_swirl — even after a visual polish
--                  pass this session, still the weakest reader of the
--                  finish set at small size.
--
--              Deliberately an UPDATE, not a DELETE — same precedent as
--              20260921000000_cosmetics_remove_tables_auras_titles.sql:
--              anyone who already purchased/equipped one of these keeps it
--              (their user_cosmetics / user_equipped_cosmetics rows are
--              untouched); it just can no longer be bought new.
--              `getCatalog()` already filters on `is_active = true`, so
--              this alone removes them from shop listing/browse.
-- ─────────────────────────────────────────────────────────────────────────────

update public.cosmetic_catalog
set is_active = false
where id in (
  'token_neon_ring',
  'token_finish_polished_pearl',
  'token_finish_carved_grain',
  'token_finish_matte_noir',
  'token_finish_rose_glass',
  'token_finish_veined_marble',
  'token_finish_nebula_swirl'
);
