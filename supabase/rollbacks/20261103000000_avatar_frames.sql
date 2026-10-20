-- Rollback for 20261103000000_avatar_frames.sql
--
-- Deactivates the 20 avatar frames instead of deleting them, so a player who already
-- bought one keeps it in their inventory (the catalog row is what an owned item
-- points at). They simply stop appearing in the shop.

update public.cosmetic_catalog
   set is_active = false
 where id in (
  'frame_bubble_float',
  'frame_prism_spinner',
  'frame_cuddly_cat_ears',
  'frame_marigold_garland',
  'frame_pixel_arcade',
  'frame_diya_glow',
  'frame_star_orbit',
  'frame_tidal_waves',
  'frame_frost_crystals',
  'frame_cricket_seam',
  'frame_neon_tube',
  'frame_rangoli_mandala',
  'frame_blaze_ring',
  'frame_storm_arc',
  'frame_clockwork_gears',
  'frame_victory_laurel',
  'frame_peacock_plume',
  'frame_royal_crown',
  'frame_dragon_coil',
  'frame_galaxy_portal'
);
