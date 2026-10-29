# Friend invitations and the Journey panel

## Rules and data

A signed-in, email-verified member gets a stable invitation link. Viewing it
creates no identity and stores no acceptance. The recipient deliberately
accepts **before creating an account**, verifies their new account, and completes
one server-recorded match with another non-bot human participant within 30 days.
Local pass-and-play seats and bot-only matches cannot qualify.

Three distinct qualified accounts grant the whole Nostalgia Pack once:
Golden Reunion avatar aura, Gang Leader podium title, and School Slate
table material (Rummy, Ludo, Goli Jump, Bingo, Star Game and Sudoku). Referral XP is never awarded; referral **coins** are
paid separately, see "Referral codes and the coin bonus". Existing cosmetic ownership
is preserved; ownership is never fabricated by the client.

Admin Pass (including Super Admin) can equip all three items without qualifying
referrals, using **Equip pack · Admin Pass** on the Journey Social Quest card.
It remains available while invitation progress is loading or unavailable.
The button uses the existing server-verified cosmetic equip permission; it
neither grants earned entitlements nor changes referral counts or wallet balance.
Ordinary members still need the earned pack. Equipping the pack equips School
Slate in all six games (one equipped slot per game, `shared/referrals.ts`
`packEquipTargets`); each game's own theme control turns it off again. In Rummy
and Ludo it is confined to the classic world: a host-selected non-classic world
takes priority for admins too.

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

The inviter sees the invitee's **display name**, join date, whether they have played
a match with another person, and how each bonus stands (privacy notice 7). Never
email, date of birth, other profile fields or match details. The invitee sees the
same about the member who invited them. No contacts, IP or device fingerprint are
collected for referrals. Public endpoints share a per-process 60-request burst/1-per-second
budget; member mutations have a 12-request burst/one-per-five-seconds budget.
Exhaustion returns 429 with Retry-After. These are operational bounds, not
distributed abuse prevention or proof that two accounts are different people.

## Referral codes and the coin bonus

**The code.** Every verified member has a share code `BHALYAM-XXXXX`: five characters drawn at random from
`23456789BCDFGHJKLMNPRSTVWXZ` (no vowels, so no word can be spelt, and no 0/1/O/I/U). It contains nothing about the
member (no name, birthday or id), which is what keeps it clear of the DPDP Act's minimisation rule. It is stable,
stored on `referral_invites.share_code`, and typed forgivingly (case, spaces, hyphens, optional `BHALYAM`) by
`normalizeReferralCode` in `shared/referrals.ts`. The long UUID links already sent keep working.

**Two ways in.** A visitor opens `/invite/BHALYAM-XXXXX` (or the old UUID link), accepts, and signs up; or a new member
types a code in the sign-up form (step 3), or in the first-run `ReferralCodePrompt` (between the profile questions and
the welcome). A typed code is held in `bhalyam.referral.code` and in the account's sign-up metadata
(`referral_code`) so verifying the email on another device still applies it; both are cleared once tried.
`referral_redeem_code` accepts it only for a verified member in their first 7 days (`code_window_days`), with no
attribution yet, who has not yet finished a match with another person. "Wrong code? Remove" (`referral_detach`)
works until the first qualifying match or once a bonus is reserved.

**The bonus.** 2,000 coins to the inviter and 2,000 to the invitee (the invitee keeps the 5,000 welcome), when the
invitee finishes a match with another non-bot human. `ReferralBonusService` runs every 60 seconds:
`referral_qualify_open` marks friends qualified, `referral_bonus_due` lists who is owed, `referral_bonus_reserve`
takes the inviter's lock, applies the rolling cap (10 rewarded friends per 30 days) and records the amounts, each
side is granted through `RewardGateway` (reward type `REFERRAL`, source `referral:<invitee>:inviter|invitee`, held
24 hours like any gameplay reward), and only then `referral_bonus_complete` closes it. A crash anywhere leaves the
bonus reserved and the next pass finishes it; the idempotent ledger key means nobody is paid twice. Friends beyond
the cap still count toward the Nostalgia Pack. Nothing accepted before the migration is paid retroactively
(`referral_campaign.bonus_starts_at`).

**Live notices and the wallet label.** `ReferralNotifier` (server) sends a `referral:update` socket event to the
member's `user:<id>` room, which every signed-in tab joins through the Mandali authentication, at four moments:
a friend joined with your code (`friend_joined`, to the inviter, from `redeemCode`/`attribute`, once per invitee),
the friend played their first match (`friend_played` to the inviter, `bonus_on_the_way` to the invitee, once, right
after `referral_bonus_complete`), and the coins landed (`bonus_landed`, from the reward gateway's
`setReleaseListener` when the 24-hour hold ends). A notice carries only the other person's display name and the
coins, read by `referral_event_context` (migration `20261112000000`, service-role only, rollback in
`supabase/rollbacks/`). It is best effort: it never throws, an offline member simply misses it, and the Referrals page
and wallet show the same facts later. The client (`useReferralLive`, mounted in `AppLayout`) validates the payload,
shows a toast, bumps `useReferralLiveStore` so an open Referrals page re-reads, and reloads the wallet when coins land.
Referral coins appear in wallet history as **Friend Bonus** (principal `system:referral`).

**Tuning and stopping.** The amounts, cap, windows and start time live in `referral_campaign`; set `inviter_bonus`
and `invitee_bonus` to 0 to stop paying without touching any row (the rollback script does exactly that).

**The page.** `/referrals` (capability `viewReferrals`, members only, linked from Player HQ as "Invite friends") reads
`referral_overview` and is drawn as **Crew Quest**, which follows the app's theme: navy glass by night, warm paper with white panels by day,
and a hero that stays a dark illustrated banner in both (components in
`client/src/features/referrals/crew/`): a hero; the code with **Share Invite** as the one primary action and
WhatsApp / Copy Link / Email beneath it; a four-tile Crew Pulse (joined, played together, waiting, coins on the way,
with what was received folded in); a five-stage Invitation Journey (invite sent, friend joins, play together, verify
match, both get rewards) where the gold stage is where the member is now; Your Crew, one progress card per friend
(Joined / Verifying / Rewarded / Window ended, the days left to play, and the day, time and countdown a held bonus
arrives); the Nostalgia Pack as a vault; a four-step How It Works; and a privacy panel. "View Full Rules" opens the
complete rules in a dialog. A member who may still add a friend's code, or who has one to remove, sees that box
under the code row. The stage and badge logic is pure (`crew/crewProgress.ts`) and unit-tested. The wide
two-column grid starts at `xl` (1280px), because the app sidebar leaves only about 680px at 1024px. `/referrals` and
`/invite/` are disallowed in `robots.txt` and never prerendered.

**Invitation promos.** The home page (between the games grid and "What are we playing") shows a large showcase,
"Bring your last-bench gang": a dark panel with the friends photograph, count-up reward chips, a tilted gold
"Admit two" pass holding the member's code (Copy code and Share on its stub) and, only when the browser allows
motion, coins drifting upward. A compact `InvitePromo` card appears on the Games catalogue (below the grid), the Shop
(below the shelf, both layouts), the wallet drawer (under the carry-over card) and the finished-table card after a
match. Both read the member's overview once per visit
(`useInvitePromoStore`) and shows the code with Copy and Share; a guest sees "Create an account" with no coin figure.
It is hidden while loading, on any error, and when the campaign's two bonuses are both 0 (so "Stop the coin bonus" in
the admin console also switches the promos off). "Hide" lasts for the visit only and is held in memory, so there is
no storage key and no privacy-notice change. The promos send nothing about who saw them.

**The operator console.** `/admin/referrals` (admin nav item "Referrals") is a view over `/api/admin/referrals`
(`ReferralAdminController`, behind `requireOperationalAuth`: super admins or the operations key). It shows the funnel
(members with a code → friends joined → played with another person → bonus issued), the coins waiting / paid /
withdrawn, the members with the most invitees (a number to read, not a verdict), the bonuses still in their hold,
and the record of operator changes. Two levers exist, and nothing else:
- **Campaign settings** (`PUT /campaign`): inviter and invitee bonus (0–10,000), friends rewarded per window
  (0–100), window length (1–365 days), days a new member may add a code (1–60). Tighter than the table's own limits
  on purpose, so a typo of 20000 for 2000 is refused rather than paid. A change needs a written note (≤200
  characters). "Stop the coin bonus" only fills in zeros; it still needs a note and a save. Bonuses already reserved
  keep their amounts; the new amounts apply to a friend whose bonus has not been reserved yet.
- **Withdraw a pending bonus** (`POST /rewards/:id/void`): needs a reason, cannot be undone, and is refused with 409
  once a bonus has started being paid (the page offers no button for it).
Every change is written to the append-only `referral_admin_events` table with the actor taken from the verified
credential (`admin:<id>` or `ops-key`), never from the request body. The migration is `20261113000000`
(service-role only, rollback in `supabase/rollbacks/`; the rollback drops the functions but keeps the log table as
evidence, and leaves any campaign values already set as they are).

## Deploy

1. Back up and migrate the existing production schema through:
   - [referral rules](../../supabase/migrations/20261108000000_referrals.sql)
   - [pack catalogue and campaign activation](../../supabase/migrations/20261108000001_nostalgia_pack.sql)
   - [share codes, redeem and the coin bonus](../../supabase/migrations/20261111000000_referral_bonus.sql)
     (needs `profiles` and `reward_ledger`; take owner authorisation before applying)
   - [live-notice name lookup](../../supabase/migrations/20261112000000_referral_event_context.sql)
     (read-only; without it the notices are skipped with a warning, nothing else breaks)
   - [operator console](../../supabase/migrations/20261113000000_referral_admin.sql)
     (without it `/admin/referrals` shows "Referral data unavailable"; nothing else breaks)
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
The browser notice version is 7; review the updated privacy notice and Terms (section 8) before release.

## Staging acceptance

- Existing and self accounts cannot qualify; an unconfirmed email waits.
- Accept on one device, confirm email on another, and check attribution survives.
- Verify Google signup callback and refresh without exposing the token in the URL.
- Bot-only and pre-acceptance matches do not count; human matches in the window do.
- At 3 qualifying friends, retry/concurrent sync grants exactly three entitlements
  with one source reference, no wallet/XP change.
- Remove a catalogue item in staging: the entire grant and qualification update
  must roll back, and the UI must show a retryable failure.
- Equip the pack; check the aura/title and both layouts of Rummy, Ludo, Goli Jump,
  Bingo, Star Game and Sudoku. In Rummy and Ludo, switch to a non-classic host
  world: it must override School Slate. Card artwork and seat colours are unchanged.
  Turn it off from each game's own theme control (Sudoku/Bingo: the theme button;
  Goli Jump: World; Star Game: the palette in the header; Rummy/Ludo: the host's picker).
- With a server-recognised Super Admin and zero referrals, equip all three through
  Admin Pass, including when referral sync is unavailable. Confirm the wallet and
  earned ownership are unchanged. An ordinary unearned member must still be refused.
- Restart the server/database and verify progress/ownership remain. Delete an
  account and verify attribution cascades; earned rewards on others remain.
- Test 320/375/768/1024/1440px, keyboard, both theme contexts, reduced motion,
  public acceptance, sharing fallback and unavailable-service states.
- Codes: the page shows one stable `BHALYAM-XXXXX`; `/invite/<code>` accepts and the sign-up field arrives
  pre-filled; a typed code with a different case or spaces works; a wrong code is refused with a reason; a
  member who already played a human match, is older than 7 days, or is the code's owner is refused.
- Bonus: a new member finishes a match with a real second person; within a minute both sides show "arriving"
  with the vesting date, and 24 hours later both wallets rise by 2,000. A bot-only match pays nothing. Run the
  sweeper twice (and kill the server between the two grants) and confirm no one is paid twice.
- Cap: with 10 rewarded friends in 30 days, the 11th shows "Not paid: 10 friends already rewarded", still counts
  toward the pack, and the inviter's wallet does not move.
- Privacy: the inviter's page shows the invitee's display name and nothing else personal (no email, birthday or
  match detail); the invitee's "Invited by" card shows the inviter's display name. Deleting either account removes
  the other's view of that name.
- Promos: a member sees their own code (the same as on `/referrals`) on home, Games, Shop, wallet and after a match;
  Copy puts it on the clipboard and Share opens the share sheet or WhatsApp; "Hide" removes every promo until the
  page is reloaded. A guest sees the sign-up pitch and no coin figure, and the network tab shows no referral call for
  them. Setting both bonuses to 0 in the admin console removes every member promo. Check 375, 768, 1024, 1440 and
  800x365: the card must not push the Shop's stage or action bar off the first screen.
- Console: as a super admin, `/admin/referrals` shows numbers that match the member Referrals pages; changing a
  bonus without a note is impossible, a value over its limit is refused with the range, a saved change appears in
  "Record of changes" with the admin's id and the note; withdrawing a vesting bonus asks for a reason, removes it
  from the hold list, and the member's wallet never receives it; an ordinary member gets 401 from the API.
- First run: a Google sign-up sees the code prompt before the welcome; an email sign-up that typed a code at step 3
  (even if verified on another device) sees "Code added"; "Not now" leaves the Referrals page field available.

## Disable without erasing earned property

Run [the operational rollback](../../supabase/rollbacks/20261108000000_referrals_rollback.sql).
It disables the campaign but keeps attribution and ownership for audit and
recovery. Do not drop tables, remove owned catalogue rows, or roll back the
unlock-method constraint while referral entitlements exist.

To stop only the coin bonus, run
[the bonus rollback](../../supabase/rollbacks/20261111000000_referral_bonus_rollback.sql): it sets both bonus
amounts to 0, keeping codes, attributions, ledger rows and the page. Bonuses already reserved or vesting are
not clawed back; an operator can void a pending reward through the reward-gateway admin tools.

## Local checks and scope

Server referral tests include real SQL in embedded PostgreSQL, disk restart,
atomic failure and HTTP ownership boundaries. They do **not** prove a deployed
Supabase project's redirects, auth schema, email delivery or real two-device flow.

Focused verification commands (from the repository root):

```powershell
npm --prefix client test -- src/hooks/__tests__/useReferralProgress.test.tsx src/components/auth/__tests__/referralSignup.test.tsx src/pages/__tests__/InvitePage.test.tsx src/pages/home/__tests__/PlayerJourneyDashboard.test.tsx src/pages/home/__tests__/ReferralQuest.test.tsx src/components/profile/__tests__/SeatAvatar.test.tsx src/components/cosmetics/__tests__/cosmeticsBoutiquePolish.test.tsx src/components/cosmetics/__tests__/referralCosmetics.test.tsx src/store/__tests__/cosmeticsStore.test.ts src/store/__tests__/authLifecycle.test.ts src/pages/__tests__/privacyPolicyContent.test.tsx src/lib/__tests__/referrals.test.ts --reporter=dot --maxWorkers=1 --minWorkers=1
npm --prefix client test -- src/pages/__tests__/ReferralsPage.test.tsx src/features/referrals src/components/onboarding src/pages/__tests__/termsCoinsAndAge.test.tsx src/lib/privacy src/seo --reporter=dot --maxWorkers=1 --minWorkers=1
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
