# Rummy Hint System — Architectural Design & Implementation

> **Status:** IMPLEMENTED AND VERIFIED  
> **Target:** BHALYAM Indian Rummy (Mobile & Desktop)  
> **Quality Gate:** 100% Passing (0 TypeScript errors, 6/6 isolated hint tests, 538 repository tests)

---

## 1. Executive Summary & Problem Addressed

In online Indian Rummy platforms, intrusive "Auto Play" buttons can accidentally make irreversible moves, rearrange customized card groups without player consent, or strip the player of strategic agency.

Under the BHALYAM platform governance tenets:
- **No Auto-Play Guarantee:** The Hint System never mutates game state, never auto-moves cards, and never auto-discards.
- **Player Retains 100% Control:** The Hint System acts purely as a tactical advisor, calculating and displaying visual/textual advice (draw recommendations, discard guidance, and meld completion status) without touching the player's private hand or dispatching socket moves automatically.

---

## 2. Core Architecture & Pure Hint Engine

The hint generation lives in [`client/src/games/rummy/hintEngine.ts`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/client/src/games/rummy/hintEngine.ts) as a deterministic, pure function:

```typescript
export function generateRummyHint(params: {
  hand: Card[];
  wildRank: Rank;
  turnAction: "draw" | "discardOrDeclare" | null;
  canDraw: boolean;
  canDiscardOrDeclare: boolean;
  topOfOpenPile: Card | null;
  openJokerDrawable: boolean;
  isReadyToDeclare: boolean;
}): RummyHint
```

### 2.1 Decision Logic Matrix

| Game Phase | Hand Condition | Hint Recommendation | Rationale |
|---|---|---|---|
| **Draw Phase** | Open card completes or improves a pure/impure meld or is Wild Joker | `actionType: "draw"`, `recommendedDeck: "open"` | Picking the open card reduces deadwood points or secures a Wild Joker. |
| **Draw Phase** | Open card does not match any sequence/set | `actionType: "draw"`, `recommendedDeck: "closed"` | Drawing unseen card from stockpile preserves hand secrecy and maximizes upside. |
| **Discard Phase** | Hand contains unmatched high-value cards | `actionType: "discard"`, `recommendedCard: bestDiscard` | Suggests discarding the card that minimizes total deadwood penalty points. |
| **Discard Phase** | All 13 cards form valid pure/impure sequences & sets (0 deadwood) | `actionType: "declare"` | Alerts player that hand is complete and ready to finish. |
| **Idle / Opponent Turn** | Waiting for turn | `actionType: "idle"` | Displays current deadwood points, weakest card, and wild joker reminders. |

---

## 3. UI/UX Presentation Layer

1. **[`HintBanner.tsx`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/client/src/games/rummy/HintBanner.tsx):**
   - Accessible banner with `role="region"`, `aria-label="Tactical Move Hint"`.
   - Clear icon cues (lightbulb, pulse effect, ready badges).
   - Dismissible with a single tap (`X` button).
   - Responsive presentation: bottom docked sheet on mobile, centered header card on desktop.

2. **Smart Hint Approval Flow ([`RummyBoardDesktop.tsx`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/client/src/games/rummy/RummyBoardDesktop.tsx) & [`RummyBoardMobile.tsx`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/client/src/games/rummy/RummyBoardMobile.tsx)):**
   - Replaced raw auto-button with `Smart Hint` button.
   - Clicking `Smart Hint` opens a preview banner highlighting proposed groups and recommended discard.
   - Player can review the proposal, click `Approve` to apply the grouping, or `Dismiss` to keep their current layout unchanged.

---

## 4. Verification & Testing

Unit test suite in [`client/src/games/rummy/__tests__/hintEngine.test.ts`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/client/src/games/rummy/__tests__/hintEngine.test.ts):
- ✅ Recommends open deck when card completes or improves a meld.
- ✅ Recommends closed deck when open discard is unhelpful.
- ✅ Recommends drawing open card when it is a Wild Joker.
- ✅ Recommends the highest deadwood card to discard.
- ✅ Recommends declare when hand is fully melded and valid.
- ✅ Invariant: Never mutates input hand arrays or objects.
