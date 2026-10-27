import React, { useEffect } from "react";
import { BrickBreakoutGame } from "../features/brick-breakout";
import { useAudio } from "../hooks/useAudio";
import { useGameFullscreen } from "../hooks/useGameFullscreen";

export default function BrickBreakoutPage() {
  useGameFullscreen({ slug: "breakout", wantsFullscreen: true, enterOnFirstGesture: true });

  // Sound is scoped to catalog "solo" games (see AudioManager.isSoloContext)
  // — this is one of them (catalog slug "breakout"), so report presence on
  // mount/unmount.
  const { setActiveGame } = useAudio();
  useEffect(() => {
    setActiveGame("breakout");
    return () => setActiveGame(null);
  }, [setActiveGame]);

  return <BrickBreakoutGame />;
}
