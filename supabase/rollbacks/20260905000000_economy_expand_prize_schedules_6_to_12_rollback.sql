-- Rollback for 20260905000000_economy_expand_prize_schedules_6_to_12.sql
--
-- Reverts seat_count check constraints back to [1..5] and removes the
-- schedules for seat counts 6..12.

delete from public.economy_prize_schedules
where config_version = 1 and seat_count between 6 and 12;

alter table public.economy_prize_schedules
  drop constraint if exists economy_prize_schedules_seat_count_check;

alter table public.economy_prize_schedules
  add constraint economy_prize_schedules_seat_count_check check (seat_count between 1 and 5);

alter table public.match_economy_settlements
  drop constraint if exists match_economy_settlements_seat_count_check;

alter table public.match_economy_settlements
  add constraint match_economy_settlements_seat_count_check check (seat_count between 1 and 5);

alter table public.match_economy_participants
  drop constraint if exists match_economy_participants_placement_check;

alter table public.match_economy_participants
  add constraint match_economy_participants_placement_check check (placement between 1 and 5);
