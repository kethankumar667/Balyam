# Friend invitations and the Journey panel

## Rules and data

A signed-in, email-verified member gets a stable invitation link. Viewing it
creates no identity and stores no acceptance. The recipient deliberately
accepts **before creating an account**, verifies their new account, and completes
one server-recorded match with another non-bot human participant within 30 days.
Local pass-and-play seats and bot-only matches cannot qualify.

Three distinct qualified accounts grant the whole Nostalgia Pack once:
Golden Reunion avatar aura, Gang Leader podium title, and School Slate
Rummy material. There are no referral coins or XP. Existing cosmetic ownership
is preserved; ownership is never fabricated by the client.

Admin Pass (including Super Admin) can equip all three items without qualifying
referrals, using **Equip pack · Admin Pass** on the Journey Social Quest card.
It remains available while invitation progress is loading or unavailable.
The button uses the existing server-verified cosmetic equip permission; it
neither grants earned entitlements nor changes referral counts or wallet balance.
Ordinary members still need the earned pack. School Slate remains confined to
classic Rummy; a host-selected non-classic world takes priority for admins too.

`referral_sync` reads durable `match_summaries`/`match_participants`. Qualification
and all entitlements commit together under the inviter's row lock. Sync happens
on dashboard arrival, progression updates, or **Refresh progress**; this is not
a background or instantaneous match-finish award.

The browser keeps `bhalyam.referral.intent` only after acceptance. Email signup
also carries the signed token in `user_metadata.referral_intent`, allowing
confirmation on another device; Google signup carries it through the callback
URL. Processed tokens are cleared locally and from account metadata. Unconfirmed
email intents remain retryable. Their eligibility expires after 30 days; this
does not promise automatic deletion of stored attribution. Attribution remains
until either account is deleted. Already earned rewards are not revoked if an
invitee later deletes their account.

Only qualification counts are disclosed to the inviter, never invitee email,
name or match details. No contacts, IP or device fingerprint are collected for
referrals. Public endpoints share a per-process 60-request burst/1-per-second
budget; member mutations have a 12-request burst/one-per-five-seconds budget.
Exhaustion returns 429 with Retry-After. These are operational bounds, not
distributed abuse prevention or proof that two accounts are different people.

## Deploy

1. Back up and migrate the existing production schema through:
   - [referral rules](../../supabase/migrations/20261108000000_referrals.sql)
   - [pack catalogue and campaign activation](../../supabase/migrations/20261108000001_nostalgia_pack.sql)
2. Configure durable PostgREST/service-role access and verified Supabase auth
   on the server. Keep `SESSION_SECRET` stable and at least 32 characters; rotating
   it invalidates unconnected accepted invitations. Never expose service keys.
3. Deploy the server, then the client. Permit `/invite/complete` (including query
   parameters) in the Supabase OAuth redirect allow-list. Normal email-confirmation
   redirects remain unchanged because email signup metadata carries the intent.
4. Confirm the three catalogue rows are active with unlock method
   `REFERRAL_MILESTONE`, and `referral_campaign` enables `nostalgia-v1`.

Without persistence, a signing key or real auth verification, routes return 503.
There is no in-memory or local-flag simulation of successful referrals.
The browser notice version is 5; review the updated privacy notice before release.

## Staging acceptance

- Existing and self accounts cannot qualify; an unconfirmed email waits.
- Accept on one device, confirm email on another, and check attribution survives.
- Verify Google signup callback and refresh without exposing the token in the URL.
- Bot-only and pre-acceptance matches do not count; human matches in the window do.
- At 3 qualifying friends, retry/concurrent sync grants exactly three entitlements
  with one source reference, no wallet/XP change.
- Remove a catalogue item in staging: the entire grant and qualification update
  must roll back, and the UI must show a retryable failure.
- Equip the pack; check the aura/title and both Rummy layouts. Switch to a
  non-classic host world: it must override School Slate. Card artwork is unchanged.
- With a server-recognised Super Admin and zero referrals, equip all three through
  Admin Pass, including when referral sync is unavailable. Confirm the wallet and
  earned ownership are unchanged. An ordinary unearned member must still be refused.
- Restart the server/database and verify progress/ownership remain. Delete an
  account and verify attribution cascades; earned rewards on others remain.
- Test 320/375/768/1024/1440px, keyboard, both theme contexts, reduced motion,
  public acceptance, sharing fallback and unavailable-service states.

## Disable without erasing earned property

Run [the operational rollback](../../supabase/rollbacks/20261108000000_referrals_rollback.sql).
It disables the campaign but keeps attribution and ownership for audit and
recovery. Do not drop tables, remove owned catalogue rows, or roll back the
unlock-method constraint while referral entitlements exist.

## Local checks and scope

Server referral tests include real SQL in embedded PostgreSQL, disk restart,
atomic failure and HTTP ownership boundaries. They do **not** prove a deployed
Supabase project's redirects, auth schema, email delivery or real two-device flow.

Focused verification commands (from the repository root):

```powershell
npm --prefix client test -- src/hooks/__tests__/useReferralProgress.test.tsx src/components/auth/__tests__/referralSignup.test.tsx src/pages/__tests__/InvitePage.test.tsx src/pages/home/__tests__/PlayerJourneyDashboard.test.tsx src/pages/home/__tests__/ReferralQuest.test.tsx src/components/profile/__tests__/SeatAvatar.test.tsx src/components/cosmetics/__tests__/cosmeticsBoutiquePolish.test.tsx src/components/cosmetics/__tests__/referralCosmetics.test.tsx src/store/__tests__/cosmeticsStore.test.ts src/store/__tests__/authLifecycle.test.ts src/pages/__tests__/privacyPolicyContent.test.tsx src/lib/__tests__/referrals.test.ts --reporter=dot --maxWorkers=1 --minWorkers=1
npm --prefix server test -- src/referrals/__tests__ src/cosmetics/__tests__/cosmeticsService.test.ts src/cosmetics/__tests__/CosmeticsController.test.ts src/rooms/__tests__/cosmeticsOwnership.test.ts --reporter=dot --maxWorkers=1 --minWorkers=1
npm --prefix client run typecheck
npm --prefix client run build
npm --prefix server run typecheck
npm --prefix server run build
git diff --check
```

Use a real browser for layered material previews: happy-dom discards leading
background-image layers. Component tests check the emitted CSS; browser checks
must confirm that both chalk lines and the slate material are actually drawn.

This milestone does not implement playable saves. The latest-game Journey action
truthfully starts a fresh game. Solo/bot cross-device saves and live multiplayer
seat handoff remain separate, approved milestones.
