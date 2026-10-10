# Staging release verification: economy, accounts and guests

Everything in this release was verified on a throwaway local Postgres and in unit tests. None of it has met
a real Supabase project. This is the checklist for doing that on **staging**, in order, so each step says what
you should see before you go on. Do not run any of it against production.

What this covers: migrations `20261021` to `20261026`, the sign-up to carry-over journey, the abuse limits, and
the privacy checks. Time needed: about 90 minutes, most of it the real journey.

Related: `staging-environment.md` (how staging is set up), `supabase.md` (project, auth and email),
`reward-gateway.md` (the rules behind the rewards), `deployment-rollback.md`.

## 0. Before you start

- [ ] You are on the **staging** Supabase project and the staging Render service. Confirm the project URL in the
      dashboard is not the production one.
- [ ] Migrations `20261012` to `20261020` are already applied (reward gateway, transfer caps, faucet). To check, run
      `select to_regclass('public.reward_ledger');` (expect `reward_ledger`, not null) and
      `select reward_type from public.reward_ledger limit 0;` (expect no error).
- [ ] Authentication, Providers, Email: **Confirm email is ON**. The carry-over refuses an unconfirmed account,
      and that only means something when confirmation is really required.
- [ ] Take a backup point: Database, Backups, create a manual backup (or note the latest daily one).
- [ ] You have two real inboxes you can read (Account A and Account B) and two browsers or profiles.

## 1. Apply the migrations, in this order

Run each file in the SQL editor, one at a time, and stop at the first error. They are safe to re-run.

| # | File | What it does |
|---|------|--------------|
| 1 | `20261021000000_email_uniqueness_guard.sql` | One mailbox, one account (blocks aliases and throwaway domains) |
| 2 | `20261022000000_guest_welcome_3000.sql` | Guest welcome grant 2,000 to 3,000 |
| 3 | `20261023000000_guest_prizes_to_wallet.sql` | A guest winner is paid into their wallet |
| 4 | `20261024000000_remove_vouchers.sql` | Removes the voucher tables and functions |
| 5 | `20261025000000_guest_carryover.sql` | Carry-over claim table and function |
| 6 | `20261026000000_purge_idle_guests.sql` | Retention for idle guests |

Then run these checks. Each should return what is written beside it.

```sql
-- 1. The functions exist and are not callable by browsers (expect: both rows, anon=false, service_role=true)
select p.proname,
       has_function_privilege('anon', p.oid, 'execute')         as anon_can_run,
       has_function_privilege('service_role', p.oid, 'execute') as service_can_run
  from pg_proc p
 where p.proname in ('claim_guest_wallet', 'purge_idle_guests');

-- 2. The new reward types are allowed (expect: the text contains GUEST_CARRYOVER, GUEST_UPGRADE_BONUS and HOURLY_FAUCET)
select pg_get_constraintdef(oid)
  from pg_constraint
 where conrelid = 'public.reward_ledger'::regclass and conname = 'reward_ledger_reward_type_check';

-- 3. The ledger can describe the guest debit (expect: the text contains GUEST_CARRYOVER_DEBIT)
select pg_get_constraintdef(oid)
  from pg_constraint
 where conrelid = 'public.coin_ledger_entries'::regclass and pg_get_constraintdef(oid) like '%P2P_TRANSFER_SEND%';

-- 4. The claim table exists, is locked down, and nothing is in it yet (expect: true, then 0)
select relrowsecurity from pg_class where oid = 'public.guest_wallet_claims'::regclass;
select count(*) from public.guest_wallet_claims;

-- 5. Welcome grants are 3,000 for guests and 5,000 for members (expect: 3000 | 5000)
select guest_starter_coins, member_starter_coins from public.economy_configurations;

-- 6. Vouchers are gone (expect: null)
select to_regclass('public.reward_vouchers');

-- 7. The email guard is attached to sign-ups (expect: at least one non-internal trigger on auth.users)
select tgname from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal;
```

If any of these differ, stop and send me the output. Do not deploy the server yet.

## 2. Deploy the server and the client to staging

- [ ] Deploy the server. In the boot log look for **all** of these:
  - `Reward gateway store: Supabase Postgres`
  - `Guest carry-over store: Supabase Postgres`
  - no line saying a table or function is missing. If one is, it names the migration to run.
- [ ] `GET <staging server>/health` shows an `auth` mode of `jwt-secret` or `auth-api` (not `off`). In `off` mode the
      carry-over cannot be tested, because no member exists.
- [ ] Optional settings (defaults are fine): `GUEST_PROVISION_PER_MINUTE=600`, `IDLE_GUEST_DAYS=45`.
- [ ] Deploy the client.

## 3. A visitor who only looks around creates nothing

Use a fresh browser profile. Open DevTools, Network, and tick "Preserve log".

```sql
select count(*) as guests_before from public.player_identities where kind = 'guest';
```

- [ ] Open the home page, the games page and a Mandali preview. Scroll, tap around, do **not** create or join a room.
- [ ] Network shows **no** request to `/api/auth/guest`. Application, Local Storage shows **no** `bhalyam.guest.*` keys.
- [ ] The header shows no wallet chip (a first-time visitor has no wallet).
- [ ] Re-run the query. `guests_before` is unchanged.

Now do one deliberate thing: create a solo or bot room.

- [ ] Now one `/api/auth/guest` request appears, and `bhalyam.guest.id` and `.token` are set.
- [ ] A new guest row exists and the wallet chip shows 3,000.

## 4. The sign-up to carry-over journey

Keep the browser from section 3 (it now holds a guest with coins). Play something that costs or wins coins so the
guest balance is not simply the starting 3,000. Note the guest balance: `____`.

1. [ ] Sign up as **Account A** with a real email. **Do not confirm it yet.** Sign in if the app lets you.
2. [ ] Expect: no "your coins came with you" dialog, and the guest keeps its coins. Check in SQL that nothing moved:
       ```sql
       select count(*) from public.guest_wallet_claims;   -- expect 0
       ```
3. [ ] Open the confirmation email, click the link, return to the app (reload if needed).
4. [ ] Expect the **"Your coins came with you"** dialog showing the guest balance, with a note that the coins arrive
       within a day and a line about the 5,000-coin welcome bonus.
5. [ ] SQL checks:
       ```sql
       -- one claim, amount = the guest balance, the guest wallet is now 0
       select guest_id, member_id, amount from public.guest_wallet_claims;
       select balance from public.coin_wallets where identity_id = '<guest_id from above>';

       -- one debit row on the guest and one HELD reward for the member
       select entry_type, amount from public.coin_ledger_entries where wallet_id = '<guest_id>' order by id;
       select reward_type, status, amount, vesting_until from public.reward_ledger
        where player_id = '<member_id from above>' order by earned_at;
       ```
       Expect: a `GUEST_CARRYOVER_DEBIT` row, and a `GUEST_CARRYOVER` reward with status `PENDING` and a
       `vesting_until` about 24 hours ahead.
6. [ ] Open the wallet drawer. The **carry-over card** says the coins are on their way. The balance has **not**
       gone up yet (that is correct: held rewards are not paid).
7. [ ] **Staging only:** to avoid waiting a day, bring the hold forward, then wait up to a minute for the sweeper:
       ```sql
       update public.reward_ledger set vesting_until = now()
        where reward_type = 'GUEST_CARRYOVER' and player_id = '<member_id>';
       ```
       Expect: the reward becomes `RELEASED`, the balance rises by the carried amount, and the carry-over card
       disappears or moves on to the bonus.
8. [ ] **The bonus is locked** until Account A finishes a match with another signed-in person. Check the card says
       "Finish a match with friends to unlock 5,000 coins".
9. [ ] Sign up and confirm **Account B** in the second browser. Play a match together, and let it finish. If the
       bonus stays locked, check the player's trust card or `GET /api/rewards/<member_id>`; a match too short to count
       does not unlock it.
10. [ ] Expect the card to offer **Claim**. Press it. Then apply step 7 again with `reward_type = 'GUEST_UPGRADE_BONUS'`
        and confirm 5,000 arrives and the card goes away.

## 4b. The celebrations, with real people

Needs Account A and Account B (section 4) in the same Mandali, each in its own browser.

- [ ] **A coin request, paid.** Account A sends a coin request in the Mandali. Account B pays it.
  - A sees the coins-and-hearts burst and the banner "B sent you N coins", wherever A is in the app (try it from the
    home page, not only inside the Mandali).
  - B sees rising hearts and "You sent N coins to A. That was kind."
  - A third member of the group sees nothing.
  - Both wallets update. If a banner says "A friend" instead of the name, the Mandali's member list was not loaded on
    that screen; it is cosmetic, tell me.
  - The server half of this (the right event, to exactly the right people, over real sockets) is already proven by
    `mandaliCoinPaymentLive.test.ts`. This step checks the same thing end to end with the real database and two real
    sessions.
- [ ] **Daily streak.** Claim the daily streak. Expect the coin **fountain** (coins arcing up from the bottom with
  embers), not the top-down rain.
- [ ] **Level-up.** Play matches until a level is gained (a win is 35 XP, a played match 15, 100 XP a level). Within a
  few seconds of the match ending, expect the **Ascension** screen: the badge landing in rings of light, the number
  sliding up from the old level to the new, the bar filling and then dropping to real progress, and a card with the
  next reward. "Play a game" goes to the home page; "Later" just closes it. If you reload the page right after, it must
  **not** replay. If it never appears, check `GET /api/profile/<your id>` shows the new level; the screen only reacts to
  a real rise.
- [ ] **A weak phone.** On one budget Android, trigger each of the above. The celebrations drop to about half the
  particles by themselves on a device that is struggling. Anything that still stutters, tell me the phone model.

## 5. Abuse and refusal checks (each should be refused)

- [ ] **Same guest, second account.** In a browser that still has Account A's old guest token (copy `bhalyam.guest.token`
      before step 4 if you can), sign up Account B and confirm. Expect no claim and the account unaffected.
      SQL: `select count(*) from public.guest_wallet_claims where guest_id = '<guest_id>'` stays 1.
- [ ] **Second guest, same account.** Sign in as Account A on a device that has a different guest. Expect no second
      claim. The new guest keeps its coins.
- [ ] **Unconfirmed email.** Covered by step 2: nothing moved until confirmed.
- [ ] **Email aliases.** Try to sign up with `name+tag@gmail.com` and `n.a.m.e@gmail.com` for a mailbox that already
      has an account. Expect the friendly message "We couldn't create an account with that email. If you already have one,
      sign in instead — otherwise try a different address.", and **no** account created. A raw "Database error saving
      new user" shown to the person means the app's message mapping has missed it; tell me.

## 6. Retention preview (read only)

Do not run the purge by hand on data you care about. This shows who it **would** remove:

```sql
select pi.player_id, pi.last_seen_at
  from public.player_identities pi
 where pi.kind = 'guest'
   and pi.last_seen_at < now() - interval '45 days'
   and not exists (select 1 from public.guest_wallet_claims c where c.guest_id = pi.player_id)
   and not exists (select 1 from public.coin_wallets w where w.identity_id = pi.player_id);
```

- [ ] Every row is a guest who never got a wallet. None is a member, none has a wallet, none appears in
      `guest_wallet_claims`.

## 7. Privacy checks (DPDP)

- [ ] Application, Local Storage: only keys the data inventory declares (`bhalyam.session`, `bhalyam.guest.*`,
      `mpg.*`, `bhalyam.theme` and the others listed in `dataInventory.ts`). No new key from this release.
- [ ] The privacy page mentions the simplified email kept to stop duplicate accounts.
- [ ] **Decision still open:** whether to bump `NOTICE_VERSION` (forces everyone to re-consent), and what the notice says
      about guests being purged after 45 idle days. Record your decision here: `____`.

## 8. Record the result

| Section | Pass | Notes |
|---------|------|-------|
| 1 Migrations and checks | | |
| 2 Deploy and boot log | | |
| 3 Visitor creates nothing | | |
| 4 Journey | | |
| 5 Refusals | | |
| 6 Retention preview | | |
| 7 Privacy | | |

If any step fails: note the step number, the SQL output and the server log lines around it, and send them to me.
To back out the database changes, each migration has a rollback in `supabase/rollbacks/` named the same with
`_rollback`. Roll back in **reverse** order and only together with the matching server version.

## 9. Before this goes to production

- [ ] Every row above passes on staging.
- [ ] Confirm email is ON in the **production** project too.
- [ ] Decide on the per-address guest limit (it needs the privacy notice decision first) and on the `NOTICE_VERSION` bump.
- [ ] Try the coin rain on one mid-range Android phone.
