import { useState } from "react";
import { Outlet } from "react-router-dom";
import AppLayout from "./AppLayout";
import GameRoomSheet from "../bhalyam/GameRoomSheet";
import { type BhalyamGameSlug } from "../bhalyam/data";

export interface GamesFamilyOutletContext {
  openGameSheet: (slug: BhalyamGameSlug) => void;
}

/**
 * Shared chrome for /games, /favorites, /recently-played.
 *
 * Each of those three pages used to render its own `<AppLayout>`. React
 * Router treats a route change as a brand-new element tree, so navigating
 * between them — pages a player bounces between constantly via the header's
 * own nav pills — fully unmounted one page's `AppLayout` (header, sidebar,
 * every sheet it owns) and mounted a fresh one for the next: a real
 * re-render of the whole shell on every hop, not just the content under it.
 * Hoisting `AppLayout` to one persistent layout route means only the
 * `<Outlet/>` content swaps; the chrome stays mounted across all three.
 *
 * The three pages also duplicated identical `sheetGame`/`<GameRoomSheet>`
 * state — each needed its own copy so a game picked from the SIDEBAR (not
 * just from its own grid) still opened the right sheet, via `AppLayout`'s
 * `onSelectGame` prop. That state now lives here once; children reach the
 * setter through `useOutletContext`.
 */
export default function GamesFamilyLayout() {
  const [sheetGame, setSheetGame] = useState<BhalyamGameSlug | null>(null);

  const context: GamesFamilyOutletContext = { openGameSheet: setSheetGame };

  return (
    <AppLayout onSelectGame={setSheetGame}>
      <Outlet context={context} />
      <GameRoomSheet game={sheetGame} onClose={() => setSheetGame(null)} />
    </AppLayout>
  );
}
