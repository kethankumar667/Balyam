# BHALYAM — Pre-Launch Legal Risk Report (India)

**Date:** 2026-10-13 · **Prepared for:** the founder (non-lawyer) · **Status:** research and code review, **not legal advice**. Have an Indian gaming/IT lawyer confirm every "HIGH" item before launch.

**How this was built:** I read what the app actually does (code and docs), then checked the current law. Several state-law and Supreme Court details came from secondary sources that disagree with each other; those are marked **[verify]**. I could not read the Gazette text itself.

---

## 0. Remediation status (updated 2026-10-14)

### Branding follow-up (2026-10-23)

This follow-up corrects earlier overstatements below: the broadcaster names
were still visible in actual headers and a Hindi milestone caption, and the
social preview still contained the UNO logo. The dated sections below are
historical findings, not a current certification of the application.

- Hand Cricket now displays **BHALYAM Live Score** and **Retro Broadcast**,
  including the theme pickers, preview page, celebration caption and Hindi
  milestone caption. The Live Score presentation uses violet, separated
  panels and a BHALYAM masthead; the retro milestone uses a cricket-ball
  illustration instead of its broadcaster-style swirl. Mobile headers wrap
  their controls so the new names remain visible.
- Both themed headers resolve team abbreviations from the fictional roster
  metadata (for example CCO and BLZ), not the legacy `csk` / `rcb` IDs.
- Public metadata, static HTML, social copy, structured data, academy and
  profile/privacy labels use neutral names: **Color Cards**, **Brick Blocks**,
  **Brick Racer**, **Block Puzzle** and **Retro Cricket**. Racing canvas/frame
  copy says **Arcade Racing**. Color Cards server announcements say **ONE**.
- The logo-bearing social image is removed. Its replacement is derived from
  the existing Color Cards tile; this does not establish a licence or clear
  the tile's visual similarity to other card games.
- Launch destinations use `/cricket2d`, `/snake`, `/brickracer` and
  `/brickblocks`. Old branded paths redirect in the SPA and the Render/static
  host configuration. They are excluded from prerender discovery and the
  sitemap. Internal game IDs, socket intents, saved theme preferences,
  achievement records, storage keys and owned cosmetic IDs are unchanged.
- Regression tests cover readable metadata/catalog/profile/privacy labels,
  redirects, launch destinations, fictional team labels and actual themed
  headers. Deploy the change before checking live HTTP redirect status and
  refreshing social-preview/search caches.

**Verification:** 171 focused client tests and 192 affected server tests pass.
The production client build (including TypeScript and 39 prerendered routes)
and server typecheck pass. The five legacy SPA redirects and both cricket
shells were exercised locally. The integrated browser repeatedly reset its
viewport, so the full mobile/tablet/desktop visual matrix is not certified.
The local backend was not running during browser checks (socket connection
errors were expected); no live multiplayer round or deployed HTTP redirect
was verified.

**Still not cleared:** no trademark-registry clearance search for BHALYAM or
the replacement names, licence/provenance audit, or legal review of card art,
falling-block gameplay presentation, handset appearance or broadcast trade
dress was performed in this change. Renaming and restyling reduce identifiable
branding exposure; they do not prove non-infringement. Have counsel assess
those remaining similarities. The existing live-database cosmetic-copy
follow-up below is also separate and remains open.

### Earlier remediation history

**Done in code (uncommitted until you commit):**
- All 16 card backs carried the Mattel logo (not just `UNO9.png`). They are deleted and replaced by 16 generated, logo-free designs (`client/src/lib/unoCardBackArt.ts`, pinned by a test that forbids any text or embedded image).
- The home-page tile (`UNOTile.*`) and two background images (`UNO Desktop BG`, `UNO Mobile BG`, unused) also carried the logo. The tile is replaced by an original `ColorCardsTile.*`; the backgrounds are deleted.
- The remaining vector card back swaps the red oval for a diamond.
- "Connect 4" is now "Four in a Row" everywhere users can see it.
- Terms: new section 8 "Virtual Coins, Room Entries & Rewards" (free, no cash value, no purchase, no trading, may be adjusted); the "zero stakes / zero entry fees" claims are corrected; under-18 notice shared with the Privacy Policy.
- Grievance acknowledgement is 24 hours (IT Rules), resolution 15 days.
- Player-visible "stake / bet / pot" wording is now "room entry / reward pool", including server error messages.

**Also done (2026-10-14, second pass):**
- **Hand Cricket** no longer contains any real cricketer, coach or IPL franchise. All 674 names in the four roster JSON files and `shared/hc-rosters.ts` are replaced by generated fictional names (same roles, captains and squad shapes), and the ten franchises are now fictional ("Chennai Cobras", "Mumbai Mariners", ...). "IPL" wording is now "League"/"Franchise", the "Cricbuzz" skin is labelled "Live Score", and the "DD Sports" caption is neutral. Internal ids (`csk`, `mi`, the `cricbuzz`/`doordarshan` skin ids, `ipl` category) are unchanged so nothing saved breaks. Country names stay (a country is not a brand), and home-ground names stay (factual venues).
- **Color Cards card face** is redrawn: dark frame, cream rounded-diamond gem instead of the white tilted oval, upright "hold" bars for Skip, upright flip arrows for Reverse, a four-gem cluster for Wild, corner indices on dark badges. "Wild Draw 4/Four" is now "Wild +4" in all UI text.

**Also done (2026-10-14, third pass):**
- **Voice chat is hidden** for launch behind one switch (`client/src/lib/voiceFeature.ts`, build flag `VITE_VOICE_ENABLED`; server `VOICE_ENABLED`, default off). No mic, peer mesh or signalling starts, the relay and TURN-credential endpoints refuse on the server, and the help and onboarding copy no longer advertises it.
- **Hand Cricket real-name problem:** players can rename any player for their own screen ("Rename" button; saved on the device, never sent to the server or shown to the opponent, unique names enforced). Franchise crests were hand-drawn copies of the real IPL logos with the real team codes; they are replaced by ten original crests with the fictional codes. Remaining "IPL" slogans and headings are gone.
- **Age gate:** a first-run question ("18 or older?") comes before the privacy choice. Under 18 needs a parent or guardian to be present and agree, and then coin sending and requesting between players is switched off. It is a **self-declared answer kept on the device, not verified parental consent**, and the Privacy Policy now says exactly that. Account sign-up is not blocked for under-18s and nothing is enforced on the server yet.
- Layout: the Create Room button no longer clips at tablet width, and the settlement card now fits its container on a phone.
- Two storage keys were missing from the DPDP data inventory (`mpg.hc.skin`) or are new (`mpg.hc.customNames`, `bhalyam.age.band`); all three are now declared.

**Also done (2026-10-14, token review):** the 16 new 3D Ludo tokens were reviewed before merge. Names and code comments no longer reference a competitor ("Ludo King") or a Nokia model number ("Retro 3310" is now "Retro Handset"). A production migration (`20261102000000_ludo_collectible_tokens.sql`) and rollback were added. Leftover "Nokia" and "3310" wording in player-visible text (catalog, leaderboards, navigation, About page) was also replaced; internal ids and routes are unchanged.
- Worth a lawyer's look: "Sacred Trishula" is a religious symbol (Shiva's trident and damru) sold as a cosmetic for coins, and the Retro Handset's drawing (dark-blue body, green screen, Snake) still evokes the Nokia 3310 look even though it carries no name.
- Still open: the catalog descriptions for the UNO-style card backs (dev seed and the database rows from migration `20260923000000`) still say "behind the classic logo", which is no longer true now that the art is logo-free; fixing the live database text needs a new migration.

**Still open (needs you, a licence or a lawyer):** items 1, 2, 4, 5 (officer details) and 8 to 11 in section 8, plus:
- The card *names* Skip, Reverse, Draw Two and Wild, the 108-card structure and the four colours are ordinary game rules and vocabulary, and the server's action messages depend on them, so they were kept. A lawyer should confirm that is acceptable.
- The Hand Cricket skins named after real broadcasters (Cricbuzz, Doordarshan) are renamed in the UI but still imitate their look; a lawyer should confirm the visual styling is acceptable, or restyle them.
- Database rows and `shared/cosmetics.ts` keep the legacy cosmetic ids and asset keys (ending in `_uno`); renaming them would orphan items players already own.

**Correction:** an earlier note said the Terms' 10-minute reconnect grace contradicted the code. It does not: a live match has a 10-minute grace and the lobby has 90 seconds, so the Terms are right.

---

## 1. Bottom line

| Question | Answer |
|---|---|
| Is BHALYAM an illegal "online money game" today? | **Probably not.** There is no way to put real money in and no way to take money out. |
| Is it provably safe? | **No.** The central law lets the regulator (OGAI) decide each game's category itself. Several features of the coin economy are exactly what its test looks at (section 3). |
| Biggest single risk | Coins can be **sent between players** (Mandali transfers) while rooms use coins as **entry + winner-takes-pool**. Together this is the pattern the 2026 Rules call out. |
| Biggest risks unrelated to gambling | **Children's data** (DPDP Act, under-18 rule from May 2027) and **intellectual property** (UNO look-alike cards, IPL teams and real players in Hand Cricket, "Connect 4"). |
| Is launch blocked? | Not if the HIGH items in section 8 are done first. Without them you carry avoidable criminal and civil exposure. |

---

## 2. What the app does (the facts every conclusion rests on)

Confirmed in the repository:

- **Coins are free to earn and cannot be bought.** Sources: welcome grant, free-coins faucet (100 every 4 h), daily streak, match prizes. `docs/economy/economy-v1-implementation-blueprint.md` states Economy V1 has no purchase or top-up path. I found no payment gateway, UPI, or withdrawal code.
- **No cash-out.** Vouchers (the old cash-like mechanism) were removed in October 2026.
- **Rooms use coins as a stake.** Each seat pays a "Room Entry" in coins; the winner takes a "Reward Pool". On some tables the platform keeps a cut (the "World Bank"), and Rummy is played at a coins-per-point rate.
- **Coins can move between players.** Mandali members can send coins or request them. Sending is capped per day (500 to 5,000 by trust tier) by `server/src/rewards/TransferPolicy.ts`.
- **Guests are allowed** with no age check. Members enter a birthday during onboarding.
- **User-generated content:** chat, display names, avatars, and peer-to-peer voice (WebRTC).
- **Real brands inside the product:** UNO-style cards and card backs, real IPL franchises and real player names in Hand Cricket, "Connect 4".
- **No advertising SDKs found.** No real-money tournament prizes.

---

## 3. Central law: Promotion and Regulation of Online Gaming Act, 2025 (PROGA) and Rules, 2026

**In force:** the Act received assent on 22 Aug 2025; the Rules were notified 22 Apr 2026 and took effect **1 May 2026** ([Lexology](https://www.lexology.com/library/detail.aspx?g=810a746c-4dc9-49e9-818c-5c85a517b1ed), [Conventus](https://conventuslaw.com/report/the-promotion-and-regulation-of-online-gaming-rules-2026-decoding-indias-new-regulatory-framework-for-online-gaming/)).

**What it bans:** any *online money game*, whether skill, chance or both: a game where a user pays fees, deposits money **or other stakes** in expectation of monetary or equivalent return. Offering one: up to 3 years and ₹1 crore. Advertising: up to 2 years and ₹50 lakh. Offences are described as cognisable and non-bailable, with personal liability for responsible officers ([Legal500](https://www.legal500.com/intelligence/india/media-telecoms-it-entertainment/india%E2%80%99s-online-gaming-reset-decoding-proga-and-the-2026-rules), [Mondaq](https://www.mondaq.com/india/gaming/1676566/summary-promotion-and-regulation-of-online-gaming-act-2025)). Penalty figures differ between sources **[verify]**.

**What it permits:** *online social games* (recreational or educational; at most a subscription or one-off access fee; no expectation of monetary return) and e-sports (registered). Registration for social games is needed only if the Centre notifies the category or OGAI asks.

**The part that matters for you:** classification is **not self-assessed**. OGAI decides, game by game, using five factors (Rule 9, per Legal500): (1) fees or deposits at any stage, (2) expectation of monetary return, (3) how fees are structured and used, (4) revenue model, (5) whether rewards or in-game assets can be **transferred, redeemed, monetised or used outside the game**. The same source calls factor 5 the one most likely to catch operators, and says virtual tokens fall within "other stakes". It does not say that non-cashable coins are safe. **That question is unanswered.**

### How BHALYAM measures up

| Factor | BHALYAM today | Risk |
|---|---|---|
| 1. Fees or deposits | No real money ever enters. Coins are free. | Low |
| 2. Expectation of monetary return | Prizes are coins that buy only in-game cosmetics. | Low–Medium |
| 3. Fee structure | A platform cut is taken from pooled entries on some tables. A "rake" taken from a stake pool is how gambling operators earn, even in virtual coins. | **Medium** |
| 4. Revenue model | None yet. If you later sell coins, this flips instantly (see below). | Low now |
| 5. Transferable / monetisable | Coin transfers between players exist. Nothing stops users selling coins or accounts on WhatsApp or Telegram. | **High** |

**The tripwire:** *buying coins with rupees* + *staking coins at tables* + *winning coins* is a textbook money game even if coins can't be withdrawn. Never add paid coin top-ups to staked tables without a written legal opinion. Coin packs for cosmetics-only spending, separated from any stake, is a different and safer structure; ask a lawyer first.

**Status:** the constitutional challenge is consolidated before the Supreme Court and a final judgment is awaited; a hearing was agreed in August 2026 **[verify]**. The law is in force meanwhile.

---

## 4. State laws

Every state gambling law targets **staking money or something of value on a game**. None that I could find reaches free play with no cash value. The state risk is therefore the same as the PROGA risk: could a regulator or complainant treat coins as "a valuable thing" or "stake"? The product is reachable in every state, so it has to hold up everywhere.

| State / law | What it does | Relevance to BHALYAM |
|---|---|---|
| Public Gambling Act 1867 (central, adopted by many states) | Bans common gaming houses; games of mere skill exempt. | Low |
| **Telangana** Gaming Act 1974 (amended 2017) | Extends to online gaming; reported to remove the skill exemption for staked games **[verify]**. | Home state of a Telugu-focused product. Low if coins truly have no value; elevated if coins became monetisable. |
| **Andhra Pradesh** Gaming Act (amended 2020) | Prohibits online games played for stakes, including skill games. | Same |
| **Tamil Nadu** Prohibition of Online Gambling and Regulation of Online Games Act 2022 and Rules | Bans listed online games of chance for money; regulates others (hours, KYC, warnings). | Applies to money games. Keep coins strictly non-monetary. **[verify]** |
| **Karnataka** Police (Amendment) Act 2021 | Struck down by the High Court in 2022; reports of a Supreme Court ruling in 2026 conflict **[verify]**. | Re-check before launch. |
| **Kerala** Gaming Act 1960 | A 2021 attempt to ban online rummy was struck down. | Low |
| **Assam** Game and Betting Act 1970 and **Odisha** Prevention of Gambling Act 1955 (amended) | Ban gaming for stakes; Odisha's amendment includes online. | Same pattern |
| Nagaland, Sikkim, Meghalaya | Licensing regimes for skill or online games. | Not needed for a non-money product |
| Maharashtra, Gujarat, Delhi, Goa, Punjab etc. | Older gambling acts, mostly cover physical gaming houses. | Low |

The state-law rows are from my background knowledge plus secondary summaries, not from the state gazettes. Takeaway: you don't need a state licence for a genuinely no-money product; you need the *evidence* that it is one.

---

## 5. Children and data

| Law | Obligation | BHALYAM status | Risk |
|---|---|---|---|
| **DPDP Act 2023 and Rules 2025** (notified 14 Nov 2025; main duties start **13/14 May 2027**) | Anyone under **18** is a child. Verifiable parental consent; **no tracking or behavioural monitoring of children; no targeted ads** ([SCC Online](https://www.scconline.com/blog/post/2025/12/26/digital-personal-data-protection-rules-2025-key-highlights/)). Gaming platforms were not named in any exemption I found **[verify]**. | Guests have no age gate. Members give a birthday after onboarding, but nothing blocks a minor. Stats, XP and streaks may count as behavioural monitoring. | **HIGH** (from May 2027) |
| **PROGA Rules 2026** | Safety features such as age verification, time limits, parental controls and a grievance mechanism are listed as examples. | None of these exist. | Medium |
| **IT Rules 2021** (intermediary) | Publish rules and privacy policy, appoint a **Grievance Officer**, acknowledge complaints within **24 hours**, resolve within **15 days** (from my background knowledge, not re-checked this session **[verify]**), remove flagged content on time, assist law enforcement. | Policy pages exist; officer details not filled in. **The 48-hour acknowledgement I set from your checklist was too slow; it is now 24 hours.** | **HIGH** |
| **CERT-In Directions 2022** | Keep logs for 180 days within India, report incidents within 6 hours, sync clocks (background knowledge **[verify]**). | Hosting is Render and Vercel; log location and incident process undocumented. | Medium |
| **POCSO / IT Act** | Reporting duty if you learn of child sexual abuse material or grooming. | Open chat, display names and voice between people who share a room code. No report-and-block flow confirmed. | Medium–High |

---

## 6. Intellectual property

| Item | Issue | Risk |
|---|---|---|
| **UNO** (Mattel) | Title renamed to "Color Cards", but `UNO9.png` is Mattel's logo verbatim, 15 other card backs and the cosmetic ids still say UNO, and the colour-card layout and action cards (Wild Draw 4, Skip, Reverse) are close to the original. Mattel is active in the Delhi High Court on other brands ([SCC Online](https://www.scconline.com/blog/post/2023/09/06/delhi-hc-grants-permanent-injunction-to-mattel-inc-for-word-mark-kickand-play-for-baby-gym-products-legal-news)); I found no UNO case in India. | **HIGH** |
| **IPL franchises and real players** in Hand Cricket (`shared/hc-rosters.ts`: "2026 IPL franchise squads, sourced from user-provided data") | Team names, colours and logos are trademarks; real names raise personality and publicity rights, which Indian courts enforce. I did not check whether logos are used. | **HIGH** |
| **"Connect 4"** | Trade mark of Hasbro (background knowledge **[verify]**). Use a generic name ("Four in a Row"). | Medium |
| "Breakout", "Tetris" (slug only), "Space War" | Atari and Tetris Holding are active owners. The visible name "Brick Breakout" is fine; check assets and sounds. | Low–Medium |
| Ludo, Snakes & Ladders, Chess, Rummy, Bingo, Tic-Tac-Toe, Sudoku, 2048 | Generic game names or open licences (2048 is MIT). | Low |
| Sounds, fonts, images, AI-generated art | Licence provenance is not recorded anywhere I found. | Medium |
| **BHALYAM** name and logo | Confirm a trademark search and registration (Classes 9, 28, 41). | Medium |

---

## 7. Consumer and other

- **Terms vs product mismatch (HIGH, easy fix).** The Terms say games have "zero financial stakes" yet the product has "Room Entry" and a prize pool, and the Terms never define what coins are. A regulator reads that as inconsistent. Add a Coins section: no cash value, not redeemable, not transferable for money, may be adjusted or reset, trading or selling prohibited.- **Dark patterns.** The Consumer Protection (Dark Patterns) Guidelines 2023 reach false urgency and nagging; streak and faucet timers need a neutral review.
- **Advertising.** Calling a product "free to play" while staking coins can mislead; ASCI gaming guidelines will apply once you advertise. PROGA also bans promoting money games, so avoid betting-style words in marketing.
- **App stores.** Google Play and Apple treat simulated gambling and real-money gaming separately; "stake" and "pot" language can trigger review. I replaced those words in the UI, but the underlying mechanics (entry + pool + cut) are unchanged.
- **GST.** The high gaming rate applies to money gaming; free social games don't pay it. A future coin sale would bring GST.
- **Personal liability.** PROGA reaches responsible officers; keep a written, dated record of every decision that keeps coins non-monetary.

---

## 8. Risk register and what to do first

| # | Risk | Severity | Fix |
|---|---|---|---|
| 1 | Coin transfers + stake-and-pool + platform cut resemble the Rule 9 factors | **HIGH** | Get a written opinion. Options: remove player-to-player transfers or limit them to cosmetic gifts; drop the platform cut on staked tables (or make it a plain coin sink, described honestly); keep entry and prize amounts small and fixed; never sell coins. |
| 2 | No monitoring for coin or account resale | **HIGH** | Ban it in the Terms; watch for it (the risk-state engine exists); flag accounts that receive large inbound transfers. |
| 3 | Terms don't define coins and contradict the UI | **HIGH** | Add a Coins section and align wording (a few hours of work). |
| 4 | Minors: no age gate; DPDP from May 2027 | **HIGH** | Age screen before guest play; under-18 mode with parental consent flow; no behavioural profiling of minors; no ads. |
| 5 | Grievance officer not named; email unset | **HIGH** | Appoint a real person; set `VITE_GRIEVANCE_OFFICER_NAME`, `VITE_GRIEVANCE_OFFICER_ADDRESS` and `VITE_PRIVACY_CONTACT_EMAIL`. |
| 6 | UNO look-alike assets and mechanics | **HIGH** | Replace all 16 card backs; use your own card design and rename special cards; remove "uno" from ids visible to players. |
| 7 | Real IPL teams and players | **HIGH** | Use fictional teams and players, or obtain licences. |
| 8 | Chat and voice safety, POCSO | Medium–High | Report and block, profanity filter, parental controls, a takedown process within the IT Rules timelines. |
| 9 | CERT-In and log retention | Medium | Document log location and a 6-hour incident process. |
| 10 | "Connect 4" and other brand names | Medium | Rename. |
| 11 | OGAI determination | Medium | After fixing 1 to 3, consider asking OGAI to classify, or at least keep an opinion letter on file. |

---

## 9. Questions for your lawyer

1. In our structure (free coins, entry + pool, no cash-out), is BHALYAM an *online social game* under PROGA and the 2026 Rules, and should we seek an OGAI determination?
2. Does a platform cut taken in virtual coins count as a "fee" under Rule 9 factor 3?
3. Does a Mandali coin gift between friends make coins "transferable" under factor 5?
4. What age-assurance and parental-consent method is acceptable for DPDP, and does XP and streak tracking count as behavioural monitoring?
5. Are we safe in Telangana, Andhra Pradesh, Tamil Nadu, Odisha and Assam as written?
6. Can we use IPL team names and player names without a licence?

---

## 10. Sources

- [Promotion & Regulation of Online Gaming Rules 2026 (Lexology)](https://www.lexology.com/library/detail.aspx?g=810a746c-4dc9-49e9-818c-5c85a517b1ed)
- [PROGA Rules 2026 summary (Conventus Law)](https://conventuslaw.com/report/the-promotion-and-regulation-of-online-gaming-rules-2026-decoding-indias-new-regulatory-framework-for-online-gaming/)
- [PROGA and the 2026 Rules (Legal500)](https://www.legal500.com/intelligence/india/media-telecoms-it-entertainment/india%E2%80%99s-online-gaming-reset-decoding-proga-and-the-2026-rules)
- [PROGA 2025 summary and penalties (Mondaq)](https://www.mondaq.com/india/gaming/1676566/summary-promotion-and-regulation-of-online-gaming-act-2025)
- [Official Act text, Act 32 of 2025](https://lawascode.negd.in/laws/the-promotion-and-regulation-of-online-gaming-act-2025)
- [DPDP Rules 2025 highlights (SCC Online)](https://www.scconline.com/blog/post/2025/12/26/digital-personal-data-protection-rules-2025-key-highlights/)
- [State-wise overview (Arohana Legal)](https://arohanalegal.com/online-gaming-and-gambling-laws/) *(secondary; verify against state gazettes)*
