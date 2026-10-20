import { describe, it, expect } from "vitest";
import type { Server } from "socket.io";
import { RoomManager, type Room } from "../RoomManager.js";
import { roomModeId, scoreModeOptions } from "../roomModeId.js";
import { scorecardService } from "../../profile/ScorecardService.js";
import {
  DEFAULT_BINGO_OPTIONS,
  DEFAULT_CHESS_OPTIONS,
  DEFAULT_DOTSBOXES_OPTIONS,
  DEFAULT_HC_OPTIONS,
  DEFAULT_NAMESPLACEANIMAL_OPTIONS,
  DEFAULT_RUMMY_OPTIONS,
  DEFAULT_SNAKE_OPTIONS,
  DEFAULT_SNL_OPTIONS,
  DEFAULT_STARGAME_OPTIONS,
  DEFAULT_TICTACTOE_OPTIONS,
  DEFAULT_UNO_OPTIONS,
  DEFAULT_WORDBUILDING_OPTIONS,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from "@shared/types.js";

/**
 * A finished match used to be filed under its game's DEFAULT mode unless it was Tic Tac Toe: the
 * server never handed the room's options to `resolveModeId`. A Rummy Pool 101 win, a UNO race to 500
 * and a Snakes & Ladders "hard" board all landed on the same row as the easiest variant.
 */
describe("roomModeId: the mode a room's match is filed under", () => {
  it("follows what the host chose, for every game whose lobby offers a choice", () => {
    expect(roomModeId({ game: "rummy", rummyOptions: { ...DEFAULT_RUMMY_OPTIONS, mode: "pool101" } })).toBe("pool101");
    expect(roomModeId({ game: "rummy", rummyOptions: { ...DEFAULT_RUMMY_OPTIONS, mode: "pool201" } })).toBe("pool201");
    expect(roomModeId({ game: "uno", unoOptions: { ...DEFAULT_UNO_OPTIONS, targetScore: 500 } })).toBe("race_500");
    expect(roomModeId({ game: "snl", snlOptions: { ...DEFAULT_SNL_OPTIONS, difficulty: "hard" } })).toBe("hard");
    expect(roomModeId({ game: "dotsboxes", dotsBoxesOptions: { ...DEFAULT_DOTSBOXES_OPTIONS, boardSize: 9 } })).toBe("grid_9x9");
    expect(
      roomModeId({ game: "wordbuilding", wordBuildingOptions: { ...DEFAULT_WORDBUILDING_OPTIONS, dictionaryMode: "tournament", boardSize: 8 } }),
    ).toBe("tournament_8x8");
    expect(roomModeId({ game: "handcricket", hcOptions: { ...DEFAULT_HC_OPTIONS, format: "odi" } })).toBe("odi");
    expect(roomModeId({ game: "handcricket", hcOptions: { ...DEFAULT_HC_OPTIONS, mode: "galli", galliOvers: 12 } })).toBe("galli_long");
    expect(roomModeId({ game: "stargame", starGameOptions: { ...DEFAULT_STARGAME_OPTIONS, totalRounds: 7 } })).toBe("extended_7");
    expect(roomModeId({ game: "bingo", bingoOptions: { ...DEFAULT_BINGO_OPTIONS, stopOnFirstWin: false } })).toBe("all_win");
    expect(
      roomModeId({ game: "namesplaceanimal", namesplaceanimalOptions: { ...DEFAULT_NAMESPLACEANIMAL_OPTIONS, totalRounds: 10 } }),
    ).toBe("marathon_10rds");
    expect(roomModeId({ game: "chess", chessOptions: { ...DEFAULT_CHESS_OPTIONS, timeControl: "rapid_10_0", initialSeconds: 600 } })).toBe("rapid_10m");
    expect(roomModeId({ game: "snake", snakeOptions: { ...DEFAULT_SNAKE_OPTIONS, wallMode: "solid", speedMs: 70 } })).toBe("speed_rush");
    expect(roomModeId({ game: "tictactoe", ticTacToeOptions: { ...DEFAULT_TICTACTOE_OPTIONS, mode: "classic" } })).toBe("classic");
  });

  it("files a room created with the lobby defaults under the mode those defaults mean", () => {
    expect(roomModeId({ game: "rummy", rummyOptions: DEFAULT_RUMMY_OPTIONS })).toBe("single");
    expect(roomModeId({ game: "uno", unoOptions: DEFAULT_UNO_OPTIONS })).toBe("single");
    expect(roomModeId({ game: "snl", snlOptions: DEFAULT_SNL_OPTIONS })).toBe("medium");
    expect(roomModeId({ game: "dotsboxes", dotsBoxesOptions: DEFAULT_DOTSBOXES_OPTIONS })).toBe("grid_7x7");
    expect(roomModeId({ game: "wordbuilding", wordBuildingOptions: DEFAULT_WORDBUILDING_OPTIONS })).toBe("classroom_10x10");
    expect(roomModeId({ game: "handcricket", hcOptions: DEFAULT_HC_OPTIONS })).toBe("t20");
    expect(roomModeId({ game: "bingo", bingoOptions: DEFAULT_BINGO_OPTIONS })).toBe("first_win");
    expect(roomModeId({ game: "namesplaceanimal", namesplaceanimalOptions: DEFAULT_NAMESPLACEANIMAL_OPTIONS })).toBe("medium_5rds");
    expect(roomModeId({ game: "stargame", starGameOptions: DEFAULT_STARGAME_OPTIONS })).toBe("classic_5");
    expect(roomModeId({ game: "chess", chessOptions: DEFAULT_CHESS_OPTIONS })).toBe("blitz_3m");
    // Snake's engine default is the wrapping board, which is the "Wrap" row, not the walled one.
    expect(roomModeId({ game: "snake", snakeOptions: DEFAULT_SNAKE_OPTIONS })).toBe("borderless_wrap");
  });

  it("gives a game with one mode that mode, and a game it has never heard of its default", () => {
    expect(roomModeId({ game: "ludo" })).toBe("classic_4token");
    expect(roomModeId({ game: "connect4" })).toBe("classic");
    expect(roomModeId({ game: "rps" })).toBe("first_to_10");
    expect(scoreModeOptions({ game: "ludo" })).toBeUndefined();
  });
});

describe("a Snake match is recorded by the server under the lobby's wall and speed choice", () => {
  const MEMBER = "bbbbbbbb-1111-2222-3333-444444444444";
  const SNAKE_OPTIONS_SLOT = 14; // socketId, name, game, then the per-game option slots in order

  function makeRooms() {
    const io = {
      to: () => ({ emit: () => {} }),
      sockets: { sockets: { get: () => ({ join() {}, leave() {}, emit: () => {} }) } },
    } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;
    return new RoomManager(io);
  }

  function createSnakeRoom(rooms: RoomManager, identityId: string, snakeOptions: object): Room {
    const args: unknown[] = ["sock-snake", "Solo", "snake", ...Array(rooms.createRoom.length - 3).fill(undefined)];
    args[SNAKE_OPTIONS_SLOT] = snakeOptions;
    args[rooms.createRoom.length - 3] = "member";
    args[rooms.createRoom.length - 2] = identityId;
    const created = rooms.createRoom(...(args as Parameters<RoomManager["createRoom"]>));
    return (rooms as unknown as { rooms: Map<string, Room> }).rooms.get((created as unknown as { code: string }).code)!;
  }

  it("files a solid-wall, 70ms match under Speed Rush", async () => {
    const rooms = makeRooms();
    const fast = createSnakeRoom(rooms, MEMBER, { wallMode: "solid", speedMs: 70 });
    rooms.setReady("sock-snake", true);
    await rooms.requestGameStart("sock-snake");
    expect(fast.phase).toBe("playing");

    (rooms as unknown as { recordPostMatchStats(room: Room): void }).recordPostMatchStats(fast);

    const snake = scorecardService.getScorecards(MEMBER).games["snake"];
    expect(Object.keys(snake?.modes ?? {})).toEqual(["speed_rush"]);
  });
});
