import { useNavigate } from "react-router-dom";
import NokiaCricketBoard from "../games/nokiacricket/NokiaCricketBoard";

export default function NokiaCricketPage() {
  const navigate = useNavigate();

  return (
    <div className="w-full min-h-dvh-safe h-dvh-safe bg-[#0D1322] overflow-hidden">
      <h1 className="sr-only">Nokia Cricket 2D — Classic Retro Handheld Cricket Game</h1>
      <NokiaCricketBoard onExit={() => navigate("/games")} />
    </div>
  );
}
