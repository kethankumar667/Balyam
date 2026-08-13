import type { BlockBlastPieceView } from "@shared/types";
import { PieceGlyph } from "./blockblast-shared";

/**
 * The three pieces you have been dealt.
 *
 * Slots keep their place when emptied rather than collapsing — the tray is a
 * countdown to the next draw, and a shrinking row of two would hide that.
 * A piece that no longer fits anywhere is greyed rather than removed, which
 * is the game's only warning that it is about to end.
 */
export default function BlockBlastTray({
  tray,
  playable,
  cell,
  heldSlot,
  disabled,
  onGrab,
}: {
  tray: (BlockBlastPieceView | null)[];
  playable: boolean[];
  /** Cell size for tray rendering — smaller than the board's, deliberately. */
  cell: number;
  /** The slot currently attached to the pointer, if any. */
  heldSlot: number | null;
  disabled: boolean;
  onGrab: (slot: number, piece: BlockBlastPieceView, e: React.PointerEvent) => void;
}) {
  return (
    <div
      className="grid touch-none select-none grid-cols-3 gap-2 rounded-2xl p-2"
      style={{
        background: "linear-gradient(180deg,rgba(148,163,184,0.10),rgba(15,23,42,0.55))",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
        // Five cells is the tallest piece in the table. Reserving that height
        // stops the whole board jumping when a tall piece is drawn.
        minHeight: cell * 5 + 16,
      }}
    >
      {tray.map((piece, slot) => {
        const dead = piece != null && !playable[slot];
        const held = heldSlot === slot;
        return (
          <div
            key={slot}
            className="flex items-center justify-center rounded-xl"
            style={{
              // The refusal state is on the SLOT, not the piece: a red-lined
              // well reads as "nowhere for this to go", where a red piece
              // would read as "this piece is broken".
              background: dead ? "rgba(244,63,94,0.10)" : "transparent",
              boxShadow: dead ? "inset 0 0 0 1px rgba(244,63,94,0.35)" : undefined,
            }}
          >
            {piece && !held && (
              <div
                role="button"
                tabIndex={disabled || dead ? -1 : 0}
                aria-label={`Piece ${slot + 1}${dead ? ", no room on the board" : ""}`}
                aria-disabled={disabled || dead}
                onPointerDown={(e) => {
                  // Pointer down, not click: a click fires on release, which
                  // is a whole gesture too late for something you drag.
                  if (disabled || dead) return;
                  if (e.button !== 0 && e.pointerType === "mouse") return;
                  e.preventDefault();
                  onGrab(slot, piece, e);
                }}
                className={`touch-none ${
                  disabled || dead ? "cursor-default" : "cursor-grab active:cursor-grabbing"
                }`}
                style={{
                  // Nudges up on press so the piece looks lifted before it
                  // has moved anywhere.
                  transition: "transform 120ms ease",
                  touchAction: "none",
                }}
              >
                <PieceGlyph piece={piece} cell={cell} dimmed={dead} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
