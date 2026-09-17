import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Game2048Board from "../games/2048/Game2048Board";
import { useAudio } from "../hooks/useAudio";

export default function Game2048Page() {
  const navigate = useNavigate();

  // Sound is scoped to catalog "solo" games (see AudioManager.isSoloContext)
  // — this is one of them, so report presence on mount/unmount.
  const { setActiveGame } = useAudio();
  useEffect(() => {
    setActiveGame("2048");
    return () => setActiveGame(null);
  }, [setActiveGame]);

  return (
    <div className="w-full min-h-dvh-safe h-dvh-safe overflow-y-auto overflow-x-hidden overscroll-none">
      <h1 className="sr-only">2048 — Battle, Race, Time Attack &amp; Zen</h1>
      <Game2048Board onExit={() => navigate("/games")} />
    </div>
  );
}
