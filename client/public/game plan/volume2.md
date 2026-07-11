# Volume 02 — Complete Game Design Document (GDD)

## Project: UNO Reimagined (Working Title)

**Version:** 1.0
**Document Type:** Game Design Document (GDD)
**Status:** Approved (Draft v1.0)
**Audience:** Product Managers, Game Designers, UI/UX Designers, QA, Developers, Artists

---

# 1. Purpose

This document defines the complete gameplay design for the product. It establishes how a match begins, progresses, and ends, while documenting every player interaction, game state, rule, and gameplay scenario.

The objective is to ensure that every player experiences a game that is fair, intuitive, engaging, and consistent.

This document intentionally focuses on **gameplay design** rather than technical implementation.

---

# 2. Core Gameplay Philosophy

The game should always feel:

* Easy to learn
* Fast to start
* Strategic to master
* Fair to compete
* Exciting until the final card

Players should never feel overwhelmed by complexity, yet experienced players should always have opportunities to outplay opponents through better decisions.

---

# 3. Core Gameplay Loop

The entire product revolves around a simple but highly replayable gameplay loop.

```text
Launch Game
      ↓
Choose Game Mode
      ↓
Find or Create Match
      ↓
Join Lobby
      ↓
Prepare Match
      ↓
Play Match
      ↓
Match Ends
      ↓
Rewards & Statistics
      ↓
Play Again / Exit
```

Every screen and feature should support this loop without introducing unnecessary friction.

---

# 4. Match Lifecycle

A complete match consists of the following stages.

| Stage          | Description                                  |
| -------------- | -------------------------------------------- |
| Match Creation | Room is created or matchmaking begins        |
| Lobby          | Players join and configure the match         |
| Countdown      | Cards are shuffled and dealt                 |
| Gameplay       | Players take turns until a winner emerges    |
| Round End      | Winner is declared and scores are calculated |
| Results        | Statistics and rewards are displayed         |
| Post Match     | Players choose to rematch or leave           |

---

# 5. Game Modes

## Practice

Purpose:

* Learn mechanics
* Test strategies
* No rewards
* No pressure

Ideal for first-time players.

---

## AI Match

Purpose:

* Practice against computer-controlled opponents.
* Adjustable difficulty.
* Supports experimentation with custom rules.

---

## Casual Match

Purpose:

* Relaxed multiplayer.
* No ranking changes.
* Ideal for short sessions.

---

## Ranked Match

Purpose:

* Competitive gameplay.
* Skill-based matchmaking.
* Seasonal progression.
* Higher stakes.

---

## Private Room

Purpose:

* Play with invited friends.
* Full control over room settings.
* Customizable house rules.

---

## Party Mode

Purpose:

* Chaotic, social gameplay.
* Optional modifiers and fun rule combinations.
* Not ranked.

---

# 6. Match Configuration

Room hosts may configure:

* Number of players
* Public or private visibility
* Turn timer
* AI fill
* Official rules only
* House rules
* Spectator permission
* Room name
* Room code

---

# 7. Match Start Sequence

To build anticipation, the game should follow a consistent opening sequence:

1. Players enter the lobby.
2. All participants indicate readiness.
3. A short countdown begins.
4. The deck is shuffled.
5. Cards are dealt with animation.
6. A starting card is revealed.
7. The first player is selected.
8. Gameplay begins.

The opening should feel ceremonial rather than abrupt.

---

# 8. Core Objective

The primary objective is to become the first player to discard all cards from their hand.

Secondary objectives include:

* Minimizing penalty cards.
* Managing hand composition.
* Predicting opponents' options.
* Controlling game flow through action cards.

---

# 9. Official Deck Composition

The standard deck contains **108 cards**.

| Card Type      | Quantity |
| -------------- | -------- |
| Number Cards   | 76       |
| Skip           | 8        |
| Reverse        | 8        |
| Draw Two       | 8        |
| Wild           | 4        |
| Wild Draw Four | 4        |

---

# 10. Starting the Match

Each player receives **7 cards**.

The remaining cards form the draw pile.

The top card is revealed to begin the discard pile.

If the revealed card is not a valid starting card according to the selected rules, another card is drawn until a valid starting card is found.

---

# 11. Turn Lifecycle

Every turn follows the same sequence.

1. Active player is highlighted.
2. Playable cards are visually indicated.
3. Turn timer begins.
4. Player chooses an action.
5. Action resolves.
6. Game state updates.
7. Turn passes to the next player.

---

# 12. Player Actions

During a turn, a player may:

* Play a valid card.
* Draw one card.
* Play the drawn card if eligible.
* End the turn if no playable card exists.
* Declare UNO when holding one card.
* React using non-intrusive emotes (where enabled).

Only one primary gameplay action is permitted per turn unless modified by a specific card effect.

---

# 13. Card Play Rules

A card is playable if it matches at least one of the following:

* Color
* Number
* Action symbol
* Wild card

If no playable card exists, the player must draw according to the selected ruleset.

---

# 14. Card Behaviors

## Number Cards

* Continue normal gameplay.
* No additional effects.

---

## Skip

Effect:

The next player's turn is skipped.

---

## Reverse

Effect:

The direction of play changes.

In a two-player game, Reverse functions as a Skip.

---

## Draw Two

Effect:

The next player draws two cards and loses their turn.

---

## Wild

Effect:

Current player chooses the next active color.

---

## Wild Draw Four

Effect:

* Current player chooses a color.
* Next player draws four cards.
* Next player loses their turn.

Official restrictions apply regarding when this card may be played.

---

# 15. Turn Timer

Each turn has a configurable time limit.

If the timer expires:

1. Player automatically draws.
2. If the drawn card is playable, it is played automatically (optional rule).
3. Otherwise, the turn ends.

This prevents unnecessary delays.

---

# 16. UNO Declaration

When a player has one remaining card, they must declare "UNO."

Successful declaration:

* No penalty.

Failure to declare before another player notices:

* Draw two penalty cards.

The declaration should be treated as a key gameplay moment.

---

# 17. Winning the Round

A round ends immediately when a player has no remaining cards.

The winner receives:

* Victory recognition
* Statistics update
* Progress rewards
* Ranking changes (if applicable)

---

# 18. Scoring System

When score-based play is enabled:

| Card           | Points     |
| -------------- | ---------- |
| Number Cards   | Face Value |
| Skip           | 20         |
| Reverse        | 20         |
| Draw Two       | 20         |
| Wild           | 50         |
| Wild Draw Four | 50         |

Remaining cards in opponents' hands determine the winner's score.

---

# 19. Match End Flow

The conclusion of a match should feel rewarding.

Sequence:

1. Winning animation.
2. Final standings.
3. Statistics.
4. Rewards.
5. Progress updates.
6. Rematch voting.
7. Return to lobby or home.

---

# 20. Game States

| State        | Description                                               |
| ------------ | --------------------------------------------------------- |
| Idle         | Waiting for player input                                  |
| Matchmaking  | Searching for opponents                                   |
| Lobby        | Waiting for players                                       |
| Countdown    | Preparing game                                            |
| Playing      | Active gameplay                                           |
| Paused       | Temporary interruption (private rooms only, if supported) |
| Reconnecting | Player attempting to return                               |
| Results      | Match complete                                            |

---

# 21. Player States

Each player may be in one of the following states:

* Ready
* Thinking
* Playing
* Drawing
* Choosing Color
* Declaring UNO
* Disconnected
* Reconnecting
* Finished

The UI should communicate these states clearly to all participants.

---

# 22. Multiplayer Behaviour

The multiplayer experience should emphasize:

* Fair turn order
* Clear visual indicators
* Minimal waiting
* Smooth synchronization
* Immediate feedback
* Graceful handling of disconnects

Players should always know:

* Whose turn it is.
* What action just occurred.
* What changed.

---

# 23. AI Behaviour

AI opponents should feel believable rather than mechanical.

Behavior should include:

* Playing valid cards consistently.
* Choosing colors based on hand composition.
* Prioritizing advantageous action cards.
* Occasionally making imperfect decisions at lower difficulties.
* Acting with realistic delays to mimic human thinking.

The goal is to create opponents that are enjoyable to play against rather than artificially difficult.

---

# 24. House Rule Framework

Private rooms may optionally enable additional rules such as:

| Rule             | Description                                     |
| ---------------- | ----------------------------------------------- |
| Stack Draw Cards | Combine Draw Two and/or Draw Four penalties     |
| Jump-In          | Play identical cards out of turn                |
| Seven Swap       | Swap hands with another player                  |
| Zero Rotate      | Rotate all hands                                |
| Keep Drawing     | Continue drawing until a playable card is found |
| Force Play       | Automatically play a drawn card if possible     |

Each rule should be independently configurable.

---

# 25. Edge Cases

The game must define expected behavior for uncommon situations.

Examples include:

* Player disconnects during their turn.
* Player leaves after declaring UNO.
* Draw pile becomes empty.
* Simultaneous UNO declarations.
* Timer expires while selecting a Wild color.
* Host leaves a private room.
* Last card played is an action card.

These scenarios should always resolve predictably and consistently.

---

# 26. Match Statistics

The game should record meaningful data for each completed match.

Examples include:

* Winner
* Match duration
* Total turns
* Cards played
* Cards drawn
* Action cards used
* Wild cards played
* UNO declarations
* Successful challenges
* Longest turn
* Fastest turn
* Average decision time

These statistics provide value for players and future balancing efforts.

---

# 27. Player Experience Goals

Throughout gameplay, the player should experience:

| Phase       | Intended Feeling |
| ----------- | ---------------- |
| Match Found | Excitement       |
| Lobby       | Anticipation     |
| Card Deal   | Immersion        |
| Early Game  | Exploration      |
| Mid Game    | Strategy         |
| UNO Moment  | Tension          |
| Final Turns | Suspense         |
| Victory     | Celebration      |
| Defeat      | Motivation       |

The emotional pacing of a match is as important as its mechanical balance.

---

# 28. Design Principles Checklist

Every gameplay feature should satisfy the following questions:

* Does it keep the game easy to understand?
* Does it create meaningful decisions?
* Does it maintain a reasonable pace?
* Does it avoid unnecessary downtime?
* Does it reward strategic thinking?
* Does it produce satisfying moments?
* Does it support both casual and competitive play?
* Does it preserve fairness?

If the answer to these questions is consistently "yes," the feature aligns with the product vision.

---

# 29. Summary

This Game Design Document establishes the foundational gameplay systems for the product. It defines how matches are structured, how players interact with the game, how rules are applied, and what emotional experience each stage of a match should deliver.

Subsequent documents will expand upon this foundation by detailing the complete user experience, progression systems, engagement strategies, competitive design, moderation policies, and interaction guidelines. Together, these documents form a comprehensive blueprint for creating a polished, replayable, and player-focused digital UNO experience.
