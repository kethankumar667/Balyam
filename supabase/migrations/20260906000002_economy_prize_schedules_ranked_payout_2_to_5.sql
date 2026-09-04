-- ═══════════════════════════════════════════════════════════════════════
-- Economy V1 — Standardize 2-5 Seat Prize Schedules on the Ranked Payout
-- Formula Already Used for 6-12 Seats
-- ═══════════════════════════════════════════════════════════════════════
--
-- Migration: 20260906000002_economy_prize_schedules_ranked_payout_2_to_5.sql
-- Status: Additive to 20260826000000_economy_v1.sql (original seed) and
-- 20260905000000_economy_expand_prize_schedules_6_to_12.sql (which already
-- introduced this exact formula for 6-12 seats).
--
-- Purpose:
-- The original 2026-08-26 seed paid 2-5 seat tables a flatter, inconsistent
-- cut (10-25% platform take depending on seat count, prize split roughly
-- proportional to seats played rather than ranked). The 2026-09-05 seat-6..12
-- expansion introduced a cleaner, product-approved rule and applied it only
-- to the NEW seat counts. This migration applies that SAME rule retroactively
-- to seat counts 2 through 5, so every seat count from 2 to 12 now follows
-- one consistent formula. Seat count 1 (solo) is untouched — 100% to World
-- Bank, unrelated to ranked multiplayer payout.
--
-- Formula (identical to the 6-12 migration):
--   collected_coins  = 100 * seat_count
--   world_bank_coins = 20% of pot (platform reserve)
--   prize_pool       = 80% of pot, split by rank:
--     3+ winners (4-5 seats): 1st 50% / 2nd 30% / 3rd 20% of the pool
--     2 winners   (3 seats):  1st 62.5% / 2nd 37.5% of the pool (no 3rd place exists)
--     1 winner    (2 seats):  1st 100% of the pool (no 2nd/3rd place exists)
--   conservation check: collected_coins = 1st + 2nd + 3rd + world_bank
insert into public.economy_prize_schedules (
  config_version, seat_count, collected_coins, first_place_coins, second_place_coins, third_place_coins, world_bank_coins
)
values
  (1, 2, 200, 160, 0,  0,  40),
  (1, 3, 300, 150, 90, 0,  60),
  (1, 4, 400, 160, 96, 64, 80),
  (1, 5, 500, 200, 120, 80, 100)
on conflict (config_version, seat_count) do update set
  collected_coins    = excluded.collected_coins,
  first_place_coins  = excluded.first_place_coins,
  second_place_coins = excluded.second_place_coins,
  third_place_coins  = excluded.third_place_coins,
  world_bank_coins   = excluded.world_bank_coins;
