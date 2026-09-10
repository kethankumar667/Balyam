-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260920000000_cosmetics_system.sql
-- Description: BHALYAM Cosmetic Economy Sink & Aesthetic Customization System.
--              Includes scoped catalog, user entitlements, account-scoped
--              idempotent purchase requests, game-scoped equipped slots,
--              atomic purchase RPC with wallet debit and strict zero-pay-to-win
--              presentation guarantees.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Expand coin_ledger_entries entry_type check to include COSMETIC_PURCHASE.
--    Preserves all 9 existing values intact.
alter table public.coin_ledger_entries
  drop constraint if exists coin_ledger_entries_entry_type_check;

alter table public.coin_ledger_entries
  add constraint coin_ledger_entries_entry_type_check check (entry_type in (
    'STARTER_GRANT',
    'ROOM_ENTRY_DEBIT',
    'SOLO_ENTRY_DEBIT',
    'BOT_ENTRY_DEBIT',
    'MATCH_PRIZE_CREDIT',
    'VOUCHER_REDEMPTION',
    'MATCH_REFUND',
    'ADMIN_ADJUSTMENT',
    'DAILY_REWARD_CREDIT',
    'COSMETIC_PURCHASE'
  ));

-- 2. Scoped Cosmetic Catalog Table
--    Owns dynamic attributes: pricing, active status, unlock method, display order.
create table if not exists public.cosmetic_catalog (
  id             text primary key,
  category       text not null check (category in ('TABLE_THEME', 'DICE_SKIN', 'TOKEN_SKIN', 'CARD_BACK', 'AVATAR_AURA', 'PODIUM_TITLE')),
  name           text not null,
  description    text not null,
  price_coins    bigint not null default 0 check (price_coins >= 0),
  rarity         text not null default 'COMMON' check (rarity in ('COMMON', 'RARE', 'EPIC', 'LEGENDARY')),
  unlock_method  text not null default 'COIN_PURCHASE' check (unlock_method in ('COIN_PURCHASE', 'STREAK_MILESTONE', 'DEFAULT')),
  is_active      boolean not null default true,
  display_order  integer not null default 0,
  created_at     timestamptz not null default now()
);

comment on table public.cosmetic_catalog is
  'Dynamic catalog records for BHALYAM cosmetic customizations. Prices are development-only seeds pending economy team approval.';

create index if not exists cosmetic_catalog_category_idx on public.cosmetic_catalog (category, display_order) where is_active = true;

-- 3. User Entitlements (Inventory) Table
--    Defaults are implicitly owned and NOT stored here.
create table if not exists public.user_cosmetics (
  id               bigserial primary key,
  user_id          text not null references public.player_identities (player_id) on delete cascade,
  cosmetic_id      text not null references public.cosmetic_catalog (id) on delete restrict,
  source_type      text not null default 'COIN_PURCHASE' check (source_type in ('COIN_PURCHASE', 'STREAK_MILESTONE', 'ADMIN_GRANT')),
  source_reference text,
  acquired_at      timestamptz not null default now(),

  constraint user_cosmetics_user_item_unique unique (user_id, cosmetic_id)
);

comment on table public.user_cosmetics is
  'Persistent ownership records for non-default cosmetic customizations.';

create index if not exists user_cosmetics_user_idx on public.user_cosmetics (user_id, acquired_at desc);

-- 4. Account-Scoped Idempotency Purchase Requests Table
--    Guarantees that replaying a key for the same item returns the previous result,
--    while replaying the same key for a different item raises a conflict error.
create table if not exists public.cosmetic_purchase_requests (
  user_id           text not null references public.player_identities (player_id) on delete cascade,
  idempotency_key   uuid not null,
  cosmetic_id       text not null references public.cosmetic_catalog (id) on delete restrict,
  ledger_entry_id   bigint references public.coin_ledger_entries (id) on delete set null,
  resulting_balance bigint not null,
  result            jsonb not null,
  created_at        timestamptz not null default now(),

  primary key (user_id, idempotency_key)
);

comment on table public.cosmetic_purchase_requests is
  'Account-scoped idempotency log for cosmetic purchases with stored results.';

-- 5. Game-Scoped Equipped Cosmetics Table
--    Primary key is (user_id, category, game_scope) to allow per-game card backs,
--    token skins, and table themes. Restoring default deletes the row.
create table if not exists public.user_equipped_cosmetics (
  user_id      text not null references public.player_identities (player_id) on delete cascade,
  category     text not null check (category in ('TABLE_THEME', 'DICE_SKIN', 'TOKEN_SKIN', 'CARD_BACK', 'AVATAR_AURA', 'PODIUM_TITLE')),
  game_scope   text not null default 'GLOBAL',
  cosmetic_id  text not null references public.cosmetic_catalog (id) on delete cascade,
  equipped_at  timestamptz not null default now(),

  primary key (user_id, category, game_scope)
);

comment on table public.user_equipped_cosmetics is
  'Currently equipped cosmetics per user, category, and game scope.';

create index if not exists user_equipped_cosmetics_user_idx on public.user_equipped_cosmetics (user_id);

-- 6. Row Level Security Policies
alter table public.cosmetic_catalog enable row level security;
alter table public.user_cosmetics enable row level security;
alter table public.cosmetic_purchase_requests enable row level security;
alter table public.user_equipped_cosmetics enable row level security;

-- Catalog is publicly readable for active items
create policy "active cosmetics readable by all"
  on public.cosmetic_catalog for select
  using (is_active = true);

-- Entitlements readable only by authenticated owner
create policy "own cosmetics readable"
  on public.user_cosmetics for select
  to authenticated
  using (
    user_id = auth.uid()::text or
    user_id in (select player_id from public.player_identities where auth_user_id = auth.uid())
  );

-- Purchase requests readable only by authenticated owner
create policy "own purchase requests readable"
  on public.cosmetic_purchase_requests for select
  to authenticated
  using (
    user_id = auth.uid()::text or
    user_id in (select player_id from public.player_identities where auth_user_id = auth.uid())
  );

-- Equipped cosmetics readable by authenticated users (needed for multiplayer table presentation)
create policy "equipped cosmetics readable by authenticated"
  on public.user_equipped_cosmetics for select
  to authenticated
  using (true);

-- Revoke direct mutation rights from client roles (all writes route through server-authoritative RPCs / API)
revoke insert, update, delete on public.cosmetic_catalog from anon, authenticated;
revoke insert, update, delete on public.user_cosmetics from anon, authenticated;
revoke insert, update, delete on public.cosmetic_purchase_requests from anon, authenticated;
revoke insert, update, delete on public.user_equipped_cosmetics from anon, authenticated;

grant select on public.cosmetic_catalog to anon, authenticated;
grant select on public.user_cosmetics to authenticated;
grant select on public.cosmetic_purchase_requests to authenticated;
grant select on public.user_equipped_cosmetics to authenticated;

-- 7. Secure Atomic Stored Procedures
--    `purchase_cosmetic_internal` executes the transaction under service role.
--    `purchase_cosmetic` derives identity strictly from auth.uid() and never accepts p_user_id from the client.
create or replace function public.purchase_cosmetic_internal(
  p_user_id text,
  p_cosmetic_id text,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_existing_req      public.cosmetic_purchase_requests;
  v_item              public.cosmetic_catalog;
  v_wallet            public.coin_wallets;
  v_new_balance       bigint;
  v_ledger_id         bigint;
  v_result            jsonb;
begin
  if p_user_id is null or char_length(trim(p_user_id)) = 0 then
    raise exception using
      errcode = '28000',
      message = 'AUTHENTICATION_REQUIRED: A valid user identity is required.';
  end if;

  -- 1. Check account-scoped idempotency
  select * into v_existing_req
  from public.cosmetic_purchase_requests
  where user_id = p_user_id and idempotency_key = p_idempotency_key;

  if v_existing_req.user_id is not null then
    if v_existing_req.cosmetic_id <> p_cosmetic_id then
      raise exception using
        errcode = '23505',
        message = 'IDEMPOTENCY_MISMATCH: Idempotency key replayed with a different cosmetic ID.';
    end if;
    return jsonb_set(v_existing_req.result, '{applied}', 'false'::jsonb);
  end if;

  -- 2. Verify cosmetic exists and is active in catalog
  select * into v_item
  from public.cosmetic_catalog
  where id = p_cosmetic_id and is_active = true;

  if v_item.id is null then
    raise exception using
      errcode = 'P0002',
      message = 'INVALID_COSMETIC: Cosmetic item does not exist or is inactive.';
  end if;

  if v_item.unlock_method = 'DEFAULT' then
    raise exception using
      errcode = '22000',
      message = 'CANNOT_PURCHASE_DEFAULT: Default cosmetics are available to all players without purchase.';
  end if;

  -- 3. Check if user already owns the cosmetic
  if exists (select 1 from public.user_cosmetics where user_id = p_user_id and cosmetic_id = p_cosmetic_id) then
    select balance into v_new_balance from public.coin_wallets where identity_id = p_user_id;
    v_result := jsonb_build_object(
      'applied', false,
      'code', 'ALREADY_OWNED',
      'cosmeticId', p_cosmetic_id,
      'balance', coalesce(v_new_balance, 0)::text
    );
    insert into public.cosmetic_purchase_requests (user_id, idempotency_key, cosmetic_id, resulting_balance, result)
    values (p_user_id, p_idempotency_key, p_cosmetic_id, coalesce(v_new_balance, 0), v_result);
    return v_result;
  end if;

  -- 4. Lock user wallet row for atomic debit
  select * into v_wallet
  from public.coin_wallets
  where identity_id = p_user_id
  for update;

  if v_wallet.identity_id is null then
    raise exception using
      errcode = 'P0002',
      message = 'WALLET_NOT_FOUND: User coin wallet does not exist.';
  end if;

  if v_wallet.is_frozen then
    raise exception using
      errcode = '55000',
      message = 'WALLET_FROZEN: Wallet is frozen and cannot execute purchases.';
  end if;

  if v_wallet.balance < v_item.price_coins then
    raise exception using
      errcode = '54000',
      message = 'INSUFFICIENT_FUNDS: Wallet balance is insufficient to complete this purchase.';
  end if;

  -- 5. Atomic wallet debit
  v_new_balance := v_wallet.balance - v_item.price_coins;

  update public.coin_wallets
  set balance = v_new_balance,
      version = version + 1,
      lifetime_spent = lifetime_spent + v_item.price_coins,
      updated_at = now()
  where identity_id = p_user_id;

  -- 6. Insert ledger entry
  insert into public.coin_ledger_entries (
    wallet_id,
    amount,
    balance_before,
    balance_after,
    wallet_version_before,
    wallet_version_after,
    entry_type,
    source_kind,
    source_id,
    idempotency_key,
    description
  ) values (
    p_user_id,
    -v_item.price_coins,
    v_wallet.balance,
    v_new_balance,
    v_wallet.version,
    v_wallet.version + 1,
    'COSMETIC_PURCHASE',
    'cosmetics',
    p_cosmetic_id,
    p_idempotency_key::text,
    'Purchased cosmetic: ' || v_item.name
  )
  returning id into v_ledger_id;

  -- 7. Grant persistent entitlement
  insert into public.user_cosmetics (user_id, cosmetic_id, source_type, source_reference)
  values (p_user_id, p_cosmetic_id, 'COIN_PURCHASE', p_idempotency_key::text);

  -- 8. Record in purchase requests table
  v_result := jsonb_build_object(
    'applied', true,
    'code', 'PURCHASED',
    'cosmeticId', p_cosmetic_id,
    'balance', v_new_balance::text
  );

  insert into public.cosmetic_purchase_requests (
    user_id,
    idempotency_key,
    cosmetic_id,
    ledger_entry_id,
    resulting_balance,
    result
  ) values (
    p_user_id,
    p_idempotency_key,
    p_cosmetic_id,
    v_ledger_id,
    v_new_balance,
    v_result
  );

  return v_result;
end;
$$;

revoke all on function public.purchase_cosmetic_internal(text, text, uuid) from public;
revoke all on function public.purchase_cosmetic_internal(text, text, uuid) from anon, authenticated;

-- Client-facing RPC deriving identity exclusively from auth.uid()
create or replace function public.purchase_cosmetic(
  p_cosmetic_id text,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_auth_uid uuid;
  v_user_id  text;
begin
  v_auth_uid := auth.uid();
  if v_auth_uid is null then
    raise exception using
      errcode = '28000',
      message = 'AUTHENTICATION_REQUIRED: A valid authenticated session is required to purchase cosmetics.';
  end if;

  select player_id into v_user_id
  from public.player_identities
  where auth_user_id = v_auth_uid;

  if v_user_id is null then
    v_user_id := v_auth_uid::text;
  end if;

  return public.purchase_cosmetic_internal(v_user_id, p_cosmetic_id, p_idempotency_key);
end;
$$;

revoke all on function public.purchase_cosmetic(text, uuid) from public;
grant execute on function public.purchase_cosmetic(text, uuid) to authenticated;

-- 8. Authoritative Achievement Entitlement Grant Function
--    Privileged function called only by internal server orchestration (e.g. StreakService).
create or replace function public.grant_cosmetic_entitlement(
  p_user_id text,
  p_cosmetic_id text,
  p_source_type text,
  p_source_reference text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (select 1 from public.cosmetic_catalog where id = p_cosmetic_id and is_active = true) then
    return jsonb_build_object('success', false, 'reason', 'INVALID_COSMETIC');
  end if;

  insert into public.user_cosmetics (user_id, cosmetic_id, source_type, source_reference)
  values (p_user_id, p_cosmetic_id, p_source_type, p_source_reference)
  on conflict (user_id, cosmetic_id) do nothing;

  return jsonb_build_object('success', true, 'cosmeticId', p_cosmetic_id);
end;
$$;

revoke all on function public.grant_cosmetic_entitlement(text, text, text, text) from public;

-- 9. Seed Catalog Records (Development-Only Seed Prices — Pending Economy Team Sign-Off)
insert into public.cosmetic_catalog (id, category, name, description, price_coins, rarity, unlock_method, display_order)
values
  -- Table Themes
  ('table_classic_green', 'TABLE_THEME', 'Classic Felt Green', 'Traditional gaming lounge green felt with clean stitch border.', 0, 'COMMON', 'DEFAULT', 10),
  ('table_crt_neon_90s', 'TABLE_THEME', 'CRT Cyber Neon 90s', 'Retro gridlines, arcade CRT glow, and synthwave backdrop.', 2500, 'EPIC', 'COIN_PURCHASE', 20),
  ('table_royal_mahogany', 'TABLE_THEME', 'Royal Mahogany Lounge', 'Polished mahogany wood grain with regal gold-leaf flourishes.', 5000, 'LEGENDARY', 'COIN_PURCHASE', 30),
  ('table_midnight_velvet', 'TABLE_THEME', 'Midnight Velvet', 'Deep sapphire blue velvet with soft ambient silver sheen.', 1200, 'RARE', 'COIN_PURCHASE', 40),

  -- Dice Skins
  ('dice_classic_ivory', 'DICE_SKIN', 'Classic Ivory', 'Smooth polished ivory resin with classic crimson ace pip.', 0, 'COMMON', 'DEFAULT', 10),
  ('dice_wooden_teak', 'DICE_SKIN', 'Carved Teak Wood', 'Handcrafted teak wood block with natural grain and dark burned pips.', 800, 'COMMON', 'COIN_PURCHASE', 20),
  ('dice_golden_ember', 'DICE_SKIN', 'Golden Ember Dice', 'Solid molten gold cube with ember heat glows and spark trails.', 3500, 'EPIC', 'COIN_PURCHASE', 30),
  ('dice_cyber_neon', 'DICE_SKIN', 'Cyber Neon Obsidian', 'Matte obsidian body with electric cyan and magenta luminescent pips.', 5000, 'LEGENDARY', 'COIN_PURCHASE', 40),

  -- Token Skins (Ludo)
  ('token_classic_pawn', 'TOKEN_SKIN', 'Standard Pawn', 'Traditional 3D molded tournament pawn token.', 0, 'COMMON', 'DEFAULT', 10),
  ('token_golden_crown', 'TOKEN_SKIN', 'Golden Crown Pawn', 'Crown-topped pawn adorned with royal gold trim.', 3000, 'EPIC', 'COIN_PURCHASE', 20),
  ('token_fireball_ludo', 'TOKEN_SKIN', 'Solar Flare Token', 'Corona flame ring orbiting a polished cosmic sphere.', 4500, 'LEGENDARY', 'COIN_PURCHASE', 30),
  ('token_neon_ring', 'TOKEN_SKIN', 'Cyber Pulse Ring', 'Neon ring hovering around the base of the player token.', 1500, 'RARE', 'COIN_PURCHASE', 40),

  -- Card Backs
  ('cardback_classic_navy', 'CARD_BACK', 'Classic Navy Mandala', 'Traditional Indian card room navy back with geometric mandala.', 0, 'COMMON', 'DEFAULT', 10),
  ('cardback_classic_uno', 'CARD_BACK', 'Classic Red Oval', 'Iconic red oval card back.', 0, 'COMMON', 'DEFAULT', 15),
  ('cardback_vintage_velvet_rummy', 'CARD_BACK', 'Baroque Vintage Velvet', 'Wine-red velvet background with intricate 24K gold filigree.', 2000, 'RARE', 'COIN_PURCHASE', 20),
  ('cardback_neon_cyber_uno', 'CARD_BACK', 'Synthwave Grid Cyber', 'Futuristic neon horizon card back with retro 80s sunburst.', 3500, 'EPIC', 'COIN_PURCHASE', 30),

  -- Avatar Auras
  ('aura_none', 'AVATAR_AURA', 'No Aura', 'Standard clean avatar border.', 0, 'COMMON', 'DEFAULT', 10),
  ('aura_radiant_vanguard', 'AVATAR_AURA', 'Radiant Vanguard Aura', 'Solar sunburst golden ring softly pulsing around your profile.', 4000, 'EPIC', 'COIN_PURCHASE', 20),
  ('aura_ludo_king', 'AVATAR_AURA', 'Royal Monarch Halo', 'Crimson and gold dual orbiting planetary rings.', 6000, 'LEGENDARY', 'COIN_PURCHASE', 30),
  ('aura_rummy_maestro', 'AVATAR_AURA', 'Arcane Emerald Shimmer', 'Glowing emerald runes floating in a hypnotic ambient swirl.', 3500, 'EPIC', 'COIN_PURCHASE', 40),

  -- Podium Titles
  ('title_none', 'PODIUM_TITLE', 'Contender', 'Standard match participant title.', 0, 'COMMON', 'DEFAULT', 10),
  ('title_early_bird', 'PODIUM_TITLE', 'Early Bird', 'Earned by completing a 7-day daily login streak.', 0, 'RARE', 'STREAK_MILESTONE', 20),
  ('title_table_master', 'PODIUM_TITLE', 'Table Master', 'Recognized veteran of the BHALYAM lounge tables.', 2500, 'RARE', 'COIN_PURCHASE', 30),
  ('title_grandmaster', 'PODIUM_TITLE', 'Grandmaster', 'Elite lounge title displayed on victory podiums and player lists.', 10000, 'LEGENDARY', 'COIN_PURCHASE', 40)
on conflict (id) do nothing;
