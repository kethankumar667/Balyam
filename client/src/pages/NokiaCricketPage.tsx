import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NokiaCricketBoard from "../games/nokiacricket/NokiaCricketBoard";
import { useAudio } from "../hooks/useAudio";

export default function NokiaCricketPage() {
  const navigate = useNavigate();

  // Sound is scoped to catalog "solo" games (see AudioManager.isSoloContext)
  // — this is one of them, so report presence on mount/unmount.
  const { setActiveGame } = useAudio();
  useEffect(() => {
    setActiveGame("nokiacricket");
    return () => setActiveGame(null);
  }, [setActiveGame]);

  return (
    <div className="w-full min-h-dvh-safe h-dvh-safe bg-[#0D1322] overflow-hidden">
      <h1 className="sr-only">Nokia Cricket 2D — Classic Retro Handheld Cricket Game</h1>
      <NokiaCricketBoard onExit={() => navigate("/games")} />
    </div>
  );
}
