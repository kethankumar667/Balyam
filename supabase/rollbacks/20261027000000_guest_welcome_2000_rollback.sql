-- Undo 20261027000000_guest_welcome_2000.sql: new guests get 3,000 again.
-- Wallets already granted 2,000 keep it; nothing is topped up.

alter table public.economy_configurations
  alter column guest_starter_coins set default 3000;

update public.economy_configurations
   set guest_starter_coins = 3000,
       updated_at = now()
 where is_active = true
   and guest_starter_coins <> 3000;
