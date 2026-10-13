# Admin Player Inspection Implementation Plan

**Goal:** Let verified super admins inspect recorded member/guest data and reversibly suspend abusive identities.

**Approved Design:** The owner approved the recommendation on 2026-10-13: extend the existing Users screen, use recorded data only, preserve moderation evidence, and implement suspension rather than destructive deletion.

**Architecture:** Reuse the existing operational API, canonical player identities, PostgREST/in-memory persistence and admin components. Persist moderation state and audit atomically; hydrate the denial map before accepting traffic. Keep active socket checks synchronous. Shared contracts are in `shared/adminUsers.ts`.

**Constraints:** No new tracking signals, no credential/password exposure, no new infrastructure, no live database changes or commits. Preserve privacy erasure and anonymous financial ledgers. Never fabricate missing emails or lost historical account-to-seat associations. Suspension protects the existing identity, not an anonymous visitor or a newly registered identity.

## 1. Directory and Inspection

- Replace the capped merged profile directory with canonical member/created-guest coverage, bounded server pagination/search/filter and honest missing values.
- Include accounts registered but never used on the game server; persist newly created guest identities without granting a wallet.
- Implement `GET /api/admin/users?page=1&pageSize=10&search=&kind=all&role=all` returning `AdminUsersResponse`.
- Implement `GET /api/admin/users/:id` returning `AdminUserDetails`; `GET /api/admin/users/:id/records/:section?page=1&pageSize=20` returns `AdminRecordSection`.
- Whitelist recorded profile, match, progression, wallet/ledger, reward, social and moderation data. Inspection must not provision or credit anything.
- Test more than 100 accounts, guests without profiles/wallets, erased exclusions, empty/search/pagination, private-data denial and zero inspection writes.

## 2. Suspension and Enforcement

- Implement `POST /api/admin/users/:id/suspension` with the shared action/reason/expectedRevision contract.
- Require a server-verified human super admin; refuse self and protected superadmin targets, invalid reasons and stale revisions.
- Persist status and audit in one transaction. Hydrate all suspended identities before listen and fail closed on configured-store load failure.
- Block verified suspended HTTP identities, guest renewal, authenticated socket actions, seat reclaim and Mandali operations. Disconnect associated active sockets after suspension commits; resume only after a confirmed write.
- Test durable reload, audit consistency, conflict/failure handling, authenticated bypasses, existing-seat reclaim and zero database calls in packet checks.
- Fix future match recording to retain verified human identity associations without changing gameplay outcomes. Clearly label unavailable legacy associations.

## 3. Existing Admin UI

- Replace local ban previews with confirmed suspend/resume actions requiring a reason and explicit confirmation.
- Add member/guest filters, server pagination, inspection loading/error/empty states and bounded record-section navigation.
- Reuse admin layout, drawers, tables, themed controls and focus-managed confirmation dialogs. Keep controls keyboard accessible and mobile usable.
- Test directory requests, selection races, record pagination, required reasons, protected targets and failure without optimistic success.

## 4. Verification

- Run focused tests immediately after each implementation edit, then affected integration suites and client/server typechecks.
- Run client production build and focused real-browser workflows at mobile/tablet/desktop widths.
- Run mandatory repository gates and report failures honestly without changing unrelated code.
- Review security and code changes independently before completion; record deployment migration requirements and unverified live-provider assumptions.