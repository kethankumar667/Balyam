# BHALYAM Prompting Guide & RIC-EFC Framework

> **Framework:** RIC-EFC (Role • Intent • Context • Examples • Format • Constraints)  
> **Purpose:** Standardize high-precision, production-grade instructions for all AI coding assistants in BHALYAM.

---

## 1. The RIC-EFC Prompt Structure

Every complex prompt dispatched to an AI agent in BHALYAM must follow the mandatory 6-part RIC-EFC format:

```markdown
## ROLE
Define the senior cognitive perspective (e.g., Principal Software Architect, Staff Frontend Engineer, Gaming UX Specialist).

## INTENT
State the high-level objective and the core problem being solved.

## CONTEXT
Provide exact architectural context, existing files, state shapes, constraints, and dependencies.

## EXAMPLES
Show concrete input/output examples, before-and-after scenarios, or reference implementations.

## FORMAT
Define the exact deliverables, file paths, and output format required.

## CONSTRAINTS
State all hard boundaries (no Redis, no external DB in game loop, zero any types, dual layouts mandatory, 100/100 quality gates).
```

---

## 2. Prompt Quality Scoring Rubric (0–100)

| Score Tier | Quality Characteristics | Action |
| :--- | :--- | :--- |
| **90–100 (Exemplary)** | Full RIC-EFC structure, concrete constraints, file path references, explicit validation commands. | Ready for AI execution. |
| **70–89 (Adequate)** | Clear intent and context, but missing explicit testing or responsive device requirements. | Enhance constraints before run. |
| **< 70 (Flawed)** | Vague, single-line prompt lacking architectural boundaries (*"Fix the UI"* or *"Make a new game"*). | **Reject and rewrite using RIC-EFC.** |

---

## 3. Common Prompt Anti-Patterns

1. **Anti-Pattern 1: The Ambiguous Feature Request**
   - ❌ *"Add chat to the game."*
   - ✅ *Specify channel scope (room-only), rate limits (5 msgs/sec), sanitization rules, and keyboard shortcut (`Enter`).*
2. **Anti-Pattern 2: The Unconstrained Refactor**
   - ❌ *"Clean up the room store."*
   - ✅ *Specify backward compatibility, state transition invariants, test coverage preservation, and zero regression requirements.*
3. **Anti-Pattern 3: Ignoring Dual Layouts**
   - ❌ *"Build the Carrom board."*
   - ✅ *Explicitly demand `<Game>BoardMobile.tsx` (touch-first) and `<Game>BoardDesktop.tsx` (side-rail layout).*

---

## 4. BHALYAM Reference Prompt Templates

### Template A: New Multiplayer Game Implementation
```markdown
## ROLE
Principal Game Systems Architect, Staff React Engineer, and Multiplayer Engine Specialist.

## INTENT
Implement [Game Name] as a server-authoritative multiplayer game in BHALYAM.

## CONTEXT
- Server engine implements `GameEngine<TState, TPublicState, TMove>` in `server/src/games/[game]/`.
- Shared types in `shared/types.ts` with `GameKind = "[game]"`.
- Client uses `useViewport` in `client/src/games/[game]/[Game]Board.tsx` selecting between `[Game]BoardMobile.tsx` and `[Game]BoardDesktop.tsx`.

## EXAMPLES
Reference `server/src/games/rummy/` and `client/src/games/rummy/` for the gold-standard architecture.

## FORMAT
- `shared/types.ts`
- `server/src/games/[game]/[Game]Engine.ts`
- `server/src/games/[game]/__tests__/[game]Engine.test.ts`
- `client/src/games/[game]/[Game]Board.tsx`
- `client/src/games/[game]/[Game]BoardMobile.tsx`
- `client/src/games/[game]/[Game]BoardDesktop.tsx`

## CONSTRAINTS
- Strict TypeScript (0 errors).
- Server remains 100% authoritative.
- Touch targets >= 44x44px on mobile.
- Zero skipped tests; 100/100 on `npm run enterprise:check`.
```
