# Volume 04 — Official Rulebook & House Rules Manual

## Project: UNO Reimagined (Working Title)

**Version:** 1.0
**Document Type:** Official Rulebook & House Rules Manual (RHM)
**Status:** Approved (Draft v1.0)
**Audience:** Product Managers, Game Designers, UX Designers, QA Engineers, Developers, Community Managers, Tournament Organizers

---

# 1. Document Purpose

This document defines the official gameplay rules for UNO Reimagined. It establishes the standard rules that every public match follows while also documenting optional house rules available in custom rooms.

The primary objectives are:

* Ensure fair and consistent gameplay.
* Eliminate ambiguity.
* Support casual and competitive play.
* Allow private rooms to customize gameplay without affecting ranked integrity.
* Provide a single source of truth for all rule-related decisions.

---

# 2. Rule Philosophy

Every rule should satisfy four principles:

1. **Easy to Learn** – New players should understand the rule quickly.
2. **Fair to Everyone** – No player should gain an unfair advantage.
3. **Consistent** – The same situation must always produce the same outcome.
4. **Enjoyable** – Rules should create exciting decisions rather than unnecessary complexity.

---

# 3. Official Match Settings (Default)

Unless changed in a private room, every public match uses the following settings:

| Setting         | Default            |
| --------------- | ------------------ |
| Starting Cards  | 7                  |
| Deck            | Standard 108 Cards |
| Turn Timer      | 20 Seconds         |
| Official Rules  | Enabled            |
| House Rules     | Disabled           |
| Ranked Eligible | Yes                |
| Spectators      | Disabled           |
| Chat            | Enabled            |
| Emotes          | Enabled            |

---

# 4. Objective

The objective is simple:

> Become the first player to discard every card in your hand.

Winning requires both strategy and timing.

---

# 5. Players

Supported player counts:

* 2 Players
* 3 Players
* 4 Players
* 5 Players
* 6 Players (Custom)
* 8 Players (Party Mode)

Recommended competitive format:

4 Players

---

# 6. Deck Composition

The standard deck contains **108 cards**.

### Number Cards

Four colors:

* Red
* Blue
* Green
* Yellow

Each color contains:

* One 0
* Two copies of numbers 1–9

---

### Action Cards

Each color includes:

* Skip ×2
* Reverse ×2
* Draw Two ×2

---

### Wild Cards

* Wild ×4
* Wild Draw Four ×4

---

# 7. Starting the Match

Every player receives:

**7 cards**

The remaining cards form the Draw Pile.

One card is placed face up to create the Discard Pile.

The player selected to start takes the first turn.

---

# 8. Choosing the First Player

The first player may be determined by:

* Random selection (default)
* Host selection (private room only)
* Previous round winner (optional)

Random selection is recommended for fairness.

---

# 9. Valid Card Play

A player may play a card if it matches at least one of the following:

* Current color
* Current number
* Current action symbol
* Wild card

Otherwise, the player must draw according to the active ruleset.

---

# 10. Drawing Cards

When no valid card exists:

Player draws one card.

If the drawn card is playable:

Official Rule:

Player **may** immediately play it.

Otherwise:

Turn ends.

---

# 11. Number Cards

Number cards have no additional effects.

They simply change the current number while maintaining the current color.

---

# 12. Skip Card

Effect:

The next player's turn is skipped.

Sequence:

```text
Player A

↓

Skip

↓

Player B skipped

↓

Player C
```

---

# 13. Reverse Card

Effect:

The direction of play changes.

Example:

Clockwise

↓

Counter-Clockwise

In two-player matches:

Reverse behaves exactly like Skip.

---

# 14. Draw Two

Effect:

The next player:

* Draws two cards.
* Loses their turn.

The affected player cannot avoid the penalty under official rules.

---

# 15. Wild Card

Effect:

Current player chooses any color.

Play continues using the selected color.

Wild cards may always be played.

---

# 16. Wild Draw Four

Official Rule:

A Wild Draw Four may only be played when the current player has **no card matching the active color**.

After playing:

* Next player draws four cards.
* Next player loses their turn.
* Current player chooses the next color.

---

# 17. Wild Draw Four Challenge

The challenged player must prove that they played the card legally.

### If the challenge succeeds

The player who played the Wild Draw Four:

* Draws four penalty cards.

The challenger keeps their turn.

---

### If the challenge fails

The challenger:

Draws six cards instead.

This discourages unnecessary challenges.

---

# 18. Declaring UNO

When holding exactly one card:

Player must declare UNO before the next player begins their turn.

Failure to declare:

If another player notices first:

Penalty:

Draw two cards.

---

# 19. Winning

A player wins immediately after successfully discarding their final card.

The round ends.

Statistics are calculated.

Rewards are distributed.

---

# 20. Score Calculation (Optional)

Remaining cards held by opponents determine the winner's score.

| Card           | Points     |
| -------------- | ---------- |
| Number         | Face Value |
| Skip           | 20         |
| Reverse        | 20         |
| Draw Two       | 20         |
| Wild           | 50         |
| Wild Draw Four | 50         |

---

# 21. Draw Pile Exhaustion

If the Draw Pile becomes empty:

1. Keep the top Discard Pile card.
2. Shuffle all remaining discard cards.
3. Create a new Draw Pile.

Gameplay continues without interruption.

---

# 22. Turn Timeout

If the timer reaches zero:

Official behavior:

* Player automatically draws.
* If no playable card exists, turn ends.

Private rooms may enable automatic play.

---

# 23. Disconnect Rules

Temporary disconnect:

Player has a grace period to reconnect.

If reconnection fails:

Behavior depends on room type.

Casual:

AI may replace the player.

Ranked:

Player forfeits after timeout.

---

# 24. Leaving Mid-Match

Casual:

No ranking penalty.

Ranked:

Loss recorded.

Temporary matchmaking restrictions may apply for repeated offenses.

---

# 25. Spectator Rules

Spectators:

Cannot

* Chat with players during competitive matches.
* Reveal hidden cards.
* Influence gameplay.

Spectators may:

* Watch.
* React.
* View public information.

---

# 26. Private Room Permissions

Room Host controls:

* Start match
* Kick player
* Change settings
* Enable house rules
* Add AI
* Transfer host
* Invite players

---

# 27. Official Rule Priority

When multiple effects occur simultaneously:

Priority order:

1. Winning Condition
2. Draw Penalties
3. Skip Effects
4. Reverse Effects
5. Color Selection
6. Turn Transfer

This guarantees consistent outcomes.

---

# 28. House Rules Overview

House Rules are available only in private rooms by default.

Ranked matches always use Official Rules.

Each House Rule is individually configurable.

---

# 29. Stack Draw Cards

Status:

Optional

Description:

Players may stack:

* Draw Two
* Wild Draw Four (configurable)

Example:

```text
A → Draw Two

↓

B → Draw Two

↓

C draws four
```

Host may choose whether different draw cards can be mixed.

---

# 30. Jump-In

Status:

Optional

If a player holds an identical card matching the top discard exactly:

They may play immediately,

Even when it is not their turn.

Play order continues from the player who jumped in.

---

# 31. Seven Swap

Status:

Optional

Playing a Seven:

Player exchanges hands with another player.

Host selects:

* Random target
* Player choice

---

# 32. Zero Rotate

Status:

Optional

Playing Zero:

All players rotate hands.

Rotation direction follows current gameplay direction.

---

# 33. Keep Drawing

Status:

Optional

Instead of drawing one card,

Player continues drawing until a playable card appears.

Common family rule.

Not recommended for competitive play.

---

# 34. Force Play

Status:

Optional

If the drawn card is playable:

It is automatically played.

No manual decision.

Recommended for faster matches.

---

# 35. Unlimited Thinking Time

Status:

Optional

Turn timer disabled.

Recommended only for casual games.

---

# 36. Instant Start

Status:

Optional

Lobby countdown removed.

Game begins immediately after all players are ready.

---

# 37. Hidden Hand Count

Status:

Optional

Opponent hand sizes are hidden.

Creates additional uncertainty.

---

# 38. Multi-Round Matches

Status:

Optional

Instead of one round:

Play:

* Best of 3
* Best of 5
* First to Score Limit

Suitable for tournaments.

---

# 39. Tournament Rules

Official tournaments always use:

* Standard deck
* Official rules
* No house rules
* Fixed turn timer
* Ranked scoring
* Disconnect policy
* Standard penalties

Competitive integrity always takes priority.

---

# 40. Invalid Actions

Players cannot:

* Play invalid cards.
* Skip mandatory draws.
* Change colors without Wild cards.
* Declare UNO with multiple cards.
* Cancel completed actions.

Invalid actions should be prevented rather than corrected later.

---

# 41. Frequently Asked Questions

### Can I play a Wild at any time?

Yes.

---

### Can I stack Draw Two cards?

Only if the room enables stacking.

---

### Can I challenge every Wild Draw Four?

Yes.

Whether the challenge succeeds depends on the previous player's hand.

---

### What happens if I disconnect?

You have a limited time to reconnect.

---

### Can I undo my move?

No.

Moves are final.

---

### Can I play after drawing?

Only if the drawn card is playable.

Official settings determine whether this is optional or automatic.

---

# 42. Rule Configuration Matrix

| Rule           | Casual   | Ranked | Tournament | Private  |
| -------------- | -------- | ------ | ---------- | -------- |
| Official Rules | Yes      | Yes    | Yes        | Optional |
| Stacking       | Optional | No     | No         | Yes      |
| Jump-In        | Optional | No     | No         | Yes      |
| Seven Swap     | Optional | No     | No         | Yes      |
| Zero Rotate    | Optional | No     | No         | Yes      |
| Force Play     | Optional | No     | No         | Yes      |
| Keep Drawing   | Optional | No     | No         | Yes      |

---

# 43. Rule Design Philosophy

Official rules should prioritize:

* Fairness
* Predictability
* Competitive integrity

House rules should prioritize:

* Creativity
* Fun
* Replayability
* Social interaction

Separating these philosophies allows both casual and competitive audiences to enjoy the game without compromise.

---

# 44. Rule Validation Checklist

Before introducing a new rule, evaluate:

* Is it easy to explain?
* Does it improve enjoyment?
* Does it remain fair?
* Does it avoid unnecessary complexity?
* Does it create strategic decisions?
* Is it suitable for public matchmaking?
* Does it fit the product vision?

Only rules that satisfy these criteria should be considered for inclusion.

---

# 45. Summary

This Rulebook & House Rules Manual defines the complete rule framework for UNO Reimagined. It distinguishes between official gameplay and optional customizations, ensuring that public and competitive matches remain fair while allowing private games to embrace creativity and personal preferences.

By documenting rule priorities, edge cases, configurable options, and tournament standards, this manual serves as the authoritative reference for gameplay consistency across all game modes. It complements the Product Vision, Game Design, and UX documents, providing the foundation for future expansions, additional game variants, and competitive events.
