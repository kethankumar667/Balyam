# BHALYAM — Complete Animation Verification & Quality Assurance Guide

> **Document Purpose**: A comprehensive, step-by-step manual for testing, verifying, and auditing all **Application-Wide** and **Game-Specific** animation implementations across the BHALYAM platform.

---

## 📑 Table of Contents
1. [Platform Verification Prerequisites](#1-platform-verification-prerequisites)
2. [Application-Wide Animation Suite](#2-application-wide-animation-suite)
3. [Game-Specific Animation Suites](#3-game-specific-animation-suites)
   - [3.1 Hand Cricket](#31-hand-cricket)
   - [3.2 Ludo](#32-ludo)
   - [3.3 Snakes & Ladders](#33-snakes--ladders)
   - [3.4 UNO (Benchmark)](#34-uno-quality-benchmark)
   - [3.5 Rummy](#35-rummy)
   - [3.6 Rock Paper Scissors](#36-rock-paper-scissors)
   - [3.7 Dots & Boxes](#37-dots--boxes)
   - [3.8 Word Building](#38-word-building)
   - [3.9 Bingo](#39-bingo)
   - [3.10 Star Game](#310-star-game)
   - [3.11 Chess](#311-chess)
   - [3.12 Name Place Animal Thing](#312-name-place-animal-thing)
4. [Accessibility & Reduced Motion Verification](#4-accessibility--reduced-motion-verification)
5. [Automated Health Checks](#5-automated-health-checks)

---

## 1. Platform Verification Prerequisites

Before running manual tests in your browser:

```powershell
# 1. Start the Client Dev Server
cd client
npm run dev

# 2. Start the Game Lounge Backend
cd ../server
npm run dev
```

Open `http://localhost:5173/` in Google Chrome or any modern browser.

---

## 2. Application-Wide Animation Suite

These animations govern the core loop: **Lobby → Room Shell → Players → Ready Check → Match Countdown → In-Game Focus → Match Results**.

| # | Animation | Source File | Trigger Condition | Expected Visual & Audio Feedback |
|---|---|---|---|---|
| **2.1** | **Ambient Doodles** | [`client/src/animations/app/AmbientDoodles.tsx`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/client/src/animations/app/AmbientDoodles.tsx) | Landing on Home page. | Floating, slow-drifting paper planes, pencils, dice, notebooks, and twinkling stars with gentle orbital drift. |
| **2.2** | **Ready Pencil Checkmark** | [`client/src/animations/app/ReadyCheckmarkDraw.tsx`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/client/src/animations/app/ReadyCheckmarkDraw.tsx) | Click **"I'm Ready"** button in room. | An animated hand-drawn pencil stroke sketches a green checkmark into the player's status box with pop sound and haptic pulse. |
| **2.3** | **Universal Match Countdown** | [`client/src/animations/app/BhalyamMatchCountdown.tsx`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/client/src/animations/app/BhalyamMatchCountdown.tsx) | All players become Ready (`phase: "countdown"`). | Central bouncy **3 → 2 → 1 → GO!** numerals, star sparkle bursts, audio ticks on each count, and camera punch on **GO!**. |
| **2.4** | **Host Crown Migration** | [`client/src/animations/app/HostCrownTravel.tsx`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/client/src/animations/app/HostCrownTravel.tsx) | Host leaves the room; new host assigned. | Golden 3D floating crown smoothly flies from former host's seat to the new host with a light trail. |
| **2.5** | **Turn Focus Ring & Sweep** | [`client/src/animations/app/TurnFocusIndicator.tsx`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/client/src/animations/app/TurnFocusIndicator.tsx) | Active player's turn begins. | Breathing golden aura, pulsing border ring, light sweep across player card, and subtle turn haptic. |
| **2.6** | **Flying Score Float** | [`client/src/animations/app/ScoreFlyingFloat.tsx`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/client/src/animations/app/ScoreFlyingFloat.tsx) | Gaining score in Word Building, Dots & Boxes, Bingo. | Comic numbers (`+10`, `+50`, `+100`) float upward in comic font with rainbow particle sparkles. |
| **2.7** | **Victory Confetti & Fireworks** | [`client/src/components/GameOverScreen.tsx`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/client/src/components/GameOverScreen.tsx) | Any match completed with a winner. | Fullscreen multi-color confetti rain, fireworks particle bursts (`fireFireworksBurst`), 3D bouncing trophy 🏆, and victory fanfare. |

### 🛠️ Verification Steps (App-Wide):
1. Navigate to `http://localhost:5173/`. Verify the drifting doodle background.
2. Click any game tile (e.g. Ludo) → Click **Create Room** → Add a Bot.
3. Click **"I'm Ready"**: Observe the pencil checkmark draw.
4. When both players are ready, observe the **3 → 2 → 1 → GO!** sequence.
5. In a 2-human player room, have the host leave: observe the crown migrate.

---

## 3. Game-Specific Animation Suites

---

### 3.1 Hand Cricket
**Implementation**: [`client/src/games/handcricket/hc-shared.tsx`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/client/src/games/handcricket/hc-shared.tsx)

| Outcome | Trigger | Expected Visual & Audio Feedback |
|---|---|---|
| **Four (Boundary)** | Delivery scores 4 runs. | Golden gradient `"FOUR!"` slide text with ambient emoji bursts. |
| **Six (Maximum)** | Delivery scores 6 runs. | Fiery radial glow `"SIX!"` launch with ambient spin rays and emoji bursts. |
| **Wicket Fall (OUT!)** | Batter and Bowler choose matching numbers. | Crimson `"WICKET!"` shake banner with delivery wicket commentary. |
| **Hat-Trick** | Bowler takes 3 consecutive wickets. | Fiery strobe background 🔥, 3 bullseye popups, `"HAT-TRICK!"` fanfare. |
| **Victory / Tie** | Match ends. | Majestic `"VICTORY!"` / `"TIED!"` / `"WELL PLAYED"` crown popup with golden rays and confetti rain. |

**Verification Steps**:
1. Start Hand Cricket with a bot.
2. Score 4 runs or 6 runs to observe the sleek broadcast typography overlays.
3. Choose matching number to trigger a Wicket.
4. Finish match to verify Victory / Match-Over screen.

---

### 3.2 Ludo
**Implementation**: [`client/src/games/ludo/LudoAnimations.tsx`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/client/src/games/ludo/LudoAnimations.tsx) & [`client/src/games/ludo/ludo-board-composites.tsx`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/client/src/games/ludo/ludo-board-composites.tsx)

| Event | Trigger | Expected Visual & Audio Feedback |
|---|---|---|
| **Balanced Player Card** | Rendered across all seats. | Clean circular avatar bezel without crescent distortion, balanced status (`🎲 20s` on active turn, `Waiting` on inactive, `Home ● ● ○ ○ (2/4)` progress). |
| **Dice Roll & Settle** | Click Roll button. | 3D tumbling dice with landing impact punch (`ludo-dice-impact`) and audio roll. |
| **Token Hop & Step** | Click movable token. | Token bobs and hops cell-by-cell along track with shadow squish and step sounds. |
| **Safe Star Landing** | Token lands on Star cell. | Golden star sparkle burst and protective shield ring. |
| **Capture Kick** | Token lands on opponent token. | 70ms hit-stop, comic kick impact 💥, opponent token sent flying back to base with smoke dust. |
| **Home Triangle Goal** | Token reaches center home. | Cheerful fanfare, home celebration particle pop. |
| **Winner Celebration** | Player gets all 4 tokens home. | Golden crown pop 👑, `"LUDO CHAMPION!"` banner, fireworks burst. |

**Verification Steps**:
1. Start Ludo match against bot.
2. Inspect player cards in side rail: verify clean avatar circles, home progress dots, and turn timer pills.
3. Roll dice and move tokens along track to verify hop, star landing, and capture kick.

---

### 3.3 Snakes & Ladders
**Implementation**: [`client/src/games/snl/SnlAnimations.tsx`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/client/src/games/snl/SnlAnimations.tsx)

| Event | Trigger | Expected Visual & Audio Feedback |
|---|---|---|
| **Ladder Climb** | Land on base of a ladder. | Rung-by-rung glowing climb trail, ascending harp chime 🪜, golden upward sparkles. |
| **Snake Slide** | Land on a snake head. | Screen shudder, snake hiss sound 🐍, token swallowed and sliding down to tail with dizzy stars. |
| **Podium Winner** | Land on cell 100. | Golden 100 Champion trophy, confetti explosion, podium celebration. |

---

### 3.4 UNO (Quality Benchmark)
**Implementation**: [`client/src/animations/card/`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/client/src/animations/card/)

| Event | Trigger | Expected Visual & Audio Feedback |
|---|---|---|
| **Wild Color Splash** | Play Wild / Wild +4 card. | 4-color liquid paint splash radiating across screen (`WildColorSplash.tsx`). |
| **Draw 4 Meteor Strike** | Target player with `+4`. | Meteor crash impact on victim's hand with screen recoil and camera shake (`DrawFourMeteorStrike.tsx`). |
| **Skip Banana Peel** | Play Skip card. | Spinning cartoon banana peel 🍌 sliding across target player (`SkipBananaPeel.tsx`). |
| **UNO Call Celebration** | Hit UNO button on 1 card. | Giant explosive comic badge `"UNO!"` with golden star bursts (`UnoCallCelebration.tsx`). |
| **UNO Police Bust** | Catch player without calling UNO. | Flashing red/blue siren lights 🚨, police tape, forced penalty draw (`UnoPoliceBust.tsx`). |

---

### 3.5 Rummy
**Implementation**: [`client/src/games/rummy/RummyAnimations.tsx`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/client/src/games/rummy/RummyAnimations.tsx)

| Event | Trigger | Expected Visual & Audio Feedback |
|---|---|---|
| **Card Draw & Discard** | Draw/discard card. | Parabolic arc glide with card shadow and tactile snap sound. |
| **Valid Meld Lock** | Form Pure / Impure sequence. | Green glowing border sweep across meld, sparkle pop ✨, and meld lock tick. |
| **Special Joker** | Reveal cut joker. | Golden star aura pulse and jester cap icon. |
| **Declare & Showdown** | Valid 13-card Declare. | Grand trumpeting fanfare, card layout reveal, victory burst. |

---

### 3.6 Rock Paper Scissors
**Implementation**: [`client/src/games/rps/RpsAnimations.tsx`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/client/src/games/rps/RpsAnimations.tsx)

| Event | Trigger | Expected Visual & Audio Feedback |
|---|---|---|
| **Shoot Countdown** | Round start. | Shaking fist jitters on each count (Rock.. Paper.. Scissors.. SHOOT!) with woodblock ticks. |
| **Rock Crush** | Rock vs Scissors. | Boulder smash impact, stone debris particles 🪨, screen recoil. |
| **Scissors Snip** | Scissors vs Paper. | Sharp twin blades snipping across paper with paper shreds ✂️. |
| **Paper Wrap** | Paper vs Rock. | Paper wrapping envelope around rock with spiral ribbons 📜. |
| **Clash / Tie** | Same choice chosen. | Sparks flying from central collision 💥 with rebound bounce. |

---

### 3.7 Dots & Boxes
**Implementation**: [`client/src/games/dotsboxes/DotsBoxesAnimations.tsx`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/client/src/games/dotsboxes/DotsBoxesAnimations.tsx)

| Event | Trigger | Expected Visual & Audio Feedback |
|---|---|---|
| **Box Capture** | Complete 4th side of box. | Snappy 750ms comic burst `"MINE!"` 📦✨✏️, pencil line fill, instant tap-to-dismiss. |
| **Box Master Victory** | All boxes claimed. | Floating Crown 👑, `"BOX MASTER!"` banner, fireworks finale. |

---

### 3.8 Word Building
**Implementation**: [`client/src/games/wordbuilding/WordBuildingAnimations.tsx`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/client/src/games/wordbuilding/WordBuildingAnimations.tsx)

| Event | Trigger | Expected Visual & Audio Feedback |
|---|---|---|
| **Valid Word Score** | Submit valid dictionary word. | Green ink stamp draw, `"EXCELLENT!"` / `"BRILLIANT!"` badge, flying score stars. |
| **Invalid Word Shake** | Submit invalid word. | Red horizontal wobble/shake, buzzer sound ❌, pencil scratch. |

---

### 3.9 Bingo
**Implementation**: [`client/src/games/bingo/BingoAnimations.tsx`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/client/src/games/bingo/BingoAnimations.tsx)

| Event | Trigger | Expected Visual & Audio Feedback |
|---|---|---|
| **Ball Announcement** | Number called. | Wooden bingo ball rolling into viewport with cage spin sound. |
| **Ink Stamp** | Click called number. | Wet ink dab / stamp effect 🔴 with splash particles. |
| **Line Bingo** | Complete 5 in a row/col. | Laser line strike through row, `"B-I-N-G-O!"` comic badge. |
| **Full House** | Complete 25 numbers. | Giant golden jackpot explosion 💥, confetti rain, fanfare. |

---

### 3.10 Star Game
**Implementation**: [`client/src/games/stargame/StarAnimations.tsx`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/client/src/games/stargame/StarAnimations.tsx)

| Event | Trigger | Expected Visual & Audio Feedback |
|---|---|---|
| **Star Trail** | Move star piece. | Luminous cosmic light trail following the piece. |
| **Supernova Victory** | Complete star constellation. | Stellar supernova burst, cosmic dust galaxy spiral, starry victory banner. |

---

### 3.11 Chess
**Implementation**: [`client/src/games/chess/ChessAnimations.tsx`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/client/src/games/chess/ChessAnimations.tsx)

| Event | Trigger | Expected Visual & Audio Feedback |
|---|---|---|
| **Check Flash** | King in check. | Red pulse around king cell, alert chime, `"CHECK!"` banner. |
| **Checkmate Strike** | Checkmate delivered. | Lightning strike onto winning board, golden crown 👑, `"CHECKMATE!"` finale. |

---

### 3.12 Name Place Animal Thing
**Implementation**: [`client/src/games/namesplaceanimal/NpatAnimations.tsx`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/client/src/games/namesplaceanimal/NpatAnimations.tsx)

| Event | Trigger | Expected Visual & Audio Feedback |
|---|---|---|
| **Panic Timer Pulse** | Last 10s of round. | Pulsing red vignette, ticking clock audio heartbeat. |
| **Category Stamp** | Submitting answer. | Ink stamped approved / review badges. |

---

## 4. Accessibility & Reduced Motion Verification

Every animation in BHALYAM strictly adheres to the platform's accessibility rules:

1. **`prefers-reduced-motion` Compliance**:
   - In your OS or browser settings, enable **"Reduce Motion"** / **"Remove animations"**.
   - Verify that camera shakes, high-velocity particle storms, and heavy zooms smoothly degrade to subtle opacity transitions.
2. **Non-Blocking Pointer Events**:
   - All full-screen celebration layers have `pointer-events-none` or support instant tap/keypress dismissal (`pointerdown` / `keydown`).
   - Tapping anywhere during a celebration immediately clears the overlay so gameplay is never blocked.

---

## 5. Automated Health Checks

To verify code cleanliness and system integrity at any time:

```powershell
# Verify 0 TypeScript Errors in Client
cd client
npm run typecheck

# Verify 808 Server Tests Pass (Across 99 Test Suites)
cd ../server
npm test
```
