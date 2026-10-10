-- One mailbox, one account.
--
-- Supabase already refuses a second account for the SAME email text. It does not
-- know that Kethan.K@gmail.com, kethank@gmail.com, kethank+2@gmail.com and
-- kethank@googlemail.com are one inbox, so five "different" addresses can be made
-- from one Gmail in a minute. This closes that, where it cannot be bypassed: a
-- trigger on auth.users, the single table every signup path (email + password,
-- Google, an email change) writes to. It cannot be edited out of a browser, and it
-- does not depend on the server being asked.
--
--   1. canonical_email(): one mailbox, one spelling — lower-cased, a +tag dropped,
--      dots ignored and googlemail.com folded into gmail.com for Gmail only (on
--      other providers a dot makes a different mailbox).
--   2. account_emails: one row per canonical address, owned by one user. Closed to
--      every client role; only the server and this trigger ever touch it.
--   3. blocked_email_domains: throwaway-mail services. An operator can add to it.
--   4. guard_account_email(): runs right after an insert, or an update OF email, and
--      refuses the second account (raising rolls the whole statement back). A refused change leaves the person's old
--      address registered to them.
--
-- What this does not do, and nothing in a database can: tell that two genuinely
-- different mailboxes belong to one person. Five real addresses are five accounts.
-- The carry-over rules (one guest per account, held and capped by trust tier) are
-- what make that not worth doing.
--
-- Existing accounts are never touched. Where two already collide, the earliest owns
-- the address and the later one keeps working; it simply cannot be the one a third
-- account is compared against. 20261012000000 and earlier migrations are not edited.
--
-- Re-runnable. Apply BEFORE deploying the client that explains the refusal; until it
-- is applied nothing is refused, and nothing is lost.

-- 1. The one spelling of a mailbox ------------------------------------------------
create or replace function public.canonical_email(p_email text)
returns text
language plpgsql
immutable
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_email text;
  v_local text;
  v_domain text;
begin
  if p_email is null then
    return null;
  end if;
  v_email := lower(btrim(p_email));
  if position('@' in v_email) = 0 then
    return v_email;
  end if;
  v_local := substring(v_email from '^(.*)@[^@]*$');
  v_domain := substring(v_email from '@([^@]*)$');
  v_local := split_part(v_local, '+', 1);
  if v_domain in ('gmail.com', 'googlemail.com') then
    v_local := replace(v_local, '.', '');
    v_domain := 'gmail.com';
  end if;
  return v_local || '@' || v_domain;
end;
$$;

-- 2. Who owns which mailbox --------------------------------------------------------
create table if not exists public.account_emails (
  canonical_email text primary key,
  user_id         uuid not null unique references auth.users (id) on delete cascade,
  created_at      timestamptz not null default now()
);

alter table public.account_emails enable row level security;
alter table public.account_emails force row level security;
revoke all on public.account_emails from public, anon, authenticated;
grant select, insert, update, delete on public.account_emails to service_role;

-- 3. Throwaway-mail services -------------------------------------------------------
create table if not exists public.blocked_email_domains (
  domain     text primary key check (domain = lower(domain)),
  created_at timestamptz not null default now()
);

alter table public.blocked_email_domains enable row level security;
alter table public.blocked_email_domains force row level security;
revoke all on public.blocked_email_domains from public, anon, authenticated;
grant select, insert, update, delete on public.blocked_email_domains to service_role;

insert into public.blocked_email_domains (domain) values
  ('mailinator.com'), ('guerrillamail.com'), ('guerrillamail.net'), ('guerrillamail.org'),
  ('guerrillamail.biz'), ('guerrillamail.de'), ('sharklasers.com'), ('10minutemail.com'),
  ('tempmail.com'), ('temp-mail.org'), ('yopmail.com'), ('trashmail.com'), ('getnada.com'),
  ('dispostable.com'), ('maildrop.cc'), ('throwawaymail.com'), ('fakeinbox.com'),
  ('mintemail.com'), ('mohmal.com'), ('emailondeck.com'), ('tempail.com'), ('moakt.com'),
  ('spamgourmet.com'), ('mailnesia.com'), ('tempinbox.com'), ('burnermail.io'),
  ('discard.email'), ('mytemp.email')
on conflict (domain) do nothing;

-- 4. The guard ---------------------------------------------------------------------
create or replace function public.guard_account_email()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_canonical text;
  v_domain    text;
  v_owner     uuid;
begin
  if tg_op = 'UPDATE' and new.email is not distinct from old.email then
    return new;
  end if;

  -- No email (a phone or anonymous account): nothing to claim. If they had one, release it.
  if new.email is null or btrim(new.email) = '' then
    if tg_op = 'UPDATE' then
      delete from public.account_emails where user_id = new.id;
    end if;
    return new;
  end if;

  v_canonical := public.canonical_email(new.email);
  v_domain := substring(v_canonical from '@([^@]*)$');

  if v_domain is not null and exists (
    select 1 from public.blocked_email_domains b
     where v_domain = b.domain or v_domain like '%.' || b.domain
  ) then
    raise exception 'EMAIL_DOMAIN_NOT_ALLOWED: this kind of email address cannot be used to create an account'
      using errcode = 'P0001';
  end if;

  -- Moving from one address to another: let go of the old claim first. Everything here is
  -- one statement, so if the new address turns out to be taken the release is rolled back too.
  if tg_op = 'UPDATE' then
    delete from public.account_emails where user_id = new.id and canonical_email <> v_canonical;
  end if;

  -- Take the claim, or learn who holds it. The unique key makes two simultaneous signups queue
  -- here: the second one waits for the first to finish and then sees its row.
  insert into public.account_emails (canonical_email, user_id)
  values (v_canonical, new.id)
  on conflict (canonical_email) do update set user_id = public.account_emails.user_id
  returning user_id into v_owner;

  if v_owner is distinct from new.id then
    raise exception 'EMAIL_ALREADY_REGISTERED: an account already exists for this mailbox'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_account_email() from public, anon, authenticated;

drop trigger if exists guard_account_email on auth.users;
-- AFTER, not BEFORE: the claim row points at the user row, which does not exist yet
-- while a BEFORE trigger runs. Raising from an AFTER row trigger still aborts the whole
-- statement, so a refused signup leaves no account behind.
create trigger guard_account_email
  after insert or update of email on auth.users
  for each row execute function public.guard_account_email();

-- 5. Accounts that already exist ----------------------------------------------------
-- The earliest account for each mailbox owns it. A later look-alike is left alone.
insert into public.account_emails (canonical_email, user_id)
select distinct on (c) c, id
  from (
    select public.canonical_email(email) as c, id, created_at
      from auth.users
     where email is not null and btrim(email) <> ''
  ) s
 order by c, created_at, id
on conflict do nothing;
