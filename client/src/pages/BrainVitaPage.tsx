import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BrainVitaBoard from "../games/brainvita/BrainVitaBoard";
import { useAudio } from "../hooks/useAudio";

/** Brain Vita is a client-only solo puzzle: it never opens a server room, like Sudoku and 2048. */
export default function BrainVitaPage() {
  const navigate = useNavigate();

  const { setActiveGame } = useAudio();
  useEffect(() => {
    setActiveGame("brainvita");
    return () => setActiveGame(null);
  }, [setActiveGame]);

  return (
    <main role="main" aria-label="Goli Jump marble puzzle game" className="h-dvh-safe min-h-dvh-safe w-full overflow-hidden overscroll-none">
      <h1 className="sr-only">Goli Jump — marble solitaire puzzle</h1>
      <BrainVitaBoard onExit={() => navigate("/games")} />
    </main>
  );
}
