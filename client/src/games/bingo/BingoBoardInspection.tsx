import { useState } from "react";
import type { BingoPublicState, Player } from "@shared/types";
import { AllPlayerBoardsView } from "./bingo-shared";
import { useBingoLook } from "./bingoLook";

export default function BingoBoardInspection({
  state, selfId, players,
}: {
  state: BingoPublicState;
  selfId: string | null;
  players: Player[];
}) {
  const [open, setOpen] = useState(false);
  const { skin } = useBingoLook();
  if (state.phase !== "finished") return null;

  return (
    <section aria-label="Finished Bingo boards" className={`rounded-3xl p-4 ${skin.card}`}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
        className={`min-h-[44px] rounded-xl px-3 text-sm font-extrabold ${skin.link} ${skin.focus}`}
      >
        {open ? "Hide tables" : "View all tables"}
      </button>
      {open && <AllPlayerBoardsView players={state.players} selfId={selfId} roster={players} skin={skin} />}
    </section>
  );
}
