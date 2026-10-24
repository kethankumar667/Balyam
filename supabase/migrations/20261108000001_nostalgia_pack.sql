insert into public.cosmetic_catalog
  (id, category, name, description, price_coins, rarity, unlock_method, is_active, display_order)
values
  ('aura_nostalgia_gold', 'AVATAR_AURA', 'Golden Reunion', 'A warm gold aura earned by bringing three new friends to play.', 0, 'RARE', 'REFERRAL_MILESTONE', true, 900),
  ('title_gang_leader', 'PODIUM_TITLE', 'Gang Leader', 'A social title earned through three qualifying friend invitations.', 0, 'RARE', 'REFERRAL_MILESTONE', true, 910),
  ('table_retro_school_slate', 'TABLE_THEME', 'School Slate', 'A chalk-lined slate surface for your classic Rummy table. Host-selected worlds take priority.', 0, 'RARE', 'REFERRAL_MILESTONE', true, 920);
insert into public.referral_campaign(id, enabled) values ('nostalgia-v1', true);
