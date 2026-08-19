import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
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
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const PersonalInformationPage = lazy(() => import("./pages/PersonalInformationPage"));
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const SignUpPage = lazy(() => import("./pages/auth/SignUpPage"));
const ForgotPasswordPage = lazy(() => import("./pages/auth/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage"));
const VerifyEmailPage = lazy(() => import("./pages/auth/VerifyEmailPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
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

function RouteLoadingFallback() {
  return (
    <div
      className="min-h-screen bhalyam-paper flex flex-col items-center justify-center p-6 text-center"
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <div className="animate-pulse flex flex-col items-center gap-3">
        <BhalyamLogo size={56} decorative />
        <div className="flex items-center gap-2 text-sm font-bold text-[#8A6D4B] dark:text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          <span>Opening table…</span>
        </div>
      </div>
    </div>
  );
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

export default function App() {
  useEffect(() => {
    enforceConsentOnLoad();
    getSocket();
  }, []);

  return (
    <ErrorBoundary>
      <RecoveryProvider>
        <ScrollToTopOnRouteChange />
        <ConsentModal />
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            <Route path="/" element={<BhalyamHome />} />
            <Route path="/home" element={<BhalyamHome />} />
            <Route path="/games" element={<GamesPage />} />

            {/* Protected profile & account management */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute requireMember={false}>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/personal"
              element={
                <ProtectedRoute requireMember={false}>
                  <PersonalInformationPage />
                </ProtectedRoute>
              }
            />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/tournaments" element={<TournamentsPage />} />
            <Route path="/social" element={<SocialHubPage />} />
            <Route path="/design-system" element={<DesignSystemCatalogPage />} />

            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/settings" element={<SettingsPage />} />
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
      </RecoveryProvider>
    </ErrorBoundary>
  );
}
