import { useState } from "react";
import { getGameModeConfig } from "@shared/profile/GameModes";
import type { AllGameSlug } from "@shared/profile/Scorecard";
import ChronoScorecardDeckDesktop from "./ChronoScorecardDeckDesktop";
import ChronoScorecardDeckMobile from "./ChronoScorecardDeckMobile";
import { ScorecardNavigator, ScorecardModes, PersonalBestCard, RecordIntelligence, PerformanceHistory, RecentBattles, ScorecardDetails } from "./ScorecardDashboardPanels";
import HoloPassShareModal from "./HoloPassShareModal";
import {
  DEFAULT_PINNED_GAMES, PINNED_STORAGE_KEY, SCORECARD_GAMES, scorecardModes,
  type ScorecardDeckProps, type ScorecardCategory, type CricketFamily,
} from "./scorecardDashboardModel";

function loadPins(): { games: string[]; error: string | null } {
  try {
    const raw = localStorage.getItem(PINNED_STORAGE_KEY);
    if (!raw) return { games: DEFAULT_PINNED_GAMES, error: null };
    const saved: unknown = JSON.parse(raw);
    if (!Array.isArray(saved) || !saved.every(value => typeof value === "string")) throw new Error("Invalid saved pins");
    return { games: saved.filter(value => SCORECARD_GAMES.some(game => game === value)), error: null };
  } catch (error) {
    console.warn("Could not load scorecard pins:", error);
    return { games: DEFAULT_PINNED_GAMES, error: "Saved pins could not be loaded. You can pin games again." };
  }
}

export default function ScorecardDashboard({
  layout, archive, playerName, avatar, className = "",
  recentMatches = [], recentMatchesStatus = "ready", onRetryMatches,
}: ScorecardDeckProps & { layout: "mobile" | "desktop" }) {
  const [selectedGame, setSelectedGame] = useState<AllGameSlug>("handcricket");
  const [selectedModeId, setSelectedModeId] = useState(getGameModeConfig("handcricket").defaultModeId);
  const [pins, setPins] = useState(loadPins);
  const [category, setCategory] = useState<ScorecardCategory>("all");
  const [search, setSearch] = useState("");
  const [family, setFamily] = useState<CricketFamily>("all");
  const [dialog, setDialog] = useState<"details" | "share" | null>(null);
  const config = getGameModeConfig(selectedGame);
  const modes = scorecardModes(archive, selectedGame);
  const mode = modes.find(item => item.modeId === selectedModeId) ?? modes[0]!;
  const record = archive.games[selectedGame]?.modes[mode.modeId];

  function selectGame(game: AllGameSlug) {
    setSelectedGame(game);
    setSelectedModeId(getGameModeConfig(game).defaultModeId);
    setFamily("all");
    setDialog(null);
  }

  function togglePin(game: AllGameSlug) {
    const games = pins.games.includes(game) ? pins.games.filter(item => item !== game) : [...pins.games, game];
    try {
      localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(games));
      setPins({ games, error: null });
    } catch (error) {
      console.warn("Could not save scorecard pins:", error);
      setPins({ games, error: "Your pins changed for this visit, but could not be saved on this device." });
    }
  }

  const filteredGames = SCORECARD_GAMES.filter(game => {
    const entry = getGameModeConfig(game);
    const query = search.trim().toLowerCase();
    return (category === "all" || category === entry.category)
      && (!query || entry.displayName.toLowerCase().includes(query) || game.includes(query));
  }).sort((a, b) => Number(pins.games.includes(b)) - Number(pins.games.includes(a))
    || Number(Boolean(archive.games[b])) - Number(Boolean(archive.games[a]))
    || getGameModeConfig(a).displayName.localeCompare(getGameModeConfig(b).displayName));

  const slots = {
    navigator: <ScorecardNavigator archive={archive} games={filteredGames} selectedGame={selectedGame}
      onSelect={selectGame} pinnedGames={pins.games} onPin={togglePin} category={category} onCategory={setCategory}
      search={search} onSearch={setSearch} onClear={() => { setSearch(""); setCategory("all"); }} />,
    modes: <ScorecardModes archive={archive} game={selectedGame} modes={modes} selectedModeId={mode.modeId}
      onSelect={id => { setSelectedModeId(id); setDialog(null); }} family={family} onFamily={value => {
        setFamily(value);
        if (value !== "all" && !mode.modeId.startsWith(`${value}_`)) {
          const first = modes.find(item => item.modeId.startsWith(`${value}_`));
          if (first) setSelectedModeId(first.modeId);
        }
      }} />,
    record: <PersonalBestCard game={selectedGame} mode={mode} record={record}
      onDetails={() => setDialog("details")} onShare={() => setDialog("share")} />,
    intelligence: <RecordIntelligence record={record} />,
    history: <PerformanceHistory game={selectedGame} mode={mode} record={record} />,
    battles: <RecentBattles matches={recentMatches} status={recentMatchesStatus} onRetry={onRetryMatches}
      playerName={playerName} avatar={avatar} playerId={archive.playerId} />,
  };
  const Layout = layout === "mobile" ? ChronoScorecardDeckMobile : ChronoScorecardDeckDesktop;

  return (
    <div className={`chrono-scorecards min-w-0 text-ink-hi ${className}`} data-layout={layout}>
      {pins.error ? <p role="status" className="mb-3 rounded-xl border border-amber-500/40 bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">{pins.error}</p> : null}
      <Layout {...slots} />
      <ScorecardDetails open={dialog === "details" && Boolean(record)} onClose={() => setDialog(null)}
        game={selectedGame} mode={mode} record={record} />
      {dialog === "share" && record ? <HoloPassShareModal game={config.game} scorecard={record}
        playerName={playerName} avatar={avatar} onClose={() => setDialog(null)} /> : null}
    </div>
  );
}
