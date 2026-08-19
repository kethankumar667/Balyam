# Typography Remediation — Report

Phase 8 of the P0/P1 Design & Trust Remediation plan. The plan specified
three actions. Two are done as specified. The third — dropping Playfair
Display and Fredoka as unused — was checked against the current source
before executing, and **both are real, live, load-bearing fonts**. Executing
that instruction as written would have visibly broken two shipped surfaces.
Reported here as found, not silently skipped and not blindly executed.

## 1. Done as specified: Poppins is now the real body font

`client/src/index.css` had a `body { font-family: 'Nunito', ... }` rule that
contradicted `tailwind.config.js`'s own declared intent
(`sans: ['Poppins', ...], body: ['Poppins', ...]`, with a comment confirming
Poppins as "existing brand body voice"). Tailwind's own preflight already
sets `html`'s font-family from that config; the `body` rule was a hand-written
override sitting in front of it. Deleted the `font-family` line from that
rule (kept `background`/`color`/`overflow-x` — the rest of the rule is
unrelated).

**Verified, not assumed** — production build, real Chromium:

```
body computed font-family: Poppins, system-ui, sans-serif
```

## 2. Done, but scoped differently than specified: font-loading consolidated, not font count reduced

The plan's "11 families → 8" target assumed Playfair Display and Fredoka
would be dropped (§3). They were not, so the family count is unchanged at
**11** — but a second, real inefficiency the plan also named *was* fixed:
`index.html` loaded 7 families via a `<link>`, and `index.css` loaded 8 more
(4 overlapping) via `@import` — two separate blocking font-CSS fetches on
every page load, one of them (`@import`) blocking CSS parsing until it
resolves and invisible to the HTML preloader scanner besides. Merged into
the one `<link>` in `index.html`, with every distinct weight from *both*
original sources preserved (checked per family — e.g. Caveat needed
400/500/600/700 across the two lists, not just the 500/700 either one
declared alone). `index.css`'s `@import` deleted.

**Verified, not assumed** — production build, real Chromium: exactly one
`fonts.googleapis.com` network request now (previously two), and
`document.fonts` after load lists all 11 families at their full original
weight sets, confirming nothing was dropped in the merge — see the raw
listing in this phase's verification run.

**Net result: "two blocking font requests → one" — the plan's other stated
goal for this line — is achieved. "11 → 8" is not, because 8 was never
actually reachable; see below.**

## 3. Corrected: Playfair Display and Fredoka are not dead code

Checked before deleting, per this session's standing rule to verify a claim
against current source before acting on it — especially one instructing
deletion.

**Playfair Display** — `index.html`'s own comment already documents this
face as *"the Rummy 'Card Room' display face"*. Traced it: `--rm-font-display`
(`rummy-tokens.css:163`) is consumed by `.rm-wordmark` (`rummy-table.css:130,343`),
which is applied in `RummyBoardDesktop.tsx`. It renders on the Rummy table's
own wordmark, live, today.

**Fredoka** — used directly as an inline style, not through a token:
`client/src/games/ludo/Token.tsx:190`, `fontFamily: "'Fredoka','Poppins','Nunito',sans-serif"`
— the Ludo token's number/label face.

Neither is reachable from most routes (a Rummy table, a Ludo board), which
is almost certainly why a route-sampling audit missed both — but "not seen
on the sampled routes" and "unused" are different claims, and only the
second justifies deletion. Left in place. The plan's Phase 8 diagnosis is
corrected on the record here rather than carried forward into a third
report repeating it.

**Nunito** stays loaded for the same reason, independent of the body-font
fix in §1: it's the second-choice fallback (after Poppins) in 8 inline
`fontFamily` declarations across the Ludo boards and UNO stadium
(`"'Poppins','Nunito',sans-serif"` and similar). Removing its font load
wouldn't break anything Poppins successfully loads, but it would silently
remove the fallback for the case where Poppins doesn't — not this plan's
call to make while fixing an unrelated `body` override.

## 4. Sub-pixel sizes: reported, not fixed — the plan undercounted this item

The plan described this as "remove the 10 sub-pixel sizes (`text-[12.5px]`
etc.)," alongside the wider off-scale-size debt it explicitly defers
("1,592 off-scale sizes... reported, not fixed; a systematic pass, not a
remediation sprint"). Measured before touching anything:

```
grep -c across client/src, *.tsx: 215 occurrences, 32 files, 9 distinct sub-pixel values
  text-[12.5px]  60      text-[9.5px]    8
  text-[13.5px]  50      text-[14.5px]   8
  text-[11.5px]  48      text-[8.5px]    5
  text-[10.5px]  27      text-[7.5px]    5
  text-[15.5px]   4
```

"10" appears to have counted distinct values (9 found here, close enough to
be the same inventory, possibly one already resolved since) rather than call
sites. 215 call sites across 32 files is not a bounded, single-location fix
like the `body` rule in §1 — it is the same shape of work as the
1,592-instance debt the plan already classifies as report-only, and several
of the densest files (the multi-step signup form, in particular) size text
deliberately tightly to fit a lot of form into one screen; resizing 215
instances without reviewing each one's layout risk is not something to do
mechanically. Classified into the same "reported, not fixed" bucket as the
rest of the off-scale debt, rather than either silently skipped or
mechanically resized without visual review.

## 5. Verification

```bash
cd client && npm run typecheck && npm run build   # clean
```

Real-browser checks (production build, Chromium via Playwright):
- `getComputedStyle(document.body).fontFamily` → `Poppins, system-ui, sans-serif`
- Exactly 1 request to `fonts.googleapis.com` (was 2)
- `document.fonts` lists all 11 families at their pre-merge weight sets —
  the consolidation did not drop a weight

## 6. Status

**Two of three planned actions done as specified. The third corrected, not
silently dropped:** the body font-family fix is real and verified; the
font-loading consolidation achieves the plan's *performance* goal even
though the *family-count* goal was never valid; Playfair Display and Fredoka
are kept because they're in active use, evidenced with exact file:line
references rather than asserted. Sub-pixel sizes are named as real,
measured, and explicitly out of this pass's bound — not claimed fixed.
