import React from "react";
import type { PieceType } from "../types";
import { getPieceMatrix } from "../pieces/pieceFactory";

interface NextPieceBoxProps {
  nextQueue: PieceType[];
}

export const NextPieceBox: React.FC<NextPieceBoxProps> = ({ nextQueue }) => {
  const visiblePieces = nextQueue.slice(0, 3);

  return (
    <div className="flex flex-col items-center bg-[#8BAC0F] border-2 border-[#306230] p-2 rounded shadow-inner select-none">
      <span className="text-[9px] font-mono font-black tracking-wider text-[#306230] uppercase mb-1">
        NEXT
      </span>
      <div className="flex flex-col gap-1.5">
        {visiblePieces.map((pieceType, pIdx) => {
          const matrix = getPieceMatrix(pieceType);
          const size = matrix.length;

          return (
            <div
              key={`${pieceType}-${pIdx}`}
              className="grid gap-0.5 p-1 bg-[#7F9F0E]/30 rounded border border-[#306230]/40 w-[60px] h-[50px] items-center justify-center"
              style={{
                gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
              }}
            >
              {matrix.map((row, r) =>
                row.map((cell, c) => (
                  <div
                    key={`${r}-${c}`}
                    className={`w-2 h-2 rounded-xs ${
                      cell === 1 ? "bg-[#0F380F]" : "bg-transparent"
                    }`}
                  />
                )),
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
