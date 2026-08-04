/**
 * Ludo track rules now live in `shared/ludo-rules.ts` so the client cannot
 * drift from them (it previously kept its own copy in `board-layout.ts` /
 * `predict.ts`, and did drift — see the header there).
 *
 * This file is kept as a re-export so the engine's existing imports keep
 * working and the move is not a big-bang rename.
 */
export * from "@shared/ludo-rules.js";
