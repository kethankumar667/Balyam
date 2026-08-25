import { useEffect, useState } from "react";
import { useAuthStore } from "../store/authStore";
import { WelcomeModal, journeyTracker } from "../features/onboarding";
import { type BhalyamGameSlug } from "../components/bhalyam/data";
import { getSocket } from "../lib/socket";
import { usePlayerSnapshot } from "../hooks/usePlayerSnapshot";
import GameRoomSheet from "../components/bhalyam/GameRoomSheet";
import JoinRoomModal from "../components/bhalyam/JoinRoomModal";
import AppLayout from "../components/layout/AppLayout";
import FallingPetals from "../animations/app/FallingPetals";
import WhatAreWePlayingSection from "../components/bhalyam/WhatAreWePlayingSection";
import { Hero } from "./home/Hero";
import { PlayYourWaySection } from "./home/PlayYourWaySection";
import { GamesSection } from "./home/GamesSection";
import { PlayerJourneyDashboard } from "./home/PlayerJourneyDashboard";
import { Footer } from "./home/Footer";

/**
 * BHALYAM home — the app's landing surface.
 *
 * Intentionally spartan. Only contains UI that wires to a working backend
 * flow: header, BALU greeting, the game tiles, and a footer. Tapping
 * a tile opens the GameRoomSheet which carries the full Lobby-equivalent
 * flow (name input + per-game options + Create Room + Join by Code).
 *
 * Future sections (daily rewards, badges, friends online, recently played,
 * tournaments) are deliberately NOT here yet — they were mocked previously
 * and removed during the cleanup pass. Add them back as each backing
 * feature ships.
 *
 * Single responsive page rather than mobile/desktop split; with this much
 * content the split was overhead with no payoff.
 *
 * Each section below lives in its own file under `./home/` — see that
 * directory for `Hero`, `PlayYourWaySection`, `GamesSection`,
 * `PlayerJourneyDashboard`, `Footer`, and the profile/menu sheets under
 * `./home/sheets/`. This file is just their composition.
 */
export default function BhalyamHome() {
  const [sheetGame, setSheetGame] = useState<BhalyamGameSlug | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(() => {
    return !journeyTracker.getState().hasCompletedWelcome;
  });
  const isMember = useAuthStore((s) => s.isMember);
  // Guests get the honest "Guest Mode" branch in WelcomePlayerStrip and never
  // reach PlayerJourneyDashboard's member content, so there is nothing for
  // this fetch to back for them — `enabled: false` until the caller is a
  // member, one fetch shared by both surfaces instead of two.
  const playerSnapshot = usePlayerSnapshot(isMember);

  // Warm the socket connection on landing so the first room create/join
  // doesn't pay the cold WebSocket handshake at click time
  useEffect(() => {
    getSocket();
  }, []);

  return (
    <AppLayout onSelectGame={setSheetGame}>
      <div className="bhalyam-home bhalyam-font min-h-full bhalyam-paper flex flex-col">
        <FallingPetals />
        <div className="relative z-10 mx-auto w-full max-w-[1100px] px-3 sm:px-6 py-4 pb-12 flex-1">
          <Hero
            onPlayFeatured={() => setSheetGame("uno")}
            onOpenJoin={() => setJoinOpen(true)}
          />
          <PlayYourWaySection
            onPlayFriends={() => setJoinOpen(true)}
            onPlayBots={() => {
              const gamesElem = document.getElementById("games-section");
              if (gamesElem) gamesElem.scrollIntoView({ behavior: "smooth" });
            }}
          />
          <div id="games-section">
            <GamesSection onSelect={setSheetGame} />
          </div>
          <WhatAreWePlayingSection
            onSelectGame={setSheetGame}
            onOpenCreateRoom={() => setJoinOpen(true)}
          />
          <PlayerJourneyDashboard onSelect={setSheetGame} snapshot={playerSnapshot} />
          <Footer />
        </div>
        <GameRoomSheet game={sheetGame} onClose={() => setSheetGame(null)} />
        <JoinRoomModal open={joinOpen} onClose={() => setJoinOpen(false)} />
        <WelcomeModal
          open={welcomeOpen}
          onClose={() => setWelcomeOpen(false)}
          onStartQuest={() => setSheetGame("uno")}
        />
      </div>
    </AppLayout>
  );
}
