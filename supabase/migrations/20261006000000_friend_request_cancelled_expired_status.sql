-- Migration: Add CANCELLED and EXPIRED statuses to friend_requests
-- Work Package: WP0 — Correct the friend lifecycle

alter table public.friend_requests drop constraint if exists friend_requests_status_check;
alter table public.friend_requests add constraint friend_requests_status_check
  check (status in ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED'));

comment on constraint friend_requests_status_check on public.friend_requests is
  'Permitted friend request lifecycle statuses including CANCELLED and EXPIRED.';
