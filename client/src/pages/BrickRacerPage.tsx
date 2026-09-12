import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BrickRacerBoard from "../games/brickracer/BrickRacerBoard";
import { useAudio } from "../hooks/useAudio";
import { useGameFullscreen } from "../hooks/useGameFullscreen";

export default function BrickRacerPage() {
  // No Start button — the engine boots into its keypad menu, so the player's
  // first tap is the start gesture.
  useGameFullscreen({ slug: "roadrash", wantsFullscreen: true, enterOnFirstGesture: true });

  const navigate = useNavigate();

  // Sound is scoped to catalog "solo" games (see AudioManager.isSoloContext)
  // — this is one of them (catalog slug "roadrash"), so report presence on
  // mount/unmount.
  const { setActiveGame } = useAudio();
  useEffect(() => {
    setActiveGame("roadrash");
    return () => setActiveGame(null);
  }, [setActiveGame]);

  return (
    <div className="w-full min-h-dvh-safe h-dvh-safe bg-[#0F172A] flex flex-col justify-between overflow-hidden">
      <h1 className="sr-only">Brick Racer — Retro 9999-in-1 Handheld Racing Game</h1>
      <BrickRacerBoard onExit={() => navigate("/games")} />
    </div>
  );
}
