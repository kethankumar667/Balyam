# Snake Game Design Document (GDD)

**Project:** Bhalyam Retro Collection
**Game:** Snake (Classic Nokia Edition)
**Document Version:** 1.0
**Status:** Draft
**Classification:** Internal Product & Design Document

---

# 1. Document Control

## 1.1 Purpose

This document defines the complete vision, gameplay, player experience, production plan, quality expectations, and release criteria for **Snake (Classic Nokia Edition)** within the Bhalyam platform.

It serves as the single source of truth for everyone involved in the project, including Product Managers, Game Designers, UI/UX Designers, Engineers, Artists, Sound Designers, QA Engineers, and future contributors.

This document intentionally focuses on **what should be built** and **why**, rather than **how it will be implemented**. Technical architecture, engine design, APIs, and code-level decisions are documented separately.

---

## 1.2 Objectives

The primary objective is to recreate the nostalgic Nokia Snake experience with the highest practical level of gameplay fidelity while ensuring the game feels natural on modern desktop and mobile devices.

The game should evoke the same emotions players experienced on Nokia phones:

* Simple to learn
* Difficult to master
* Extremely responsive
* Highly replayable
* Instantly recognizable
* Free from unnecessary distractions

Players should feel that they are playing **the Snake they remember**, not a modern reinterpretation.

---

## 1.3 Audience

This document is intended for:

| Role            | Purpose                            |
| --------------- | ---------------------------------- |
| Product Manager | Scope, priorities, milestones      |
| Game Designer   | Gameplay rules and balancing       |
| UX Designer     | User flows and interactions        |
| UI Designer     | Interface and visual hierarchy     |
| Developers      | Functional requirements            |
| QA              | Acceptance criteria and validation |
| Artists         | Asset planning                     |
| Sound Designer  | Audio requirements                 |
| Project Manager | Production planning                |

---

## 1.4 Guiding Principle

Whenever a decision must be made between:

* Modern convenience
* Original gameplay authenticity

**Original gameplay authenticity takes priority**, provided it does not create accessibility or usability issues on current devices.

Modern improvements should be optional rather than replacing the classic experience.

---

# 2. Executive Summary

## 2.1 Game Overview

Snake is one of the most recognizable mobile games ever created. Its elegance comes from a very small rule set that creates deep mastery through increasing difficulty.

The player controls a continuously moving snake that grows in length after consuming food. As the snake becomes longer, maneuvering through the available space becomes increasingly difficult. The game ends when the snake collides with itself or another terminating obstacle, depending on the selected mode.

Despite its simplicity, Snake remains one of the best examples of minimalist game design because every movement carries consequence. The game rewards planning, pattern recognition, and spatial awareness rather than reflexes alone.

Within Bhalyam, Snake represents the entry point into the Retro Collection and establishes the standard for authenticity across all recreated Nokia titles.

---

## 2.2 Vision Statement

> **Deliver the definitive browser-based recreation of Nokia Snake that faithfully preserves its gameplay, pacing, and nostalgic identity while providing a polished experience on modern devices.**

This vision has four pillars:

* Authentic gameplay
* Instant accessibility
* High replay value
* Long-term maintainability

---

## 2.3 Project Goals

### Primary Goals

* Recreate the classic Nokia Snake experience.
* Preserve original gameplay mechanics.
* Ensure controls feel responsive and predictable.
* Support both desktop and mobile devices.
* Integrate seamlessly with the Bhalyam platform.
* Maintain deterministic gameplay behavior.
* Achieve smooth performance on low-end devices.
* Encourage repeated play through mastery rather than artificial rewards.

### Secondary Goals

* Offer optional nostalgic presentation modes (e.g., monochrome display).
* Support cloud-based high scores.
* Provide achievements and statistics.
* Allow future expansion without changing the core gameplay.

---

## 2.4 Success Metrics

The project will be considered successful if it meets the following measurable criteria:

### Gameplay Fidelity

* Players familiar with the original Nokia Snake recognize the gameplay immediately.
* Movement, pacing, and difficulty closely resemble the original experience.
* No gameplay mechanic feels unintentionally modernized.

### Performance

* Stable frame rate on supported devices.
* Fast loading time.
* Minimal battery impact on mobile devices.
* Consistent input responsiveness.

### User Experience

* Players can start a new game within a few seconds.
* Controls are intuitive without requiring a tutorial.
* Menus remain lightweight and unobtrusive.
* Gameplay remains the primary focus.

### Quality

* No game-breaking defects.
* No soft locks.
* Reliable save and resume behavior.
* Consistent behavior across supported browsers.

---

## 2.5 Project Scope

### Included

* Classic Snake gameplay.
* Multiple display modes (Classic, Color, Modern).
* Desktop and mobile controls.
* Pause and resume.
* High scores.
* Statistics.
* Settings.
* Achievements.
* Offline gameplay.
* Cloud synchronization (where supported by the platform).
* Accessibility options.
* Performance optimization.
* Comprehensive QA validation.

### Not Included (Version 1)

* Multiplayer gameplay.
* Level editor.
* Custom game rules.
* Community-created content.
* Online tournaments.
* Cosmetic purchases.
* Time-limited events.

These may be evaluated in future releases but are intentionally excluded to maintain focus on recreating the original experience.

---

# 3. History of Nokia Snake

## 3.1 Historical Background

Snake is one of the earliest and most influential mobile games in history. While the concept predates Nokia, it became globally recognized through its inclusion on Nokia mobile phones during the late 1990s and early 2000s. Millions of users experienced Snake as one of their first interactive mobile games, making it a defining part of early mobile gaming culture.

Its success came not from graphical complexity but from elegant design. The game required minimal hardware resources, simple controls, and offered endless replayability through increasingly challenging gameplay.

For many players, Snake was more than a game—it was a shared cultural experience that introduced mobile gaming to an entire generation.

---

## 3.2 Why Snake Became Iconic

Several factors contributed to Snake's enduring popularity:

* Immediate accessibility with no learning curve.
* Simple, deterministic rules that rewarded skill.
* Short play sessions suitable for mobile use.
* Increasing tension as the snake grew longer.
* Consistent controls that felt reliable.
* Broad availability across Nokia devices.

Its design demonstrates that compelling gameplay does not require complex mechanics. Instead, it relies on clarity, predictability, and meaningful player decisions.

---

## 3.3 Design Principles Worth Preserving

The recreation should preserve the following characteristics:

* Simplicity over feature overload.
* Skill-based progression.
* Predictable behavior.
* Immediate responsiveness.
* Minimal visual distractions.
* Short, replayable sessions.
* Increasing challenge driven by player success rather than randomness.

# Snake Game Design Document (GDD)

## 4. Reverse Engineering & Authenticity Strategy

### 4.1 Purpose

The primary objective of this project is **not to build another Snake game**, but to preserve and faithfully recreate the experience of the classic Nokia version.

The success of this project will be measured by how closely it reproduces the original gameplay rather than how many new features it introduces.

Whenever there is uncertainty, decisions should favor **player memory and gameplay authenticity** over modern design trends.

---

## 4.2 Authenticity Philosophy

This project follows four guiding principles.

### Preserve the Feel

Players may not consciously remember every detail of Nokia Snake, but they remember how it **felt**.

Examples include:

* Predictable movement
* Responsive turning
* Gradually increasing tension
* Satisfaction when collecting food
* Anxiety as the snake grows longer
* Short but addictive gameplay sessions

The recreation must preserve these emotional qualities.

---

### Preserve the Rules

Core mechanics should remain unchanged.

Examples:

* Continuous movement
* Grid-based navigation
* No diagonal movement
* Snake grows after eating food
* No arbitrary power-ups
* No unnecessary animations
* No artificial difficulty spikes

---

### Preserve the Simplicity

The original Snake succeeded because it was intentionally minimal.

The recreation should avoid introducing unnecessary systems such as:

* RPG mechanics
* Inventory systems
* Loot boxes
* Character upgrades
* Daily rewards that interrupt gameplay
* Complex tutorials

The player's focus should always remain on controlling the snake.

---

### Preserve the Pace

One of Snake's defining characteristics is its rhythm.

The game naturally progresses from:

Calm → Focus → Pressure → Panic → Failure

This emotional progression must remain intact.

---

## 4.3 Sources of Reference

To maximize authenticity, development should rely on multiple sources rather than memory alone.

Reference hierarchy:

### Tier 1 (Highest Confidence)

* Original Nokia devices
* User manuals
* Official screenshots
* Official promotional material

---

### Tier 2

* Hardware recordings
* Gameplay videos captured from original devices
* Device emulator comparisons

---

### Tier 3

* Community documentation
* Reverse engineering notes
* Preservation projects
* Historical discussions

---

### Tier 4

Player recollections.

Useful for understanding emotional experience but should never override verified gameplay behavior.

---

## 4.4 Reverse Engineering Process

Each gameplay mechanic should be studied individually rather than recreated by assumption.

Every mechanic should follow this workflow:

Research

↓

Observe

↓

Document

↓

Compare

↓

Prototype

↓

Validate

↓

Approve

Only after validation should the mechanic become part of production.

---

## 4.5 Gameplay Fidelity Levels

Every recreated mechanic should be classified according to confidence.

### Level A — Verified

Confirmed through direct observation or official material.

Examples:

* Grid movement
* Snake growth
* Direction rules

These should be recreated exactly.

---

### Level B — Highly Confident

Supported by multiple independent references.

Examples:

* Speed progression
* Initial snake size
* Score progression

These should closely match observed behavior.

---

### Level C — Inferred

No definitive evidence exists.

The behavior should be reconstructed logically while documenting assumptions.

---

## 4.6 Browser Constraints

The browser environment differs significantly from Nokia hardware.

Some characteristics cannot be reproduced exactly.

Examples include:

### Display

Original LCD displays had:

* Ghosting
* Slow refresh
* Pixel bleed
* Uneven contrast

Modern browsers render sharply.

Solution:

Offer optional visual filters while keeping gameplay unchanged.

---

### Audio

Original Nokia speakers produced distinctive tones.

Browser audio hardware varies by device.

Goal:

Capture the character of the sounds rather than the exact waveform.

---

### Timing

Original phones ran on fixed hardware.

Browsers execute on devices with varying refresh rates and performance.

Solution:

Use deterministic simulation independent of rendering speed.

---

### Input

Physical keypads had:

* Fixed travel distance
* Tactile feedback
* Consistent latency

Touchscreens behave differently.

The recreation should prioritize responsiveness while acknowledging these differences.

---

## 4.7 Modern Improvements Policy

Modern improvements are allowed only if they satisfy all of the following:

* Do not change gameplay.
* Can be disabled.
* Improve accessibility or usability.
* Preserve nostalgia.

Examples:

✔ Color themes

✔ Fullscreen support

✔ Haptic feedback

✔ Accessibility scaling

✔ Controller support

Examples that should NOT be included:

✘ Power-ups

✘ New enemies

✘ Endless cosmetic effects

✘ Skill trees

✘ Battle Passes

✘ Energy systems

---

## 4.8 Authenticity Checklist

Before release, every build should answer the following questions.

### Gameplay

* Does movement feel identical?
* Does turning behave correctly?
* Does growth occur at the correct time?
* Does collision match expectations?
* Does difficulty increase naturally?

---

### Visual

* Are proportions correct?
* Is the grid accurate?
* Are sprites recognizable?
* Does scaling preserve pixel sharpness?

---

### Audio

* Do sounds evoke the original experience?
* Is latency low?
* Are sounds consistent across devices?

---

### UX

* Can a player begin within seconds?
* Are menus simple?
* Does nothing interrupt gameplay?

---

### Emotional

The final and most important validation question:

> **"If someone who spent hundreds of hours playing Snake on a Nokia phone picks up this version, will they immediately feel at home?"**

If the answer is **no**, the feature requires further refinement.

---

# 5. Product Vision

## 5.1 Vision Statement

Snake is more than a retro game; it is a cultural icon that introduced millions of people to mobile gaming. Within Bhalyam, Snake will serve as the cornerstone of the Retro Collection, demonstrating that timeless gameplay can remain engaging across generations.

The vision is to create a version that feels instantly familiar to returning players while remaining approachable for newcomers. Every design decision should reinforce the game's identity as a minimalist, skill-based experience where mastery comes from practice rather than progression systems.

---

## 5.2 Product Goals

The product has six primary goals:

1. **Authenticity** — Faithfully recreate the classic Nokia experience.
2. **Accessibility** — Ensure anyone can understand and start playing within moments.
3. **Replayability** — Encourage repeated sessions through intrinsic challenge.
4. **Reliability** — Deliver consistent behavior across supported devices and browsers.
5. **Integration** — Fit naturally within the broader Bhalyam platform without losing its standalone identity.
6. **Longevity** — Build a version that can be maintained and enjoyed for years without relying on short-lived engagement mechanics.

---

## 5.3 Product Principles

Every feature must align with these principles:

* Gameplay First
* Simplicity Over Complexity
* Nostalgia Without Friction
* Skill Over Randomness
* Consistency Over Novelty
* Respect the Original

Any proposed feature that conflicts with these principles should be carefully evaluated and, if necessary, deferred or rejected.

---

# 6. Experience Goals

The player's experience should evolve through distinct emotional stages:

1. **Curiosity** — "This looks like the Snake I remember."
2. **Comfort** — "The controls feel natural."
3. **Focus** — "I need to plan my next move."
4. **Tension** — "Space is running out."
5. **Satisfaction** — "I beat my previous score."
6. **Replay** — "Just one more game."

The game should create a seamless loop where players are naturally motivated to replay based on self-improvement rather than external rewards.

---

# 7. Target Audience

## Primary Audience

* Adults who played Nokia phones during the late 1990s and early 2000s.
* Players seeking nostalgic experiences.
* Casual gamers looking for short, engaging sessions.

## Secondary Audience

* Younger players discovering classic games for the first time.
* Families sharing retro gaming experiences.
* Mobile users seeking lightweight entertainment.

---

# 8. Player Personas

### Persona 1: The Nostalgic Player

* Age: 30–50
* Motivation: Relive childhood memories.
* Expectations: Authentic gameplay, familiar presentation, minimal distractions.

### Persona 2: The Casual Player

* Age: Any
* Motivation: Quick entertainment during short breaks.
* Expectations: Fast loading, simple controls, no learning curve.

### Persona 3: The Completionist

* Age: Any
* Motivation: Achieve high scores, unlock achievements, master the game.
* Expectations: Reliable statistics, challenging gameplay, fair progression.

---

# 9. Core Experience Pillars

The game should consistently reinforce these pillars:

1. **Authenticity** — Respect the original experience.
2. **Responsiveness** — Immediate and predictable controls.
3. **Clarity** — Simple interface and understandable rules.
4. **Challenge** — Difficulty emerges from player success.
5. **Replayability** — Every session encourages another attempt.

These pillars should guide all future design decisions and serve as a benchmark during feature reviews.

---

# 10. Gameplay Philosophy

Snake demonstrates that compelling gameplay can arise from a small set of well-crafted rules. The design philosophy is to maintain that elegance by ensuring every action has clear consequences and every failure feels fair.

The game should never rely on randomness to create difficulty. Instead, it should reward planning, spatial awareness, and disciplined movement. As the snake grows, the player's own decisions naturally create increasingly complex scenarios.

Every session should feel like a conversation between the player and the game: the rules remain constant, but the challenge evolves through the player's choices.

# Snake Game Design Document (GDD)

# 11. Core Gameplay Loop

## 11.1 Purpose

The gameplay loop defines the continuous cycle that keeps players engaged from the moment they start a game until they voluntarily stop playing.

Snake succeeds because this loop is extremely short, understandable, and satisfying. Every action has an immediate consequence, encouraging players to improve through repetition rather than external rewards.

The loop should remain uninterrupted and free from unnecessary prompts, advertisements, or complex systems.

---

## 11.2 Primary Gameplay Loop

```text
Launch Game

↓

Start New Game

↓

Snake Begins Moving

↓

Player Chooses Direction

↓

Avoid Obstacles

↓

Find Food

↓

Eat Food

↓

Grow Snake

↓

Score Increases

↓

Movement Space Reduces

↓

Difficulty Increases

↓

Repeat

↓

Collision

↓

Game Over

↓

Show Score

↓

Compare High Score

↓

Play Again
```

This loop should typically complete within **30 seconds to 10 minutes**, depending on player skill.

---

## 11.3 Secondary Engagement Loop

Outside the core gameplay, players should have lightweight progression without changing the gameplay itself.

```text
Play Game

↓

Finish Match

↓

Statistics Updated

↓

High Score Updated

↓

Achievement Progress Updated

↓

Player Returns

↓

Attempts New Record
```

The secondary loop exists only to celebrate mastery. It must never become mandatory.

---

## 11.4 Emotional Curve

Every game session should naturally transition through emotional stages.

### Stage 1 — Relaxation

The player starts with a short snake.

Large movement area.

Minimal pressure.

Emotion:

> "This is easy."

---

### Stage 2 — Engagement

Food collection becomes rhythmic.

The player begins planning movements.

Emotion:

> "I'm getting into the flow."

---

### Stage 3 — Concentration

The snake occupies noticeable space.

Mistakes become costly.

Emotion:

> "Need to think ahead."

---

### Stage 4 — Pressure

Movement options shrink.

One incorrect turn may end the game.

Emotion:

> "Don't panic."

---

### Stage 5 — Failure

Collision occurs.

The player immediately understands why.

Emotion:

> "I can do better."

---

### Stage 6 — Replay

Restart happens within seconds.

No lengthy animations.

No interruptions.

Emotion:

> "One more game."

---

## 11.5 Design Objectives

The gameplay loop should achieve the following:

* Encourage continuous play.
* Reward improvement.
* Minimize downtime.
* Avoid frustration caused by randomness.
* Create tension naturally.

---

# 12. Player Journey

The player's experience extends beyond the gameplay itself.

This section describes the complete journey from discovering the game to becoming a highly skilled player.

---

## 12.1 Discovery

The player sees Snake in the Bhalyam Retro Collection.

The game card should instantly communicate:

* Classic Nokia heritage
* Simplicity
* Familiarity

The player should immediately recognize it.

---

## 12.2 Selection

After selecting Snake, the player enters a lightweight pre-game screen.

Available options:

* Play
* High Scores
* Settings
* Display Mode
* Controls
* Exit

The emphasis should always remain on **Play**.

---

## 12.3 First Launch

The first experience should require no tutorial.

Instead, the game should communicate through familiarity.

Within five seconds the player should understand:

* The snake moves automatically.
* Arrow keys or swipe control direction.
* Eat food.
* Avoid collisions.

---

## 12.4 Learning

The player naturally learns:

* Turning behavior
* Snake growth
* Space management
* Future planning

The game teaches through interaction rather than instruction.

---

## 12.5 Mastery

Experienced players begin optimizing:

* Route planning
* Efficient food collection
* Corner management
* Speed adaptation
* Long-term positioning

Mastery comes from strategic thinking rather than faster reactions alone.

---

## 12.6 Replay

Players return because:

* They almost beat their record.
* They discovered a better strategy.
* Sessions are short.
* The game feels fair.

---

## 12.7 Long-Term Retention

Players continue returning because:

* The game remains timeless.
* It respects their time.
* Every run is different due to food placement.
* High scores encourage self-improvement.

---

# 13. Controls

## 13.1 Design Philosophy

Controls must feel immediate, predictable, and unobtrusive.

Input delay should never become part of the challenge.

The player should lose because of decisions, not controls.

---

## 13.2 Desktop Controls

| Key   | Action            |
| ----- | ----------------- |
| ↑     | Move Up           |
| ↓     | Move Down         |
| ←     | Move Left         |
| →     | Move Right        |
| Space | Pause / Resume    |
| Enter | Confirm           |
| Esc   | Exit Menu / Pause |

---

## 13.3 Mobile Controls

Support three input methods:

### Virtual Nokia Keypad

The default nostalgic option.

Benefits:

* Familiar layout
* Precise input
* Retro appearance

---

### Swipe Controls

Modern alternative.

One swipe equals one direction change.

Should ignore tiny accidental gestures.

---

### Direction Buttons

Accessibility mode.

Large touch targets.

Suitable for tablets and younger players.

---

## 13.4 Controller Support

Optional.

Support:

* Xbox Controller
* PlayStation Controller
* Generic Bluetooth Controllers

Mapping:

D-Pad preferred.

Analog stick optional.

---

## 13.5 Input Priority

When multiple devices are connected:

1. Latest active device becomes primary.
2. Input switching should happen automatically.
3. No manual device selection required.

---

## 13.6 Input Rules

The player may queue one valid direction change ahead of the next movement step.

Invalid inputs should be ignored.

Examples:

Current direction:

RIGHT

Allowed:

UP

DOWN

Ignored:

LEFT

This prevents impossible 180° turns while maintaining responsiveness.

---

# 14. Input Mapping

## 14.1 Desktop

```text
Arrow Up      → North
Arrow Down    → South
Arrow Left    → West
Arrow Right   → East
```

---

## 14.2 Mobile Swipe

```text
Swipe Up

↓

Move Up

Swipe Down

↓

Move Down

Swipe Left

↓

Move Left

Swipe Right

↓

Move Right
```

---

## 14.3 Accessibility Mapping

Alternative layouts:

* Left-handed
* Right-handed
* Large buttons
* External keyboard

---

## 14.4 Input Validation

Ignore:

* Duplicate direction presses.
* Opposite direction reversals.
* Excessive repeated events.
* Invalid key combinations.

Always prioritize gameplay consistency.

---

# 15. Complete Game States

Snake should operate through clearly defined states.

---

## State List

```text
Boot

Loading

Main Menu

Settings

High Scores

Ready

Playing

Paused

Game Over

Statistics

Exit
```

---

## State Descriptions

### Boot

Initialize game.

Load assets.

Validate save data.

---

### Loading

Display minimal loading indicator.

Preload required assets.

---

### Main Menu

Player can:

* Start
* Settings
* High Scores
* Exit

---

### Ready

Initialize board.

Generate snake.

Spawn food.

Reset score.

Wait for first movement tick.

---

### Playing

Main gameplay.

Continuous movement.

Score updates.

Collision detection.

Growth.

Difficulty progression.

---

### Paused

Simulation stops.

No movement.

Input limited to:

Resume

Settings

Quit

---

### Game Over

Movement stops.

Final score displayed.

Statistics updated.

Achievements evaluated.

Player may restart immediately.

---

### Statistics

Display:

Games Played

Highest Score

Average Score

Longest Survival Time

Total Food Collected

---

# 16. State Transition Diagram

```text
Boot

↓

Loading

↓

Main Menu

↓

Ready

↓

Playing

↓

Paused

↓

Playing

↓

Game Over

↓

Statistics

↓

Main Menu

↓

Play Again

↓

Ready
```

Transitions should be smooth with minimal delay. The player should never wait unnecessarily between states.

---

# 17. Screen Flow

```text
Splash Screen

↓

Retro Collection

↓

Snake

↓

Main Menu

↓

Settings (Optional)

↓

Start Game

↓

Playing

↓

Pause (Optional)

↓

Resume

↓

Game Over

↓

Results

↓

Play Again

OR

Back to Menu
```

The total number of interactions required to start playing from launch should be as low as possible.

---

# 18. Menu Navigation

## Main Menu

The main menu should be intentionally simple to reflect the minimalist nature of the game.

Options:

1. Play
2. High Scores
3. Statistics
4. Settings
5. About
6. Back to Retro Collection

The **Play** option should be highlighted by default, enabling experienced players to begin a new game with a single confirmation input.

Navigation should be consistent across keyboard, touch, and controller input methods, with clear visual focus indicators and immediate response to user actions.

# Snake Game Design Document (GDD)

# 19. First-Time User Experience (FTUE)

## 19.1 Objective

The first five minutes determine whether a player continues playing or leaves the game.

Snake is one of the simplest games ever created. Therefore, the onboarding experience should respect the player's intelligence and avoid unnecessary explanations.

The game should be **learned through play**, just as it was on the original Nokia devices.

---

## 19.2 Design Principles

The FTUE should follow these principles:

* No mandatory tutorial.
* No lengthy introduction.
* No blocking popups.
* No account requirement.
* No permissions before gameplay.
* No advertisements.
* Gameplay starts within seconds.

---

## 19.3 First Launch Flow

```text
Player Opens Snake

↓

Splash Screen (2–3 seconds)

↓

Main Menu

↓

Play

↓

Game Starts Immediately
```

The player should reach gameplay in fewer than **three interactions**.

---

## 19.4 Optional Help

Rather than interrupting gameplay, the Help section should be available from the menu.

Topics include:

* Objective
* Controls
* Display modes
* High scores
* Settings

Players who already know Snake should never be forced to read instructions.

---

## 19.5 Learning Through Gameplay

The game teaches naturally.

The player immediately notices:

* Snake moves automatically.
* Arrow keys change direction.
* Food increases score.
* Snake grows.
* Longer snake increases challenge.
* Collision ends the game.

This discovery process is intentional and should remain unchanged.

---

# 20. HUD (Heads-Up Display)

## 20.1 Philosophy

The HUD should communicate only essential information.

Unlike modern games, Snake does not require extensive status indicators.

The game board must remain the primary focus.

---

## 20.2 Information Hierarchy

### Primary Information

Always visible:

* Current Score
* High Score
* Pause indicator (when paused)

---

### Secondary Information

Accessible but not always visible:

* Session time
* Total food collected
* FPS (Debug Mode only)
* Display mode

---

## 20.3 HUD Layout

```text
+--------------------------------+

HIGH SCORE              01250

SCORE                   00340

---------------------------------

□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□

□                          □

□      GAME AREA           □

□                          □

□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□

PAUSE (Only when paused)

+--------------------------------+
```

---

## 20.4 HUD Principles

The HUD should:

* Never block gameplay.
* Never cover the snake.
* Avoid animations during active gameplay.
* Use consistent typography.
* Maintain readability on small screens.

---

## 20.5 Notifications

Notifications should be minimal.

Allowed:

* New High Score
* Game Paused
* Game Resumed
* Achievement Unlocked (after game over)

Avoid displaying notifications while the player is actively navigating the snake.

---

# 21. Screen Specifications

## 21.1 Display Modes

The game supports three presentation styles:

### Classic Monochrome

Inspired by Nokia monochrome displays.

Characteristics:

* Green display
* Dark pixels
* Simple borders
* Minimal UI

---

### Classic Color

Inspired by Nokia Series 40 color devices.

Characteristics:

* Limited color palette
* Flat colors
* Pixel-perfect sprites

---

### Modern

For players preferring contemporary presentation.

Characteristics:

* Higher contrast
* Improved accessibility
* Optional subtle animations

Gameplay remains identical across all modes.

---

## 21.2 Responsive Layout

### Desktop

* Game centered.
* Fixed aspect ratio.
* Keyboard-first controls.

---

### Tablet

* Larger UI.
* Touch controls available.
* Landscape preferred.

---

### Mobile

Portrait and landscape supported.

Priority:

* Comfortable thumb reach.
* Maximum visible board area.
* Minimal UI chrome.

---

## 21.3 Safe Areas

Support:

* Display cutouts
* Rounded corners
* Dynamic Island
* Gesture navigation areas

Gameplay should never be obscured by system UI.

---

# 22. UI Components

## 22.1 Required Components

### Main Menu

Purpose:

Entry point.

Contains:

* Play
* High Scores
* Settings
* About
* Exit

---

### Pause Menu

Contains:

* Resume
* Restart
* Settings
* Back to Menu

---

### Game Over Dialog

Displays:

Final Score

High Score

Statistics

Achievements

Buttons:

Play Again

Main Menu

---

### Settings

Categories:

Controls

Audio

Display

Accessibility

Reset Settings

---

### High Scores

Display:

Top Scores

Date

Display Mode

Game Duration

---

## 22.2 UI Design Principles

Every UI element should:

* Feel lightweight.
* Be readable.
* Respect retro aesthetics.
* Never distract during gameplay.

---

# 23. Complete Game Rules

## 23.1 Objective

Control the snake to consume as much food as possible while avoiding collisions.

The player attempts to achieve the highest possible score before the game ends.

---

## 23.2 Winning Condition

Snake has no traditional ending.

Success is measured by:

* Highest score
* Longest survival
* Personal improvement

---

## 23.3 Losing Conditions

The game ends when:

* Snake collides with itself.

Depending on the selected game variant:

* Snake collides with walls.

Future variants may include alternate rules, but the classic mode should remain faithful to the original.

---

## 23.4 Food Rules

Food:

* Appears one item at a time.
* Is always reachable.
* Never overlaps the snake.
* Remains until eaten.
* Immediately respawns after collection.

---

## 23.5 Movement Rules

Snake:

* Never stops moving.
* Never reverses direction.
* Moves exactly one grid cell per update.
* Turns only at grid intersections.

---

## 23.6 Growth Rules

After eating food:

* Score increases.
* Snake length increases.
* Movement speed may increase according to progression rules.

---

## 23.7 Pause Rules

Pausing should:

Freeze:

* Snake
* Timer
* Score updates

Resume should continue seamlessly without repositioning the snake.

---

## 23.8 Restart Rules

Restart should:

* Reset board.
* Reset snake.
* Generate new food.
* Reset score.
* Preserve high scores.

Restart time should remain under one second.

---

# 24. Snake Behaviour

## 24.1 Role

The snake is the player's avatar and the only controllable object.

Its behavior must remain entirely deterministic.

Players should always understand why the snake moved as it did.

---

## 24.2 Initial Spawn

The snake begins:

* Center of the board.
* Facing right.
* Standard initial length.
* Stationary until the first game tick begins.

---

## 24.3 Continuous Movement

Once gameplay starts:

The snake moves automatically.

The player controls only direction.

This principle should never change.

---

## 24.4 Head Behaviour

The head determines:

* Direction
* Collision
* Food collection

Only the head interacts directly with new cells.

---

## 24.5 Body Behaviour

Each body segment follows the previous segment's former position.

Movement should appear smooth and perfectly aligned to the grid.

There should never be visible gaps or overlapping segments.

---

## 24.6 Tail Behaviour

Normally:

Tail advances every movement update.

When food is eaten:

Tail remains in place for one movement cycle, causing the snake to grow by one segment.

This growth should feel immediate and predictable.

---

## 24.7 Direction Changes

Rules:

Allowed:

Up → Left

Left → Down

Right → Up

Down → Right

Not Allowed:

Right → Left

Left → Right

Up → Down

Down → Up

Invalid inputs should be ignored without affecting movement.

---

# 25. Food Behaviour

## 25.1 Purpose

Food drives progression.

Without food, the game cannot advance.

Its placement should encourage varied movement across the board while remaining fair.

---

## 25.2 Spawn Rules

Food should:

* Spawn only on empty cells.
* Never overlap the snake.
* Never appear outside the playable area.
* Always be reachable.

---

## 25.3 Visibility

Only one food item exists at any given time.

It should remain clearly distinguishable from the snake and the background.

---

## 25.4 Collection

Food is collected when the snake's head enters the same grid cell.

Collection immediately triggers:

* Score increase.
* Snake growth.
* New food generation.
* Difficulty evaluation (if applicable).

The collection event should feel instantaneous and satisfying.

---

# 26. Growth Behaviour

Growth is the game's primary progression mechanic.

Each collected food increases the snake's length by exactly one segment.

Growth should be consistent and free from randomness.

The player should always be able to predict the snake's new length after eating.

---

# 27. Grid System

## 27.1 Philosophy

The game world is composed of a fixed grid.

Every gameplay element aligns perfectly to this grid.

There is no sub-cell movement, interpolation, or free-form positioning.

This discrete movement is a defining characteristic of classic Snake.

---

## 27.2 Grid Rules

* One entity per cell.
* Movement occurs cell by cell.
* Direction changes take effect on the next movement update.
* Food occupies a single cell.
* Snake segments occupy individual cells.
* Collision checks are evaluated per movement step.

The grid size should scale with display mode while preserving the gameplay proportions of the selected classic version.

---

# 28. Movement Rules

## 28.1 Fundamental Rule

The snake advances exactly **one grid cell** on each movement update.

Movement is driven by the game clock, **not** by the speed of player input.

---

## 28.2 Direction Priority

When multiple valid inputs occur between movement updates:

1. Only the latest valid direction is applied.
2. Opposite-direction inputs are ignored.
3. Invalid or duplicate inputs do not interrupt movement.

This ensures responsive controls while preserving deterministic behavior.

---

## 28.3 Cornering

A turn is executed only when the snake reaches the next grid intersection. This guarantees clean, right-angle movement and prevents clipping or diagonal motion.

---

## 28.4 Consistency

Movement behavior must remain identical regardless of:

* Screen size
* Frame rate
* Input device
* Browser
* Display mode

Players should experience the same gameplay across all supported platforms.

# Snake Game Design Document (GDD)

# 29. Collision Behaviour

## 29.1 Purpose

Collision is the primary failure mechanic in Snake. It defines the game's challenge and must behave consistently in every session.

Players should never question why a collision occurred. Every collision must feel predictable, fair, and directly attributable to the player's actions.

---

## 29.2 Collision Philosophy

Collision detection must prioritize:

* Predictability
* Determinism
* Consistency
* Immediate feedback

The game should never allow or reject a collision inconsistently.

---

## 29.3 Types of Collision

The game evaluates collisions in the following order:

### Boundary Collision

Applicable only in game variants where walls are solid.

Possible outcomes:

* Game Over
* Wrap Around (variant-specific)

---

### Self Collision

Occurs when the snake's head enters a grid cell already occupied by its body.

Outcome:

Immediate Game Over.

No grace period should be applied.

---

### Food Collision

Occurs when the snake enters the food cell.

Outcome:

* Increase score
* Grow snake
* Spawn new food
* Recalculate progression

---

### Empty Cell

Most common state.

Outcome:

Continue movement.

---

## 29.4 Collision Resolution Priority

If multiple events occur simultaneously:

1. Wall collision
2. Self collision
3. Food collection
4. Tail update

The evaluation order should remain fixed to ensure deterministic behavior.

---

## 29.5 Collision Feedback

Upon collision:

### Visual

* Snake stops instantly.
* Brief collision flash (optional in modern mode).
* Final board remains visible.

### Audio

* Collision sound plays once.
* Background audio fades naturally.

### UI

Display:

* Final Score
* High Score
* Play Again
* Main Menu

No lengthy transition should delay replay.

---

# 30. Speed & Difficulty Progression

## 30.1 Design Philosophy

Difficulty in Snake should emerge from:

* Increasing snake length
* Reduced maneuvering space
* Gradual movement speed changes

The game should not introduce artificial obstacles or random hazards.

---

## 30.2 Starting Difficulty

At game start:

* Large open space
* Short snake
* Comfortable movement speed
* Low cognitive load

The player should feel relaxed and in control.

---

## 30.3 Progression

As food is collected:

* Snake length increases.
* Available movement space decreases.
* Planning becomes more important.

Depending on the selected classic variant, movement speed may also increase gradually.

---

## 30.4 Difficulty Curve

The ideal curve is smooth and continuous.

```text id="3i7nnp"
Difficulty

↑
│                          ●
│                      ●
│                  ●
│              ●
│          ●
│      ●
│   ●
└────────────────────────────→ Time
```

Avoid sudden spikes in challenge.

---

## 30.5 Player Skill Progression

The player gradually develops:

### Beginner

* Understands controls
* Learns movement

---

### Intermediate

* Plans several moves ahead
* Uses corners effectively

---

### Advanced

* Controls board space
* Anticipates future constraints
* Optimizes routes

---

### Expert

* Maintains control under extreme space limitations
* Consistently achieves high scores
* Minimizes unnecessary movement

---

## 30.6 Fairness

The game should never become impossible due to randomness.

Every failure should be recoverable through better decision-making in the next session.

---

# 31. Scoring System

## 31.1 Purpose

The scoring system provides a simple measure of player performance.

It should reward survival and successful food collection without introducing unnecessary complexity.

---

## 31.2 Design Principles

The scoring system should be:

* Easy to understand
* Consistent
* Transparent
* Deterministic

Players should always know why their score increased.

---

## 31.3 Score Sources

Primary score comes from:

* Food collection

Future optional modes may award bonus points, but Classic Snake should remain faithful to the original scoring philosophy.

---

## 31.4 Score Display

The current score should always be visible during gameplay.

Formatting should remain simple.

Examples:

```text id="zk1qwm"
Score

25

High Score

340
```

Avoid unnecessary separators or animations.

---

## 31.5 New High Score

When a new high score is achieved:

Gameplay should continue uninterrupted.

Recognition occurs:

* Immediately after the run
* Within the Game Over screen
* Inside Statistics

No intrusive celebration should interrupt gameplay.

---

# 32. High Score Rules

## 32.1 Objective

High scores celebrate mastery.

They should motivate replay without creating pressure.

---

## 32.2 Storage

Maintain:

* Local high score
* Cloud high score (if player account is available)

If cloud synchronization is unavailable, gameplay should remain fully functional.

---

## 32.3 Leaderboards

Classic mode should include:

* Personal Best
* Friends (future)
* Global (optional)

The focus remains on personal improvement rather than competition.

---

## 32.4 Integrity

High scores should only be recorded for legitimate gameplay.

Scores obtained through:

* Debug mode
* Accessibility testing
* Development builds

should not affect official rankings.

---

# 33. Pause & Resume Behaviour

## 33.1 Pause Philosophy

Players should be able to pause at any moment without penalty.

Pause exists to respect the player's time.

---

## 33.2 Pause Effects

Pausing freezes:

* Snake movement
* Timers
* Score updates
* Animations
* Audio (optional fade)

No gameplay simulation continues while paused.

---

## 33.3 Pause Menu

Available options:

* Resume
* Restart
* Settings
* Return to Main Menu

The interface should remain lightweight.

---

## 33.4 Resume

Resuming should:

* Restore gameplay instantly
* Preserve game state exactly
* Avoid countdown timers unless enabled as an accessibility option

---

# 34. Game Over Experience

## 34.1 Philosophy

Game Over is not a punishment.

It is a moment of reflection that encourages another attempt.

The player should feel:

> "I know what I did wrong."

rather than

> "The game was unfair."

---

## 34.2 Sequence

```text id="9xnv1m"
Collision

↓

Movement Stops

↓

Collision Sound

↓

Score Display

↓

Statistics Update

↓

High Score Check

↓

Achievements

↓

Play Again
```

The entire sequence should complete quickly.

---

## 34.3 Game Over Screen

Display:

* Final Score
* High Score
* Food Collected
* Survival Time
* New Record (if applicable)

Buttons:

* Play Again
* Main Menu

Play Again should be the default focus.

---

## 34.4 Replay Time

From Game Over to a new game:

Target:

Less than **2 seconds**.

Fast replay is essential to the game's addictive nature.

---

# 35. Statistics & Achievements

## 35.1 Philosophy

Statistics celebrate long-term engagement without altering gameplay.

Achievements should recognize milestones rather than dictate behavior.

---

## 35.2 Statistics

Track:

* Games Played
* Total Food Collected
* Highest Score
* Average Score
* Longest Survival Time
* Total Play Time
* Total Distance Traveled
* Best Daily Score
* Best Weekly Score

Statistics should be viewable from the main menu.

---

## 35.3 Achievement Categories

### Progression

Examples:

* First Game
* 10 Games Played
* 100 Games Played

---

### Skill

Examples:

* Reach a specific score
* Survive for a set duration
* Achieve a new personal best

---

### Consistency

Examples:

* Consecutive days played
* Multiple high-scoring runs

Achievements should not unlock gameplay advantages.

---

# 36. Save & Resume Strategy

## 36.1 Philosophy

Players should be able to leave and return without losing meaningful progress.

However, save functionality must not undermine the challenge of individual runs.

---

## 36.2 Persistent Data

Always save:

* High scores
* Statistics
* Achievements
* Settings
* Display preferences

These persist across sessions and devices where supported.

---

## 36.3 In-Progress Games

If the player exits unexpectedly (e.g., browser closes, app is backgrounded), the game may preserve the current run **only when explicitly paused or when platform policies require state restoration**. Automatic recovery should restore the exact board state, score, snake position, and direction if supported.

Classic mode should avoid allowing repeated save-scumming that removes the consequence of mistakes. If resume is offered, it should restore a single interrupted session rather than provide unlimited retries.

---

## 36.4 Session Integrity

To preserve fairness:

* Completed games are final.
* High scores are recorded only after a valid game over or completed session.
* Interrupted sessions should be clearly identified if resumed.
* Restoring a session must never duplicate rewards or statistics.

---

## 36.5 Offline Behavior

The game should remain fully playable without an internet connection.

When offline:

* Gameplay is unaffected.
* Local statistics continue updating.
* Local high scores remain available.
* Pending cloud synchronization occurs automatically when connectivity returns, if the player is signed in.

Offline support is considered a core requirement because it aligns with the simplicity and accessibility that made the original Nokia Snake successful.

# Snake Game Design Document (GDD)

# 37. Sound Design

## 37.1 Purpose

Sound is not merely feedback—it is part of the player's memory of Nokia Snake. While the original devices produced simple tones, those sounds became iconic because they communicated game events clearly without overwhelming the experience.

The soundscape should remain minimal, purposeful, and instantly recognizable.

---

## 37.2 Sound Design Principles

Every sound should:

* Provide meaningful feedback.
* Be short and distinctive.
* Never distract from gameplay.
* Avoid overlapping excessively.
* Preserve the minimalist identity of the game.

Silence is equally important. The game should never feel noisy.

---

## 37.3 Audio Events

The game requires sounds for:

| Event              | Purpose              | Priority |
| ------------------ | -------------------- | -------- |
| Menu Navigation    | UI feedback          | Medium   |
| Menu Selection     | Confirmation         | Medium   |
| Game Start         | Beginning of session | Medium   |
| Food Collection    | Reward               | High     |
| Score Milestone    | Celebration          | Low      |
| Pause              | State feedback       | Medium   |
| Resume             | State feedback       | Medium   |
| Collision          | Failure indication   | Critical |
| Game Over          | End of run           | High     |
| New High Score     | Achievement          | Medium   |
| Achievement Unlock | Recognition          | Low      |

---

## 37.4 Sound Characteristics

Each sound should be:

* Clean
* Short (<250 ms where appropriate)
* Low latency
* Retro-inspired
* Pleasant during repeated gameplay

Avoid:

* Long musical phrases
* Heavy bass
* Cinematic effects
* Voiceovers
* Excessive reverb

---

## 37.5 Accessibility

Support:

* Master Volume
* Effects Volume
* Mute
* Mono Audio Compatibility
* Independent UI/Game sound levels

Settings should persist across sessions.

---

# 38. Music Philosophy

## 38.1 Classic Experience

Most classic Nokia Snake versions did not rely on continuous background music. The experience was intentionally quiet, allowing gameplay to take center stage.

The default experience should preserve this restraint.

---

## 38.2 Background Music (Optional)

If background music is offered, it should be:

* Optional
* Disabled by default in Classic mode
* Soft and unobtrusive
* Loop seamlessly
* Never compete with sound effects

---

## 38.3 Modern Mode

Modern mode may include subtle ambient music inspired by retro electronic tones, provided it does not alter gameplay pacing or distract the player.

---

## 38.4 Audio Prioritization

During gameplay:

1. Collision sound
2. Food collection
3. UI confirmation
4. Background music

Critical gameplay feedback must always remain audible.

---

# 39. Haptic Feedback

## 39.1 Philosophy

Haptics are a modern enhancement and should be optional. They must reinforce gameplay events without becoming distracting.

---

## 39.2 Haptic Events

Recommended feedback:

| Event           | Intensity  |
| --------------- | ---------- |
| Menu Selection  | Light      |
| Food Collection | Light      |
| Pause           | Very Light |
| Resume          | Very Light |
| Collision       | Strong     |
| New High Score  | Medium     |
| Achievement     | Medium     |

---

## 39.3 Desktop

No haptic feedback is required for desktop platforms.

---

## 39.4 Mobile

Support device vibration APIs where available and permitted by the browser.

Players must be able to disable haptics completely.

---

# 40. Animation Principles

## 40.1 Philosophy

Animation should support gameplay, not decorate it.

The original Snake had extremely limited animation. Modern enhancements must respect that simplicity.

---

## 40.2 Gameplay Animations

Allowed:

* Snake movement
* Food appearance
* Pause transition
* Menu transitions
* New High Score celebration
* Game Over fade

Avoid:

* Excessive particle effects
* Screen shake during normal gameplay
* Animated backgrounds
* Distracting visual flourishes

---

## 40.3 Timing

Animations should never delay gameplay.

Examples:

Food collection:

Immediate.

Pause:

Immediate.

Restart:

Immediate.

---

## 40.4 Motion Consistency

All transitions should follow consistent timing.

Examples:

* Menu fade
* Pause overlay
* Results screen
* Settings navigation

Consistency contributes to a polished user experience.

---

# 41. Visual Style Guide

## 41.1 Design Philosophy

The visual identity should evoke the simplicity and clarity of classic Nokia devices while remaining comfortable on modern displays.

Every visual element should exist to improve readability or reinforce nostalgia.

---

## 41.2 Core Principles

* Minimalism
* Pixel precision
* High readability
* Consistent spacing
* Clean geometry

---

## 41.3 Modern Enhancements

Permitted enhancements include:

* Sharper rendering
* Improved contrast
* Accessibility scaling
* Optional subtle shadows

These enhancements must not alter gameplay.

---

## 41.4 Visual Consistency

Menus, HUD, and gameplay should share:

* Typography
* Iconography
* Spacing
* Color hierarchy

This creates a cohesive experience across the Retro Collection.

---

# 42. Typography

## 42.1 Philosophy

Typography should reinforce the retro aesthetic while remaining legible across all screen sizes.

---

## 42.2 Font Categories

Primary:

Retro-inspired pixel font.

Secondary:

Modern sans-serif for accessibility where necessary.

---

## 42.3 Hierarchy

| Element    | Style     |
| ---------- | --------- |
| Game Title | Largest   |
| Menu Items | Large     |
| Score      | Medium    |
| Labels     | Small     |
| Debug      | Monospace |

---

## 42.4 Readability

Typography should:

* Scale cleanly.
* Maintain contrast.
* Avoid decorative effects.
* Support localization.

---

# 43. Color Palette

## 43.1 Classic Monochrome

Inspired by early Nokia LCD screens.

Palette:

* Background Green
* Dark Green Pixels
* Mid Green Highlights
* Black UI Elements

---

## 43.2 Classic Color

Inspired by Series 40 displays.

Characteristics:

* Limited palette
* Flat colors
* High contrast
* Minimal gradients

---

## 43.3 Modern

Modern mode may expand the palette while preserving the visual hierarchy.

Accessibility contrast standards should be maintained.

---

## 43.4 Color Usage

Colors should communicate:

* Gameplay
* Status
* Focus
* Errors
* Success

Avoid decorative color usage that distracts from gameplay.

---

# 44. Sprite Specifications

## 44.1 Philosophy

Sprites should preserve the recognizable appearance of the original game while remaining crisp at modern resolutions.

---

## 44.2 Snake

Requirements:

* Consistent segment size
* Clear head direction
* Clean corners
* Distinct tail

---

## 44.3 Food

Requirements:

* Easily identifiable
* High contrast
* Single-cell occupancy
* No unnecessary detail

---

## 44.4 UI Icons

Icons should:

* Match retro styling
* Scale cleanly
* Remain recognizable at small sizes

---

## 44.5 Scaling

Only integer scaling should be used to preserve pixel integrity.

No sprite stretching or smoothing.

---

# 45. Asset Inventory

## 45.1 Gameplay Assets

* Snake Head
* Snake Body
* Snake Tail
* Food
* Background Grid
* Boundary Tiles (where applicable)

---

## 45.2 UI Assets

* Logo
* Buttons
* Icons
* Menu Panels
* Pause Overlay
* Results Screen
* Settings Icons

---

## 45.3 Audio Assets

* UI Click
* Food Collection
* Collision
* Pause
* Resume
* Game Over
* Achievement
* High Score

---

## 45.4 Documentation

Every asset should include:

* Purpose
* Resolution
* Source
* License
* Version
* Last Updated

This ensures long-term maintainability and legal clarity.

---

# 46. Display Modes (Detailed)

## 46.1 Objective

Display modes allow players to choose how they experience Snake without changing gameplay mechanics.

Only presentation changes between modes.

---

## 46.2 Classic Monochrome

Target audience:

Players seeking the closest visual approximation to early Nokia devices.

Characteristics:

* Green monochrome palette
* Minimal UI
* Pixel-perfect rendering
* No background animation
* No visual effects

---

## 46.3 Classic Color

Target audience:

Players familiar with later Nokia color phones.

Characteristics:

* Limited color palette
* Flat pixel art
* Original-inspired UI
* Simple transitions

---

## 46.4 Modern

Target audience:

Players preferring a contemporary presentation.

Characteristics:

* Improved readability
* Enhanced contrast
* Accessibility options
* Optional subtle visual polish

---

## 46.5 Shared Gameplay

Regardless of display mode:

* Rules remain identical.
* Speed remains identical.
* Physics remain identical.
* Scoring remains identical.
* Collision remains identical.
* Input remains identical.

Presentation must never affect gameplay.

---

## 46.6 Mode Switching

Players may change display modes from the Settings menu.

Changes should apply immediately where possible and persist across sessions.
# Snake Game Design Document (GDD)

# 47. Accessibility

## 47.1 Accessibility Vision

Snake should be enjoyable by the widest possible audience without compromising the core gameplay experience.

Accessibility is not an optional enhancement—it is a core quality requirement. Every player, regardless of physical ability, device, or environment, should be able to experience the game comfortably.

The goal is **equal access to the same gameplay**, not a different version of the game.

---

## 47.2 Accessibility Principles

The game should follow these principles:

* Simple interactions
* Clear visual hierarchy
* Consistent controls
* High readability
* Customizable presentation
* Minimal cognitive load

Accessibility options must never change the core gameplay rules or provide gameplay advantages.

---

## 47.3 Visual Accessibility

Support:

### High Contrast Mode

Improves visibility for players with reduced vision.

Includes:

* Increased contrast
* Stronger borders
* Improved text readability

---

### Large UI Mode

Increases:

* Text size
* Button size
* HUD size

Gameplay area should remain unaffected.

---

### Color Blind Support

Support common color vision deficiencies:

* Protanopia
* Deuteranopia
* Tritanopia

Classic display modes remain unchanged for authenticity.

Accessibility themes are optional.

---

## 47.4 Motor Accessibility

Provide:

* Larger touch buttons
* Adjustable swipe sensitivity
* Left-handed layout
* Right-handed layout
* External keyboard support
* Gamepad support

---

## 47.5 Audio Accessibility

Support:

* Independent volume controls
* Mute
* Mono output
* Visual confirmation for important events

---

## 47.6 Motion Accessibility

Allow players to reduce:

* Screen transitions
* Menu animations
* Visual effects

Gameplay timing must remain unchanged.

---

## 47.7 Accessibility Validation

Before release, verify:

✓ Entire game playable without sound

✓ Entire game playable using keyboard only

✓ Entire game playable with touch only

✓ Large text remains readable

✓ High contrast themes remain usable

✓ No inaccessible menu interactions

---

# 48. Settings

## 48.1 Philosophy

Settings should remain intentionally lightweight.

The original Nokia experience required almost no configuration.

Modern options should improve usability without overwhelming the player.

---

## 48.2 Categories

### Gameplay

* Display Mode
* Difficulty Variant
* Wall Behaviour (variant dependent)

---

### Controls

* Keyboard
* Swipe
* Virtual Keypad
* Gamepad

---

### Audio

* Master Volume
* Effects Volume
* Music
* Mute

---

### Display

* Fullscreen
* Pixel Scaling
* CRT Filter
* LCD Filter
* Brightness

---

### Accessibility

* High Contrast
* Large UI
* Color Blind Mode
* Reduced Motion

---

### Data

* Reset Statistics
* Reset Settings
* Cloud Sync Status

---

## 48.3 Persistence

All settings should persist between sessions.

Cloud synchronization should occur when supported.

---

# 49. Analytics & Telemetry

## 49.1 Purpose

Analytics exist to improve the game—not to manipulate player behavior.

The data collected should help identify:

* Bugs
* Performance issues
* UX improvements
* Balancing opportunities

Analytics should never compromise player privacy.

---

## 49.2 Core Metrics

Track:

* Games Started
* Games Completed
* Average Session Length
* Average Score
* Highest Score
* Food Collected
* Restart Frequency
* Pause Frequency

---

## 49.3 Performance Metrics

Collect:

* FPS
* Memory Usage
* Load Time
* Crash Reports

Only anonymized data should be collected where applicable.

---

## 49.4 Privacy

The game should:

* Minimize data collection.
* Explain analytics clearly.
* Allow players to opt out where required by applicable regulations.

---

# 50. Error Handling

## 50.1 Philosophy

Errors should never interrupt gameplay unexpectedly.

Whenever possible:

* Recover automatically.
* Preserve player progress.
* Inform the player using clear language.

---

## 50.2 Possible Errors

Examples:

* Save failure
* Cloud sync failure
* Asset loading failure
* Network interruption
* Browser storage full

---

## 50.3 Recovery

Preferred order:

Automatic Retry

↓

Local Recovery

↓

Player Notification

↓

Graceful Failure

Gameplay should remain available whenever possible.

---

# 51. Edge Cases

The following scenarios require validation.

---

## Gameplay

* Rapid direction changes
* Holding movement keys
* Simultaneous key presses
* Window resize
* Browser zoom
* Pause during movement
* Resume after long delay

---

## Device

* Rotate mobile device
* Lock screen
* Incoming phone call
* Background application
* Low battery mode

---

## Browser

* Refresh page
* Lose internet
* Storage unavailable
* Tab inactive
* Multiple tabs open

---

## Save System

* Interrupted save
* Corrupted save
* Missing save
* Storage quota exceeded

---

## Input

* Keyboard disconnect
* Controller disconnect
* Touch interruption
* Multiple simultaneous devices

---

# 52. Performance Targets

## 52.1 Performance Vision

Snake should feel instantaneous.

Players should never notice the engine.

---

## 52.2 Startup

Target:

Game playable within **3 seconds** on supported devices.

---

## 52.3 Gameplay

Target:

* Stable frame rate
* Consistent input
* Smooth movement

Frame drops should not alter gameplay behavior.

---

## 52.4 Memory

The game should:

* Use minimal assets
* Release unused resources
* Avoid unnecessary allocations

---

## 52.5 Battery

Optimize for:

* Mobile devices
* Low CPU usage
* Efficient rendering

---

# 53. Browser & Device Compatibility

## 53.1 Desktop Browsers

Support current major versions of:

* Chrome
* Edge
* Firefox
* Safari

---

## 53.2 Mobile Browsers

Support:

* Chrome Android
* Samsung Internet
* Safari iOS
* Edge Mobile

---

## 53.3 Screen Sizes

Support:

* Small phones
* Large phones
* Tablets
* Desktop
* Ultrawide (centered layout)

---

## 53.4 Input Devices

Support:

* Keyboard
* Mouse (menus)
* Touch
* Gamepad

---

# 54. QA Strategy

## 54.1 Philosophy

Quality assurance begins during design, not after implementation.

Every gameplay rule should have corresponding validation scenarios.

---

## 54.2 QA Layers

### Functional Testing

Verify:

* Menus
* Controls
* Save system
* Statistics

---

### Gameplay Testing

Verify:

* Movement
* Food
* Growth
* Collision
* Scoring

---

### Visual Testing

Verify:

* Pixel alignment
* Scaling
* UI consistency
* Themes

---

### Performance Testing

Verify:

* Startup time
* Frame stability
* Memory usage

---

### Compatibility Testing

Verify behavior across:

* Browsers
* Devices
* Screen sizes

---

# 55. Gameplay Validation Checklist

Before release, every build must satisfy:

## Core Gameplay

□ Snake always moves correctly

□ Food always spawns correctly

□ Snake grows correctly

□ Score updates correctly

□ Collision behaves correctly

□ Restart works correctly

---

## User Experience

□ Menus are responsive

□ Pause works

□ Resume works

□ Settings persist

□ High scores save correctly

---

## Presentation

□ Correct display mode

□ Correct sounds

□ Correct animations

□ Pixel-perfect rendering

---

## Performance

□ Stable gameplay

□ Fast startup

□ Low memory usage

---

# 56. Acceptance Criteria

The game is considered complete when:

* All gameplay rules match the approved design.
* No Critical or High severity defects remain.
* Performance targets are met.
* Accessibility requirements are satisfied.
* QA sign-off is complete.
* Product Owner approval is obtained.
* Regression testing passes.
* Release checklist is complete.

Only then is the game eligible for inclusion in the Bhalyam Retro Collection.

---

# 57. Development Phases

## Phase 1 — Research

Objectives:

* Historical research
* Gameplay comparison
* Reverse engineering
* Reference collection

Deliverables:

* Research dossier
* Authenticity report

---

## Phase 2 — Product Design

Objectives:

* Finalize GDD
* UX flows
* Validation criteria

Deliverables:

* Approved design document
* UX review

---

## Phase 3 — Prototype

Objectives:

* Verify gameplay feel
* Validate movement
* Validate controls

Deliverables:

* Playable prototype
* Feedback report

---

## Phase 4 — Production

Objectives:

* Complete feature implementation
* Integrate shared systems
* Polish user experience

Deliverables:

* Feature-complete build

---

## Phase 5 — QA

Objectives:

* Functional testing
* Gameplay validation
* Performance testing
* Accessibility testing

Deliverables:

* QA sign-off

---

## Phase 6 — Release

Objectives:

* Final review
* Store assets
* Documentation
* Production deployment

Deliverables:

* Public release
* Release notes
* Post-launch monitoring

---

# 58. Risk Register

| Risk                                       | Impact | Mitigation                                                       |
| ------------------------------------------ | ------ | ---------------------------------------------------------------- |
| Inaccurate recreation of original behavior | High   | Validate against reference devices and gameplay recordings       |
| Browser timing differences                 | High   | Use deterministic simulation and extensive cross-browser testing |
| Input latency on touch devices             | Medium | Optimize input handling and test across devices                  |
| Asset licensing issues                     | High   | Use original or properly licensed assets only                    |
| Scope creep                                | High   | Freeze gameplay scope after GDD approval                         |
| Performance issues on low-end devices      | Medium | Profile regularly and optimize asset usage                       |

Risks should be reviewed at the end of each development phase.

---

# 59. Future Enhancements

The following ideas may be considered after the classic experience is complete and validated:

* Snake II mode
* Additional Nokia device skins
* Authentic keypad overlays
* Replay viewer
* Daily challenges
* Friends leaderboard
* Seasonal themes (presentation only)
* Cloud save improvements
* Accessibility enhancements
* Retro Collection achievements spanning multiple games

These enhancements must never alter or replace the classic gameplay mode.

---

# 60. Final Release Checklist

Before the game is released:

### Product

* □ GDD approved
* □ Scope complete
* □ Documentation finalized

### Gameplay

* □ Rules validated
* □ Difficulty approved
* □ Controls verified
* □ Scoring verified
* □ High scores verified

### UX

* □ Menus complete
* □ Accessibility complete
* □ Settings complete

### Audio & Visual

* □ Assets finalized
* □ Audio validated
* □ Display modes validated

### Quality

* □ Functional testing passed
* □ Gameplay testing passed
* □ Performance targets met
* □ Cross-browser testing passed
* □ Accessibility testing passed
* □ Regression testing passed

### Release

* □ Production build generated
* □ Release notes prepared
* □ Analytics verified
* □ Monitoring enabled
* □ Product Owner sign-off obtained

---

# Document Conclusion

The **Snake Game Design Document** serves as the definitive planning reference for recreating the classic Nokia Snake experience within the Bhalyam Retro Collection. It defines the product vision, player experience, gameplay rules, production milestones, quality expectations, and release criteria while deliberately avoiding implementation-specific details.

Any future changes to gameplay should be evaluated against the core principles established in this document:

* **Authenticity before modernization**
* **Gameplay before presentation**
* **Simplicity before feature expansion**
* **Player trust before engagement metrics**
* **Long-term maintainability over short-term novelty**

This document should remain the authoritative reference throughout design, development, testing, release, and future maintenance of the game.
