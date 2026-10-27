import { useMemo, useState } from "react";
import { getGameModeConfig } from "@shared/profile/GameModes";
import type { AllGameSlug } from "@shared/profile/Scorecard";
import ChronoScorecardDeckDesktop from "./ChronoScorecardDeckDesktop";
import ChronoScorecardDeckMobile from "./ChronoScorecardDeckMobile";
import { ScorecardNavigator, ScorecardModes, PersonalBestCard, RecordIntelligence, PerformanceHistory, RecentBattles, ScorecardDetails } from "./ScorecardDashboardPanels";
import HoloPassShareModal from "./HoloPassShareModal";
import { buildRecords, preferredRecordModeId } from "../../features/myrecords/records";
import {
  DEFAULT_PINNED_GAMES, PINNED_STORAGE_KEY, SCORECARD_GAMES, scorecardBest, scorecardModes,
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
  recentMatches = [], recentMatchesStatus = "ready", onRetryMatches, records: suppliedRecords,
}: ScorecardDeckProps & { layout: "mobile" | "desktop" }) {
  const records = useMemo(() => suppliedRecords ?? buildRecords(archive), [suppliedRecords, archive]);
  const [selectedGame, setSelectedGame] = useState<AllGameSlug>("handcricket");
  const [selectedModeId, setSelectedModeId] = useState(getGameModeConfig("handcricket").defaultModeId);
  const [pins, setPins] = useState(loadPins);
  const [category, setCategory] = useState<ScorecardCategory>("all");
  const [search, setSearch] = useState("");
  const [family, setFamily] = useState<CricketFamily>("all");
  const [dialog, setDialog] = useState<"details" | "share" | null>(null);
  const config = getGameModeConfig(selectedGame);
  const gameRecords = records.find(game => game.id === selectedGame);
  const modes = scorecardModes(archive, selectedGame, gameRecords);
  const mode = modes.find(item => item.modeId === selectedModeId) ?? modes[0]!;
  const best = scorecardBest(gameRecords, mode.modeId);
  const record = best?.record;
  const fullScorecard = best?.source === "recorded" ? record : undefined;

  function selectGame(game: AllGameSlug) {
    setSelectedGame(game);
    const saved = records.find(item => item.id === game);
    setSelectedModeId(saved ? preferredRecordModeId(saved) : getGameModeConfig(game).defaultModeId);
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
    || Number(records.find(game => game.id === b)?.modes.some(mode => mode.best !== null))
      - Number(records.find(game => game.id === a)?.modes.some(mode => mode.best !== null))
    || getGameModeConfig(a).displayName.localeCompare(getGameModeConfig(b).displayName));

  const slots = {
    navigator: <ScorecardNavigator records={records} games={filteredGames} selectedGame={selectedGame}
      onSelect={selectGame} pinnedGames={pins.games} onPin={togglePin} category={category} onCategory={setCategory}
      search={search} onSearch={setSearch} onClear={() => { setSearch(""); setCategory("all"); }} />,
    modes: <ScorecardModes records={gameRecords} game={selectedGame} modes={modes} selectedModeId={mode.modeId}
      onSelect={id => { setSelectedModeId(id); setDialog(null); }} family={family} onFamily={value => {
        setFamily(value);
        if (value !== "all" && !mode.modeId.startsWith(`${value}_`)) {
          const first = modes.find(item => item.modeId.startsWith(`${value}_`));
          if (first) setSelectedModeId(first.modeId);
        }
      }} />,
    record: <PersonalBestCard game={selectedGame} mode={mode} record={fullScorecard} best={best}
      onDetails={() => setDialog("details")} onShare={() => setDialog("share")} />,
    intelligence: <RecordIntelligence record={record} />,
    history: <div className="min-w-0">
      {best && best.source !== "recorded" && record ? <p className="mb-2 text-xs text-score-soft">History and radar below use recorded matches only, not the {best.source === "imported" ? "imported" : "device-only"} best.</p> : null}
      <PerformanceHistory game={selectedGame} mode={mode} record={record} />
    </div>,
    battles: <RecentBattles matches={recentMatches} status={recentMatchesStatus} onRetry={onRetryMatches}
      playerName={playerName} avatar={avatar} playerId={archive.playerId} />,
  };
  const Layout = layout === "mobile" ? ChronoScorecardDeckMobile : ChronoScorecardDeckDesktop;

  return (
    <div className={`chrono-scorecards min-w-0 text-ink-hi ${className}`} data-layout={layout}>
      {pins.error ? <p role="status" className="mb-3 rounded-xl border border-amber-500/40 bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">{pins.error}</p> : null}
      <Layout {...slots} />
      <ScorecardDetails open={dialog === "details" && Boolean(fullScorecard)} onClose={() => setDialog(null)}
        game={selectedGame} mode={mode} record={fullScorecard} />
      {dialog === "share" && fullScorecard ? <HoloPassShareModal game={config.game} scorecard={fullScorecard}
        playerName={playerName} avatar={avatar} onClose={() => setDialog(null)} /> : null}
    </div>
  );
}
