import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { GAME_LIMITS } from "@shared/catalog";
import type { GameKind } from "@shared/types";
import { BHALYAM_GAMES, isLocked } from "../../../components/bhalyam/data";
import { gameLaunch } from "../../../lib/gameLaunch";
import { inviteFriendFor, rememberInviteFriend, resetInviteFriends } from "../../../lib/inviteFriend";
import { PlayTogetherButton } from "../PlayTogetherButton";
import { friendInviteMessage, PLAY_TOGETHER_GAMES, playTogetherHandOff } from "../playTogether";

const navigate = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async importOriginal => ({
  ...await importOriginal<typeof import("react-router-dom")>(),
  useNavigate: () => navigate,
}));

beforeEach(() => { vi.clearAllMocks(); resetInviteFriends(); });
afterEach(cleanup);

describe("the games offered for a pair", () => {
  it("only lists games two people can play, that the catalog can launch", () => {
    for (const { slug } of PLAY_TOGETHER_GAMES) {
      const limits = GAME_LIMITS[slug as GameKind];
      expect(limits.min, slug).toBeLessThanOrEqual(2);
      expect(limits.max, slug).toBeGreaterThanOrEqual(2);
      expect(BHALYAM_GAMES.some(game => game.slug === slug), slug).toBe(true);
    }
  });

  it("offers every multiplayer room game a pair can play, from the catalogue", () => {
    const offered = PLAY_TOGETHER_GAMES.map(game => game.slug);
    for (const slug of ["rps", "handcricket", "ludo", "dotsboxes", "rummy", "uno", "tictactoe", "connect4", "chess", "snl", "wordbuilding"]) {
      expect(offered, slug).toContain(slug);
    }
    // Independent of the helper: every catalogue room game whose limits allow two, and nothing else.
    const expected = BHALYAM_GAMES
      .filter(card => !isLocked(card) && gameLaunch(card.slug).kind === "room-sheet")
      .filter(card => { const limits = GAME_LIMITS[card.slug as GameKind]; return limits !== undefined && limits.min <= 2 && limits.max >= 2; })
      .map(card => card.slug);
    expect(offered).toEqual(expected);
  });

  it("never offers a solo game, a browser-only game or one under maintenance", () => {
    const offered = PLAY_TOGETHER_GAMES.map(game => game.slug as string);
    for (const slug of ["spacewar", "snake", "roadrash", "nokiacricket", "brickblocks", "breakout", "2048", "sudoku", "brainvita"]) {
      expect(offered, slug).not.toContain(slug);
    }
    for (const card of BHALYAM_GAMES.filter(card => isLocked(card))) expect(offered, card.slug).not.toContain(card.slug);
  });

  it("says who each game takes and how long it runs, so the choice is informed", () => {
    const ludo = PLAY_TOGETHER_GAMES.find(game => game.slug === "ludo");
    expect(ludo?.hint).toBe("2–8 Players · 10–30 min");
    for (const game of PLAY_TOGETHER_GAMES) expect(game.hint.length, game.slug).toBeGreaterThan(0);
  });

  it("hands the game and the friend to the create-room sheet", () => {
    expect(playTogetherHandOff("ludo", "Meera")).toEqual({ newRoom: "ludo", inviteFriend: "Meera" });
  });

  it("names the friend in the share message without putting the link in the text", () => {
    const text = friendInviteMessage("Meera", "Ludo", "ABC234");
    expect(text).toContain("Meera, I'm waiting for you in Ludo");
    expect(text).toContain("ABC234");
    expect(text).not.toMatch(/https?:/);
  });
});

describe("the in-memory friend handoff", () => {
  it("remembers a friend by room code, whatever the case", () => {
    rememberInviteFriend("abc234", "Meera");
    expect(inviteFriendFor("ABC234")).toBe("Meera");
  });

  it("knows nothing about a room it was never told about", () => {
    expect(inviteFriendFor("ZZZ999")).toBeNull();
  });

  it("trims and caps the name, and ignores an empty one", () => {
    rememberInviteFriend("ABC234", `  ${"x".repeat(40)}  `);
    expect(inviteFriendFor("ABC234")).toHaveLength(20);
    rememberInviteFriend("DEF567", "   ");
    expect(inviteFriendFor("DEF567")).toBeNull();
  });
});

describe("PlayTogetherButton", () => {
  const open = () => render(<MemoryRouter><PlayTogetherButton friendName="Meera" /></MemoryRouter>);

  it("names the friend and offers the games only once asked", () => {
    open();
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /play with meera/i }));
    expect(screen.getByRole("group", { name: /pick a game to play with meera/i })).toBeInTheDocument();
    for (const game of PLAY_TOGETHER_GAMES) expect(screen.getByRole("button", { name: new RegExp(game.label, "i") })).toBeInTheDocument();
  });

  it("opens the create-room sheet for the chosen game, for that friend", () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: /play with meera/i }));
    fireEvent.click(screen.getByRole("button", { name: /hand cricket/i }));
    expect(navigate).toHaveBeenCalledWith("/", { state: { newRoom: "handcricket", inviteFriend: "Meera" } });
  });

  it("says a match against a bot does not count", () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: /play with meera/i }));
    expect(screen.getByText(/match against a bot does not count/i)).toBeInTheDocument();
  });

  it("can be closed again", () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: /play with meera/i }));
    fireEvent.click(screen.getByRole("button", { name: /close game list/i }));
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
  });
});
