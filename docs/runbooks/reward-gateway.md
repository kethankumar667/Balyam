# Reward gateway — operating it

Every coin a player earns for playing (level milestones, daily streaks) goes through one door, the
**reward gateway**. This runbook is for whoever operates it: how it behaves, how to apply its
migration, how to look at an account and change its standing, and what it deliberately does not do.

Code: `server/src/rewards/`. Schema: `supabase/migrations/20261012000000_reward_gateway.sql`.
Verification against a real PostgreSQL: `node scripts/persistence/verifyRewardSchema.mjs`.

## The flow

```
game / event
   → RewardGateway.grantCoins        (refuses: not signed in, no economy, UNDER_REVIEW)
   → reward_ledger row               (a reason code, the player's risk state, a vesting time)
   → wait (vesting)                  (24 h; 72 h if RESTRICTED; a trusted member's daily streak is paid at once)
   → sweeper (every 60 s)            (PENDING → RELEASING → RELEASED, one idempotent wallet credit)
   → wallet ledger entry             (linked back on the reward row as ledger_entry_id)
```

Nothing else in the server credits coins for playing. `adminAdjustWallet` is still the operator's
manual top-up; the gateway uses it as its payment primitive, keyed on the reward id, so a redriven
release can never credit twice. **Never call `adminAdjustWallet` for a gameplay reward.**

### A reward's states

| State | Meaning | Who can move it |
|---|---|---|
| `PENDING` | Earned, waiting out its vesting period | the sweeper (→ RELEASING); an operator (→ VOIDED) |
| `RELEASING` | Claimed by the sweeper, being paid | the sweeper only; a claim older than 5 min is redriven |
| `RELEASED` | In the wallet | — |
| `VOIDED` | Withdrawn before it was paid; never re-claimable | — |

A void can only happen while `PENDING`, so a void can never race a payment into a clawback.

## Risk states

| State | Set by | XP | Coins | Sending coins | Leaderboard | Player told? |
|---|---|---|---|---|---|---|
| `NORMAL` | — | full | vest 24 h | tier cap | listed | — |
| `WATCHLIST` | system (3 abnormal sessions in a day) or operator | practice XP only | vest 24 h | tier cap | **off** | no |
| `RESTRICTED` | operator | practice XP only | vest **72 h** | **off** | off | yes |
| `UNDER_REVIEW` | operator | practice XP only | new rewards refused, pending held | **off** | off | yes |

- A machine only ever moves an account **NORMAL → WATCHLIST**, and a watch the system set lapses on
  its own after a quiet week. Everything past WATCHLIST is a person's decision, with a written note.
- Every change is an append-only `risk_events` row: who, from what, to what, why.
- The database-level wallet freeze (`is_frozen`) is **not** touched by any of this; it remains an
  operator action on the economy tables. UNDER_REVIEW is enforced at the reward and transfer layers.

## What counts against an account

`server/src/rewards/SessionRules.ts`, all tunable constants:

- A match shorter than its game's floor (20 s Rock Paper Scissors … 90 s Ludo/Rummy) pays no XP.
- More than 12 finished matches in 10 minutes pays no XP for the excess.
- A too-short or over-pace match is an **abnormal session**; three within 24 h put a NORMAL account on WATCHLIST.
- The match is still recorded (stats, history). Only the XP is withheld, with a reason code
  (`TOO_SHORT`, `PACE_LIMIT`) in the XP ledger row.

## Trust tiers and transfer caps

Tiers are a checklist, not a score (`TrustService.ts`). Tier 2 needs 3 days, 5 real-people matches and
3 distinct opponents; tier 3 adds 30 days, 25 matches, 10 opponents and a Mandali; tier 4 needs 90 days,
100 matches, 50 opponents and 3 Mandalis. Guests, bots, pass-and-play seats and matches too short to
have been played are never counted.

Coins can be sent per UTC day up to **500 / 1,000 / 2,500 / 5,000** for tiers 1–4, measured from the
wallet ledger (so a restart cannot reset it). Both ways coins move between players are checked:
sending, and paying a coin request.

## The free-coins faucet

A signed-in player may claim **100 coins**, then must wait **4 hours from that claim** (not a fixed clock
time, so claiming late costs nothing and claims cannot be banked). It is separate from the 50-coin daily
streak: the streak rewards showing up once a day, the faucet rewards coming back during it. Constants:
`shared/faucet.ts`. Code: `server/src/rewards/HourlyFaucetService.ts` and `FaucetController.ts`.

- **A claim is an ordinary reward row** (`reward_type = HOURLY_FAUCET`, `reason_code = FAUCET_CLAIM`), so it
  carries the player's risk state and goes through the same wallet credit as everything else. There is no
  table of its own; "when did they last claim" is the newest such row.
- **Paid at once for a NORMAL account, at any trust tier.** The gate is the transfer cap (500/day at tier 1),
  not a delay. A WATCHLIST account's claim vests 24 h, RESTRICTED 72 h, UNDER_REVIEW is refused. A held claim
  still starts the wait.
- **Signed-in players only.** A guest gets `NOT_MEMBER`. In `auth: off` mode no real member exists
  (`verifyAccessToken` returns null), so the faucet pays nobody there. That is deliberate: a guest identity is
  a value in browser storage and could be remade at will.
- **Two simultaneous claims pay once.** A claim's source id names the claim before it
  (`after:<previous reward id>`, or `first`), so both requests build the same key and the ledger's unique
  constraint admits one. The other is told to wait; it is not an error.
- **The server decides everything.** The POST body is never read; every answer carries `serverNow` so the
  countdown does not depend on the device clock.
- **Where it shows.** `sm` and wider: a chip in the header. On a phone the header is full, so the claim is a
  row in the wallet drawer and a green dot on the wallet chip says it is ready. All of them read one store.
- **No new browser storage key and no device, browser or IP signal**, so the privacy inventory is unchanged.

Economy effect, for whoever sets prices: at most **600 coins a day** per account. A COMMON cosmetic (up to
1,000) is under two days of claims; a LEGENDARY (4,000-11,000) is one to three weeks. The cosmetic prices are
still development seed values pending economy sign-off, so revisit them together with this rate.

Roll back with `supabase/rollbacks/20261020000000_hourly_faucet_rollback.sql` (deletes the faucet rows it
cannot keep) and only together with the server. `node scripts/persistence/verifyRewardSchema.mjs` proves the
migration and its rollback on a real PostgreSQL.

## Applying the migration

1. Take a backup.
2. Run these three, in order (SQL editor or `supabase db push`). All are re-runnable.
   - `20261012000000_reward_gateway.sql` — the reward, standing and audit tables (needs the progression migration).
   - `20261013000000_transfer_daily_cap.sql` — the daily cap on sending coins (needs the P2P transfer migration).
   - `20261014000000_fund_coin_request_daily_cap.sql` — the same cap on paying a coin request (needs the Mandali coin-request migrations).
   - `20261020000000_hourly_faucet.sql` — lets `reward_ledger` hold the `HOURLY_FAUCET` reward type (see "The free-coins faucet" below). Apply it before deploying a server that serves `/api/faucet`; until then a claim is refused honestly and nothing is paid.
   Then check: `SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run check:schema-ready` prints `SCHEMA_READY`.
3. Deploy the server. **A missing migration stops the boot** (the store is pinged before the port
   opens), so a bad deploy fails at start, not on a player's first claim. The error names every missing
   table or function and the file that creates it.

   Better, catch it before the deploy: set `npm run check:schema-ready` as Render's **Pre-Deploy
   Command** (or run it in CI). It checks the same things, changes nothing, and fails the release with
   the same list, so a migration that was forgotten stops the deploy instead of crash-looping it. Exit
   codes: 0 ready, 1 something missing, 2 could not check (no credentials, or the database is unreachable).
4. Confirm the boot log reports the reward gateway ready on the supabase store.

Roll back with `supabase/rollbacks/20261012000000_reward_gateway_rollback.sql`. It is destructive:
release or void pending rewards first. The two cap functions roll back on their own
(`20261013000000_…_rollback.sql`, `20261014000000_…_rollback.sql`); do that only together with the
server, which calls them.

## Looking at an account, and changing it

All under `/api/admin/risk`, with the operational key or an admin session.

```
GET  /api/admin/risk                          every account that is not NORMAL, with counts
GET  /api/admin/risk/collusion                accounts that look fed by others (a report; changes nothing)
GET  /api/admin/risk/:playerId                state, events, rewards, trust checklist
PUT  /api/admin/risk/:playerId                { "state": "RESTRICTED", "reasonCodes": ["FARM_RING"], "note": "why" }
POST /api/admin/risk/rewards/:rewardId/void   { "reason": "why" }
DELETE /api/admin/risk/:playerId/data         { "note": "which request this answers", "confirmStandingLoss"?: true }
```

The same things are on the **Risk & Rewards** page of the admin console (`/admin/risk`): the watch list,
the collusion report, an account lookup, and the two actions (set a state with a note, withdraw a
pending reward).

### Accounts that look fed by others

`GET /api/admin/risk/collusion` lists an account whose games over the last week are mostly against one
other account that almost always loses to it (at least 12 games, at least 90% won by the first, at least
80% of the second's games against the first). Friends who play each other a lot are the product working,
so this is a **report, not a penalty**: nothing is set automatically. Open the account, read the numbers,
and set a watch or restriction with a note if it holds up. Thresholds are constants in
`server/src/rewards/CollusionReport.ts`.

### Erasing an account's risk data

`DELETE /api/admin/risk/:playerId/data` removes the account's standing and every audit event, for a
data-protection request. It needs a note naming the request, and refuses an account that is still
RESTRICTED or UNDER_REVIEW unless you pass `confirmStandingLoss: true`, because erasing is otherwise a way
to lift a restriction with no reviewer's reasoning on record. The erasure is logged (the events that would
have recorded it are what it deletes). Reward rows are kept: they are the financial record that stops a
milestone being claimed twice and hold only an opaque id.

- Restricting or reviewing an account **requires a note**. Setting it back to `NORMAL` does not.
- The actor recorded is the verified credential, never the request body.
- Everything is reversible except a void.

### "My rewards are late"

1. `GET /api/admin/risk/:playerId` — is the state `RESTRICTED` or `UNDER_REVIEW`? Is there a `PENDING` reward whose `vestingUntil` is still in the future?
2. A reward stuck in `RELEASING` for more than 5 minutes is redriven by the next sweep.
3. If the account is under review by mistake: `PUT … { "state": "NORMAL" }` — held rewards are paid on the next sweep.

## What is deliberately not here

- **No device, browser, IP or location signal.** Nothing about the machine or the network is stored or
  used. Adding any is a privacy-notice and consent decision (and, while the minors question is open, a
  legal one), not a code change.
- **No automatic penalty past WATCHLIST, and no ban.**
- **No detection of one person running many verified accounts** beyond the trust tiers, the pace and
  duration rules and the transfer cap. A collusion job over the match tables is the next step.
- **`risk_events` is kept for a year by default**, purged by the sweeper once a day. Set
  `RISK_EVENT_RETENTION_DAYS` (0 keeps forever). The period is a privacy-notice decision. Standing
  (`account_risk`) and rewards are never purged by it.

## Known limits

- **Sending coins is capped inside the database transaction** (`transfer_wallet_coins_capped`, migration
  `20261013000000_transfer_daily_cap.sql`, run it before deploying this server). Both wallet rows are
  locked before the day's total is read, so parallel sends and multiple server instances cannot exceed
  the cap. `node scripts/persistence/verifyTransferCap.mjs` proves it, for sends and for coin-request payments, on a real PostgreSQL with concurrent
  connections.
- **Paying a coin request is capped inside the database too** (`fund_coin_request_capped`), under the same
  wallet locks and against the request's own stored amount. A request that already landed is answered
  "already paid", never "limit reached", because only an OPEN request is checked.
- **Self-service profile deletion does not erase risk or reward rows**, deliberately: otherwise a watched
  account could clear itself by deleting. Use the operator erasure endpoint above.
- **Streak coins are paid to guests too** (tier 1, 24 h vest); milestone coins need an account.

## Personal data

Server-side rows only: `reward_ledger`, `account_risk`, `risk_events`, each keyed by player id and each
deleted with the identity row (`on delete cascade`). No browser storage key is added. A player can see
their own rewards and, if restricted or under review, that fact; they cannot see a WATCHLIST state or
operator notes. The privacy notice (`client/src/pages/PrivacyPolicyPage.tsx`, sections 3 and 7) now says
accounts are checked for reward abuse, what is looked at, that no device or network signal is used, that
nothing is banned automatically, and how long the records are kept. **One decision is still open:
whether this change bumps `NOTICE_VERSION`** (`client/src/lib/privacy/consent.ts`). A bump re-asks every
player for consent on their next visit; not bumping means players who consented to the old notice are not
asked about the new text. That is the product owner's and counsel's call, and the retention period (one
year by default, `RISK_EVENT_RETENTION_DAYS`) should be confirmed in the same conversation.
