import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NokiaSnakeBoard from "../games/nokiasnake/NokiaSnakeBoard";
import { useAudio } from "../hooks/useAudio";

export default function NokiaSnakePage() {
  const navigate = useNavigate();

  // Sound is scoped to catalog "solo" games (see AudioManager.isSoloContext)
  // — this is one of them, so report presence on mount/unmount.
  const { setActiveGame } = useAudio();
  useEffect(() => {
    setActiveGame("snake");
    return () => setActiveGame(null);
  }, [setActiveGame]);

  return (
    <div className="w-full min-h-dvh-safe h-dvh-safe bg-[#0F172A] flex flex-col justify-between overflow-hidden">
      <h1 className="sr-only">Classic Snake — Retro Nokia 3310 Arcade Game</h1>
      <NokiaSnakeBoard onExit={() => navigate("/games")} />
    </div>
  );
}
