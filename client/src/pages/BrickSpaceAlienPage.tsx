import { useNavigate } from "react-router-dom";
import { BrickSpaceAlienGame } from "../features/brick-space-alien";

export default function BrickSpaceAlienPage() {
  const navigate = useNavigate();

  return (
    <div className="w-full min-h-screen bg-[#070b14]">
      <BrickSpaceAlienGame onExit={() => navigate("/games")} />
    </div>
  );
}
