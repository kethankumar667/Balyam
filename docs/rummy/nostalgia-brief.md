# Bhalyam Rummy — Nostalgia Design Brief

The thing we are trying to make players feel: **"this is exactly how we used to play at home."**

Not "this is a slick rummy app." Not "this is the best rummy AI." A specific emotional memory — a Sunday afternoon, an aunt slapping a card down too hard, a grandfather counting points on the back of an electricity bill, a cousin who always forgets it's their turn.

## The single sentence

> Bhalyam Rummy is the family card table, hosted online. Soft lamp light, paper score sheet, cardamom tea getting cold next to the deck, and four people who love each other arguing about whether 7♠ counts.

Every design decision in this game answers to that sentence.

## Sensory anchors

When designers, illustrators, and AI agents make choices here, these are the references:

| Sense | Anchor |
|---|---|
| Sight | A worn wooden card table. Brass coin tray. A ruled notebook score sheet with names in someone's grandmother's handwriting. A single warm overhead bulb — not casino spotlights. Card backs that look hand-drawn (peacock motif, paisley, kolam pattern) rather than corporate-printed. |
| Sound | The shuffle. The slap. The "rummy!" call in a familiar voice — not an announcer. A kettle whistling in the next room between rounds. A ceiling fan. Distant kids. **Not** a casino jingle, not a slot-machine ding. |
| Touch | Cards that feel weighty when dragged — a subtle resistance, the way a stack of real cards has mass. Tap targets a thumb can hit while holding a tea cup. |
| Smell (suggested only) | Players will hear "fresh deck", "cardamom", "agarbatti", "monsoon evening" in our copy. Imagined smells are free and they land. |
| Time | The pace of family rummy: not blitz, not chess. Enough time between turns for someone to say "wait, who dealt?" |

## The five engagement pillars

Every roadmap task must serve at least one. If a proposed feature serves none, it does not belong in this product.

### 1. Ritual
The game has a *before*, a *middle*, and an *after*, and each part has its own small ceremony.
- Lobby = pulling out the cards. There should be shuffle sounds, the deck-cut animation, a "who's dealing?" moment.
- Mid-round = the rhythm of draw → discard → eye-roll at a cousin.
- Post-round = the score sheet being filled in. Not a flashy results screen. A pen moving on lined paper.

### 2. Belonging
The other players at the table are *yours*. Not opponents — your people.
- Bot names already feel like family (Anand, Babji, Chinna, Damodar, Eswari, Lakshmi). Lean further in: each has a tiny personality quirk, surfaced as a one-line "tell".
- Real player avatars optional but encouraged. Photo of the actual cousin > generated avatar.
- "Last played with" memory: when you start a new room, the app remembers your last gang.

### 3. Memory
The product remembers the moments that mattered.
- "You declared with a pure run on Sankranti night." Surface as a quiet card on the lobby screen, not a notification.
- Match history reads like a family photo album, not a leaderboard.
- Per-room name persists ("Friday Rummy Nights" — chosen once, used forever).

### 4. Storytelling
Microcopy is the secret weapon. Treat every empty state, every transition, every tooltip as a chance to feel warm.
- "Round 2 — top up your chai?" between rounds.
- "Pure sequence! Even Lakshmi would smile." when you declare cleanly.
- "Anand keeps too many jokers. Old habits." as a bot quirk surfaced in chat.

### 5. Stakes that feel real *without being real money*
Family rummy has stakes — pride, bragging rights, the elder who always wins. Recreate those, never with cash.
- Pool points, longest winning streak, "house champion" titles per room.
- A printable score sheet at the end of a long session. Yes — printable. Some uncle will print it.
- "Years of Friday Rummy Nights" — celebrate the **longevity of a friend group on Bhalyam**, not individual ranking.

## Voice & language

- Bilingual where natural. Telugu / Hindi / Tamil words can punctuate English copy (chai, joker, baazi, hath, dimaag, "rummy bola tha!"). Never forced, never decorative.
- Caveat (the handwriting font already in `tailwind.config.js`) is the score sheet voice. Use it for moments that should feel hand-written: declarations, end-of-round notes, the room name on the lobby header.
- Poppins is the system voice — buttons, modals, accessible defaults.
- Righteous (display) is for big celebratory beats only. Don't over-use.

## What "heart-touching" looks like in a feature decision

| Decision point | Wrong instinct | Brief-aligned instinct |
|---|---|---|
| End-of-round screen | Trophy + confetti + XP bar | Notebook page slides in. A pen draws the scores in handwriting. A tea-kettle sound. "Round 3 — same again?" |
| Bot makes a smart move | "Anand played optimally" toast | Nothing. He just played it. *We* don't break the immersion. |
| Player wins a long match | Casino chime + slot-machine numbers | Soft "rummy!" call in a familial voice. The score sheet flips, the winner's name circled in red pen. |
| Idle/AFK | Pulse + countdown timer | Subtle. A tea-cup icon. "Taking a sip? 8 seconds…" |
| Empty lobby | "0 players online" gloom | A printed invitation card. "Call your gang. They're probably free." with one-tap WhatsApp share. |

## The non-negotiables

1. **No money in or money out.** Ever. This is not a real-money rummy product. If a feature only makes sense as a monetisation hook, it doesn't ship.
2. **No dark patterns.** No "you'll lose your streak if you don't play today!" pressure. The game is here when you are; it doesn't beg.
3. **No leaderboard shame.** A losing streak should feel like a normal Sunday, not a wall of red.
4. **Accessibility is part of nostalgia.** Grandparents play this game. Large-text mode, high-contrast mode, optional voice narration of "your hand" and "discard pile". This is not optional polish — it's the whole point.
5. **Don't break what already works.** The existing Rummy engine, the desktop/mobile split, the in-game scorecard math — they're working. The roadmap *layers* nostalgia over them; it does not rewrite them.
