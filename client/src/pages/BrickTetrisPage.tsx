import React from "react";
import { BrickTetrisGame } from "../features/brick-tetris";

export default function BrickTetrisPage() {
  return (
    <div>
      <h1 className="sr-only">Brick Blocks — Classic 9999-in-1 Falling Blocks Arcade</h1>
      <BrickTetrisGame />
    </div>
  );
}
