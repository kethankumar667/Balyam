-- ═══════════════════════════════════════════════════════════════════════
-- Economy V1 — Expand Prize Schedules and Seat Constraints to 12 Seats
-- ═══════════════════════════════════════════════════════════════════════
--
-- Migration: 20260905000000_economy_expand_prize_schedules_6_to_12.sql
-- Status: Additive to 20260826000000_economy_v1.sql and
-- 20260829000000_economy_seat_capacity_contract.sql.
--
-- Purpose:
-- Resolves production failure when rooms have >5 players (e.g. 6-player Rummy,
-- 8-player Ludo/WordBuilding, 10-player UNO, 12-player Tambola).
-- Relaxes check constraints on economy tables from [1..5] to [1..12] and inserts
-- authoritative, conserving payout schedules for seat counts 6 through 12.

-- 1. Relax CHECK constraint on economy_prize_schedules (seat_count)
alter table public.economy_prize_schedules
  drop constraint if exists economy_prize_schedules_seat_count_check;

alter table public.economy_prize_schedules
  add constraint economy_prize_schedules_seat_count_check check (seat_count between 1 and 12);

-- 2. Relax CHECK constraint on match_economy_settlements (seat_count)
alter table public.match_economy_settlements
  drop constraint if exists match_economy_settlements_seat_count_check;

alter table public.match_economy_settlements
  add constraint match_economy_settlements_seat_count_check check (seat_count between 1 and 12);

-- 3. Relax CHECK constraint on match_economy_participants (placement)
alter table public.match_economy_participants
  drop constraint if exists match_economy_participants_placement_check;

alter table public.match_economy_participants
  add constraint match_economy_participants_placement_check check (placement between 1 and 12);

-- 4. Seed Conserving Prize Schedules for Seat Counts 6 through 12
-- Formula:
--   collected_coins = 100 * seat_count
--   world_bank_coins = 20% of pot (platform reserve)
--   prize_pool = 80% of pot -> 1st: 50% (40% total), 2nd: 30% (24% total), 3rd: 20% (16% total)
--   conservation check: collected_coins = 1st + 2nd + 3rd + world_bank
insert into public.economy_prize_schedules (
  config_version, seat_count, collected_coins, first_place_coins, second_place_coins, third_place_coins, world_bank_coins
)
values
  (1, 6,  600,  240, 144, 96,  120),
  (1, 7,  700,  280, 168, 112, 140),
  (1, 8,  800,  320, 192, 128, 160),
  (1, 9,  900,  360, 216, 144, 180),
  (1, 10, 1000, 400, 240, 160, 200),
  (1, 11, 1100, 440, 264, 176, 220),
  (1, 12, 1200, 480, 288, 192, 240)
on conflict (config_version, seat_count) do update set
  collected_coins    = excluded.collected_coins,
  first_place_coins  = excluded.first_place_coins,
  second_place_coins = excluded.second_place_coins,
  third_place_coins  = excluded.third_place_coins,
  world_bank_coins   = excluded.world_bank_coins;
