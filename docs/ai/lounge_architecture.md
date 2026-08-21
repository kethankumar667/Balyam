# BHALYAM Lounge & Game Discovery — Architectural Blueprint & Taxonomy Specification

> **Milestone 01 & 02 Specification**  
> **Target Subsystem: BHALYAM Lounge (`/` and `/lounge`)**  
> **Status: Architecture Locked**

---

## 1. Executive Summary & Purpose

The **BHALYAM Lounge** is the heart of the platform. It is not an analytical dashboard or an e-commerce grid. It is a **vibrant, warm childhood gaming lounge** where players immediately feel at home, discover beloved traditional games, and seamlessly initiate multiplayer matches with family and friends.

### Three Primary User Questions Answered Instantly:
1. **What can I play?** $\rightarrow$ Complete, curated catalogue of 18+ traditional and retro handheld games.
2. **What should I play right now?** $\rightarrow$ Discovery by **Nostalgia Memory Worlds** (*School Break*, *Rainy Evening*, *Sunday Afternoon*, *Friends' Adda*) rather than sterile database categories.
3. **Can I quickly jump into a game?** $\rightarrow$ One-click **Continue Playing / Active Room** banner, instant **Create Room**, and direct **Join by Code**.

---

## 2. Information Architecture (Top to Bottom)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        GLOBAL APPLICATION HEADER                       │
│  [Logo / Brand]                    [Language] [Theme] [Profile Avatar] │
├────────────────────────────────────────────────────────────────────────┤
│ 1. LOUNGE HERO & WELCOME BANNER                                        │
│    • Welcome greeting with player's live name                          │
│    • Quick stats chip (Lifetime XP / Current Level)                    │
│    • Primary CTAs: [ Create Room ] [ Join by Code ]                    │
├────────────────────────────────────────────────────────────────────────┤
│ 2. RESUME / CONTINUE PLAYING (Dynamic)                                 │
│    • Appears only when player has an active room or recent match       │
│    • Card: "Active Ludo Match in Room #LX49A" -> [ Rejoin Game ]       │
├────────────────────────────────────────────────────────────────────────┤
│ 3. NOSTALGIA WORLDS (Discovery by Mood & Memory)                       │
│    [🏫 School Break]  [🌧 Rainy Evening]  [☀️ Sunday Afternoon]  [👬 Friends' Adda] │
│    • Selecting a world filters games to that specific childhood memory │
├────────────────────────────────────────────────────────────────────────┤
│ 4. DISCOVERY CONTROL STRIP                                             │
│    • 🔍 Search games by name, genre, or rules                          │
│    • Filter Pills: [All] [Popular] [2 Players] [3-4 Players] [5+ Group]│
│    • Time Filter: [Quick <10m] [Medium 15-30m] [Long 30m+]             │
├────────────────────────────────────────────────────────────────────────┤
│ 5. UNIVERSAL GAME GRID (Powered by `<GameTile />`)                    │
│    • Responsive 1-col (mobile) -> 2-col (tablet) -> 3/4-col (desktop)  │
│    • Rich cover artwork, title, Telugu subtitle, tagline, player count │
│    • Favorite heart button + Quick Play affordance                     │
├────────────────────────────────────────────────────────────────────────┤
│ 6. GAME DETAILS SHEET / MODAL (Triggered on Tile Click)                │
│    • Hero artwork & memory quote                                       │
│    • How to Play step-by-step rules summary                            │
│    • Action Rail: [ Create Private Room ] [ Play vs Bots ] [ Join Code]│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Four Nostalgia Worlds (Memory-First Discovery)

| Nostalgia World | Childhood Mood & Context | Games Included |
| :--- | :--- | :--- |
| **🏫 School Break** | Played between bells, under wooden desks, and on the back page of rough notebooks. | Hand Cricket, Dots & Boxes, Name Place Animal Thing, Rock Paper Scissors, Word Building, Star Game, Bingo |
| **🌧 Rainy Evening** | Unrushed, cozy strategy when rain trapped cousins and siblings indoors with hot chai. | Snakes & Ladders, Indian Rummy, UNO, Word Building, Block Blast, Chess |
| **☀️ Sunday Afternoon** | Grand post-lunch family tournaments across the living room carpet. | Ludo, Carrom, Chess, Tambola, Indian Rummy, Star Game, Nokia Snake |
| **👬 Friends' Adda** | High-energy gatherings on the veranda with noisy laughter and friendly rivalries. | UNO, Hand Cricket, Carrom, Tambola, Bingo, Road Rash, Rock Paper Scissors |

---

## 4. Central Game Taxonomy Schema

The single source of truth is declared in [`shared/catalog.ts`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/shared/catalog.ts):

```typescript
export interface GameCatalogueItem {
  id: BhalyamGameSlug;
  name: string;
  teluguName?: string;
  tagline: string;
  shortDescription: string;
  description: string;
  nostalgiaQuote: string;
  minPlayers: number;
  maxPlayers: number;
  playTime: string;
  playTimeCategory: "quick" | "medium" | "long";
  difficulty: "easy" | "medium" | "hard";
  genre: "board" | "card" | "casual" | "word" | "dice" | "arcade" | "sports";
  tags: readonly string[];
  nostalgiaWorlds: readonly NostalgiaWorldId[];
  supportedModes: readonly GamePlayMode[];
  supportsBots: boolean;
  isPopular: boolean;
  isClassic: boolean;
  availability: "playable" | "maintenance" | "coming_soon";
  accent: { from: string; to: string };
  thumbnail: string;
  heroAsset: string;
  howToPlay: readonly GameHowToPlayStep[];
}
```

---

## 5. Architectural Separation of Concerns

> [!IMPORTANT]
> **Strict Separation Rule:**  
> The Lounge subsystem owns **discovery, metadata querying, filtering, search, and room initiation**.  
> The Game Engines own **board rendering, move rules, turn management, and scoring**.  
> The Lounge NEVER parses or calculates internal game state moves.

---

## 6. Zero-State Contracts & Progressive Disclosure

1. **Brand-New Player**:
   - *Continue Playing* section remains cleanly hidden (no empty container).
   - *Recently Played* falls back to *Popular Childhood Legends*.
2. **Search With No Matches**:
   - Renders a warm, illustrated empty state:
     *"Couldn't find that game. Try searching for Ludo, Rummy, or Hand Cricket, or explore All Games."*
   - Includes a one-click `[ Reset Search & Filters ]` CTA.
3. **Loading State**:
   - `LoungeSkeleton` renders animated pulsating placeholder cards matching the exact grid geometry to prevent layout shift.
