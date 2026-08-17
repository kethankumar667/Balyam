# Runbook — accounts on Supabase

Everything needed to turn BHALYAM's sign-in screens from a local flag into
real accounts, and what to check when they misbehave.

**Time to complete:** about 20 minutes, most of it waiting for the project to
provision.

---

## Why Supabase, and what it costs

Accounts need three things: somewhere to store users, something to check
passwords, and something to send email. Supabase's free tier is all three, and
the client talks to it directly over HTTPS — the game server never sees a
password and needs no database of its own.

The free tier's real limits, stated plainly because two of them will matter:

| Limit | Value | What happens when you hit it |
| --- | --- | --- |
| Monthly active users | 50,000 | Nothing, at this project's scale |
| Database | 500 MB | Profiles are two short columns; not a concern |
| **Email delivery** | Only as good as what **SMTP Settings** points at — a personal mailbox will not do it | Confirmation and reset emails silently fail to arrive, with nothing in the logs. **The single most likely thing to be broken** — see [Email](#7-email--the-one-that-will-bite-you-and-already-has) |
| **Emails per hour** | Whatever **Authentication → Rate Limits** shows (30/h here) | Sends refused with `over_email_send_rate_limit`. Loud and named, unlike delivery failures |
| Project pausing | after 7 days idle | Sign-in fails until you unpause from the dashboard |

The game server is unaffected by all of it. A paused Supabase project means
nobody can sign in; it does not stop a guest playing or a room running.

---

## 1. Create the project

1. <https://supabase.com> → **New project**.
2. Pick a region close to your players — for India, **South Asia (Mumbai)**.
   This is a data-residency decision as much as a latency one; write down
   which region you chose, because the privacy notice describes where personal
   data goes.
3. Save the database password somewhere safe. You will not need it for this
   setup, and you cannot see it again.

## 2. Run the migration

Dashboard → **SQL Editor** → **New query** → paste all of
[`supabase/migrations/0001_accounts.sql`](../../supabase/migrations/0001_accounts.sql)
→ **Run**.

It is written to be re-runnable, so running it twice is harmless.

It creates:

- `public.profiles` — display name and avatar, one row per account, with Row
  Level Security so a row is readable only by its owner.
- `on_auth_user_created` — a trigger that makes the profile row the moment the
  account exists, named from the signup form or from Google.
- `public.delete_account()` — lets a signed-in player delete themselves. This
  is what makes "Erase my data" honest under DPDP Section 12, and it is why
  the app never needs a service-role key.

Verify: **Table Editor** → `profiles` exists and shows the green **RLS
enabled** badge. If that badge is missing, stop and re-run the migration —
without RLS every profile is world-readable.

## 3. Point the client at it

Dashboard → **Project Settings → API**. Copy the **Project URL** and the
**publishable** key into `client/.env`:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
```

Older projects call that key **anon** and show a JWT instead. Both names are
read (`VITE_SUPABASE_ANON_KEY`), so use whichever the dashboard gives you.

Restart `npm run dev` — Vite reads env at startup, not per request.

The key is public by design and ships inside the JS bundle. That is safe
because RLS, not the key, decides who can read what. **Never** put the
`service_role` (or `sb_secret_…`) key in the client: it bypasses RLS
completely.

## 4. Point the server at it

The server does not read or write the database. Its only job is to check that
a player claiming to be signed in actually is, so that `hostKind` stops being
something a browser can simply assert.

In `server/.env`, **either**:

```
SUPABASE_JWT_SECRET=<Project Settings → API → JWT Settings → JWT Secret>
```

**or**, if your project uses asymmetric signing keys — newer projects do, and
a key that looks like `sb_publishable_…` is the tell — in which case there is
no secret to copy and this is the path to take:

```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<the same key the client uses>
```

The first verifies in-process with no network call and is preferable. The
second asks Supabase and caches the answer for a minute.

Confirm with `curl http://localhost:4000/health` — the `auth` field reads
`jwt-secret`, `auth-api`, or `off`.

> **Both sides or neither.** A server with verification on and a client build
> without keys turns every player into a guest, and the only visible symptom
> is that nobody can host. The server logs a warning on the first such join;
> `/health` is the faster check.

## 4b. Deploying (Render)

Every variable each side needs, and nothing it does not. `service_role` /
`sb_secret_…` appears in neither column and must never be set on either: no
line of this codebase reads it, and it bypasses Row Level Security entirely.

**Client build** — set on whichever service *builds* the bundle:

| Variable | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | the publishable key (`VITE_SUPABASE_ANON_KEY` also read) |
| `VITE_SERVER_URL` | the deployed **server** URL, e.g. `https://bhalyam-server.onrender.com` |

`VITE_SERVER_URL` is the one that is easy to forget and impossible to miss
afterwards: `lib/socket.ts` falls back to `http://localhost:4000`, so without
it the deployed client loads perfectly and can never reach a room.

Vite inlines all three **at build time**. Changing them in the dashboard does
nothing until a rebuild — a redeploy of the same artifact keeps the old values.

**Server:**

| Variable | Value |
| --- | --- |
| `SUPABASE_URL` | same project URL |
| `SUPABASE_PUBLISHABLE_KEY` | same key as the client (`SUPABASE_ANON_KEY` also read) |
| `CLIENT_ORIGIN` | the deployed **client** origin, comma-separated for several |

Skip `SUPABASE_JWT_SECRET` unless your project still issues legacy `anon` JWTs;
a project on `sb_publishable_…` keys signs asymmetrically and has no secret to
verify against, so `auth-api` is its mode.

`CLIENT_ORIGIN` fails in a way worth knowing in advance: browsers do not
enforce CORS on WebSocket handshakes, so a wrong value looks completely fine
until a player's network degrades enough to need the long-polling fallback —
then that one phone can never reconnect while everyone else is fine. Set it,
and check `/health` after deploy.

**Static-site rewrite.** The client is a single-page app, so a static host
must rewrite `/*` to `/index.html`. Without it every deep link 404s on direct
open — including `/verify-email`, which is exactly where a confirmation link
lands, and `/room/:code`, which is every invite ever shared.

## 5. Redirect URLs

Dashboard → **Authentication → URL Configuration**:

- **Site URL** — your deployed client origin (`https://bhalyam.example.com`).
- **Redirect URLs** — add every origin that will send people back, including
  local development:

  ```
  http://localhost:5173/**
  https://<your-client-domain>/**
  ```

Miss this and OAuth and password-reset links bounce to the Site URL instead of
where the player was, or fail outright.

## 6. Google sign-in (optional)

The Google button is live in the UI and returns an honest error until this is
done.

1. [Google Cloud Console](https://console.cloud.google.com) → **APIs &
   Services → Credentials → Create OAuth client ID → Web application**.
2. Authorised redirect URI — exactly this, from the Supabase dashboard's
   Google provider page:
   `https://<project-ref>.supabase.co/auth/v1/callback`
3. Copy the client ID and secret into Supabase → **Authentication → Providers
   → Google** → enable.

Apple is deliberately not wired: it needs a paid Apple developer account. The
button says so rather than failing silently.

## 7. Email — the one that WILL bite you, and already has

> **If players are reporting "I never got the OTP", this section is the
> answer, and nothing in the client can fix it.** The code changes shipped
> alongside this note stop those players being *stranded*; they do not make
> the email send. Only the dashboard can do that.

### The symptom

Some people sign up and receive their code. Most get nothing. The `auth.users`
and `profiles` rows for those players **still exist**, because the account is
created before the mail is dispatched — so the table fills with accounts that
were never usable, and sign-up refuses those addresses ever after ("that email
already has an account").

### What it was on this project, August 2026

**Gmail SMTP.** Custom SMTP was enabled and pointed at `smtp.gmail.com` with a
personal `@gmail.com` account as both sender and username. Supabase warns
about this on the SMTP settings page itself:

> Check your SMTP provider — It looks like the SMTP provider you entered is
> designed for sending **personal** rather than **transactional** email
> messages. Email deliverability may be impacted.

That warning is the whole diagnosis. Take it seriously; it is easy to save
past.

### Why the logs look innocent

This failure is invisible in **Logs → Auth Logs**. Every call succeeds:

```
POST /signup  200   User confirmation requested: request completed
POST /resend  200   Request completed
```

GoTrue's job ends when the mail server accepts the message. Gmail accepts it,
GoTrue logs a 200, and everything that happens afterwards — a spam
classification, a silent drop, an asynchronous bounce — happens somewhere
Supabase never sees. **A clean auth log is not evidence that mail arrived.**

So the check that matters is not in Supabase at all: **open the sending Gmail
account's own inbox.** Google's "Critical security alert" notices and SMTP
bounce reports are delivered there and nowhere else.

### Why Gmail specifically breaks this way

- **Google blocks the SMTP sign-in.** Supabase connects from a datacenter IP,
  which to Google looks like a compromised account. It blocks the attempt,
  intermittently, and mails the owner about it. Intermittent is the tell: it
  produces failures scattered across days, which no hourly cap can explain.
- **Gmail rewrites the From header** to the authenticated account, so mail
  branded "Bhalyam" arrives from a personal address with no SPF or DKIM
  alignment behind it. Straight to spam for most recipients.
- **Daily send caps** (~500 recipients on a free account, lower in practice
  for unusual traffic) produce deferrals and bounces *after* acceptance.

### Ruling the rate limit in or out

Only if the above does not fit. The cap (`Authentication → Rate Limits` →
*Rate limit for sending emails*) is project-wide and hourly, so it fits a
**burst** — several signups inside one hour, the later ones refused — and
never fits failures spread across different hours or days, because each hour
starts fresh. When it does fire it is loud and named:
`over_email_send_rate_limit`, with a 429, in the auth log. If you cannot find
that string, this is not your problem.

### The fix — pick one, today

**Option A — turn off email confirmation. Two minutes, no accounts needed.**

Authentication → Providers → Email → **Confirm email: off**.

Sign-up then returns a session immediately, and the app already handles that
path: `useSignUp` checks `data.session` and skips the check-your-inbox screen
entirely. No code change. Acceptable for a party game where the email is a
login handle rather than a channel you intend to use. What you give up is any
proof the address is real, and password reset becomes only as good as whatever
was typed.

**Option B — a real transactional provider. Twenty minutes, and the fix.**

Project Settings → Authentication → **SMTP Settings**. Custom SMTP being *on*
is not the same as it being *right* — this project had it on, pointed at
Gmail, the entire time it was failing. What matters is what it points at:

| You have | Use | Free tier | Why |
| --- | --- | --- | --- |
| Your own domain | **Resend** or **Amazon SES** | 3,000/mo | Verify the domain and you get SPF + DKIM aligned to it. Best deliverability available. |
| No domain yet | **Brevo** | 300/day | Sends from a verified sender address over its own warmed IPs and authentication. Far better than Gmail without needing to own anything. |
| — | ~~Gmail / Outlook / any personal mailbox~~ | — | Not a transactional sender. This is the failure being fixed. |

A transactional provider also gives you the thing Gmail never did: a
**delivery dashboard**. Sent, delivered, bounced, marked spam — per message.
The next time someone says the code never arrived you can look it up instead
of guessing.

Afterwards, check **Authentication → Rate Limits → Rate limit for sending
emails** is high enough for a launch evening. It is a separate page, and it is
easy to configure SMTP correctly and still sit behind a low cap.

Doing both is reasonable: B is the real fix, A unblocks the evening.

### Cleaning up the accounts already stranded

Players who signed up during an outage have an unconfirmed row and no way
through. Since the sign-in fix shipped, they no longer need deleting: signing
in with the right password now lands them on `/verify-email`, where **Resend**
issues a fresh code — which will work as soon as mail is flowing again. Tell
them to sign in rather than sign up.

To confirm them in bulk instead, in the SQL editor:

```sql
-- Inspect first. These are the accounts that never finished.
select id, email, created_at
from auth.users
where email_confirmed_at is null
order by created_at desc;
```

Only after reading that list, and only if you accept the addresses unverified:

```sql
update auth.users
set email_confirmed_at = now()
where email_confirmed_at is null;
```

That marks every pending address as confirmed without proving any of them are
real — the same trade Option A makes, applied retroactively.

### While you are in there

**Authentication → Email Templates** — replace the default wording, which
names Supabase rather than BHALYAM and reads like a developer tool to whoever
receives it. Check the template still emits `{{ .Token }}`: the app asks for
an 8-digit code (`OTP_LENGTH` in `useAccountAuth.ts`, matching **Email OTP
Length** in the dashboard), and a template carrying only `{{ .ConfirmationURL }}`
leaves the code box on `/verify-email` with nothing to type into it.

---

## What is stored, and what the app promises about it

For the DPDP surfaces (`client/src/lib/privacy/`), the facts as built:

| Where | What |
| --- | --- |
| `auth.users` (Supabase) | Email, a bcrypt hash of the password, sign-in timestamps, and the IP the sign-in came from |
| `public.profiles` | Display name and avatar id |
| Browser `bhalyam.session` | The session tokens that keep a player signed in |
| Browser `bhalyam.session-code-verifier` | A one-time PKCE secret, deleted on return from Google |

All four are declared in `dataInventory.ts` and reachable from the player's own
export and erase controls. **Erase my data** deletes the account itself
(`delete_account()`) before wiping the device, and reports a failure rather
than claiming a success — see `YourDataPanel.tsx`.

Two things this setup does **not** settle, both of which are decisions rather
than code:

- **Minors (DPDP Section 9).** Collecting an email from a child needs
  verifiable guardian consent, which is not built. The privacy page now says
  an account should be made by a parent. An age gate is a product decision.
- **Data residency wording.** The privacy notice should name the region you
  picked in step 1.

---

## Troubleshooting

**Everyone is a guest and nobody can host.**
The client build has no Supabase keys, or points at a different project than
the server. Check `/health` → `auth`, then check `VITE_SUPABASE_URL` in the
build that is actually deployed — Vite bakes env in at build time, so changing
it on the host without rebuilding does nothing.

**"Provider is not enabled" on the Google button.**
Step 6 is incomplete, or the redirect URI in Google Cloud does not exactly
match the one on Supabase's Google provider page.

**The reset link opens on "That link has expired".**
Either the link really did expire (they last an hour and work once), or the
page's origin is not in **Redirect URLs** (step 5), so the code was never
exchanged. The second case is the common one and looks identical to the first.

**Sign-in works locally but not in production.**
Site URL still points at localhost, or the deployed origin is missing from
Redirect URLs.

**Nothing works and the dashboard says the project is paused.**
Free projects pause after 7 days of no requests. Resume from the dashboard.
Guests are unaffected; only sign-in breaks.

**Players report they never received the OTP / confirmation email.**
Check what **SMTP Settings** points at before anything else — a personal
mailbox (Gmail, Outlook) is not a transactional sender and is the cause you
are most likely looking at. Do not be reassured by a clean **Auth Log**: mail
that Gmail accepted and then dropped logs as `200 request completed`. See
[§7](#7-email--the-one-that-will-bite-you-and-already-has).

Whatever the cause, it is a dashboard problem rather than a code one, and the
accounts of everyone affected already exist in `auth.users` unconfirmed. Tell
them to **sign in**, not sign up: that routes to `/verify-email` with a
working Resend button.

**A player signed in on a second device and is called "Player 3".**
Their `profiles` row has no `display_name`. Accounts created before the
migration ran have no row at all; the app upserts one the next time the name or
avatar changes.

---

## What is deliberately not here

**Match history.** It needs an outcome shape all ten engines agree on, and
they end in genuinely different ways — Ludo has a `finishOrder`, Bingo ranks
claims, Rummy's lowest score wins, Star Game keeps standings. A table designed
before that is settled would be wrong for most of them. Two other traps for
whoever picks this up: `applyMove` broadcasts *before* it sets
`room.phase = "finished"`, so an end-of-match hook must gate on
`engine.isOver()`; and pass-and-play seats hold ephemeral `local_…` ids that
must be excluded, exactly like bots.

**Live match state.** Surviving a redeploy mid-game means giving all ten
engines a `snapshot()`/`restore()` contract — `getStateFor()` is a view
projection, not round-trippable state. That is a much larger piece of work
than it appears.
