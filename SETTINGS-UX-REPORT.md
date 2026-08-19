# Settings Dead-End — Remediation Report

Phase 6 of the P0/P1 Design & Trust Remediation plan. P0, and the smallest
fix in the plan by line count — but it was two bugs, not the one the plan
named, and the report says both rather than only the one that was expected.

## The defect, as actually found

`SettingsPage.tsx` already had `MemberLockedGate` wired up correctly for the
guest case — a real, working component with its own `"settings"` feature
copy — but a guest could never see it, for two independent reasons:

1. **A redirect fired first.** A `useEffect` at the top of the component
   watched `ready`/`isMember` and called `navigate("/", { replace: true })`
   the moment a guest's auth state resolved — before React ever reached the
   `if (blocked)` branch further down that was supposed to render the gate.
2. **Its own fallback was blank.** Independent of the redirect, the gate
   branch itself was `if (blocked) return null;` — even a guest who somehow
   avoided the redirect (e.g. the render that happens before `ready` flips
   true) landed on a blank page, not `MemberLockedGate`. The component
   existed and was never reached by either path.

The plan's diagnosis named the first bug (lines 50–55, the redirect). The
second was found while removing it: deleting only the redirect would have
traded "guest gets bounced to `/`" for "guest sees a blank page" — a
different dead end, not a fix.

## The fix

`client/src/pages/SettingsPage.tsx`:

- Removed the redirect `useEffect` and its now-unused `useNavigate` /
  `navigate` binding.
- Changed the existing gate branch from `if (blocked) return null;` to
  `if (blocked) return <MemberLockedGate feature="settings" />;` — the
  component the page already imported and already had copy for, now
  actually reached.

Both changes were required together; either alone leaves a dead end of a
different shape.

## The plan's open question, checked

The plan flagged a risk before implementation: *"guests have genuine
settings (audio, haptics, theme, language) — if the full-page gate hides
those, gate only the account-bound sections instead."*

Checked directly: guest-facing audio/haptics/theme/language settings live in
`client/src/components/GlobalSettings/GlobalSettings.tsx`, a separate
component reached from the home menu sheet (`BhalyamHome.tsx`), not from
`/settings`. `/settings` itself is account-bound end to end — profile,
security, linked identity — so gating the whole page is correct, not a
regression: guests already reach their real settings through a different,
already-guest-accessible surface, unaffected by this change.

## Incidental fix in the same file

Two occurrences of `py-0.2` (not a value on Tailwind's default spacing scale
— compiles to no CSS, a dead class identical in kind to the ones the token
audit found elsewhere) changed to `py-0.5`, the nearest real value, on the
two "Verified" badges in the account-details section. Noticed while in the
file for the gate fix; not otherwise part of this phase's scope.

## Verification

- `cd client && npm run typecheck && npm run build && npm test` — clean,
  501/501.
- Manual trace: guest with `ready=true, isMember=false` now renders
  `<MemberLockedGate feature="settings" />` (was: silent redirect to `/`).
- Guest's own settings (audio/haptics/theme/language) confirmed reachable
  via `GlobalSettings`, unaffected by this page's gating.

## Status

**Fully resolved.** Both defects bounded to `SettingsPage.tsx`, both fixed,
both verified by reading the resulting render path rather than assumed from
the diff.
