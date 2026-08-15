import { useNavigate } from "react-router-dom";
import NokiaSnakeBoard from "../games/nokiasnake/NokiaSnakeBoard";

export default function NokiaSnakePage() {
  const navigate = useNavigate();

  return (
    <div className="w-full min-h-screen bg-[#0F172A] flex flex-col justify-between">
      <NokiaSnakeBoard onExit={() => navigate("/games")} />
    </div>
  );
}
