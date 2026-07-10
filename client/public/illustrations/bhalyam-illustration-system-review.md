# BHALYAM — Notebook Illustration System, a Production Design Review

*A page-by-page production design review — prepared 2026-07-10*

> The notebook is the product. Here's where it still hasn't reached.
>
> An audit of every screen in BHALYAM against the five hand-drawn reference sheets in `client/public/illustrations` — what belongs, what's missing, and exactly what to commission next.

**14 games catalogued · 11 screens reviewed · reviewed 2026-07-10**

---

## Reality check, before anything gets designed

BHALYAM currently ships two visual identities at once. Any illustration plan has to say which one it's serving.

**Two skins, one app**

**The shell** — Home, `/games`, the Room chrome, and 404 — runs on a wood-and-gold-leaf "90s adda" identity: cream paper, gold-leaf CTAs, wood-dark ink, an orange/navy/green tri-tone headline, a photographic memorabilia hero, WhatsApp-green share buttons. It's warm and specific to Telugu/Indian childhood culture (Sankranti, verandah proverbs, terrace games) — but it is *not* the ballpoint-notebook look.

**The notebook** — the actual blue-ballpoint, ruled-paper, spiral-bound language shown in your five reference sheets — lives in a real, reusable component kit already: `components/paper/` (RoughFrame, PaperCard, PaperButton, SketchHeading, StickyNote, TornChip) plus `components/nostalgia/NotebookSheet`. Today it's wired into exactly **one** screen: the Hand Cricket board (`hc-notebook.tsx`). RPS has its own `rps-notebook.tsx` file but doesn't yet pull from the shared kit — worth unifying before it drifts into a third dialect.

So "a single visual identity across every page" is the destination, not where things stand today. Recent commits (skeuomorphic skin, physical paper country cards, aged paper + sketch font) show the notebook system is actively being extended, game by game. This review designs every illustration *as if* the notebook were already the universal skin — because that's the clear direction of travel — and flags, screen by screen, whether the notebook migration has to land first.

---

## Reading the source material first

Every one of the five existing sheets was opened and studied before anything below was drafted. Here is the grammar they share — the rules any new illustration has to obey to belong to the same family.

| Trait | Description |
|---|---|
| **Canvas** | Full-bleed vertical spiral notebook page: die-cut ring holes down the left edge, a red vertical margin rule, faint blue horizontal rule lines on warm cream paper. Never a blank white background. |
| **Ink** | One color only — deep cobalt ballpoint blue. No secondary hues, no flat color fills except the occasional solid-blue silhouette (a helmet, a filled star). Monochrome is a hard constraint, not a style suggestion. |
| **Line quality** | Confident, slightly imperfect hand-drawn contours at a heavier weight for silhouettes, with fine parallel/cross-hatching for shading — bat wood grain, helmet padding, grass, ball seams. |
| **The cast** | A recurring boy character — spiky tousled hair, round face, dot-and-curve eyes, plain or collared tee — drawn at consistent proportions across every sheet. It's a cast to keep reusing, not redesigning per game. |
| **Prop vocabulary** | Bat, ball, stumps, helmet, gloves, whistle, double-handled trophy, megaphone, wooden signpost, spiral score-book, pencil, paper airplane, backpack, coin, speech/thought bubbles, outline & filled stars, dashed motion trails, curly doodle squiggles. |
| **Lettering** | Hand-set marker lettering always sits on a drawn "carrier" — a torn-ribbon banner, a nailed wooden sign, a washi-taped index card, a spiral notebook cover — never floats as bare type over the scene. |
| **Composition** | One dominant figure or object group anchored center-to-lower-half; small satellite doodles (stars, circles, motion lines) spread evenly through the remaining margin so the ruled paper still breathes through the art. |
| **Voice** | Captions read like a diary line underlining a feeling ("Every Legend starts with One Match!"), not a UI instruction. The one exception — the six-step rulebook sheet — earns its strict numbered-panel layout because it *is* a real sequence. |

**Extension principles — how a new illustration stays in the family**

- **Same ink, same paper, always** — even a small corner sticker sits on the cream ruled canvas in cobalt-blue line, never a plain white background.
- **Reuse the cast** — new scenes draw the same boy (and a small, consistent 2–4 kid roster), not a fresh character per game.
- **Borrow the carrier objects** — new game-specific icons (dice, cards, alphabet tiles, folded chits) get drawn at the identical line weight and hatching density as the cricket bat, and any new lettering rides on an existing carrier type (ribbon, sign, sticky note, tape).
- **Density signals importance** — hero/empty-state sheets get the dense, satellite-doodle treatment; small in-context accents borrow one or two objects at reduced complexity so they never compete with UI controls.
- **Captions are diary lines** — never a system label. "Waiting for Players" belongs; "0 of 4 ready" does not.

---

## Page-by-page: the flow a player actually walks through

These eleven screens are a real sequence — home → pick a game → enter a room → wait → play → celebrate — so they're numbered. The games catalog and the global system further down are not sequences, so they aren't.

### 01 · Home
`BhalyamHome.tsx` · route `/` — **Shell today · Illustrate: yes**

**Purpose:** the first-impression landing surface — get a visitor into a game in under fifteen seconds. **User goal:** recognize BHALYAM, feel the nostalgia hook, tap a tile or join a friend's room.

- **Current layout:** Header (logo, all-games, profile, menu) → a photographic hero banner of a 90s memorabilia flat-lay with a cream gradient scrim and the "Ready to relive your childhood?" headline → a WhatsApp-style Join Room pill → a 2×3 "Pick a game" tile grid (first six games) → "View all games" link → an animated stats strip → a Continue Playing / recent-activity panel row → footer.
- **Empty space analysis:** The hero's gradient scrim (roughly the left 60% on desktop) is currently pure color, not artwork — the only imagery is the photograph bleeding through on the right. The stats strip uses generic flat colored-circle badges ("O", "T", "★", "❤") that don't belong to any drawn system at all. The Continue Playing card has a plain rounded image slot with nothing in its corners.
- **Illustration opportunity:** Yes — this is the single highest-leverage surface in the app. It's the one place a first-time visitor decides what kind of product this is, and today it promises "photographed nostalgia," not "you are inside a notebook."
- **Story:** This whole site is somebody's old notebook, and every game about to be offered was scribbled into its margins — reframing six unrelated mobile games as one continuous doodle session, which is BHALYAM's actual premise.
- **Illustration concept:** A wide desk-spread sketch on the same spiral-ruled cream canvas: an open exercise book showing the "GAME PLAN" checklist device already used in the reference sheets (Invite friends ✓ · Add bots ✓ · Practice ✓ · Have fun ✓), with the reused boy character waving from the right edge, surrounded by a loose still-life of one small prop per flagship game — cricket bat + ball, a fan of playing cards, a die with two tokens, a spinning coin, a connect-the-dots corner scribble, a single alphabet tile — small enough to read as margin doodles, not six competing heroes.
- **Objects:** spiral notebook spread, "Game Plan" checklist, cricket bat & ball, playing-card fan, die + 2 tokens, spinning coin, dot-connecting scribble, alphabet tile, waving boy, outline stars, pencil, washi tape corner.
- **Composition:** *Top:* calm, binding-shadow only, so the header sits on plain paper. *Left:* the open notebook + checklist (kept light — the headline currently overlays here). *Right:* the boy + prop still-life, denser toward the outer edge. *Bottom:* a thin doodled grass line. *Center:* emptiest, reserved for the headline exactly as the current scrim logic already reserves it.
- **Visual hierarchy:** First: the boy + checklist (instant "notebook, not app store" read). Second: the tiny game props (a reward for a second look). Always subtler than the headline type sitting on top: paper grain, background stars.
- **UX justification:** Right now the hero photo and the Hand-Cricket-only notebook art send two different promises — whichever a visitor sees first sets an expectation the other page breaks. One shared visual grammar removes that whiplash, explains "what kind of app is this" without a word of copy, and turns the hero into a teaser for every game instead of just one.
- **Reusability:** High — this "desk spread + checklist + prop still-life" composition is the direct template for the Games catalog header below (same idea, all fourteen props, denser). The waving-boy pose can recur across every onboarding/empty moment in the app as a light mascot presence.

**Production AI prompt:**
> Hand-drawn ballpoint-pen illustration in the style of a 1990s Indian school exercise notebook: cream ruled paper background with faint blue horizontal rule lines and a vertical red margin line on the left edge, rendered entirely in a single deep cobalt-blue ballpoint ink line (no other colors), confident slightly-imperfect contour lines with fine cross-hatch shading. Wide landscape composition. Left-of-center: an open spiral-bound notebook lying flat, its visible page showing a handwritten checklist titled "GAME PLAN" with ticked boxes reading Invite friends, Add bots, Practice, Have fun. Right side: one cheerful hand-drawn boy character — tousled spiky hair, round friendly face, simple collared t-shirt — waving toward the viewer, surrounded by a loose scattered still-life of small hand-drawn game props: a cricket bat and ball, a fan of playing cards, a rolling die with two round tokens, a spinning coin, a connect-the-dots scribble, and a single alphabet tile with the letter A, all at the same fine line weight and hatching density as the notebook. Scattered outline stars, small circles, and a dashed motion-trail doodle fill the remaining margins; bottom edge lightly implies a strip of hand-drawn grass. Center third of the composition kept comparatively empty for text overlay. No color besides the cream paper and cobalt ink. No 3D rendering, no gradients, no clipart, no anime style.

---

### 02 · All Games catalog
`GamesPage.tsx` · route `/games` — **Shell today · Illustrate: yes**

**Purpose:** the full shelf of every game BHALYAM offers, playable and "coming soon." **User goal:** browse past the home page's 6-tile cap, or land here directly from a friend's share.

- **Current layout:** Lean header (logo + Home link) → "Ready to play" grid of the nine playable tiles → a "Coming soon" section for the five maintenance tiles → a centered "Join a room with a code" link. No hero, no stats — deliberately leaner than Home.
- **Empty space analysis:** The gap between the two section headers and the "Join a room" footer link is plain paper with nothing in it — on a tall desktop viewport with only nine + five tiles, there's a visible band of unused vertical rhythm above the fold that neither section header nor the tiles fill.
- **Illustration opportunity:** Yes, but modestly — this page's job is fast scanning, not storytelling, so the illustration should frame the shelf rather than decorate it.
- **Illustration concept:** A single horizontal "notebook shelf" band directly under the page header: a hand-drawn wooden bookshelf/cubby rendered as cross-hatched shelving, holding small line-art silhouettes of the fourteen games' signature objects lined up like toys put away after school — no characters, just objects, so it reads fast and doesn't compete with the tile grid's own artwork underneath.
- **Story:** Every game in the house, put back on the shelf, ready to be pulled down again — turns a plain catalog into "the toy cupboard," which matches the "coming soon" tiles reading as toys not yet unwrapped.
- **Objects:** hand-drawn wooden shelf/cubby, cricket bat, playing cards, dice, a rock-paper-scissors hand gesture, a snake-and-ladder die, a UNO card, connect-the-dots corner, alphabet tile, memory-match card pair, a folded paper chit (Star Game), a Tambola ticket, a film reel (Telugu Cinema), a palm-leaf scroll (Samethalu).
- **Composition:** *Top:* the shelf band, full width, thin (roughly the height of one tile row) so it reads as a header ornament, not a second hero. *Center/rest of page:* left untouched — the tiles themselves already carry each game's own accent gradient and glyph. *Background:* paper texture only below the shelf band.
- **Visual hierarchy:** First: the tile grid itself (unchanged, still the primary click target). Subtle: the shelf band reads on arrival, then recedes — it's an establishing shot, not a competitor for attention.
- **UX justification:** Gives the "coming soon" section emotional permission to exist — toys waiting on a shelf, not a broken promise — and reinforces the site-wide notebook language at the second-most-visited page without slowing down the scan-and-tap job the page exists to do.
- **Reusability:** The shelf motif can be reused, restocked, anywhere BHALYAM needs to say "more is coming" — an empty friends list, a locked-content teaser — by swapping which objects sit on it.

**Production AI prompt:**
> Hand-drawn ballpoint-pen line illustration, cream ruled notebook paper background with a red margin line, single cobalt-blue ink, fine cross-hatch shading, no other colors. A wide, low horizontal band showing a simple hand-drawn wooden shelf (cross-hatched wood grain) holding a row of small line-art toy-like objects evenly spaced: a cricket bat, a fan of playing cards, a single die, a hand making the "scissors" gesture, a snake-and-ladder game die, a UNO-style card, a scribbled connect-the-dots doodle, a letter tile, two face-down memory cards, a small folded paper chit, a lottery ticket, a film reel, and a rolled scroll — each object simplified to clean silhouette-plus-hatching at identical line weight, like toys tidied onto a shelf after school. Wide banner aspect ratio. No characters, no text, no color beyond cream paper and blue ink.

---

### 03 · Create / Join a room
`GameRoomSheet.tsx` + `JoinRoomModal.tsx` — **Shell today · Illustrate: sparingly**

**Purpose:** the moment a tile-tap turns into a real room — name, per-game options, then Create or Join. **User goal:** get through the form fast without losing the "we're about to play" excitement.

- **Current layout:** A bottom sheet on mobile / centered modal on desktop: game glyph + title header, name input, per-game option pickers (overs, difficulty, match mode, etc.), then Create Room / Join with code actions.
- **Empty space analysis:** This is a dense, form-heavy surface — inputs, radio-style option cards, and buttons fill nearly the whole sheet. There is no meaningfully empty region; the only open space is the header strip above the name input.
- **Illustration opportunity:** Only a light touch — a small header accent, not a scene. A form this dense should never compete with its own inputs for attention; anything heavier would slow down exactly the moment you want to feel fastest.
- **Illustration concept:** A single small corner doodle in the sheet header — a hand holding a pencil mid-signature, tucked beside the game's glyph — implying "you're about to write your name into the notebook," echoing the sticky-note "You're Invited!" card from the reference sheets at a much smaller scale.
- **Story:** Signing your name into the game, the way you'd write it on the first page of a new exercise book.
- **Objects:** pencil, small hand, one outline star.
- **Composition:** Top-right corner only, roughly 48–64px, beside the sheet's close button — never behind the name input or option cards, which must stay at full legibility and contrast.
- **Visual hierarchy:** Deliberately last thing noticed — the form fields and the Create/Join buttons must win every time. This is decoration, not narrative, at this density.
- **UX justification:** A tiny consistent flourish here still ties the flow back to the notebook world without adding friction to a screen whose entire job is "fill this in and go." Restraint is the correct call, not an oversight.
- **Reusability:** The "pencil signing a name" mark can double as a generic favicon-scale mascot mark for any name-entry moment across the app (see also Name Entry, page 05).

---

### 04 · Connecting screen
`Room.tsx` → `ConnectingScreen()` — **Shell today · Illustrate: yes, tiny**

**Purpose:** bridge the gap while the socket opens and the first room snapshot arrives. **User goal:** trust that the app is working, not stuck, in the 1–3 seconds this typically takes.

- **Current layout:** Fully centered, minimal: a spinning gold ring with a pulsing dot core, "Connecting to room" with three bouncing dots, and the room code in large tracked monospace underneath. Nothing else on screen.
- **Empty space analysis:** The entire screen outside the small centered spinner group is bare paper — by far the emptiest screen in the app, but also the shortest-lived, which changes the calculus.
- **Illustration opportunity:** Yes, but tiny and looping — this state is measured in seconds, so nothing elaborate should be commissioned; a small looping accent earns its keep precisely because it's cheap to build and only seen briefly, over and over, by everyone.
- **Illustration concept:** Swap the abstract gold spinner ring for a small hand-drawn pencil that appears to be doodling a circle around the room code in a continuous loop — the "spinner" becomes an in-world action (someone circling the code in their notebook) instead of a generic loading widget.
- **Story:** Someone's still circling your room code in their notebook — a beat away from being found.
- **Objects:** pencil, looping ink circle around the code.
- **Composition:** Center only, replacing the current spinner 1:1 — the room code stays exactly where it is, in the same weight, so the layout doesn't shift when this ships.
- **Visual hierarchy:** The room code remains the thing to read; the pencil-loop is peripheral motion that signals "working," matching today's spinner's job exactly.
- **UX justification:** A branded loading motif still reduces perceived wait versus a generic ring, and reusing the pencil mark ties back to the room-creation and name-entry moments either side of it.
- **Reusability:** This is the app's one canonical loading indicator — build it once as a small looping SVG/Lottie and reuse it everywhere else that needs a spinner (scorecard countdown ring excluded, since that one carries real numeric meaning).

---

### 05 · Name entry (shared link)
`Room.tsx` → `NameEntryForRoom()` — **Shell today · Illustrate: sparingly**

**Purpose:** catch a visitor who followed a raw share link with no stored name. **User goal:** type a name and get straight into the room their friend is already waiting in.

- **Current layout:** A single centered card: "Joining room" label, the room code in large tracked monospace, one line of copy, a name input, and a Join Room button. Nothing else.
- **Empty space analysis:** The area around the card (the full viewport minus the ~380px card) is bare paper on any screen wider than mobile.
- **Illustration opportunity:** Yes, but background-only — this is a one-field form under real time pressure (a friend is waiting), so the illustration has to frame, never slow.
- **Illustration concept:** A faint, low-contrast background vignette behind the card — the same "kids waiting" cast from the reference lobby sheet, drawn small and pushed to the corners at reduced ink opacity, glancing toward the card as if watching the door for the new arrival.
- **Story:** The gang is already there, glancing over, waiting for one more name to show up.
- **Objects:** 2–3 small waiting kid silhouettes (low-opacity), a couple of outline stars.
- **Composition:** Background, corners only — bottom-left and bottom-right, well outside the card's ~380px footprint; nothing crosses behind the input or button.
- **Visual hierarchy:** Essentially invisible until you look for it — the card and its single field must win instantly, this is atmosphere, not a scene to read.
- **UX justification:** Softens what is otherwise the coldest, most "empty database record" screen in the app (a lone form on blank paper) into "you're joining people," which matters emotionally more here than almost anywhere else, since this is often a brand-new visitor's very first BHALYAM screen.
- **Reusability:** The same low-opacity "waiting cast in the corners" treatment is the natural background for the Lobby screen itself (page 06) at full strength — this is its quiet preview.

---

### 06 · Lobby — waiting for players
`Room.tsx` · `roomState.phase === "lobby"` — **Shell today · Illustrate: yes — highest priority**

**Purpose:** the room after creation, before the game starts — everyone joins, picks colors/options, adds bots, and readies up. **User goal:** feel the anticipation build while waiting on friends, without getting bored enough to leave.

- **Current layout:** A plain cream card: room code + share button, room name editor, a "Waiting for players to ready up" line of text, optional color pickers (Ludo/SnL), a Bot Controls box, Ready/Start buttons — beside an inline rail with the player list, voice panel, and chat.
- **Empty space analysis:** This is, almost verbatim, the scene your first reference illustration already draws — a wooden "Waiting for Players" sign, kids sitting around, a "GAME PLAN" checklist. Today's real lobby has none of it: just a text sentence ("Waiting for players to ready up.") sitting in a plain card with real empty margin above and beside it on desktop, where the two-column grid leaves the illustration-worthy space entirely bare.
- **Illustration opportunity:** Yes — and it should be the very first full-scale illustration shipped outside Hand Cricket, because a matching concept already exists, tested, in your reference set. This is the multiplayer "dead air" moment every casual platform struggles with; right now BHALYAM fills it with a sentence.
- **Story:** The gang is gathering — some have arrived, a seat's still empty, and everyone's doodling in the margins while they wait, exactly the emotional beat your existing sheet already tells.
- **Illustration concept:** Adapt (don't redraw from scratch) reference illustration 1: the wooden "Waiting for Players" sign becomes the literal replacement for today's plain text line, with the kid count and props matching the room's actual game (a bat and stumps for Hand Cricket, a card fan for Rummy, a die and tokens for Ludo, a torn coin for RPS) so the same composition template restages itself per game rather than becoming one generic asset reused everywhere unchanged.
- **Objects:** wooden "Waiting for Players" signpost, 2–4 seated/standing kid characters, game-specific prop (varies by room), backpack, "GAME PLAN" checklist book, stopwatch ("Good things take time!"), speech bubble ("Let's play together!"), stars, scoreboard placard reading the live seat count.
- **Composition:** *Center-bottom:* the seated/standing kids, one per joined seat plus a visibly empty spot with a "You're invited!" card propped in it for unfilled seats — a literal, readable representation of room capacity. *Top:* the wooden sign, doubling as the section header. *Sides:* the checklist and stopwatch doodles, kept clear of where the player-list rail sits on desktop. *Background:* ruled paper throughout.
- **Visual hierarchy:** First: how many seats are filled (this is functional information, not just mood — it should be legible at a glance). Second: the wooden sign / headline feeling. Subtlest: the stopwatch, stars, and margin doodles.
- **UX justification:** Turns dead waiting time into anticipation instead of doubt (usability: is anything actually happening?), gives a wordless, instantly-parseable seat-count visualization (usability), and is the single moment most likely to be screenshotted and shared to a WhatsApp group to recruit the missing player — which is BHALYAM's actual growth loop.
- **Reusability:** Extremely high — this is the template every future game's lobby reuses, swapping only the prop and seat count. It should be built as a composable illustration (base scene + per-game prop slot), not fourteen separate flat images.

**Production AI prompt (Hand Cricket variant, as a build reference):**
> This composition can be adapted directly from the existing "Waiting for Players" reference sheet already in `client/public/illustrations`: same cobalt-blue ballpoint ink on cream ruled paper, same wooden nailed signpost reading "Waiting for Players," same seated/standing kid cast and cricket-bat-and-stumps props, same "GAME PLAN" checklist book and stopwatch doodle — cropped and re-composed to a wide banner aspect ratio for the lobby card, with one seat shown visibly empty holding a small "You're invited!" propped card, and a scoreboard placard re-lettered to show the live seat count instead of a score.

---

### 07 · Active gameplay (all boards)
`Room.tsx` · `roomState.phase === "playing"` — **Mixed — HC only today · Illustrate: mostly no**

**Purpose:** the actual game — cricket innings, a Ludo board, a Rummy hand, a Ludo/SnL turn. **User goal:** total focus on the play; this is the opposite of a browsing moment.

- **Current layout:** Fourteen different board layouts (nine playable today), each desktop/mobile split, most already dense with game-specific chrome: score placards, turn indicators, dice, cards, tokens, a floating room rail.
- **Empty space analysis:** Genuinely little true empty space during play — these boards are working surfaces, not showcases. Where margin exists (frame edges around Ludo's board, the felt border in Rummy, unused corners in Dots & Boxes) it's there on purpose, as breathing room for touch targets and drag gestures.
- **Illustration opportunity:** No, not as scenes — and this is the correct, deliberate answer, not an oversight. A player mid-turn needs the board, the score, and their opponent's move, not a doodle competing for eye time. Hand Cricket's own notebook skin already proves the right level: it re-skins the frame (paper texture, sketch headers, rough borders) without ever placing an illustrated scene over the play surface itself.
- **Illustration concept:** Where illustration belongs here is strictly at the frame, not the field: (1) the paper/rough-border re-skin extended from Hand Cricket to the other thirteen boards, (2) a single small per-game corner doodle (≤ 64px) in an already-static UI chrome zone — e.g. the Ludo board's outer corner, the Rummy felt's header bar — using each game's one signature object at reduced complexity, matching the "density signals importance" rule above.
- **Story:** The notebook page turned into a game board, but it's still visibly the same notebook at the edges.
- **Objects (per game, one each):** die + tokens (Ludo), snake/ladder doodle (SnL), playing card fan (Rummy/UNO), connect-the-dots corner (Dots & Boxes), alphabet tile (Word Building), two face-down cards (Memory Match), folded paper chit (Star Game).
- **Composition:** Corners of the static chrome only — header bars, outer frame edges — never inside the live play area, never behind draggable/tappable elements, never animated in a way that could be mistaken for a game state change.
- **Visual hierarchy:** Essentially invisible during focused play — correctly so. If a playtester notices the corner doodle before they notice whose turn it is, the illustration has failed at this screen specifically.
- **UX justification:** Extending the paper re-skin (not new illustrated scenes) is what makes "one visual identity across every page" true during the 90%+ of session time spent actually playing, without ever risking focus or misreadable game state — the single biggest usability risk anywhere in this review.
- **Reusability:** The paper/rough-border kit (already built, already proven on Hand Cricket) is the reusable asset here — this is a rollout task for engineering, not a fresh illustration commission, aside from the thirteen small corner-object doodles.

---

### 08 · Scorecard & Game Over
`GenericScorecardModal` + `GameOverScreen.tsx` — **Shell today · Illustrate: yes**

**Purpose:** the two-stage result flow every game ends on — a 90-second scorecard, then a 100-second full-screen celebration before auto-leave. **User goal:** feel the win (or the loss) land, see a rematch option, and decide whether to stay or go.

- **Current layout:** The scorecard is a dark navy-and-gold modal card: countdown ring, "🏆 X wins!" headline, a ranked player list, Leave/Continue buttons. GameOverScreen is a full-viewport radial amber-to-maroon gradient with an emoji trophy, a big "Game Over" gradient headline, a winner badge, and a rematch panel.
- **Empty space analysis:** GameOverScreen's top third — the glow halo above the trophy — is currently pure gradient with a single emoji trophy as the only mark; on wide desktop viewports there's a large expanse of ambient gradient with nothing drawn in it at all.
- **Illustration opportunity:** Yes — this is the emotional peak of a session and currently the least "notebook" screen in the whole flow (dark gradient, an emoji, no hand-drawn linework anywhere), which breaks the identity at the exact moment a player is most likely to screenshot and share.
- **Illustration concept:** Replace the emoji trophy with the reference sheets' own hand-drawn double-handled star trophy, sitting on the same wooden pedestal already drawn in illustration 4, now with confetti-doodles (curly squiggles + stars, not literal confetti pieces) bursting from it, and a small cheering-kids silhouette line reused from illustration 2 along the bottom edge — kept in cobalt-blue ink even against the warm gradient backdrop, so the identity holds even in the app's most colorful moment.
- **Story:** The scene from the front of the reference score-book sheet — "You are the Champion!" — finally happening to you, not just printed as a rulebook illustration.
- **Objects:** double-handled star trophy on a pedestal, curly confetti-squiggle doodles, outline & filled stars, a line of 2–3 cheering kid silhouettes, a small "YEAH!" flag from the reference rulebook sheet.
- **Composition:** *Top-center:* the trophy, replacing the current emoji 1:1 in the same glow halo. *Radiating outward:* confetti-squiggles and stars filling the currently-empty gradient expanse. *Bottom edge:* the cheering-kids silhouette line, low enough to never overlap the winner badge or rematch buttons. *Losing state:* the same trophy drawn faded/tipped over with a single kid shrugging, keeping the identity consistent even for a loss rather than reusing the win art with different text.
- **Visual hierarchy:** First: the "Game Over" headline and winner name (unchanged — text hierarchy stays exactly as-is). Second: the trophy illustration, now doing real emotional work instead of a stock emoji. Subtlest: the confetti doodles and cheering line at the edges.
- **UX justification:** This is the moment most likely to produce a screenshot shared back to the WhatsApp group that started the room — the app's actual acquisition channel — so it deserves the most distinctive, least-generic art in the entire product, not an emoji. It also closes the emotional loop the lobby illustration opened: "the gang gathered → the gang played → the gang won."
- **Reusability:** The trophy + confetti base is reusable across every game's win state (only the small prop accents change per game, matching the corner-doodle system from page 07); a mirrored "consolation" version (tipped trophy, shrugging kid) covers every loss state with one additional asset.

**Production AI prompt:**
> Hand-drawn ballpoint-pen illustration, single deep cobalt-blue ink line with fine cross-hatch shading, drawn as if on cream ruled notebook paper (paper texture kept very light/desaturated so it can sit over a warm gradient background). Centered: a double-handled trophy with a star medallion on a two-tier wooden pedestal, drawn at heavier line weight than surrounding elements to read as the focal point. Radiating outward from the trophy: loose curly squiggle doodles standing in for confetti, mixed with small outline and solid-filled five-point stars, distributed unevenly like a page someone got excited and scribbled on. Along the bottom edge, a low horizontal line of two to three simple hand-drawn kid silhouettes with arms raised in celebration, small enough to sit clear of any text or buttons below them. A small hand-lettered flag reading "YEAH!" tucked beside the trophy. No color besides cobalt-blue ink; no photographic elements; no 3D rendering; no emoji-style icons.

---

### 09 · 404 — Not Found
`NotFound.tsx` · route `*` — **Shell today · Illustrate: yes**

**Purpose:** catch a dead room link or a mistyped URL gracefully. **User goal:** understand nothing is broken with them, and get back to a real game in one tap.

- **Current layout:** A tri-tone "404" numeral treatment with a circular porthole photo inside the middle "0" (a schoolbag / paper-plane photo with graceful fallbacks), a "ran off to play hide-and-seek" headline, explanatory copy, and Home / Reload buttons.
- **Empty space analysis:** Already a strong, bespoke page — the least "generic error" 404 possible. Its one gap: the porthole photo is photographic, not hand-drawn, so it's the same seam as the Home hero — a different visual language dropped into an otherwise well-considered layout.
- **Illustration opportunity:** Yes — a straightforward swap, not a redesign. The page's structure, copy, and animation are already right; only the porthole image needs to move from photography to the notebook's own ink.
- **Illustration concept:** Replace the photographic porthole image with a hand-drawn scene in the exact spirit already implied by the existing paper-plane SVG decoration on this page: a schoolbag mid-tumble, spilling a cricket ball and a few playing cards, as if it fell out of the notebook's margin — the porthole framing (gold ring, drop shadow) stays untouched, only its contents change medium.
- **Story:** The room you were looking for packed its bag and ran off between periods — consistent with the existing "ran off to play hide-and-seek" headline, just told in the same ink as everywhere else.
- **Objects:** tumbling open schoolbag, spilling cricket ball, 2–3 playing cards, the paper airplane already used on this page, a couple of outline stars.
- **Composition:** Inside the existing circular porthole only — same crop, same gold ring, same drop shadow the page already uses; the paper-plane animation already orbiting the porthole stays exactly as built.
- **Visual hierarchy:** Unchanged from today: the "404" numerals and headline remain the first thing read; the porthole art is a secondary, charming detail exactly as it already functions.
- **UX justification:** Closes the very last seam where BHALYAM shows a visitor two different art styles in a single session — someone who bounces off a dead link and sees the notebook style even in the error page reads the whole product as more deliberate, not less finished.
- **Reusability:** Low-to-medium — this is a one-off scene specific to the 404 joke, though the tumbling-schoolbag device could recur for any other "this went away" state (an expired room, a kicked-from-room screen) if one gets built later.

---

### 10 · Supporting empty & transitional states
`Chat.tsx` · `BotControls` · `PassPhoneGate` · reconnect toasts — **Shell today · Illustrate: small only**

Four small moments worth a deliberate call each, grouped because none justifies a full page treatment on its own.

- **Empty chat:** Chat currently shows nothing before the first message. A single hand-drawn "psst — say hi" speech bubble doodle, the same carrier device already used in the reference sheets, would read faster than a blank scroll area. **Illustrate: yes, one tiny asset.**
- **"No bots yet":** BotControls already has real copy ("No bots yet. Add one to practice against AI.") in an italic empty-state line. A small robot-doodle-in-cobalt-ink beside that text, matching hand-drawn linework rather than the 🤖 emoji currently used elsewhere in the same component, would be a worthwhile one-off consistency fix. **Illustrate: yes, one tiny asset.**
- **Pass-the-phone gate:** Ludo/SnL/Dots & Boxes/Word Building all use a "pass phone to the next player" gate between turns on shared-device play. This is a genuine hand-off ritual — a small hand-drawn illustration of a phone being physically passed between two sketched hands would dramatize the exact real-world action being requested. **Illustrate: yes, meaningful.**
- **Reconnect / room-error toasts:** These are urgent, time-pressured system messages ("This room is no longer active…"). **Illustrate: no** — any artwork here would slow comprehension of a message that needs to be read and acted on in seconds; keep these as plain, high-contrast text as they are today.

---

### 11 · Ludo preview
`PreviewLudo.tsx` · route `/preview/ludo` — **Internal tool · Illustrate: no**

**Purpose:** an internal, undiscoverable route for previewing Ludo board states during development — not a route any real player is ever routed to.

- **Illustration opportunity:** No. This is a developer tool, not a player-facing surface. Spending illustration budget here would be decorating a screen no one but the team ever opens. If it's ever promoted into a real "watch a demo" marketing page, revisit — until then, skip it.

---

## The full game catalog, mapped

Not a sequence, so no numbering. Every game gets one signature object worked into the shared lobby/corner-doodle systems above; four flagship games get a fully worked concept and prompt below.

### Rummy
Story: the Sankranti-holiday card table your whole extended family actually plays at, drawn as a notebook memory of it.

- **Objects:** fanned playing cards, a discard pile, a card-holder stand, a joker card drawn slightly askew, a bowl of festival snacks, a string of paper bunting.
- **Composition:** the fanned cards and card-stand centered as the dominant object group, the bunting strung across the top margin, the snack bowl tucked in a bottom corner.
- **Reusability:** the fanned-card motif reused at reduced complexity for the lobby's per-game prop slot and the gameplay corner doodle.

> Hand-drawn ballpoint-pen illustration, cream ruled notebook paper, red margin line, single cobalt-blue ink with fine cross-hatch shading, no other colors. Center: a wooden card-holder stand fanning out playing cards face-toward-viewer (simplified suit pips, no realistic card-back pattern), one joker card tilted at a jaunty angle. A small discard pile of 3 cards sits beside it. A string of small triangular bunting flags is doodled across the top of the page. A round bowl of festival snacks (simple mound shape with a few dot-like pieces) sits in the lower corner. Outline stars and small circles scattered in remaining margin space. No characters required. No color beyond cream paper and cobalt ink.

### Ludo
Story: the power-cut afternoon time-killer — no electricity, just a board, dice, and whoever's around.

- **Objects:** a cross-shaped Ludo board sketched in perspective, two oversized dice mid-roll with motion lines, four cone-shaped tokens, a hand-drawn ceiling fan (switched off, blades still) referencing the "waiting for the current to come back" tagline already in the game's own catalog blurb.
- **Composition:** the board tilted slightly as if viewed from where you're sitting on the floor, dice mid-bounce above it with dashed motion trails, the still ceiling fan doodled faintly in an upper corner as an atmosphere detail.
- **Reusability:** the mid-roll dice + motion trail is the single object reused in the gameplay corner doodle.

> Hand-drawn ballpoint-pen illustration, cream ruled notebook paper, red margin line, single cobalt-blue ink with fine cross-hatch shading. A cross-shaped Ludo board sketched in slight perspective as if sitting on a floor, its four colored home-quadrants indicated only by different hatching patterns (not flat color fills). Two large dice shown mid-bounce just above the board with curved dashed motion trails behind them. Four simple cone-shaped playing tokens stand on the board's starting squares. In the upper corner, faintly doodled and lower in ink density than the main scene, a ceiling fan with its blades at rest. Scattered outline stars in the remaining margin. No characters, no color beyond cream paper and cobalt ink.

### Snakes & Ladders
Story: the neighborhood-friendship-ending big snake at square 99, drawn exactly as menacingly as it felt as a kid.

- **Objects:** a hand-drawn game board grid seen at an angle, one long dramatically-coiled snake spanning from a high number down to a low one, a ladder climbing the opposite side, a single die, a shocked-face kid reacting to landing on the snake's head.
- **Composition:** the snake given the most linework and hatching density of anything on the page (it's the emotional main character), the ladder kept simple and secondary, the shocked kid small in a lower corner reacting to it.
- **Reusability:** the coiled-snake motif alone (without the board) becomes the compact gameplay corner doodle.

> Hand-drawn ballpoint-pen illustration, cream ruled notebook paper, red margin line, single cobalt-blue ink with fine cross-hatch shading. A numbered grid game board sketched at a slight downward angle, most of its squares left as bare outlined boxes. One long, dramatically coiled snake (heavy cross-hatch scale texture, exaggerated fanged head) stretches diagonally from a high square down to a low one, drawn as the clear focal point with the heaviest ink weight on the page. A much simpler wooden ladder is doodled climbing the opposite side of the board. In a lower corner, a small hand-drawn kid character reacts with a shocked open-mouth expression and raised hands. A single rolling die with motion lines sits near the board's edge. No color beyond cream paper and cobalt ink.

### Star Game (చుక్క ఆట)
Story: pure 90s terrace nostalgia — folded paper chits slid clockwise on a rooftop between friends until someone slaps the star.

- **Objects:** a circle of small folded/torn paper slips arranged clockwise, one slip unfolded to reveal a hand-drawn star inside, a flat hand mid-slap, a rooftop railing/terrace edge suggested at the bottom of the frame, an evening sky doodled only in outline (no color wash).
- **Composition:** the ring of paper chits forms the visual center exactly like a clock face, the slapping hand entering from one side motion-lined, the terrace railing anchoring the bottom edge so the scene reads as "outdoors, rooftop, evening" without needing color.
- **Reusability:** the single unfolded star-chit is the compact per-game object reused in the lobby and corner-doodle systems.

> Hand-drawn ballpoint-pen illustration, cream ruled notebook paper, red margin line, single cobalt-blue ink with fine cross-hatch shading. A ring of six small folded paper chits arranged in a circle like a clock face, drawn with visible fold-crease lines; one chit in the circle is shown unfolded, revealing a hand-drawn five-point star inside it. A flat open hand enters from the right edge of the frame mid-slap toward the unfolded star chit, with short motion-trail lines behind it. Along the bottom edge, a simple terrace railing is sketched suggesting a rooftop setting; a plain outlined crescent moon sits in an upper corner. No color beyond cream paper and cobalt ink; no photographic elements.

### The rest of the catalog

| Game | Status | Signature object |
|---|---|---|
| Hand Cricket | already shipped | Bat + stumps + helmet — reference sheets exist already; treat them as the calibration standard, not a gap to fill. |
| Rock Paper Scissors | playable | A hand mid-gesture, three ways (fist, flat palm, two fingers), drawn as a triptych echoing the reference sheet's "3 fingers vs 4 fingers" coin-toss page. |
| UNO | playable | A single oversized action card (Draw Two / Reverse / Skip) with its symbol in outline hatching, plus a small fanned hand of cards. |
| Dots & Boxes | playable | The "maths-period nostalgia" grid of dots with one freshly-closed box doodled with a small triumphant flourish (a tiny star inside it). |
| Word Building | playable | Loose alphabet tiles scattered like Scrabble pieces, one row snapping into a real word with a hand-drawn teacher's tick above it. |
| Memory Match | coming soon | A pair of face-down cards, one just flipped mid-motion with a matching pair revealed beneath — the "aha" moment as the frozen frame. |
| Names Place Animal Thing | coming soon | A ruled notebook column sheet with the four category headers hand-lettered, one row mid-fill, a stopwatch racing beside it. |
| Tambola (Housie) | coming soon | A Tambola ticket grid with a few numbers circled, a cloth bag of numbered tokens beside it — a wedding-sangeet setting. |
| Samethalu Quiz | coming soon | A palm-leaf-style scroll with a half-finished Telugu proverb, a wise elder's walking stick leaning beside it — "Ammamma's verandah," drawn literally. |
| Telugu Cinema Quiz | coming soon | A hand-drawn film reel unspooling into a single filmstrip frame, a movie ticket stub tucked beside it — "Friday-release adda energy." |

---

## The illustration system, as one architecture

Every category below draws from the same ink, the same cast, and the same prop vocabulary catalogued at the top of this review — this is what makes it a system rather than fourteen unrelated commissions.

- **Primary illustrations** — Home hero, Games-catalog shelf, Lobby waiting scene, Game Over trophy scene. Full density, full cast, the pages this review treats in the most depth.
- **Secondary illustrations** — 404 porthole scene, Connecting-screen pencil loop, Name-entry background vignette. Real scenes, smaller stage, lower ink density.
- **Corner doodles** — One signature object per game (bat, dice, card fan, snake coil, star chit…), ≤64px, reserved for static chrome zones on gameplay boards and the room-creation sheet header. Never inside a live play surface.
- **Empty-state illustrations** — Empty chat bubble, "no bots yet" robot doodle, coming-soon shelf objects. Small, single-object, paired directly with existing copy rather than replacing it.
- **Waiting-state illustrations** — The Lobby scene (page 06) and the pass-the-phone hand-off illustration (page 10) — anywhere a player is blocked on another human, not on the network.
- **Loading illustrations** — The Connecting-screen pencil-loop only. Deliberately singular — one canonical loading motif reused everywhere, not one per screen.
- **Success / celebration illustrations** — The Game Over trophy + confetti-squiggle scene, with a per-game prop swap-in, matching the corner-doodle object for whichever game just ended.
- **Error illustrations** — Deliberately minimal. Room-error toasts and join-failure messages stay plain text. Illustration only enters where a failure is also a soft, whimsical dead-end (404), never where speed of comprehension matters (a live-room error mid-session).
- **Achievement illustrations** — Not yet a shipped feature (the Profile sheet already promises "Slam-Book Champion" badges as "coming soon") — reserve the trophy-and-star vocabulary now so badge art, when built, is a natural extension rather than a fourth visual language.
- **Background decorative elements** — Loose stars, circles, dashed motion trails, curly squiggles — the connective tissue used at low density across every illustration above so the page never feels like a sticker slapped onto blank UI.

---

## Production guardrails

Every commissioned asset above should be checked against this list before it ships.

- [ ] Matches the five existing illustrations — same ink, same paper, same cast, same prop vocabulary.
- [ ] Never sits behind or beside an interactive control at reduced tap-target clarity.
- [ ] Leaves the field of live play (Ludo board, Rummy felt, card hands) untouched — corner doodles only.
- [ ] Leaves enough surrounding whitespace to read as a notebook margin, not a filled page.
- [ ] Works at both the mobile card width (~340px) and the desktop max-width (~1080px) without cropping a carrier object's lettering illegibly.
- [ ] Reuses an existing object or cast member wherever plausible, rather than inventing a new one per screen.
- [ ] Carries its lettering (if any) on a drawn carrier — ribbon, sign, sticky note, tape — never as bare type over a scene.
- [ ] Has an explicit "why" tying it to a real user moment (onboarding, waiting, celebrating) — not decoration for its own sake.

---

*BHALYAM · Illustration System Review · prepared 2026-07-10*
