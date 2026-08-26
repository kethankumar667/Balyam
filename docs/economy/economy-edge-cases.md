# Economy V1 Edge Cases & Failure Mode Analysis

> **Status:** AUDIT & DISCOVERY ONLY — NO CODE CHANGES APPLIED  
> **Purpose:** Exhaustive forensic review of distributed failure modes, race conditions, fraud vectors, and network edge cases across BHALYAM Economy V1.

---

## 1. Concurrency & Idempotency Edge Cases

### 1.1 Duplicate Match Settlement Requests
- **Failure Scenario:**
  A network glitch or client retry causes `finalizeMatch()` or `settle_match_economy()` to be called multiple times for the same `matchId`.
- **System Defense:**
  - `settle_match_economy` utilizes 64-bit transaction-level advisory locks (`pg_advisory_xact_lock(hashtextextended('match-settlement:' || matchId, 0))` — not the 32-bit `hashtext()`, whose narrower keyspace was audit finding M5) and row-locks the settlement `FOR UPDATE`.
  - If `status === 'SETTLED'`, the RPC immediately returns the existing settlement without executing any balance updates or ledger inserts (`applied = false`).
  - Unique composite index on `coin_ledger_entries.idempotency_key` (`match-settlement:<matchId>:credit:<playerId>`) guarantees no double wallet payout at the database constraint level.

### 1.2 Concurrent Voucher Redemption
- **Failure Scenario:**
  A player attempts to redeem the same bearer voucher across multiple tabs or concurrent requests simultaneously.
- **System Defense:**
  - `redeem_reward_voucher` takes a 64-bit advisory lock on the voucher hash (`pg_advisory_xact_lock(hashtextextended('voucher-redemption:' || codeHash, 0))`) and row-locks `reward_vouchers` `FOR UPDATE`.
  - The first transaction sets `status = 'REDEEMED'`, `redeemed_by_member_id = memberId`, and `redeemed_at = now()`.
  - The second concurrent transaction encounters `status === 'REDEEMED'` and is immediately rejected with `VOUCHER_ALREADY_REDEEMED` (or returns idempotent success if by the same member).

### 1.3 Wallet Race Conditions (Simultaneous Spend & Win)
- **Failure Scenario:**
  A host commits 200 coins to start a new match while simultaneously receiving a 150 coin prize from a finishing match.
- **System Defense:**
  - All balance updates (`coin_wallets`) execute inside atomic PostgreSQL transactions using row-level locking (`SELECT ... FOR UPDATE`).
  - Postgres serializes the updates. Check constraint `check (balance >= 0)` guarantees the balance never drops below zero regardless of execution order.

---

## 2. Lifecycle & Network Disconnect Edge Cases

### 2.1 Host Disconnects Mid-Match
- **Failure Scenario:**
  The room host who funded the 100 coins/seat entry fee disconnects mid-match and does not return before grace expiry.
- **System Defense:**
  - If **other human players remain**: RoomManager elects a new host via `reassignHost()`. The game continues to its normal conclusion. If the original host won, their wallet is still credited; if another player wins, they are paid.
  - If **no human players remain** (all humans left or disconnected): `abandonRoom()` is triggered. Because the match did not produce an authoritative human result, `refund_match_entry()` is invoked, and 100% of the committed funds are refunded back to the original host's wallet.

### 2.2 Server Restart During Active Match
- **Failure Scenario:**
  The Node.js server process crashes or restarts while a match is in progress (`status = 'COMMITTED'` in PostgreSQL, but room state was in memory).
- **System Defense (corrected — no automatic sweep exists):**
  - Active room memory dies with the process. This is the case Economy V1 deliberately does
    **not** auto-remediate — see `docs/economy/economy-v1.md` §9 for the full policy.
  - The read-only function `list_stale_committed_settlements(p_older_than interval)` lists
    settlements stuck in `COMMITTED` past a given age. Nothing calls it automatically; there is
    no startup reconciliation job, no scheduled sweep, and no code in this migration that runs
    `refund_match_entry` on its own initiative.
  - **Why not:** the database alone cannot distinguish "the server crashed and the match never
    actually happened" from "the match is still legitimately in progress." An automatic refund
    risks refunding a host whose match is, in fact, still running correctly on a process that
    hasn't restarted.
  - The intended flow is: an admin surface displays `list_stale_committed_settlements` output as
    "reconciliation required," and a human (or a server-controlled, idempotent, explicitly
    invoked recovery command backed by authoritative room-state evidence) decides whether to
    call `refund_match_entry`. Until that recovery path is built and tested, a crash mid-match
    leaves the settlement `COMMITTED` and flagged, not silently resolved either way.

### 2.3 Host Has Insufficient Funds on Rematch
- **Failure Scenario:**
  A host completes game 1, spends remaining coins or has insufficient balance, and clicks "Request Rematch" or accepts a rematch vote.
- **System Defense:**
  - Before transitioning the room into a new round (`startRematchRound`), RoomManager checks the host's wallet balance via `EconomyService.quoteCheckout(hostId, seatCount)`.
  - If `hasSufficientFunds === false`, RoomManager cancels the rematch request with an explicit error: `"Insufficient coins to fund room rematch"`. The room returns to `WAITING_FOR_PLAYERS`.

---

## 3. Game Outcome & Ranking Edge Cases

### 3.1 Draw / Stalemate (Chess, Hand Cricket)
- **Failure Scenario:**
  A 2-player match ends in a true draw (e.g. Chess stalemate or Hand Cricket tied score).
- **System Defense:**
  - Economy V1 **does not split prize pools**.
  - `finalizeMatch()` detects `winnerId === null` with a draw status and dispatches `refund_match_entry(matchId, 'Match ended in a draw')`.
  - 100% of the entry fee is refunded to the host wallet with a `MATCH_REFUND` ledger entry.

### 3.2 Tied Placements for 2nd / 3rd Place (UNO, Dots & Boxes)
- **Failure Scenario:**
  In a 4-player game, 1st place is clear, but 2nd and 3rd place have identical tie scores.
- **System Defense (corrected — no invented tie-breakers):**
  - Economy V1 does **not** apply secondary tie-breaking heuristics (no "earliest join time," no
    "lowest unmelded card count," or any other criterion the engine did not already produce as
    part of its normal result) — see `docs/economy/game-settlement-map.md` §1, Rule 2.
  - A tie at **any** paid position — not only 1st place — makes the ranking invalid for
    settlement purposes. `settle_match_economy` is called with
    `p_is_valid_ranking := false`, and the entire committed entry fee is refunded to the host.
    The match is never partially settled with 1st place paid and 2nd/3rd left ambiguous.

### 3.3 Bot Wins 1st Place
- **Failure Scenario:**
  A local bot player wins 1st place against human opponents.
- **System Defense:**
  - Bots never have wallets, identities, or vouchers.
  - `settle_match_economy` routes the 1st place prize to the **World Bank Treasury**'s
    `bot_prize_revenue` balance using the dedicated ledger type `BOT_PRIZE_REVENUE` — a balance
    and ledger type kept separate from base fee revenue and from guest escrow liability (see
    `docs/economy/economy-v1.md` §5.3).
  - The base house cut (e.g. 50 coins, `BASE_FEE_REVENUE`) and the bot prize (e.g. 150 coins,
    `BOT_PRIZE_REVENUE`) both land in the World Bank, resulting in 200 coins collected by the
    platform treasury — visible as two separate balance columns, not one merged figure.

---

## 4. Identity & Voucher Security Edge Cases

### 4.1 Guest User Signs Up After Winning
- **Failure Scenario:**
  A guest wins a 100-coin voucher, then creates an authenticated account (Google or Email) on BHALYAM.
- **System Defense:**
  - Guest and member identities are separate namespaces; no automated balance merging occurs.
  - The newly registered member enters the voucher bearer code into the Member Voucher Redemption modal.
  - `redeem_reward_voucher` credits 100 coins directly to their member wallet (`VOUCHER_REDEMPTION`), seamlessly transferring the guest earnings to the new account.

### 4.2 Guest Closes Browser / Wipes Storage
- **Failure Scenario:**
  A guest closes their browser before copying their bearer voucher code and clears localStorage.
- **System Defense:**
  - By design, the database stores **only a one-way HMAC/SHA-256 hash** of the voucher code (`code_hash`).
  - Because the server does not store the plaintext bearer code, the lost code cannot be decrypted or recovered by staff, preventing internal credential leakage.
  - The escrow liability remains securely locked in `reward_vouchers` until redeemed or expired by platform policy.

### 4.3 Guest Attempts to Redeem Voucher
- **Failure Scenario:**
  A guest attempts to call `redeem_reward_voucher` directly.
- **System Defense:**
  - `redeem_reward_voucher` explicitly checks `player_identities.kind === 'member'`.
  - If called with a guest identity, the RPC throws `ONLY_MEMBERS_CAN_REDEEM_VOUCHERS`. Vouchers can only be redeemed by registered members.
