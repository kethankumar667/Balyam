import { useCallback } from "react";
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
import type { BlockBlastBoardProps } from "./BlockBlastBoardMobile";

/**
 * Desktop layout.
 *
 * Same game, more room: the board stops growing at a comfortable reading
 * size and the space that opens up goes to the rivals, who get real boards
 * instead of thumbnails. On a phone the opponents are a strip you glance at;
 * here they are the second thing on the screen, which is the right ranking
 * for a mode whose entire pitch is that you are all playing the same deal.
 */
export default function BlockBlastBoardDesktop({ state, selfId, onMove }: BlockBlastBoardProps) {
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

  const urgent = remaining != null && remaining < 30_000;

  return (
    <div className="flex w-full justify-center gap-6 rounded-3xl bg-[#080d18] p-6 select-none">
      {/* ── board column ───────────────────────────────────────────────── */}
      <div className="flex w-full max-w-[520px] flex-col gap-3">
        <header className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-black leading-none tracking-tight text-white">
              Block Blast
            </h1>
            <div className="mt-1.5">
              <ModeBanner state={state} />
            </div>
          </div>
          <div className="flex items-end gap-5">
            {remaining != null && (
              <div className="flex flex-col items-end leading-none">
                <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Time
                </span>
                <span
                  className={`font-display text-3xl font-black tabular-nums ${
                    urgent ? "animate-pulse text-rose-400" : "text-white"
                  }`}
                >
                  {formatClock(remaining)}
                </span>
              </div>
            )}
            <ScoreReadout score={state.you.score} streak={me?.streak ?? 0} gain={feedback.gain} />
          </div>
        </header>

        <BlockGrid
          grid={grid}
          preview={preview}
          gridRef={gridRef}
          justCleared={feedback.justCleared}
          dimmed={finished}
        />

        {state.you.isOut && !state.isOver ? (
          <div className="rounded-2xl bg-rose-500/12 p-4 text-center ring-1 ring-rose-400/30">
            <p className="text-base font-black text-rose-200">No room left</p>
            <p className="mt-1 text-sm font-semibold text-rose-200/70">
              {state.mode === "race"
                ? "Your score is locked in. Watch the others finish."
                : "Nothing in the tray fits."}
            </p>
          </div>
        ) : (
          <BlockBlastTray
            tray={state.you.tray}
            playable={state.you.playable}
            cell={Math.max(8, cellSize * 0.5)}
            heldSlot={drag?.slot ?? null}
            disabled={finished}
            onGrab={beginDrag}
          />
        )}

        {/* Drag hint, shown only until the first piece has been played. It
            retires itself rather than becoming furniture. */}
        {!finished && state.you.score === 0 && !drag && (
          <p className="text-center text-xs font-semibold text-slate-500">
            Drag a piece onto the board. Fill a row or a column to clear it.
          </p>
        )}
      </div>

      {/* ── rivals rail ────────────────────────────────────────────────── */}
      {rivals.length > 0 && (
        <aside className="flex w-64 flex-shrink-0 flex-col gap-3">
          <h2 className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
            {state.isOver ? "Final" : "Same deal, live"}
          </h2>
          {state.isOver ? (
            <Standings state={state} selfId={selfId} />
          ) : (
            <div className="flex flex-col gap-2.5">
              {rivals.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 rounded-xl p-2.5 ${
                    p.isOut ? "bg-white/5 opacity-60" : "bg-white/8"
                  }`}
                >
                  <RivalGrid grid={p.grid} size={72} />
                  <div className="min-w-0 leading-tight">
                    <div className="truncate text-sm font-bold text-white">{p.name}</div>
                    <div className="font-display text-xl font-black tabular-nums text-amber-300">
                      {p.score.toLocaleString()}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400">
                      {p.isOut ? (
                        <span className="text-rose-400">Stuck</span>
                      ) : (
                        `${p.linesCleared} lines`
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {state.isOver && (
            <p className="text-center text-[10px] font-semibold tracking-wide text-slate-500">
              Deal #{state.seed}
            </p>
          )}
        </aside>
      )}

      {/* Solo has no rail to fill, so the personal best goes beside the board
          rather than leaving a column of nothing. */}
      {rivals.length === 0 && state.isOver && (
        <aside className="flex w-64 flex-shrink-0 flex-col gap-2 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
            Run over
          </span>
          <span className="font-display text-4xl font-black tabular-nums text-white">
            {state.you.score.toLocaleString()}
          </span>
          <span className="text-xs font-bold text-slate-400">
            Best {Math.max(feedback.best, state.you.score).toLocaleString()}
          </span>
        </aside>
      )}

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
