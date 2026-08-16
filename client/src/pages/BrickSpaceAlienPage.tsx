import { useNavigate } from "react-router-dom";
import { BrickSpaceAlienGame } from "../features/brick-space-alien";

export default function BrickSpaceAlienPage() {
  const navigate = useNavigate();

  return (
    <div className="w-full min-h-screen bg-[#070b14]">
      {/*
        The game's own "SPACE ALIEN" headings belong to its boot and menu
        SCREENS, which come and go — promoting one of them would give the
        page a heading that disappears the moment play starts. The page-level
        heading sits here instead, where it is true throughout, and is hidden
        for the same reason the boot splash exists: the handheld is the point.
      */}
      <h1 className="sr-only">Space Alien Invaders — handheld brick shooter</h1>
      <BrickSpaceAlienGame onExit={() => navigate("/games")} />
    </div>
  );
}
