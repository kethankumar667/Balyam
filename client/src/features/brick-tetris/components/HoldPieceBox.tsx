import React from "react";
import type { PieceType } from "../types";
import { getPieceMatrix } from "../pieces/pieceFactory";

interface HoldPieceBoxProps {
  heldPiece: PieceType | null;
  canHold: boolean;
}

export const HoldPieceBox: React.FC<HoldPieceBoxProps> = ({ heldPiece, canHold }) => {
  const matrix = heldPiece ? getPieceMatrix(heldPiece) : null;
  const size = matrix ? matrix.length : 4;

  return (
    <div className="flex flex-col items-center bg-[#8BAC0F] border-2 border-[#306230] p-2 rounded shadow-inner select-none">
      <span className="text-[9px] font-mono font-black tracking-wider text-[#306230] uppercase mb-1">
        HOLD {canHold ? "" : "(LOCKED)"}
      </span>
      <div
        className="grid gap-0.5 p-1 bg-[#7F9F0E]/30 rounded border border-[#306230]/40 w-[60px] h-[60px] items-center justify-center"
        style={{
          gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
        }}
      >
        {matrix ? (
          matrix.map((row, r) =>
            row.map((cell, c) => (
              <div
                key={`${r}-${c}`}
                className={`w-2.5 h-2.5 rounded-xs ${
                  cell === 1 ? (canHold ? "bg-[#0F380F]" : "bg-[#306230]") : "bg-transparent"
                }`}
              />
            )),
          )
        ) : (
          <div className="col-span-full row-span-full flex items-center justify-center text-[9px] font-mono text-[#306230]/70">
            NONE
          </div>
        )}
      </div>
    </div>
  );
};
