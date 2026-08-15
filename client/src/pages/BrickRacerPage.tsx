import { useNavigate } from "react-router-dom";
import BrickRacerBoard from "../games/brickracer/BrickRacerBoard";

export default function BrickRacerPage() {
  const navigate = useNavigate();

  return (
    <div className="w-full min-h-screen bg-[#0F172A] flex flex-col justify-between">
      <BrickRacerBoard onExit={() => navigate("/games")} />
    </div>
  );
}
