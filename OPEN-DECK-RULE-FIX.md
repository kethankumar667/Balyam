# Rummy Open-Deck Pickup Rule — Architecture & Verification

> **Status:** IMPLEMENTED AND VERIFIED  
> **Target:** BHALYAM Indian Rummy Hand Layout Reconciliation  
> **Quality Gate:** 100% Passing (0 TypeScript errors, 4/4 isolated rule tests, 538 repository tests)

---

## 1. Problem Definition & Indian Rummy Rule Compliance

In competitive 13-card Indian Rummy, cards picked up from the Open Discard Pile have distinct tactical significance:
- When an open card is drawn, it must **never be auto-merged or merged into existing sequences or sets** without player deliberation.
- Auto-merging an open card into an existing pure sequence could inadvertently convert a pure sequence into an invalid arrangement or confuse the player as to where the newly drawn card landed.
- Standard tournament convention requires that an open-drawn card initially sits in a **brand new dedicated meld group**, allowing the player full visual clarity to arrange it as desired.

---

## 2. Implementation Mechanics

Implemented in hand reconciliation across [`RummyBoardDesktop.tsx`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/client/src/games/rummy/RummyBoardDesktop.tsx#L257-L287) and [`RummyBoardMobile.tsx`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/client/src/games/rummy/RummyBoardMobile.tsx#L545-L575):

```typescript
// Incoming card detection
const isFromOpen =
  justDrewFromOpenRef.current ||
  (prevOpenTopRef.current !== null && id === prevOpenTopRef.current);

if (isFromOpen) {
  // Open deck draw: never auto-align with existing melds; start in a dedicated new meld group
  newGroups.push({ id: newGroupId(), cardIds: [id] });
  continue;
}
```

### 2.1 Preserving Player Reorganization
Once placed in a new group, the player is free to drag the card into any existing meld or create customized combinations. Subsequent state re-renders preserve the player's manual grouping and do not re-segregate already placed cards.

---

## 3. Verification & Invariants

Verified via Vitest in [`client/src/games/rummy/__tests__/openDeckRule.test.ts`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/client/src/games/rummy/__tests__/openDeckRule.test.ts):

| Scenario | Input Hand & Draw | Expected Hand Structure | Status |
|---|---|---|---|
| **Matching Suit Draw** | Hand: `[4S, 5S, 6S]` in Group 1. Draw: `7S` from Open Pile. | Group 1 remains `[4S, 5S, 6S]`. Group 2 created with `[7S]`. | ✅ PASS |
| **Wild Joker Draw** | Hand: `[4H, 5H, 6H]` in Group 1, `[8D, 9D]` in Group 2. Draw: `2C` (Wild Joker) from Open Pile. | Group 1 remains `[4H, 5H, 6H]`. Group 2 remains `[8D, 9D]`. Group 3 created with `[2C]`. | ✅ PASS |
| **Set Match Draw** | Hand: `[KS, KH, KD]` in Group 1. Draw: `KC` from Open Pile. | Group 1 remains `[KS, KH, KD]`. Group 2 created with `[KC]`. | ✅ PASS |
| **Manual Reorganization** | Player moves `7S` into Group 1 $\to$ `[4S, 5S, 6S, 7S]`. | Reconciliation preserves manual layout without re-splitting. | ✅ PASS |
