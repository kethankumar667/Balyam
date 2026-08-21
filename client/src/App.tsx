import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import BhalyamHome from "./pages/BhalyamHome";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AdminRoute from "./components/auth/AdminRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import ConsentModal from "./components/privacy/ConsentModal";
import { enforceConsentOnLoad } from "./lib/privacy/consent";
import { getSocket } from "./lib/socket";
import BhalyamLogo from "./components/bhalyam/BhalyamLogo";

// ── Lazy-loaded pages & routes (code-split) ──
const Room = lazy(() => import("./pages/Room"));
const GamesPage = lazy(() => import("./pages/GamesPage"));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage"));
const RecentlyPlayedPage = lazy(() => import("./pages/RecentlyPlayedPage"));
const ProfileOverviewPage = lazy(() => import("./pages/ProfileOverviewPage"));
const PersonalInformationPage = lazy(() => import("./pages/PersonalInformationPage"));
const GameStatisticsPage = lazy(() => import("./pages/GameStatisticsPage"));
const MatchHistoryPage = lazy(() => import("./pages/MatchHistoryPage"));
const AchievementsPage = lazy(() => import("./pages/AchievementsPage"));
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const SignUpPage = lazy(() => import("./pages/auth/SignUpPage"));
const ForgotPasswordPage = lazy(() => import("./pages/auth/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage"));
const VerifyEmailPage = lazy(() => import("./pages/auth/VerifyEmailPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const PreferencesPage = lazy(() => import("./pages/PreferencesPage"));
const SecurityDataPage = lazy(() => import("./pages/SecurityDataPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const NokiaCricketPage = lazy(() => import("./pages/NokiaCricketPage"));
const NokiaSnakePage = lazy(() => import("./pages/NokiaSnakePage"));
const BrickRacerPage = lazy(() => import("./pages/BrickRacerPage"));
const BrickTetrisPage = lazy(() => import("./pages/BrickTetrisPage"));
const BrickBreakoutPage = lazy(() => import("./pages/BrickBreakoutPage"));
const PartyScreen = lazy(() => import("./pages/PartyScreen"));
const Diagnostics = lazy(() => import("./pages/Diagnostics"));
const PreviewLudo = lazy(() => import("./pages/PreviewLudo"));
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage"));
const LeaderboardPage = lazy(() => import("./pages/LeaderboardPage"));
const TournamentsPage = lazy(() => import("./pages/TournamentsPage"));
const DesignSystemCatalogPage = lazy(() => import("./pages/DesignSystemCatalogPage"));
const SocialHubPage = lazy(() => import("./pages/SocialHubPage"));
const PreviewLoader = lazy(() => import("./pages/PreviewLoader"));
const GameTileShowcase = lazy(() => import("./pages/GameTileShowcase"));
import PremiumGamingLoader from "./components/loading/PremiumGamingLoader";
import { ProfileSkeleton, LeaderboardSkeleton, GamesGridSkeleton } from "./design-system/dls";
import AppLayout from "./components/layout/AppLayout";
import GamesFamilyLayout from "./components/layout/GamesFamilyLayout";

function RouteLoadingFallback() {
  const { pathname } = useLocation();

  if (pathname.startsWith("/profile")) {
    return (
      <AppLayout>
        <div className="min-h-screen bhalyam-paper py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <ProfileSkeleton />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (pathname.startsWith("/leaderboard")) {
    return (
      <AppLayout>
        <div className="min-h-screen bhalyam-paper py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <LeaderboardSkeleton />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (
    pathname.startsWith("/games") ||
    pathname.startsWith("/favorites") ||
    pathname.startsWith("/recently-played")
  ) {
    return (
      <AppLayout>
        <div className="min-h-screen bhalyam-paper py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <GamesGridSkeleton />
          </div>
        </div>
      </AppLayout>
    );
  }

  return <PremiumGamingLoader />;
}

/**
 * On every route change, snap the window scroll back to the top so the
 * incoming page lands at its header rather than wherever the previous
 * page happened to be scrolled.
 */
function ScrollToTopOnRouteChange() {
  const { pathname } = useLocation();
  useEffect(() => {
    try {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
      }
    } catch {
      // ignore — non-DOM environments (tests).
    }
  }, []);
  useEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      });
    } catch {
      // ignore — non-DOM environments (tests).
    }
  }, [pathname]);
  return null;
}

import { RecoveryProvider } from "./core/recovery/RecoveryProvider";
import ToastHost from "./components/ToastHost";
import { TooltipProvider } from "./design-system/dls";

export default function App() {
  useEffect(() => {
    enforceConsentOnLoad();
    getSocket();
  }, []);

  return (
    <ErrorBoundary>
      <RecoveryProvider>
        <TooltipProvider delayDuration={200} skipDelayDuration={100}>
          <ScrollToTopOnRouteChange />
          <ToastHost />
          <ConsentModal />
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            <Route path="/" element={<BhalyamHome />} />
            <Route path="/home" element={<BhalyamHome />} />
            {/*
              One persistent layout route for the three pages a player
              bounces between constantly (header nav pills go straight
              between them). Without this, each page's own `<AppLayout>`
              meant every hop fully remounted the header/sidebar — see
              GamesFamilyLayout.tsx.
            */}
            <Route element={<GamesFamilyLayout />}>
              <Route path="/games" element={<GamesPage />} />
              <Route path="/favorites" element={<FavoritesPage />} />
              <Route path="/recently-played" element={<RecentlyPlayedPage />} />
            </Route>

            {/* Protected profile & account management */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute requireMember={false}>
                  <ProfileOverviewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/overview"
              element={<Navigate to="/profile" replace />}
            />
            <Route
              path="/profile/personal"
              element={
                <ProtectedRoute requireMember={false}>
                  <PersonalInformationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/statistics"
              element={
                <ProtectedRoute requireMember={false}>
                  <GameStatisticsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/stats"
              element={<Navigate to="/profile/statistics" replace />}
            />
            <Route
              path="/profile/matches"
              element={
                <ProtectedRoute requireMember={false}>
                  <MatchHistoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/history"
              element={<Navigate to="/profile/matches" replace />}
            />
            <Route
              path="/profile/achievements"
              element={
                <ProtectedRoute requireMember={false}>
                  <AchievementsPage />
                </ProtectedRoute>
              }
            />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/tournaments" element={<TournamentsPage />} />
            <Route path="/social" element={<SocialHubPage />} />
            <Route path="/design-system" element={<DesignSystemCatalogPage />} />

            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/settings" element={<Navigate to="/settings/preferences" replace />} />
            <Route path="/settings/preferences" element={<PreferencesPage />} />
            <Route path="/settings/security" element={<SecurityDataPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/room/:code" element={<Room />} />

            {/* Smart TV / Party Mode — big-screen, seat-less view of a room. */}
            <Route path="/tv/:code" element={<PartyScreen />} />
            {/* Connection log for debugging reconnect failures on real devices. */}
            <Route path="/diagnostics" element={<Diagnostics />} />
            <Route path="/preview/ludo" element={<PreviewLudo />} />
            <Route path="/preview/loader" element={<PreviewLoader />} />
            <Route path="/loader" element={<PreviewLoader />} />
            <Route path="/preview/tiles" element={<GameTileShowcase />} />
            <Route path="/showcase/tiles" element={<GameTileShowcase />} />
            {/*
              Two gates, deliberately.

              `ProtectedRoute` sends an anonymous visitor to sign in, which is
              the ordinary courtesy. `AdminRoute` is the one that matters: it
              asks the SERVER whether this session may read operational data
              and renders the console only on a 200. The route used to have
              neither, and the endpoints behind it answered anyone.
            */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <AdminDashboardPage />
                  </AdminRoute>
                </ProtectedRoute>
              }
            />

            {/* Standalone nostalgic & retro games */}
            <Route path="/nokiacricket" element={<NokiaCricketPage />} />
            <Route path="/cricket2d" element={<NokiaCricketPage />} />
            <Route path="/snake" element={<NokiaSnakePage />} />
            <Route path="/nokiasnake" element={<NokiaSnakePage />} />
            <Route path="/snake2d" element={<NokiaSnakePage />} />
            <Route path="/roadrash" element={<BrickRacerPage />} />
            <Route path="/brickracer" element={<BrickRacerPage />} />
            <Route path="/racer" element={<BrickRacerPage />} />
            <Route path="/brickblocks" element={<BrickTetrisPage />} />
            <Route path="/tetris" element={<BrickTetrisPage />} />
            <Route path="/bricktetris" element={<BrickTetrisPage />} />
            <Route path="/pentix" element={<BrickTetrisPage />} />
            <Route path="/breakout" element={<BrickBreakoutPage />} />
            <Route path="/brickbreakout" element={<BrickBreakoutPage />} />
            <Route path="/brick-breakout" element={<BrickBreakoutPage />} />
            <Route path="/blockbreakout" element={<BrickBreakoutPage />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        </TooltipProvider>
      </RecoveryProvider>
    </ErrorBoundary>
  );
}
