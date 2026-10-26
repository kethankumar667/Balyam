import React, { useEffect } from "react";
import { BrickTetrisGame } from "../features/brick-tetris";
import { useAudio } from "../hooks/useAudio";
import { useGameFullscreen } from "../hooks/useGameFullscreen";

export default function BrickTetrisPage() {
  useGameFullscreen({ slug: "brickblocks", wantsFullscreen: true, enterOnFirstGesture: true });

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
      <h1 className="sr-only">Brick Blocks — Color Arcade</h1>
      <BrickTetrisGame />
    </div>
  );
}
