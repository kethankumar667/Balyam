-- Guest prizes go to the wallet.
--
-- Until now a guest who won a prize was not paid: the coins were sealed in a one-time
-- "voucher" the guest had to carry to an account and redeem. This replaces that. A guest
-- winner is credited to their wallet in the same transaction as a member, with the same
-- "Match Prize" ledger row, so a guest sees what they won straight away and can spend it on
-- their next room.
--
-- Only the settlement function changes, and only its guest branch:
--   * the guest-voucher / guest-escrow branch is gone; a guest takes the member branch;
--   * the participant row records identity_kind 'guest' with payout_status PAID_WALLET;
--   * total_guest_escrow is therefore always 0 from here on. The column and the
--     conservation check (collected = wallet + guest escrow + bot + world bank) are left
--     exactly as they were, so history and the check both still hold.
--
-- Same 6-parameter signature and grants as 20260909000000, so the 4-parameter wrapper keeps
-- delegating to it untouched. A losing guest's stake stays in the pool and is paid out to the
-- placing winners exactly as it is for a member; the house cut is unchanged.
--
-- Not done here: the voucher tables and the redeem / issue functions are left in place, unused,
-- until the application code that referenced them is gone (a later migration drops them).
-- Vouchers issued before this migration remain redeemable until then.
--
-- Re-runnable (create or replace).

create or replace function public.settle_match_economy(
  p_match_id             text,
  p_is_valid_ranking     boolean,
  p_participants         jsonb,
  p_refund_reason        text default null,
  p_prize_by_placement   jsonb default null,
  p_world_bank_cut_coins bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_settlement            public.match_economy_settlements;
  v_wb                    public.world_bank_accounts;
  v_participant           jsonb;
  v_identity_id           text;
  v_identity_kind         text;
  v_placement             integer;
  v_prize                 bigint;
  v_wallet                public.coin_wallets;
  v_1st_prize             bigint;
  v_2nd_prize             bigint;
  v_3rd_prize             bigint;
  v_base_wb_cut           bigint;
  v_total_wallet_rewarded bigint := 0;
  v_total_guest_escrow    bigint := 0;
  v_total_bot_collection  bigint := 0;
  v_total_world_bank_cut  bigint := 0;
  v_idempotency           text := 'match-settlement:' || p_match_id;
  v_balance_before        bigint;
  v_version_before        bigint;
  v_wb_balance_before     bigint;
  v_solo                  boolean;
  v_metadata              jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended(v_idempotency, 0));

  select * into v_settlement from public.match_economy_settlements where match_id = p_match_id for update;
  if not found then
    raise exception 'MATCH_NOT_COMMITTED: match settlement % not found', p_match_id;
  end if;

  if v_settlement.status in ('SETTLED', 'REFUNDED') then
    return jsonb_build_object(
      'applied', false,
      'operation', 'settle_match_economy',
      'idempotencyKey', v_idempotency,
      'result', public.settlement_to_safe_jsonb(v_settlement)
    );
  end if;

  if not coalesce(p_is_valid_ranking, false) then
    return public.economy_apply_refund(v_settlement, v_idempotency, coalesce(p_refund_reason, 'Invalid or tied authoritative result'));
  end if;

  v_solo := v_settlement.seat_count = 1;
  v_metadata := jsonb_build_object('gameKind', v_settlement.game_kind);

  if p_prize_by_placement is not null then
    if p_world_bank_cut_coins is null then
      raise exception 'INVALID_SETTLEMENT_CREDITS: p_world_bank_cut_coins is required whenever p_prize_by_placement is provided';
    end if;
    v_1st_prize   := coalesce((p_prize_by_placement->>0)::bigint, 0);
    v_2nd_prize   := coalesce((p_prize_by_placement->>1)::bigint, 0);
    v_3rd_prize   := coalesce((p_prize_by_placement->>2)::bigint, 0);
    v_base_wb_cut := p_world_bank_cut_coins;
  else
    -- ── Legacy fixed-schedule path — unchanged from before this migration ──
    v_1st_prize   := coalesce((v_settlement.prize_schedule_snapshot->>'first_place_coins')::bigint, 0);
    v_2nd_prize   := coalesce((v_settlement.prize_schedule_snapshot->>'second_place_coins')::bigint, 0);
    v_3rd_prize   := coalesce((v_settlement.prize_schedule_snapshot->>'third_place_coins')::bigint, 0);
    v_base_wb_cut := coalesce((v_settlement.prize_schedule_snapshot->>'world_bank_coins')::bigint, 0);
  end if;

  for v_participant in select * from jsonb_array_elements(coalesce(p_participants, '[]'::jsonb)) loop
    v_identity_id   := v_participant->>'identityId';
    v_identity_kind := v_participant->>'identityKind';
    v_placement     := (v_participant->>'placement')::integer;

    v_prize := case
      when v_placement = 1 then v_1st_prize
      when v_placement = 2 then v_2nd_prize
      when v_placement = 3 then v_3rd_prize
      else 0
    end;

    if v_identity_kind in ('member', 'guest') then
      if v_prize > 0 then
        perform public.ensure_wallet(v_identity_id);
        select * into v_wallet from public.coin_wallets where identity_id = v_identity_id for update;
        v_balance_before := v_wallet.balance;
        v_version_before := v_wallet.version;

        update public.coin_wallets
        set balance = balance + v_prize, version = version + 1, lifetime_earned = lifetime_earned + v_prize, updated_at = now()
        where identity_id = v_identity_id
        returning * into v_wallet;

        insert into public.coin_ledger_entries (
          wallet_id, amount, balance_before, balance_after, wallet_version_before, wallet_version_after,
          entry_type, source_kind, source_id, idempotency_key, description, metadata
        ) values (
          v_identity_id, v_prize, v_balance_before, v_wallet.balance, v_version_before, v_wallet.version,
          'MATCH_PRIZE_CREDIT', 'match', p_match_id, v_idempotency || ':credit:' || v_identity_id,
          'Match placement ' || v_placement || ' prize', v_metadata
        );

        v_total_wallet_rewarded := v_total_wallet_rewarded + v_prize;

        insert into public.match_economy_participants (match_id, identity_id, identity_kind, placement, prize_coins, payout_status)
        values (p_match_id, v_identity_id, v_identity_kind, v_placement, v_prize, 'PAID_WALLET');
      else
        insert into public.match_economy_participants (match_id, identity_id, identity_kind, placement, prize_coins, payout_status)
        values (p_match_id, v_identity_id, v_identity_kind, v_placement, 0, 'NO_PRIZE');
      end if;

    elsif v_identity_kind = 'bot' then
      if v_prize > 0 then
        select * into v_wb from public.world_bank_accounts where id = 'primary' for update;
        v_wb_balance_before := v_wb.bot_prize_revenue;

        update public.world_bank_accounts
        set bot_prize_revenue = bot_prize_revenue + v_prize, updated_at = now()
        where id = 'primary'
        returning * into v_wb;

        insert into public.world_bank_ledger (
          account_id, affected_balance, amount, balance_before, balance_after,
          entry_type, source_kind, source_id, idempotency_key, description
        ) values (
          'primary', 'bot_prize_revenue', v_prize, v_wb_balance_before, v_wb.bot_prize_revenue,
          'BOT_PRIZE_REVENUE', 'match', p_match_id, v_idempotency || ':bot:' || v_placement,
          'Bot placement ' || v_placement || ' prize collection'
        );

        v_total_bot_collection := v_total_bot_collection + v_prize;

        insert into public.match_economy_participants (match_id, identity_id, identity_kind, placement, prize_coins, payout_status)
        values (p_match_id, v_identity_id, 'bot', v_placement, v_prize, 'BOT_TO_WORLD_BANK');
      else
        insert into public.match_economy_participants (match_id, identity_id, identity_kind, placement, prize_coins, payout_status)
        values (p_match_id, v_identity_id, 'bot', v_placement, 0, 'NO_PRIZE');
      end if;
    else
      raise exception 'INVALID_IDENTITY_KIND: participant identityKind must be member, guest, or bot (got %)',
        coalesce(v_identity_kind, 'null');
    end if;
  end loop;

  if v_base_wb_cut > 0 then
    select * into v_wb from public.world_bank_accounts where id = 'primary' for update;
    v_wb_balance_before := v_wb.base_fee_revenue;

    update public.world_bank_accounts
    set base_fee_revenue = base_fee_revenue + v_base_wb_cut, updated_at = now()
    where id = 'primary'
    returning * into v_wb;

    insert into public.world_bank_ledger (
      account_id, affected_balance, amount, balance_before, balance_after,
      entry_type, source_kind, source_id, idempotency_key, description
    ) values (
      'primary', 'base_fee_revenue', v_base_wb_cut, v_wb_balance_before, v_wb.base_fee_revenue,
      case when v_solo then 'SOLO_ENTRY_COLLECTION' else 'BASE_FEE_REVENUE' end,
      'match', p_match_id, v_idempotency || ':world-bank',
      case when v_solo then 'Solo session fee collection' else 'Base room house cut (' || v_settlement.seat_count || ' seats)' end
    );

    v_total_world_bank_cut := v_base_wb_cut;
  end if;

  if v_settlement.total_collected <> (v_total_wallet_rewarded + v_total_guest_escrow + v_total_bot_collection + v_total_world_bank_cut) then
    raise exception 'SETTLEMENT_CONSERVATION_VIOLATION: collected % does not equal disbursed %',
      v_settlement.total_collected, (v_total_wallet_rewarded + v_total_guest_escrow + v_total_bot_collection + v_total_world_bank_cut);
  end if;

  update public.match_economy_settlements
  set total_wallet_rewarded = v_total_wallet_rewarded,
      total_guest_escrow    = v_total_guest_escrow,
      total_bot_collection  = v_total_bot_collection,
      total_world_bank_cut  = v_total_world_bank_cut,
      status                = 'SETTLED',
      settled_at            = now(),
      updated_at            = now()
  where match_id = p_match_id
  returning * into v_settlement;

  return jsonb_build_object(
    'applied', true,
    'operation', 'settle_match_economy',
    'idempotencyKey', v_idempotency,
    'result', public.settlement_to_safe_jsonb(v_settlement)
  );
end;
$$;

revoke all on function public.settle_match_economy(text, boolean, jsonb, text, jsonb, bigint) from public, anon, authenticated;
grant execute on function public.settle_match_economy(text, boolean, jsonb, text, jsonb, bigint) to service_role;
