-- Align the sixteen Color Cards backs with client/src/lib/unoCardBackArt.ts.
-- Description-only: preserve IDs, prices, availability and every ownership link.
-- Preserve operator-edited copy; also accept the interim UNO -> card wording.
-- Rollback: supabase/rollbacks/20261105000000_card_back_descriptions.sql.
with copy(id, old_description, new_description) as (
  values
    ('cardback_retro_blocks_uno', 'Flat retro color blocks scattered across a clean white field.', 'Tilted color blocks on a cream field with a geometric rosette.'),
    ('cardback_brush_strokes_uno', 'Bold diagonal paint strokes in every UNO color.', 'Diagonal four-color stripes on a cream field with a geometric rosette.'),
    ('cardback_hazard_stripes_uno', 'Bold black-and-gold caution stripes with a punchy logo.', 'Diagonal amber stripes on a dark field with a geometric rosette.'),
    ('cardback_confetti_shapes_uno', 'Scattered colorful shapes and confetti on jet black.', 'Colorful circles, squares and triangles on a dark field with a geometric rosette.'),
    ('cardback_pigment_blast_uno', 'A rainbow pigment explosion bursting from the center.', 'Four-color geometric rays radiating from a central rosette.'),
    ('cardback_rainbow_swirl_uno', 'Painterly rainbow brush strokes swirling across black.', 'Overlapping four-color elliptical rings on a dark field with a geometric rosette.'),
    ('cardback_action_pack_uno', 'Skip, Reverse, and Wild icons scattered across the back.', 'Tilted neon color blocks on a dark field with a geometric rosette.'),
    ('cardback_prism_shatter_uno', 'A shattered low-poly prism of every UNO color.', 'Overlapping four-color triangles on a dark field with a geometric rosette.'),
    ('cardback_emerald_leaf_uno', 'Sweeping emerald leaf fronds curling across black.', 'Emerald petal shapes around a geometric rosette on a deep green field.'),
    ('cardback_deep_blue_vortex_uno', 'A deep blue vortex swirling behind the classic logo.', 'Overlapping blue elliptical rings around a geometric rosette on navy.'),
    ('cardback_crimson_vortex_uno', 'A blazing crimson vortex swirling behind the classic logo.', 'Overlapping crimson elliptical rings around a geometric rosette on dark red.'),
    ('cardback_splash_burst_uno', 'A symmetric multicolor paint splatter bursting outward.', 'Neon geometric rays radiating from a central rosette on a dark field.'),
    ('cardback_golden_eclipse_uno', 'Polished gold bands eclipsing a starlit black field.', 'Overlapping gold elliptical rings around a geometric rosette on a dark field.'),
    ('cardback_neon_vortex_uno', 'Glowing neon light trails spiraling into a vortex.', 'Overlapping neon elliptical rings around a geometric rosette on a dark field.'),
    ('cardback_gilded_swirl_uno', 'A gleaming gold swirl over a dotted midnight backdrop.', 'Overlapping gold elliptical rings around a geometric rosette on deep brown.'),
    ('cardback_neon_streak_uno', 'Multicolor neon light streaks racing around the logo.', 'Curved neon light trails across a dark field with a geometric rosette.')
)
update public.cosmetic_catalog as c
set description = copy.new_description
from copy
where c.id = copy.id
  and c.category = 'CARD_BACK'
  and c.description in (copy.old_description, replace(copy.old_description, 'UNO', 'card'));
