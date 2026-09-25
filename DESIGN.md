---
name: BHALYAM Mandali "family album"
scope: Mandali area only (client/src/components/mandali/**, client/src/pages/mandali/**). The rest of BHALYAM keeps docs/ai/bhalyam-design-system.md.
register: operate
source_of_truth: client/src/components/mandali/album/album.css, client/tailwind.config.js (album.*)
colors:
  # RGB channels, switched by data-theme on <html>. Light | Dark
  page: { light: "243 242 240", dark: "23 20 18" }
  raised: { light: "255 255 255", dark: "39 34 30" }
  field: { light: "233 231 227", dark: "41 35 31" }
  line: { light: "217 213 206", dark: "76 68 60" }
  ink: { light: "31 26 23", dark: "243 236 223" }
  ink-2: { light: "75 67 60", dark: "201 189 171" }
  ink-3: { light: "111 102 92", dark: "156 145 127" }
  foil: { light: "138 98 18", dark: "221 178 90" }
  foil-fill: { light: "201 151 43", dark: "221 178 90" }
  on-foil: { light: "28 20 9", dark: "28 20 9" }
  ribbon: { light: "168 50 60", dark: "180 50 63" }
  mine: { light: "226 231 245", dark: "51 41 29" }
  indigo: { light: "52 70 140", dark: "143 164 224" }
  danger: { light: "178 44 44", dark: "224 115 111" }
  success: { light: "38 110 66", dark: "125 190 143" }
  focus: { light: "138 98 18", dark: "233 198 111" }
  cover-foil: { light: "232 196 118", dark: "232 196 118" }
  corner: { light: "120 110 98", dark: "156 145 127" }
cloths:
  maroon: { base: "123 30 43", deep: "84 18 29" }
  indigo: { base: "37 58 107", deep: "24 38 74" }
  green: { base: "31 77 58", deep: "19 52 38" }
  umber: { base: "90 58 34", deep: "60 37 20" }
  plum: { base: "75 35 64", deep: "50 22 42" }
typography:
  ui: "Poppins, Noto Sans Telugu, system-ui"
  hand: "Caveat, Noto Sans Telugu, Poppins, cursive"
  mono: "JetBrains Mono (room codes only)"
  scale-px: { day-caption: 22, cover-band: 17, cover-tile: 20, cover-card: 24, sheet-title: 18, body: 15, secondary: 14, meta: 13, micro: 12 }
rounded: { control: 12, bubble: 16, card: 16, cover: 16, sheet: 24, pill: 9999 }
spacing: { touch-min: 44, touch-primary-lg: 48, composer-field: 48, sheet-pad: 20, feed-gutter-phone: 12, feed-gutter-desktop: 24 }
---

# Design System: Mandali "family album"

## Overview

A Mandali is the group's album that is also a live conversation. The system exists to make people who already love each other feel at home, see what is new at a glance, and act in one tap. It refuses the office-chat sidebar and the arcade-gold HUD (the rest of BHALYAM's game chrome).

Brand context: BHALYAM. Poppins carries all UI; Righteous display is used elsewhere in the app and does not appear inside the Mandali area. Caveat is the handwriting voice (see the divergences below for where it actually appears).

Register: operate. People spend their time reading and writing, so chat content is flat and fast. Ornament is rationed.

Scene: a phone held one-handed on a budget Android, an evening, a family group spanning generations. Dark is the black interleaf page of an old photo album; light is cool glassine (deliberately not cream), so identity comes from the cover, foil and ribbon, not from a warm ground.

## Colors

Strategy: restrained neutral pages plus one metallic accent (gold foil), with per-group cover cloths as the only saturated colour. Every colour is a CSS variable holding space-separated RGB channels (`--album-*`, defined in album.css) and exposed to Tailwind as `album.*` (`bg-album-foil/20` works). Both themes flip panels AND ink together by construction; never write a theme-specific class or a media-query dark style.

- **Page / Raised / Field / Line**: page ground; cards, bubbles and sheets sit on Raised; inputs and quiet buttons on Field; hairlines and scrollbar thumbs use Line.
- **Ink, Ink-2, Ink-3**: primary, secondary, tertiary text. Ink-3 is the floor for readable meta text.
- **Foil vs Foil-fill (two roles, do not swap)**: `foil` is gold as TEXT and icons (darker in light theme, 5.5:1 on white). `foil-fill` is gold as a fill (primary button, seat dots, tints via `/20`). `on-foil` is the ink on a foil fill.
- **Ribbon**: bookmark and the single cooldown dot on the coin control. Nothing else is ribbon-coloured.
- **Mine**: the sender's own bubble tint (cool blue-grey in light, warm umber in dark), with a `foil/25` hairline.
- **Danger / Success / Indigo**: Danger for destructive buttons and delete; Success for open-room state and presence; Indigo exists as a token.
- **Focus**: 2px outline, offset 2px, via `.album-focus:focus-visible`.
- **Cover cloths (5)**: maroon (brand fallback), indigo, green, umber, plum. Chosen by FNV-1a hash of the Mandali id mod 5 (`coverCloth.ts`); no id gives maroon. Cover text is always `cover-foil` on the cloth, in both themes.

Named rule: **Foil is text or fill, never both on one element.** Named rule: **Cloth is a pure function of the id.** No stored choice, no picker.

## Typography

Poppins for everything except the hand voice. Weights in use: 400 body, 600 for labels, names, buttons and titles, 700 in the ribbon.

Ramp as built: 22 (Caveat day caption) / 24, 20, 17 (cover name, card/tile/band) / 18 sheet title, 15 body, buttons and inputs (`text-[15px]`; lg buttons 16) / 14 secondary and sender names / 13 meta (room code, seat count, state label) / 12 (ribbon, host badge, party names, mobile bottom-nav labels). Line-height 1.2 to 1.6; body bubbles `leading-relaxed`. Cover names are stamped: `album-stamp` gives foil colour, a 1px dark upper shadow and a faint light lower shadow (debossed), letter-spacing 0.015em.

Room codes are mono, weight 600, tracking 0.2em.

Named rule: **The hand voice is Caveat, on a page, in foil or ink-2, never on a button or on data.** Named rule: **No uppercase micro-labels inside the album.**

## Elevation and Surface

Flat by default. Depth comes from surface steps (Page, Raised, Field) and hairlines, not shadows. Exceptions that are part of the world: the cover's inset highlight and 1px inner edge, a soft ribbon shadow, `shadow-2xl` on the sheet, `shadow-lg` on the "Latest" jump chip, and an inset gutter shadow on the desktop facing-page rail.

Cover texture: fractal-noise SVG (baseFrequency 0.9, 2 octaves, desaturated, opacity 0.55, 180px tile) laid over the cloth with `soft-light`, plus a top-lit gradient; drawn inline, no asset. A 1px `cover-foil/40` double rule sits 6px inside the edge.

## Ornament (exactly four places)

1. **Cover**: `AlbumCover` in three variants. `band` (header of a conversation, 17px name), `card` (top of the desktop left rail, 24px, centred), `tile` (a whole album on the shelf, min-height 144, name 20px, optional member faces).
2. **Bookmark ribbon**: `.album-ribbon`, 12px bold white on ribbon, notched clip-path, hangs from the top edge of a `relative` parent. Replaces any red count badge. Renders for unread > 0; the number is `aria-hidden`, the wrapper carries the spoken label. In the shipped build only shelf tiles pass `unread` (from the inbox digest, and not when the level is MUTED).
3. **Photo corners**: `.album-corners` on things pinned to the page: pinned messages, room-invite cards, coin-request cards, memory cards.
4. **Handwritten day captions**: `DayCaption` (`.album-day`, Caveat 22px, ink-2, on a foil-fill/16 strip of tape rotated -1.4deg). It is a real `h3`.

Named rule: **New decoration must live in one of these four places or it does not ship.**

## Components

- **AlbumButton**: variants `primary` (foil-fill, on-foil ink; the one action on a screen), `quiet` (field + hairline; default), `ghost` (no fill; icon and tertiary), `danger` (solid danger fill, white text). Sizes: md 44px min-height / 15px, lg 48px / 16px, icon 44x44. Radius 12. Real disabled (50%) and loading (spinner, `aria-busy`) states, `active:scale-[0.98]`, 150ms on background, filter and transform only. Labels name the action; icon-only buttons carry `aria-label`.
- **AlbumSheet**: the one shell for every sheet and dialog. Bottom sheet on phone (`rounded-t-3xl`), centred card from `sm` (`rounded-3xl`), max-w-md, max-h 88dvh. Header: title (18px semibold) + optional description (14px ink-3) + labelled Close icon button. Body scrolls; the footer is pinned with a top hairline and safe-area padding, and holds the primary action. Focus trap, Escape and backdrop dismissal come from the shared Modal.
- **Message bubble**: 15px, `px-3.5 py-2`, radius 16 with a 6px tail corner on the sender side. Theirs: Raised + Line. Mine: Mine + `foil/25`. Runs from one sender within 5 minutes collapse to one face and name. Widths: phone 84%, desktop 68%. Reactions: five quick emoji (heart, thumbs up, laughing, folded hands, clapping); emoji are message content, not iconography. Reaction chips are 32px high pills with `aria-pressed`.
- **Composer**: one component for both layouts. Field is 48px, radius 16, Field ground; placeholder addresses the group ("Write a line to <group>..." on desktop; a short form on phone). Send is a primary icon on phone, a primary with its word on desktop. A HandCoins ghost button opens a coin request; a ribbon-coloured dot shows cooldown.
- **AlbumAvatar**: round, `ring-1` line, sizes 32/40/56; failed image falls back to the BHALYAM logo; optional presence dot (success or ink-3, ringed so it does not rely on hue).
- **Cards in the feed** (RoomInviteCard, CoinRequestCard, PartyLoungeCard, memory cards): Raised, 1px Line (or `foil/40` when actionable), radius 16 (memory cards 12), `p-4`, photo corners. Room invite: seat dots (10px), state label, mono code, a full-width lg primary Join that degrades to quiet plus a plain-language reason when full, started or closed. A full room is a calm fact, never a red error.
- **Navigation**: desktop is an open spread (left rail 256/288px: cover card, rooms list at 44px rows, group menu; middle: conversation; right rail 288/320px facing page: people, memories). Mobile is a cover band header plus a bottom nav (60px min-height cells). Current room: `foil-fill/20`.
- **System messages**: centred, 14px ink-3. Deleted lines: italic ink-3.

## Layout and Motion

Mobile 320 to 767, desktop 1024 and up, each a designed layout, not a stretch. Phone feed gutter 12px, desktop 24px; sheet padding 20px. Feed sticks to bottom only when within 96px; a "Latest" chip appears at 280px up. Motion is 150 to 200ms, transform and opacity; `prefers-reduced-motion` collapses all transitions and animations in `.album-surface`.

## Do's and Don'ts

- Do consume `album.*` colours and `AlbumButton` / `AlbumSheet`; do not hand-roll a sheet or a gold button.
- Do keep 44px targets; small controls use `.album-hit` (a 6px invisible halo, parent `relative`).
- Do keep a visible, labelled path for every gesture (the per-message options button exists beside the tap-on-bubble).
- Do pair colour with text or shape.
- Don't write a numbered red badge, a second bookmark shape, or new textures.
- Don't put gold-on-gold or Ink-3 on Field for anything a user must read.
- Don't use `Sparkles` (repo rule) or emoji as chrome. Copy goes through `t()`.

## Known gaps (honest, as shipped)

- Group Info, Members, Coin modals, Notification, Share, Invite, Leave and Pending were re-skinned by token remap, not rebuilt on AlbumSheet. They still carry English-only strings and some 13px secondary text (the album-native surfaces use `t()`).
- Per-message reaction is tap-on-bubble; the visible "..." options button is shown only on the newest line, on hover, on focus or when open. Older lines rely on the tap.
- The ribbon renders only on shelf tiles when the inbox digest has unread; the `card` cover accepts `unread` but no caller passes it, so the desktop rail cover never shows one.

## Not canonized

- 12px text (ribbon digit, host badge, party names, mobile bottom-nav labels) and 13px meta: recorded as a legibility defect for a multi-generation audience, not a floor. New text starts at 14px.
- Caveat for empty-state titles, shelf and memories accent words: the build's stretch of the hand voice, see below.
- Legacy modal chrome from the token remap (see gaps).
- Hard-coded `#fff` on ribbon and danger (works, but is not a token).

## Divergences from the direction contract

1. Contract: "Caveat only for handwritten day captions" (and memory dates). Build: Caveat also sets empty-state headlines (feed, play room, memories at 30 to 48px), the shelf-title accent word and the "memories" section script (`.album-hand` in MessageFeed, MandaliHubMobile, MandaliHubDesktop, MandaliDiscoveryPage, GnapakaluTimeline). The hand voice is wider than the contract's ornament 4.
2. Contract: ribbon marks "something is new". Build: a ribbon-coloured dot is also used as a cooldown marker in the Composer.
3. Contract: FIRST VIEWPORT composer "Write a line to <group>...". Build: only desktop shows it as the placeholder; phone uses a short placeholder and keeps the full sentence as `aria-label`.
