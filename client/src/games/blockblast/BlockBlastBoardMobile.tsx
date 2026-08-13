import { useCallback } from "react";
import type { BlockBlastSelfState } from "@shared/types";
import {
  BlockGrid,
  ModeBanner,
  PieceGlyph,
  RivalGrid,
  ScoreReadout,
  Standings,
  formatClock,
  useRaceCountdown,
} from "./blockblast-shared";
import BlockBlastTray from "./BlockBlastTray";
import { useBlockBlastDrag } from "./useBlockBlastDrag";
import { useBlockBlastFeedback } from "./useBlockBlastFeedback";

export interface BlockBlastBoardProps {
  state: BlockBlastSelfState;
  selfId: string;
  onMove: (type: string, data?: unknown) => void;
}

/**
 * Phone layout.
 *
 * The board is the hero and everything else is a strip. On a 375px handset
 * that means: one line of chrome, the rival strip only when there are
 * rivals, the grid at full width, and the tray directly under it inside
 * thumb reach. Nothing else earns its vertical space — every row added here
 * is taken straight out of the size of the blocks.
 */
export default function BlockBlastBoardMobile({ state, selfId, onMove }: BlockBlastBoardProps) {
  const me = state.players.find((p) => p.id === selfId);
  const grid = me?.grid ?? new Array<number>(64).fill(0);
  const rivals = state.players.filter((p) => p.id !== selfId);
  const remaining = useRaceCountdown(state);
  const feedback = useBlockBlastFeedback(state, selfId);

  const finished = state.isOver || state.you.isOut;

  const place = useCallback(
    (slot: number, r: number, c: number) => onMove("place", { slot, r, c }),
    [onMove],
  );

  const { gridRef, drag, preview, cellSize, beginDrag } = useBlockBlastDrag({
    grid,
    disabled: finished,
    onPlace: place,
    onPickUp: feedback.onPickUp,
    onRefuse: feedback.onRefuse,
  });

  const trayCell = Math.max(8, cellSize * 0.5);
  // Under a minute, and the clock stops being information and starts being
  // pressure. That is the point of it.
  const urgent = remaining != null && remaining < 30_000;

  return (
    <div className="flex min-h-0 flex-col gap-2.5 rounded-3xl bg-[#080d18] p-3 select-none">
      {/* ── chrome ─────────────────────────────────────────────────────── */}
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-lg font-black leading-none tracking-tight text-white">
            Block Blast
          </h1>
          <div className="mt-1">
            <ModeBanner state={state} />
          </div>
        </div>

        <div className="flex items-end gap-3">
          {remaining != null && (
            <div className="flex flex-col items-end leading-none">
              <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                Time
              </span>
              <span
                className={`font-display text-2xl font-black tabular-nums ${
                  urgent ? "animate-pulse text-rose-400" : "text-white"
                }`}
              >
                {formatClock(remaining)}
              </span>
            </div>
          )}
          <ScoreReadout
            score={state.you.score}
            streak={me?.streak ?? 0}
            gain={feedback.gain}
          />
        </div>
      </header>

      {/* ── rivals ─────────────────────────────────────────────────────── */}
      {rivals.length > 0 && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {rivals.map((p) => (
            <div
              key={p.id}
              className={`flex flex-shrink-0 items-center gap-2 rounded-xl px-2 py-1.5 ${
                p.isOut ? "bg-white/5 opacity-55" : "bg-white/8"
              }`}
            >
              {/* Their actual board, live. The one thing a solo block game
                  cannot show you. */}
              <RivalGrid grid={p.grid} size={38} />
              <div className="leading-tight">
                <div className="max-w-[86px] truncate text-[11px] font-bold text-white">
                  {p.name}
                </div>
                <div className="font-display text-sm font-black tabular-nums text-amber-300">
                  {p.score.toLocaleString()}
                </div>
                {p.isOut && (
                  <div className="text-[9px] font-black uppercase tracking-wide text-rose-400">
                    Stuck
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── the board ──────────────────────────────────────────────────── */}
      <BlockGrid
        grid={grid}
        preview={preview}
        gridRef={gridRef}
        justCleared={feedback.justCleared}
        dimmed={finished}
      />

      {/* ── tray, or the reason there isn't one ────────────────────────── */}
      {state.isOver ? (
        <FinalPanel state={state} selfId={selfId} best={feedback.best} />
      ) : state.you.isOut ? (
        <div className="rounded-2xl bg-rose-500/12 p-3 text-center ring-1 ring-rose-400/30">
          <p className="text-sm font-black text-rose-200">No room left</p>
          <p className="mt-0.5 text-xs font-semibold text-rose-200/70">
            {state.mode === "race"
              ? "Your score is locked in. Watch the others finish."
              : "Nothing in the tray fits."}
          </p>
        </div>
      ) : (
        <BlockBlastTray
          tray={state.you.tray}
          playable={state.you.playable}
          cell={trayCell}
          heldSlot={drag?.slot ?? null}
          disabled={finished}
          onGrab={beginDrag}
        />
      )}

      {/*
        The piece in flight.
        Rendered at the viewport, above everything, and never under the
        finger — it floats a cell and a half up so the player can actually
        see the square they are aiming at. A piece hidden by the thumb that
        is holding it turns every placement into a guess.
      */}
      {drag && cellSize > 0 && (
        <div
          className="pointer-events-none fixed z-[65]"
          style={{
            left: drag.x,
            top: drag.y - cellSize * 1.5,
            transform: "translate(-50%, -50%)",
            filter: "drop-shadow(0 10px 16px rgba(0,0,0,0.55))",
          }}
        >
          <PieceGlyph piece={drag.piece} cell={cellSize} />
        </div>
      )}
    </div>
  );
}

function FinalPanel({
  state,
  selfId,
  best,
}: {
  state: BlockBlastSelfState;
  selfId: string;
  best: number;
}) {
  const solo = state.mode === "solo";
  const won = state.winnerId === selfId;

  return (
    <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-xs font-black uppercase tracking-[0.16em] text-slate-300">
          {solo ? "Run over" : won ? "You won the race" : "Final"}
        </h2>
        {solo && (
          <span className="text-[11px] font-bold text-slate-400">
            Best {Math.max(best, state.you.score).toLocaleString()}
          </span>
        )}
      </div>

      {solo ? (
        <p className="font-display text-3xl font-black tabular-nums text-white">
          {state.you.score.toLocaleString()}
        </p>
      ) : (
        <Standings state={state} selfId={selfId} />
      )}

      {/* The seed, quietly. It is the receipt: two players who disagree
          about a result can replay the exact same deal. */}
      {!solo && (
        <p className="mt-2 text-center text-[10px] font-semibold tracking-wide text-slate-500">
          Deal #{state.seed}
        </p>
      )}
    </div>
  );
}
