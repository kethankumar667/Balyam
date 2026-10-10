-- Undo 20261022000000_guest_welcome_3000.sql: new guests get 2,000 again.
-- Wallets already granted 3,000 keep it; nothing is clawed back.

alter table public.economy_configurations
  alter column guest_starter_coins set default 2000;

update public.economy_configurations
   set guest_starter_coins = 2000,
       updated_at = now()
 where is_active = true
   and guest_starter_coins <> 2000;
