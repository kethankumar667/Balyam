-- ─────────────────────────────────────────────────────────────────
-- Migration: 20261103000000_avatar_frames.sql
-- Description: Puts Avatar Frames on sale — 20 distinct animated designs
--              (client/src/components/cosmetics/frames/), one row each. They use
--              the existing AVATAR_AURA category, so no schema change: the table's
--              category check, the equip endpoint and the seat-presentation
--              ownership check all already cover it. The earlier migration
--              20260921000000 switched the three legacy aura rings off; those stay off.
--              Each row mirrors an entry in the closed-set registry
--              (shared/cosmetics.ts BHALYAM_COSMETIC_REGISTRY): CosmeticsService
--              .assertCatalogIntegrity() refuses to boot if a catalog row has no
--              registry entry, and assertRarityPricing() refuses to boot if a price
--              falls outside its rarity band, so this list must stay identical to the
--              in-memory seed (server/src/cosmetics/InMemoryCosmeticsRepository.ts).
--              Prices are development seed values pending economy sign-off.
--              Rollback: supabase/rollbacks/20261103000000_avatar_frames.sql
-- ─────────────────────────────────────────────────────────────────

insert into public.cosmetic_catalog (id, category, name, description, price_coins, rarity, unlock_method, display_order)
values
  ('frame_bubble_float', 'AVATAR_AURA', 'Bubble Float', 'Soap bubbles of every size drifting round your avatar.', 600, 'COMMON', 'COIN_PURCHASE', 100),
  ('frame_prism_spinner', 'AVATAR_AURA', 'Prism Spinner', 'Every colour of the rainbow turning like a colour wheel.', 800, 'COMMON', 'COIN_PURCHASE', 110),
  ('frame_cuddly_cat_ears', 'AVATAR_AURA', 'Cuddly Cat Ears', 'A pair of twitching cat ears and paw prints along the bottom.', 900, 'COMMON', 'COIN_PURCHASE', 120),
  ('frame_marigold_garland', 'AVATAR_AURA', 'Marigold Garland', 'A festival garland of orange and gold marigolds, swaying gently.', 1000, 'COMMON', 'COIN_PURCHASE', 130),
  ('frame_pixel_arcade', 'AVATAR_AURA', 'Pixel Arcade', 'A retro arcade border of coloured squares with a chasing light.', 1400, 'RARE', 'COIN_PURCHASE', 140),
  ('frame_diya_glow', 'AVATAR_AURA', 'Diya Glow', 'Eight little clay lamps with flickering flames and a warm glow.', 1600, 'RARE', 'COIN_PURCHASE', 150),
  ('frame_star_orbit', 'AVATAR_AURA', 'Star Orbit', 'A star, a ringed planet and a moon circling at their own speeds.', 1800, 'RARE', 'COIN_PURCHASE', 160),
  ('frame_tidal_waves', 'AVATAR_AURA', 'Tidal Waves', 'Three rings of rolling water with droplets bobbing at the surface.', 2000, 'RARE', 'COIN_PURCHASE', 170),
  ('frame_frost_crystals', 'AVATAR_AURA', 'Frost Crystals', 'An icy ring of crystals with snowflake sparkles blinking on and off.', 2200, 'RARE', 'COIN_PURCHASE', 180),
  ('frame_cricket_seam', 'AVATAR_AURA', 'Cricket Seam', 'A red leather seam with white stitching, turning as if in flight.', 2400, 'RARE', 'COIN_PURCHASE', 190),
  ('frame_neon_tube', 'AVATAR_AURA', 'Neon Tube', 'Two bent glass tubes lit like a shop sign, one pink and one cyan.', 2600, 'RARE', 'COIN_PURCHASE', 200),
  ('frame_rangoli_mandala', 'AVATAR_AURA', 'Rangoli Mandala', 'A floor-pattern ring of coloured-powder diamonds and dots, turning slowly.', 3000, 'EPIC', 'COIN_PURCHASE', 210),
  ('frame_blaze_ring', 'AVATAR_AURA', 'Blaze Ring', 'A ring of fire whose ragged edge rolls round the avatar.', 3200, 'EPIC', 'COIN_PURCHASE', 220),
  ('frame_storm_arc', 'AVATAR_AURA', 'Storm Arc', 'A dark storm band with lightning bolts that strike out of turn.', 3400, 'EPIC', 'COIN_PURCHASE', 230),
  ('frame_clockwork_gears', 'AVATAR_AURA', 'Clockwork Gears', 'A brass rail with three meshing gears turning one way and the next.', 3600, 'EPIC', 'COIN_PURCHASE', 240),
  ('frame_victory_laurel', 'AVATAR_AURA', 'Victory Laurel', 'A golden laurel wreath from a red bow to a star, shimmering leaf by leaf.', 3800, 'EPIC', 'COIN_PURCHASE', 250),
  ('frame_peacock_plume', 'AVATAR_AURA', 'Peacock Plume', 'A fan of peacock feathers, each with its blue-and-gold eye, rocking gently.', 4000, 'EPIC', 'COIN_PURCHASE', 260),
  ('frame_royal_crown', 'AVATAR_AURA', 'Royal Crown', 'A jewelled gold crown floating above a ring that a highlight sweeps round.', 5000, 'LEGENDARY', 'COIN_PURCHASE', 270),
  ('frame_dragon_coil', 'AVATAR_AURA', 'Dragon Coil', 'A green dragon curled round the avatar, scales sliding, breathing a puff of fire.', 6000, 'LEGENDARY', 'COIN_PURCHASE', 280),
  ('frame_galaxy_portal', 'AVATAR_AURA', 'Galaxy Portal', 'A swirling portal of racing light with stars blinking in the glow.', 7000, 'LEGENDARY', 'COIN_PURCHASE', 290)
on conflict (id) do nothing;
