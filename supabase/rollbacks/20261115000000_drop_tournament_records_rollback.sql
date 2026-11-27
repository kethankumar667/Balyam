-- Rollback of 20261115000000_drop_tournament_records.sql.
--
-- Puts back the EMPTY `tournament_records` table with the shape, index, row-level security and
-- `updated_at` trigger it had in 20260818000000. It cannot bring back the rows the migration
-- deleted; restore those from a backup taken before the migration if they matter.
--
-- Use it only together with a server build that still has the Tournaments code. The current
-- server never reads or writes this table.

create table if not exists public.tournament_records (
  tournament_id   text not null,
  player_id       text not null references public.player_identities (player_id) on delete cascade,
  tournament_name text,
  game            text,
  placement       integer,
  status          text not null default 'REGISTERED'
                    check (status in ('REGISTERED', 'CHECKED_IN', 'ELIMINATED', 'WINNER', 'WITHDRAWN')),
  recorded_at     timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  primary key (tournament_id, player_id)
);

comment on table public.tournament_records is
  'A player''s outcome in one tournament. The composite primary key makes double registration impossible rather than merely unlikely.';

create index if not exists tournament_records_player_idx
  on public.tournament_records (player_id, recorded_at desc);

-- Row-level security, as in 20260818000000: enabled and forced, nothing readable by anon, and a
-- member may read only their own rows.
alter table public.tournament_records enable row level security;
alter table public.tournament_records force row level security;
revoke all on table public.tournament_records from public, anon, authenticated;

drop policy if exists "own rows readable" on public.tournament_records;
create policy "own rows readable" on public.tournament_records
  for select to authenticated using (public.owns_player_row(player_id));
grant select on table public.tournament_records to authenticated;

drop trigger if exists touch_tournament_records_updated_at on public.tournament_records;
create trigger touch_tournament_records_updated_at before update on public.tournament_records
  for each row execute function public.touch_updated_at();

notify pgrst, 'reload schema';
