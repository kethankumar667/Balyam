import { useNavigate } from "react-router-dom";
import NokiaCricketBoard from "../games/nokiacricket/NokiaCricketBoard";

export default function NokiaCricketPage() {
  const navigate = useNavigate();

  return (
    <div className="w-full min-h-screen bg-[#0D1322]">
      <NokiaCricketBoard onExit={() => navigate("/games")} />
    </div>
  );
}
