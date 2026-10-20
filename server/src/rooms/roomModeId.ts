import { resolveModeId } from "@shared/profile/GameModes.js";

/**
 * The per-game option objects a room carries. Only the games whose lobby choices change which
 * leaderboard mode a match belongs to are listed; every other game has a single mode.
 */
export interface RoomModeSlots {
  game: string;
  hcOptions?: object;
  rummyOptions?: object;
  unoOptions?: object;
  snlOptions?: object;
  dotsBoxesOptions?: object;
  wordBuildingOptions?: object;
  starGameOptions?: object;
  bingoOptions?: object;
  namesplaceanimalOptions?: object;
  chessOptions?: object;
  snakeOptions?: object;
  ticTacToeOptions?: object;
}

/**
 * The options the leaderboard mode is derived from, for a room's game.
 *
 * `RoomManager` used to hand `resolveModeId` an options object for Tic Tac Toe only, so every other
 * multiplayer game was filed under its default mode whatever the host had picked.
 */
export function scoreModeOptions(room: RoomModeSlots): Record<string, unknown> | undefined {
  const slots: Record<string, object | undefined> = {
    handcricket: room.hcOptions,
    rummy: room.rummyOptions,
    uno: room.unoOptions,
    snl: room.snlOptions,
    dotsboxes: room.dotsBoxesOptions,
    wordbuilding: room.wordBuildingOptions,
    stargame: room.starGameOptions,
    bingo: room.bingoOptions,
    namesplaceanimal: room.namesplaceanimalOptions,
    chess: room.chessOptions,
    snake: room.snakeOptions,
    tictactoe: room.ticTacToeOptions,
  };
  return slots[room.game] as Record<string, unknown> | undefined;
}

/** The leaderboard mode a room's match is filed under. */
export function roomModeId(room: RoomModeSlots): string {
  return resolveModeId(room.game, scoreModeOptions(room));
}
