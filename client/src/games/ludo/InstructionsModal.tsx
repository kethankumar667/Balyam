import React from "react";
import { GameAcademyModal } from "../../features/academy";
import { LUDO_ACADEMY } from "../../features/academy/data/boardGames";

export default function InstructionsModal({ onClose }: { onClose: () => void }) {
  return (
    <GameAcademyModal
      open
      spec={LUDO_ACADEMY}
      initialMode="walkthrough"
      onClose={onClose}
    />
  );
}
