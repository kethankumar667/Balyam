# Economy Admin Dashboard & Console Architecture Plan

> **Status:** DESIGN & PLANNING ONLY — NO CODE CHANGES APPLIED
> **Scope:** Architecture, UI/UX wireframes, component hierarchy, and API endpoint designs for BHALYAM Admin Economy tools.
>
> **Correction (remediation pass, 2026-08-26):** the earlier draft of this plan included a wallet
> freeze-mutation endpoint, a manual balance-adjustment endpoint, and a "Privileged Action"
> UI control plus `WalletAdjustmentModal.tsx` component. **Economy V1 implements no admin
> balance-adjustment or freeze-mutation capability of any kind** — no RPC in the migration
> mutates `is_frozen` or writes an `ADMIN_ADJUSTMENT`/`ADMIN_CORRECTION` ledger row (audit
> finding B5). This plan is now **strictly read-only**: the admin surface may *display* wallet,
> voucher, and settlement state — including `is_frozen` status — but contains no mutation
> endpoint, no adjustment dialog, and no freeze toggle. Adding either capability is a distinct,
> separately-approved future scope item, not part of Economy V1.

---

## 1. Overview & Admin Security Posture

The Economy Admin Suite integrates into the existing BHALYAM Admin Console (`/admin/*`) to give operations, support, and finance visibility into platform treasury, player wallets, bearer vouchers, and match settlement ledgers. **It is a read-only reporting surface in Economy V1** — it displays state persisted by the RPCs in `docs/economy/economy-v1.md` §6, and mutates nothing of its own.

### Security Tenets
- **Strict Authentication:** All endpoints require `requireOperationalAuth` (HMAC operational token) and `service_role` backend database access, used here only for `SELECT` queries against the narrow read grants described in `docs/economy/economy-v1.md` §7.
- **Cache-Control:** All admin economy responses enforce `Cache-Control: no-store`.
- **Zero Plaintext Voucher Leakage:** The admin dashboard displays only truncated voucher hashes (`code_hash`), never raw bearer codes — and never could, since this migration never stores a raw code anywhere (see `docs/economy/economy-v1.md` §3).
- **No Mutation Surface:** This plan defines **no** endpoint that writes to any Economy V1 table. Every endpoint in §3 is a `GET`. Freeze toggles and balance adjustments are out of scope for V1 (see the correction notice above).

---

## 2. Admin Module Wireframes & Specifications

### 2.1 World Bank Treasury Dashboard (`/admin/economy/treasury`)

Displays live health, balance, and inflow metrics for the platform treasury account (`world_bank_accounts`).

```
┌─────────────────────────────────────────────────────────────────────────┐
│  WORLD BANK TREASURY OVERVIEW                                           │
├─────────────────────────────────────────────────────────────────────────┤
│ [ Base Fee Revenue ] [ Bot Prize Revenue ] [ Guest Escrow Liability ]   │
│      1,120,400 🪙          300,150 🪙            42,900 🪙 (outstanding)│
│                                       [ Total Voucher Redeemed: 257,250 🪙 ] │
├─────────────────────────────────────────────────────────────────────────┤
│  TREASURY INFLOWS & OUTFLOWS (LAST 30 DAYS)                             │
│  [ Chart: Daily Base Fee Revenue vs Bot Prize Revenue vs Escrow Flow ]  │
├─────────────────────────────────────────────────────────────────────────┤
│  RECENT TREASURY LEDGER ENTRIES                                         │
│  Timestamp         Type                    Amount    Affected Balance  Ref   │
│  2026-08-26 12:40  BASE_FEE_REVENUE        +50 🪙    base_fee_revenue  M_842 │
│  2026-08-26 12:38  BOT_PRIZE_REVENUE       +150 🪙   bot_prize_revenue M_841 │
│  2026-08-26 12:35  SOLO_ENTRY_COLLECTION   +100 🪙   base_fee_revenue  M_840 │
│  2026-08-26 12:31  GUEST_ESCROW_DEPOSIT    +100 🪙   guest_escrow_liability M_839 │
└─────────────────────────────────────────────────────────────────────────┘
```

Four separate, non-fungible balances are displayed — never merged into one aggregate "treasury balance" figure, since `guest_escrow_liability` is a liability the platform owes out, not revenue (see `docs/economy/economy-v1.md` §5.3).

- **KPI Cards:**
  - `baseFeeRevenue`: Lifetime platform rake from 2-5 seat matches plus solo entry collections (`world_bank_accounts.base_fee_revenue`).
  - `botPrizeRevenue`: Lifetime prizes diverted from bot placements (`world_bank_accounts.bot_prize_revenue`).
  - `guestEscrowLiability`: Currently outstanding, unredeemed guest voucher liability (`world_bank_accounts.guest_escrow_liability`) — decreases as vouchers are redeemed.
  - `totalVoucherRedeemed`: Lifetime counter of escrow released to members (`world_bank_accounts.total_voucher_redeemed`) — monotonically increases.
- **Audit Table:** Paginated stream of `public.world_bank_ledger` rows with filtering by `entry_type`.

---

### 2.2 Wallet Explorer (`/admin/economy/wallets`)

Provides customer support and fraud prevention tooling to inspect player balances, transaction history, and account status.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PLAYER WALLET EXPLORER                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  [ Search by Player ID / Display Name / Auth UID ] [ Filter: All/Guests]│
├─────────────────────────────────────────────────────────────────────────┤
│  Player ID    Kind    Balance     Granted   Earned    Spent    Status   │
│  p_9841284    member  4,850 🪙    5,000     1,200     1,350    Active   │
│  guest_8921a  guest   2,150 🪙    2,000       150         0    Active   │
├─────────────────────────────────────────────────────────────────────────┤
│  WALLET INSPECTION MODAL (p_9841284)                                    │
│  • Lifetime Granted: 5,000 🪙    • Lifetime Earned: 1,200 🪙            │
│  • Lifetime Spent:   1,350 🪙    • Lifetime Refunded:     0 🪙          │
│  • Current Balance:  4,850 🪙    • Status (read-only): Active / Frozen  │
│  • Starter Granted: Yes                                                 │
│                                                                         │
│  [ Transaction History Tabs: All | Entries | Prizes | Vouchers ]        │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Actions (read-only):**
  - Search wallets by `identity_id` or `auth_user_id`.
  - View full ledger history from `public.coin_ledger_entries`, including `balance_before`/`balance_after` and `wallet_version_before`/`wallet_version_after` for each entry.
  - View current `is_frozen` status, for fraud-investigation visibility only.
  - **No freeze/unfreeze control and no manual adjustment control exist in this plan.** A wallet's `is_frozen` flag is set only by a future, separately-approved capability — nothing in Economy V1 writes to it.

---

### 2.3 Voucher Explorer (`/admin/economy/vouchers`)

Auditing and monitoring interface for guest bearer vouchers and escrow liabilities.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  REWARD VOUCHER EXPLORER                                                │
├─────────────────────────────────────────────────────────────────────────┤
│  [ Filter: All / ACTIVE / REDEEMED / CANCELLED ] [ Search Code Hash ]   │
├─────────────────────────────────────────────────────────────────────────┤
│  Voucher ID  Amount   Status    Issued Guest   Redeeming Member Created │
│  vch_8912    100 🪙   ACTIVE    guest_fa821    —                10m ago │
│  vch_8911    150 🪙   REDEEMED  guest_398a1    p_9841284 (John) 1h ago  │
│  vch_8910    100 🪙   REDEEMED  guest_1109a    p_1208931 (Sara) 3h ago  │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Metrics & Insights:**
  - Total active unredeemed escrow liability in coins.
  - Average redemption velocity (time from match issuance to member claim).
  - Redemption rate breakdown (% of guest vouchers converted to member accounts).

---

### 2.4 Match Settlement Explorer (`/admin/economy/settlements`)

Financial reconciliation viewer inspecting the conservation of individual room match settlements.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  MATCH SETTLEMENT RECONCILIATION EXPLORER                               │
├─────────────────────────────────────────────────────────────────────────┤
│  [ Search Match ID / Room Code ] [ Filter: COMMITTED / SETTLED / REFUND]│
├─────────────────────────────────────────────────────────────────────────┤
│  Match ID   Room    Host         Seats  Collected  Disbursed  Status    │
│  M_98218    KD22TL  p_9841284    4      400 🪙     400 🪙     SETTLED ✓ │
│  M_98217    XARWQX  p_3819201    2      200 🪙     200 🪙     REFUNDED✓ │
├─────────────────────────────────────────────────────────────────────────┤
│  SETTLEMENT BREAKDOWN MODAL (M_98218 - Ludo 4 Seats)                   │
│  • Total Collected: 400 🪙 (Host: p_9841284)                            │
│  • Wallet Rewarded: 175 🪙 (1st Place - Alice)                          │
│  • Guest Escrow:    125 🪙 (2nd Place - guest_881a -> vch_9921)         │
│  • Bot Collection:   50 🪙 (3rd Place - Bot Charlie -> World Bank)     │
│  • World Bank Cut:   50 🪙 (Base 4-seat protocol rake)                  │
│  • Balance Delta:     0 🪙 [ CONSERVATION VERIFIED ✓ ]                  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 2.5 Ledger Search & Audit (`/admin/economy/ledger`)

Cross-cutting search engine for double-entry records across `coin_ledger_entries` and `world_bank_ledger`.

- **Filters:** Date Range, Min/Max Amount, Ledger Type (wallet-side: `STARTER_GRANT`, `ROOM_ENTRY_DEBIT`, `SOLO_ENTRY_DEBIT`, `BOT_ENTRY_DEBIT`, `MATCH_PRIZE_CREDIT`, `VOUCHER_REDEMPTION`, `MATCH_REFUND`; treasury-side: `BASE_FEE_REVENUE`, `SOLO_ENTRY_COLLECTION`, `BOT_PRIZE_REVENUE`, `GUEST_ESCROW_DEPOSIT`, `GUEST_ESCROW_REDEMPTION`), Idempotency Key regex. See `docs/economy/economy-v1.md` §4 for the full taxonomy — note there is no `GUEST_PRIZE_ESCROW` wallet entry (guest escrow never touches a wallet) and no merged `HOUSE_CUT`/`BOT_PRIZE_COLLECTION` type.
- **Export:** One-click CSV / JSON audit export for financial reconciliation.

---

## 3. Admin Economy API Endpoints

All routes mounted under `/api/admin/economy/*` inside `server/src/admin/AdminEconomyController.ts`:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/economy/treasury/summary` | World Bank balance, total collected/disbursed, and 30-day trend. |
| `GET` | `/api/admin/economy/treasury/ledger` | Paginated list of World Bank ledger entries. |
| `GET` | `/api/admin/economy/wallets` | Search and list player wallets with pagination and kind filters. |
| `GET` | `/api/admin/economy/wallets/:id` | Detailed wallet view including transaction history and balance stats (including `is_frozen`, read-only). |
| `GET` | `/api/admin/economy/vouchers` | Search and filter bearer vouchers by status and date. |
| `GET` | `/api/admin/economy/settlements` | List match settlements with conservation audit status. |
| `GET` | `/api/admin/economy/settlements/:id` | Deep reconciliation report for a single match settlement. |
| `GET` | `/api/admin/economy/settlements/stale` | Lists settlements stuck in `COMMITTED` past a configurable age, backed by `list_stale_committed_settlements` — surfaces reconciliation candidates per `docs/economy/economy-v1.md` §9. No automatic action is taken by this endpoint. |
| `GET` | `/api/admin/economy/ledger/search` | Full double-entry ledger search across all wallets and treasury. |

There is no `POST` route anywhere in this table. `/api/admin/economy/wallets/:id/freeze` and `/api/admin/economy/wallets/:id/adjust` from the pre-remediation draft are removed — see the correction notice at the top of this document.

---

## 4. Frontend Component Architecture

```
client/src/pages/admin/economy/
├── index.tsx                         # Economy Admin Hub & Sub-Navigation Tabs
├── WorldBankDashboard.tsx            # Treasury KPIs, charts, and audit stream
├── WalletExplorer.tsx                # Wallet search table + read-only inspection detail (no freeze/adjust controls)
├── VoucherExplorer.tsx               # Voucher status list, escrow metrics, hash inspector
├── SettlementExplorer.tsx            # Settlement reconciliation table & breakdown modal
├── LedgerSearch.tsx                  # Double-entry ledger query interface
├── components/
│   ├── EconomyKpiCard.tsx            # Standard DLS token stat card with coin formatting
│   ├── ConservationBadge.tsx         # Verified / Discrepancy indicator badge
│   ├── LedgerEntryRow.tsx            # Formatted ledger transaction row with type icons
│   └── StaleSettlementBanner.tsx     # Read-only "reconciliation required" indicator, sourced from list_stale_committed_settlements
```

No adjustment or freeze-mutation component exists in this plan — see the correction notice at the top of this document.
