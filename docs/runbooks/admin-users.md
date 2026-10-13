# Player Inspection and Suspension

## Deployment

Apply `supabase/migrations/20261101000000_admin_player_inspection.sql` after the existing accounts, progression and guest-retention migrations, before deploying the server. The migration registers existing and newly registered members, installs private inspection RPCs, and creates moderation state and audit tables. It is re-runnable without resetting moderation.

Configure the server's verified human superadmin IDs through `ADMIN_USER_IDS` and the existing operational role-grant mechanism. Use the deployment's existing server-only PostgREST credentials. Never put a service-role or operational key in the browser. Machine operational keys cannot use the new inspection or suspension endpoints.

The server loads all durable suspensions before listening. A failed load stops startup; it must not silently start with an empty denial list. This implementation assumes the repository's single server process. Multiple replicas would require coordinated denial invalidation before deployment.

Open `/admin/users` while signed in as a verified superadmin. The directory supports member/guest and role filters, search, and server-side pagination. Inspect opens retained profile, match, progression, economy, social and moderation sections. Unavailable sources are labelled rather than fabricated.

## Moderation

Suspend or resume through Inspect, enter a 3-500 character reason, and confirm. The server checks the caller and target, compares the displayed revision, and atomically records the state and audit. Self and superadmin targets are protected. Resume an identity before changing its role; pending moderation also prevents a role change.

Suspension denies authenticated HTTP and socket actions, guest renewal and stored-seat reclaim, and disconnects bound sockets. It preserves history rather than deleting an account. Existing verified self-profile erasure remains available. Suspension is identity-based: it does not block a newly created anonymous identity or establish an email, network or device ban.

A definitive failed write does not create a new denial. A lost or ambiguous write response leaves the identity denied and disconnects its sockets because the database may have committed. Inspect the current database state and audit, then use a reasoned resume with its current revision if access should be restored. Do not assume a displayed error means no write occurred.

## Data Limits

- Only retained canonical identities can be enumerated. Previously minted, unused guests that were never saved cannot be reconstructed.
- New human match records use canonical identities. Multiple seats owned by one identity produce one history participant, preferring its winning seat. Older seat-ID records cannot be retrospectively linked without independent evidence.
- Ratings and statistics are derived from recorded matches, not a reconstructed full lifetime history. Unsaved event timelines are not implied by the inspection view.
- Without durable persistence, inspection and suspension state are process-lifetime only. Unsupported sections report unavailable. This mode is not a durable moderation deployment.
- Erasure can remove inspectable personal records under existing privacy behavior. Moderation does not override retention or account-erasure policy.

## Verification and Rollback

Run the focused admin suites with `npm --prefix server test -- src/admin/__tests__` and `npm --prefix client test -- src/pages/admin/__tests__/usersIntegration.test.tsx`. Run `node scripts/admin/verifyAdminPlayers.mjs` for disposable local PostgreSQL checks of directory paging, atomic moderation, grants, RLS, migration reapplication and rollback.

The SQL harness declares its Supabase Auth stand-ins and optional-source limits. Mocked browser fixtures do not certify deployed Supabase JWTs or PostgREST. Verify real superadmin authentication, all installed optional record sources and migration execution in staging before production rollout.

For rollback, stop or roll back the new server version first, then use `supabase/rollbacks/20261101000000_admin_player_inspection.sql`. Export moderation evidence through the approved operational process before rollback: it removes moderation tables, RPCs, policies and the winner-kind column, but preserves canonical identities. Never apply rollback while the new server is serving traffic.