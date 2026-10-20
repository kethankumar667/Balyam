import { BHALYAM_GAMES } from "../components/bhalyam/data";

/**
 * Where a game starts, in ONE place.
 *
 * The leaderboard, both scorecard decks, the share link and the create-room sheet each kept their own
 * table, and they disagreed: the leaderboard sent five games to `/games/<slug>` paths the app has no
 * route for (a 404), and sent every room game to `/?game=<slug>`, which nothing reads, so it landed on
 * Home. Anything that starts a game now asks `gameLaunch` / `launchLinkProps`.
 *
 * `gameLaunch.test.ts` checks every route here against `<Route>`s in App.tsx.
 */

/** Games with a page of their own that runs entirely in the browser: no room, no lobby. */
export const CLIENT_GAME_ROUTES: Readonly<Record<string, string>> = {
  nokiacricket: "/nokiacricket",
  // The catalog's "Retro Snake" tile is the slug `snake`, and it opens the same page as `nokiasnake`.
  snake: "/snake",
  nokiasnake: "/nokiasnake",
  roadrash: "/roadrash",
  brickblocks: "/brickblocks",
  // `tetris` is the catalog's alias for brickblocks.
  tetris: "/brickblocks",
  breakout: "/breakout",
  "2048": "/2048",
  sudoku: "/sudoku",
  brainvita: "/brainvita",
};

const GAMES_PAGE = "/games";

export type GameLaunch =
  /** A browser-only game: go straight to its page. */
  | { kind: "page"; to: string }
  /** A game played in a room: open its create-room sheet, the same one a card on the Games page opens. */
  | { kind: "room-sheet"; slug: string }
  /** Nothing in the app can start this game, so land on the catalog instead of a dead end. */
  | { kind: "browse"; to: string };

const hasOwn = (target: object, key: string): boolean => Object.prototype.hasOwnProperty.call(target, key);

export function gameLaunch(game: string): GameLaunch {
  if (hasOwn(CLIENT_GAME_ROUTES, game)) return { kind: "page", to: CLIENT_GAME_ROUTES[game]! };
  if (BHALYAM_GAMES.some((g) => g.slug === game)) return { kind: "room-sheet", slug: game };
  return { kind: "browse", to: GAMES_PAGE };
}

/**
 * The props for a react-router `<Link>` that launches `game`.
 *
 * A room game goes to Home with `state.newRoom`, which `AppLayout` reads once to open that game's
 * create-room sheet (the same hand-off a finished table's "Create a new room" uses).
 */
export function launchLinkProps(game: string): { to: string; state?: { newRoom: string } } {
  const launch = gameLaunch(game);
  return launch.kind === "room-sheet" ? { to: "/", state: { newRoom: launch.slug } } : { to: launch.to };
}
