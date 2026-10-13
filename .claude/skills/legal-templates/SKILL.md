---
name: legal-templates
description: Draft or adapt a legal document from attorney-written, CC0-licensed templates — NDAs (mutual and one-way), website terms of use, privacy policies (US-only and GDPR), cookie notice, data processing addenda (US and global), master services agreement, advisor agreement, California employee offer letter, and HIPAA business associate agreement. Use when the user asks for one of these documents, a first draft of a policy, or wants to compare their own wording to a standard template. Not legal advice.
license: CC0-1.0
---

# Legal templates

Eleven attorney-drafted templates from General Legal (CC0 1.0 — free to use and adapt for any purpose).
Installed from <https://github.com/General-Legal/legal-templates>; see [SOURCE.md](SOURCE.md) for the exact
version and what was left out.

**These are starting points, not legal advice.** Say so in anything you hand over, and recommend that a
lawyer review a document before it is published or signed — especially anything users will be bound by.

## Pick the template

| The user wants | Read |
|---|---|
| Confidentiality, both sides share secrets | `templates/mutual-nda/` |
| Confidentiality, one side discloses | `templates/one-way-nda/` |
| Website / app terms of use | `templates/terms-of-use/` |
| Privacy policy, US users only (CCPA/CPRA and state laws) | `templates/privacy-policy-us/` |
| Privacy policy, US plus EEA/UK users (GDPR) | `templates/privacy-policy-gdpr/` |
| Cookie and tracking disclosure | `templates/cookie-notice/` |
| Data processing addendum, US data | `templates/dpa-us/` |
| Data processing addendum, US + EU/EEA + UK + Switzerland | `templates/dpa-global/` |
| Services contract for a software / platform company | `templates/master-services-agreement/` |
| Advisor with equity, IP assignment, confidentiality | `templates/advisor-agreement/` |
| California exempt employee offer | `templates/employee-offer-letter/` |
| HIPAA contract with a vendor handling health data | `templates/business-associate-agreement/` |

Each folder has `template.md` (the full text) and usually a `README.md` (what it covers, when you need it).
Read the README first when there is one. The templates are long (10–56 KB): read only the one needed, and
use `offset`/`limit` for the big ones rather than loading everything.

## How to use a template

1. **Choose, then confirm.** If two could fit (US vs GDPR privacy policy, US vs global DPA), say which you
   picked and why, in one line.
2. **Find every field to fill.** Customisable text is wrapped in `<mark>…</mark>` (company name, domain,
   governing law, contact addresses, dates). List them.
3. **Ask for values; never invent them.** Names, addresses, jurisdictions, fee amounts and dates are the
   user's facts. If one is missing, leave a visible placeholder and say it is open.
4. **Surface the choices the template leaves open.** Some contain alternative clauses ("select one and
   delete the other" — the terms of use offer two arbitration options) or bracketed drafting notes. Present
   the options, explain the difference in plain words, and let the user decide.
5. **Write the draft to a new file**, never over the template. Strip the `<mark>` tags and drafting notes
   once resolved; keep any that are still open so they are easy to find.
6. **Keep the General Legal credit footnote.** CC0 does not require it, but the authors ask for it to stay.
7. **Report what you changed from the template** (clauses removed, added or reworded), because that is
   what a reviewing lawyer will read first.

## Before using these for BHALYAM

- **They are US/California-centric** (CCPA/CPRA, California governing law, JAMS arbitration, US state
  privacy statutes). BHALYAM operates for players in India, where the Digital Personal Data Protection
  Act (DPDP) applies and **none of these templates covers it**. Treat the privacy-policy, cookie and DPA
  templates as a structural reference, not a compliant text.
- **A privacy notice already exists** (`client/src/pages/PrivacyPolicyPage.tsx`) and is tied to the
  consent record: the notice is versioned by `NOTICE_VERSION` in `client/src/lib/privacy/consent.ts`, and
  every browser-storage key must be declared in `client/src/lib/privacy/dataInventory.ts`. Do not paste a
  template over it. A material change to what is collected, why, or who receives it means bumping
  `NOTICE_VERSION` so people are asked again — see `AGENTS.md` and the standing DPDP requirement.
- **Don't promise what the product doesn't do.** Check a drafted privacy statement against the actual
  data flows (accounts via Supabase, no ads or tracking, guest identities) before it goes in.
- Arbitration option B in the terms of use names a third-party service and New York law. Don't adopt it
  by default.
