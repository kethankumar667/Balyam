import { useNavigate } from "react-router-dom";
import NokiaSnakeBoard from "../games/nokiasnake/NokiaSnakeBoard";

export default function NokiaSnakePage() {
  const navigate = useNavigate();

  return (
    <div className="w-full min-h-dvh-safe h-dvh-safe bg-[#0F172A] flex flex-col justify-between overflow-hidden">
      <h1 className="sr-only">Classic Snake — Retro Nokia 3310 Arcade Game</h1>
      <NokiaSnakeBoard onExit={() => navigate("/games")} />
    </div>
  );
}
