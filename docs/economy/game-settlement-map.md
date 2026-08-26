# Game Engine Settlement & Placement Map

> **Status:** AUDIT & DISCOVERY ONLY — NO CODE CHANGES APPLIED  
> **Scope:** Complete analysis of all 17 BHALYAM game engines for Economy V1 winner determination, multi-tier ranking, draw handling, and tie-breaking.

---

## 1. Executive Summary & Economy Resolution Principles

Economy V1 requires deterministic 1st, 2nd, and 3rd place rankings to disburse prize schedules.
- **Rule 1 (Strict Ranking):** Each game must produce unambiguous single-occupant placements for prize positions.
- **Rule 2 (Draw / Tie Policy — no invented tie-breakers):** Prize positions must be separated by
  the game engine's own authoritative outcome (e.g. an explicit `finishOrder`, a score the engine
  itself computed as part of normal play). **Economy V1 does not introduce secondary
  tie-breaking heuristics that the engine does not already produce as part of its normal
  result** (arbitrary criteria such as "earliest to join," "fewest rolls taken," or "fewest
  remaining unmarked cells" invented purely to force a ranking are out of scope and were removed
  from this document during remediation — see finding M4). Any placement ambiguity at a paid
  position — 1st, 2nd, or 3rd, whichever positions the seat-count's prize schedule actually pays
  — is **not a valid ranked result, full stop**, and triggers a **full match refund** to the
  host via `settle_match_economy(..., p_is_valid_ranking := false, ...)`. Prizes are never
  split, and a match is never partially settled with some positions paid and others refunded.
- **Rule 3 (Solo Games):** Solo games (1 player) always allocate 100% of the committed entry fee to the World Bank Treasury.

---

## 2. Comprehensive Game Catalog Settlement Matrix

| Game | Engine File | Player Limits | Winner Determination | Placement (Rank 1–5) Derivation | Draw / Tie Scenarios & Economy V1 Resolution |
|---|---|---|---|---|---|
| **Ludo** | `server/src/games/ludo/LudoEngine.ts` | 2 – 8 | First player to get all 4 tokens to home center (`finishOrder[0]`). | `finishOrder` array directly records order of finishing (1st, 2nd, 3rd...). Remaining players ranked by tokens home + track progress. | **No Draw.** Tokens reach home sequentially. If abandoned mid-game, remaining human receives default 1st place. |
| **Chess** | `server/src/games/chess/ChessEngine.ts` | 2 | Checkmate or timeout of opponent (`winnerId`). | Winner: 1st place; Loser: 2nd place. | **Draws Possible** (Stalemate, 3-fold repetition, 50-move rule, mutual agreement, insufficient material). **V1 Resolution: Full match refund.** |
| **Carrom** | `server/src/games/carrom/CarromEngine.ts` | 2 | First player to clear all pieces of their assigned color with queen covered (`winnerId`). | Winner: 1st place (score > opponent); Loser: 2nd place. | **No Draw.** Game continues until one player legally pockets all their pieces. Foul penalty points prevent deadlocks. |
| **Rummy** | `server/src/games/rummy/RummyEngine.ts` | 2 – 6 | Player who successfully makes a valid declaration with 0 penalty points (`winnerId`). | Ranked in ascending order of penalty points: 1st = 0 pts (winner), 2nd = lowest penalty, 3rd = next lowest. | **Ties in 2nd/3rd:** If non-winners have identical penalty points at a paid position, the ranking is ambiguous — no heuristic is applied. **V1 Resolution: Full match refund.** |
| **UNO** | `server/src/games/uno/UnoEngine.ts` | 2 – 6 | First player to discard all cards in hand (`roundWinnerId` / `matchWinnerId`). | 1st: Round winner. 2nd–5th: Ranked in ascending order of points remaining in hands (number cards = face value, action = 20, wild = 50). | **Ties in 2nd/3rd:** If two players hold identical remaining points at a paid position, the ranking is ambiguous — the match is **not** partially settled. **V1 Resolution: Full match refund.** |
| **Hand Cricket** | `server/src/games/handcricket/HandCricketEngine.ts` | 2 | Team with higher aggregate runs across 2 innings (`winnerId`). | Higher score: 1st place; Lower score: 2nd place. | **Ties Possible** (Innings 2 runs equal Innings 1 runs with all wickets lost). **V1 Resolution: Full match refund.** |
| **Snakes & Ladders** | `server/src/games/snl/SnlEngine.ts` | 2 – 6 | First token to land exactly on square 100 (`winnerId`). | 1st: Player on square 100. 2nd–5th: Ranked by final board square position descending. | **Ties in 2nd/3rd:** If two players are on the same square at a paid position, the ranking is ambiguous — no heuristic is applied. **V1 Resolution: Full match refund.** |
| **Snake** | `server/src/games/snake/SnakeEngine.ts` | 1 – 4 | Last surviving snake, or highest pellet score on timeout / simultaneous crash (`winnerId`). | 1st: Winner. 2nd–4th: Ranked by survival timestamp descending, then by pellet score. | **Simultaneous Crash:** If last 2 snakes collide on the exact same tick with identical scores $\rightarrow$ **V1 Resolution: Full match refund.** |
| **Block Blast** | `server/src/games/blockblast/BlockBlastEngine.ts` | 1 – 4 | Highest score when clock runs out or solo board fills (`winnerId`). | Ranked by score descending: 1st = highest score, 2nd = second highest, etc. | **Ties in Score:** Sorted by best line clear combo. If identical scores across top players $\rightarrow$ **V1 Resolution: Full match refund.** |
| **SpaceWar** | `server/src/games/spacewar/SpaceWarEngine.ts` | 1 | Solo arcade mode: survives waves / defeats boss (`winnerId`). | Solo player takes position 1. | **Solo Mode:** 100% of committed fee allocated to World Bank Treasury. |
| **Rock Paper Scissors** | `server/src/games/rps/RpsEngine.ts` | 2 | First player to reach target score of 10 (`winnerId`). | 1st: Reached 10 points. 2nd: Trailing player. | **Individual Rounds Can Tie**, but match loop continues until one player reaches 10. **No match tie possible.** |
| **Dots & Boxes** | `server/src/games/dotsboxes/DotsBoxesEngine.ts` | 2 – 6 | Player with the highest count of completed boxes when grid is full (`winnerId`). | Ranked by box count descending: 1st = max boxes, 2nd = second max boxes. | **Ties in Top Score:** If two players tie for 1st place (e.g. 8 boxes each on a 4x4 grid) $\rightarrow$ `winnerId = null`. **V1 Resolution: Full match refund.** |
| **Star Game** | `server/src/games/stargame/StarGameEngine.ts` | 2 – 4 | First player to capture target star count or eliminate opponent pieces (`winnerId`). | Ranked by captured stars descending, then by remaining pieces on board. | **Ties in 1st:** If score is equal upon max turns $\rightarrow$ **V1 Resolution: Full match refund.** |
| **Bingo** | `server/src/games/bingo/BingoEngine.ts` | 2 – 6 | First player to complete 5 lines (B-I-N-G-O) and declare valid claim (`winnerId`). | 1st: 5 lines completed. 2nd–5th: Ranked by lines completed (4, 3, 2, 1, 0) and total numbers marked. | **Simultaneous Claims:** If two players claim on the same called number, the ranking is ambiguous at that position — no heuristic is applied. **V1 Resolution: Full match refund.** |
| **Tambola** | `server/src/games/tambola/TambolaEngine.ts` | 2 – 8 | Full House winner or highest points across early 5 / lines (`winnerId`). | 1st: Full house winner. 2nd: Top line / middle line winners. 3rd: Early 5 claimers. | **Simultaneous Claims:** Earliest validated claim wins the tier. |
| **Name Place Animal** | `server/src/games/namesplaceanimal/NamePlaceAnimalEngine.ts` | 2 – 6 | Highest cumulative score across rounds (`winnerId`). | Ranked by total unique valid entries score descending. | **Tied Top Score:** If top score is tied across multiple players $\rightarrow$ **V1 Resolution: Full match refund.** |
| **Word Building** | `server/src/games/wordbuilding/WordBuildingEngine.ts` | 2 – 4 | Highest score from valid dictionary words or last player standing before turn timeout. | Ranked by cumulative word length and bonus tile points descending. | **Tied Top Score:** Sorted by longest single word played. If identical $\rightarrow$ **V1 Resolution: Full match refund.** |

---

## 3. Placement Extraction Architecture

A unified settlement adapter will be implemented in `EconomyService` to normalize game engine results into a standard participant ranking structure:

```typescript
export interface RankedParticipant {
  identityId: string;
  identityKind: "member" | "guest" | "bot";
  placement: number; // 1, 2, 3, 4, 5
  score?: number;
  voucherCodeHash?: string; // Generated for guest winners
}

export function extractPlacements(engine: GameEngine, players: Map<string, Player>): RankedParticipant[] {
  // 1. Check if engine provides native finishOrder (e.g. Ludo)
  // 2. Otherwise sort by scores (Rummy penalty asc, Dots & Boxes / Uno / BlockBlast score desc)
  // 3. Detect unresolvable ties at any paid position (not just 1st) -> flag for refund
  // 4. Return ordered RankedParticipant array
}
```
