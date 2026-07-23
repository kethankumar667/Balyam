import { Routes, Route, Navigate } from "react-router-dom";
import "./theme.css";
import { MatchLoadingPage } from "./screens/MatchLoadingPage";
import { TeamSelectionPage } from "./screens/TeamSelectionPage";
import { PlayingXIPage } from "./screens/PlayingXIPage";
import { TossSelectionPage } from "./screens/TossSelectionPage";
import { TossResultPage } from "./screens/TossResultPage";
import { MatchRulesPage } from "./screens/MatchRulesPage";
import { MatchIntroPage } from "./screens/MatchIntroPage";
import { GameplayPage } from "./screens/GameplayPage";
import { ScorecardPage } from "./screens/ScorecardPage";
import { RunDistributionPage } from "./screens/RunDistributionPage";
import { ManhattanChartPage } from "./screens/ManhattanChartPage";
import { PartnershipChartPage } from "./screens/PartnershipChartPage";
import { MatchTimelinePage } from "./screens/MatchTimelinePage";
import { WagonWheelPage } from "./screens/WagonWheelPage";
import { PlayerOfMatchPage } from "./screens/PlayerOfMatchPage";
import { MatchResultPage } from "./screens/MatchResultPage";
import { MatchSummaryPage } from "./screens/MatchSummaryPage";
import { EndMatchCelebrationPage } from "./screens/EndMatchCelebrationPage";
import { MatchHistoryPage } from "./screens/MatchHistoryPage";
import { StatisticsPage } from "./screens/StatisticsPage";
import { StandingsPage } from "./screens/StandingsPage";
import { ProfilePage } from "./screens/ProfilePage";
import { MatchHighlightsPage } from "./screens/MatchHighlightsPage";
import { StickerAlbumPage } from "./screens/StickerAlbumPage";
import { EncyclopediaPage } from "./screens/EncyclopediaPage";
import { DailyChallengePage } from "./screens/DailyChallengePage";

/**
 * Bhalyam Cricket — self-contained game section mounted at /cricket/*.
 *
 * Isolated from the socket.io multiplayer lounge. Data comes from the real
 * shared roster (International + IPL, all formats) — no mock data. Flow:
 * loading → team selection → playing XI → toss → toss result → rules → intro
 * → gameplay. Later stages add gameplay overlays, scorecard, analytics,
 * results and collection screens.
 */
export default function CricketApp() {
  return (
    <Routes>
      <Route index element={<MatchLoadingPage />} />
      <Route path="team-selection" element={<TeamSelectionPage />} />
      <Route path="playing-xi" element={<PlayingXIPage />} />
      <Route path="toss" element={<TossSelectionPage />} />
      <Route path="toss-result" element={<TossResultPage />} />
      <Route path="rules" element={<MatchRulesPage />} />
      <Route path="intro" element={<MatchIntroPage />} />
      <Route path="gameplay" element={<GameplayPage />} />
      <Route path="scorecard" element={<ScorecardPage />} />
      <Route path="run-distribution" element={<RunDistributionPage />} />
      <Route path="manhattan" element={<ManhattanChartPage />} />
      <Route path="partnership-chart" element={<PartnershipChartPage />} />
      <Route path="timeline" element={<MatchTimelinePage />} />
      <Route path="wagon-wheel" element={<WagonWheelPage />} />
      <Route path="player-of-match" element={<PlayerOfMatchPage />} />
      <Route path="match-result" element={<MatchResultPage />} />
      <Route path="match-summary" element={<MatchSummaryPage />} />
      <Route path="celebration" element={<EndMatchCelebrationPage />} />
      <Route path="history" element={<MatchHistoryPage />} />
      <Route path="statistics" element={<StatisticsPage />} />
      <Route path="standings" element={<StandingsPage />} />
      <Route path="profile" element={<ProfilePage />} />
      <Route path="highlights" element={<MatchHighlightsPage />} />
      <Route path="stickers" element={<StickerAlbumPage />} />
      <Route path="encyclopedia" element={<EncyclopediaPage />} />
      <Route path="daily-challenge" element={<DailyChallengePage />} />
      <Route path="*" element={<Navigate to="/cricket" replace />} />
    </Routes>
  );
}
