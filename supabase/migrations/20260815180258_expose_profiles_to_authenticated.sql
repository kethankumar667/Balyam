-- BHALYAM accounts: expose profiles through the Data API
-- Only authenticated users can reach the table.
-- RLS remains responsible for restricting rows.

grant select, insert, update
on table public.profiles
to authenticated;