import React, { useEffect } from "react";
import { BrickTetrisGame } from "../features/brick-tetris";
import { useAudio } from "../hooks/useAudio";

export default function BrickTetrisPage() {
  // Sound is scoped to catalog "solo" games (see AudioManager.isSoloContext)
  // — this is one of them (catalog slug "brickblocks"), so report presence
  // on mount/unmount.
  const { setActiveGame } = useAudio();
  useEffect(() => {
    setActiveGame("brickblocks");
    return () => setActiveGame(null);
  }, [setActiveGame]);

  return (
    <div>
      <h1 className="sr-only">Brick Blocks — Classic 9999-in-1 Falling Blocks Arcade</h1>
      <BrickTetrisGame />
    </div>
  );
}
