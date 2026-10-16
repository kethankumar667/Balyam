import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NokiaSnakeBoard from "../games/nokiasnake/NokiaSnakeBoard";
import { useAudio } from "../hooks/useAudio";
import { useGameFullscreen } from "../hooks/useGameFullscreen";

export default function NokiaSnakePage() {
  const navigate = useNavigate();

  // The engine boots straight into its keypad menu, so there is no Start
  // button to hang this on — the player's first tap is the start gesture.
  useGameFullscreen({ slug: "snake", wantsFullscreen: true, enterOnFirstGesture: true });

  // Sound is scoped to catalog "solo" games (see AudioManager.isSoloContext)
  // — this is one of them, so report presence on mount/unmount.
  const { setActiveGame } = useAudio();
  useEffect(() => {
    setActiveGame("snake");
    return () => setActiveGame(null);
  }, [setActiveGame]);

  return (
    // `overflow-y-auto`: the handset is taller than a short phone (≈760px with its keypad). Hidden clipped the
    // keypad with no way to reach it; this keeps it reachable on any screen the board cannot fully fit.
    <div className="w-full min-h-dvh-safe h-dvh-safe bg-[#0F172A] flex flex-col justify-between overflow-x-hidden overflow-y-auto">
      <h1 className="sr-only">Classic Snake — Retro Monochrome Arcade Game</h1>
      <NokiaSnakeBoard onExit={() => navigate("/games")} />
    </div>
  );
}
