import { useNavigate } from "react-router-dom";
import BrickRacerBoard from "../games/brickracer/BrickRacerBoard";

export default function BrickRacerPage() {
  const navigate = useNavigate();

  return (
    <div className="w-full min-h-dvh-safe h-dvh-safe bg-[#0F172A] flex flex-col justify-between overflow-hidden">
      <h1 className="sr-only">Brick Racer — Retro 9999-in-1 Handheld Racing Game</h1>
      <BrickRacerBoard onExit={() => navigate("/games")} />
    </div>
  );
}
