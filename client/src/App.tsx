import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Room from "./pages/Room";
import BhalyamHome from "./pages/BhalyamHome";
import GamesPage from "./pages/GamesPage";
import NotFound from "./pages/NotFound";
import ProfilePage from "./pages/ProfilePage";
import LoginPage from "./pages/auth/LoginPage";
import SignUpPage from "./pages/auth/SignUpPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import ConsentModal from "./components/privacy/ConsentModal";
import { enforceConsentOnLoad } from "./lib/privacy/consent";
import { getSocket } from "./lib/socket";
import BhalyamLogo from "./components/bhalyam/BhalyamLogo";

import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import AboutPage from "./pages/AboutPage";
import SettingsPage from "./pages/SettingsPage";
import NokiaCricketPage from "./pages/NokiaCricketPage";
import NokiaSnakePage from "./pages/NokiaSnakePage";
import BrickRacerPage from "./pages/BrickRacerPage";
import BrickTetrisPage from "./pages/BrickTetrisPage";
import BrickBreakoutPage from "./pages/BrickBreakoutPage";
import BrickSpaceAlienPage from "./pages/BrickSpaceAlienPage";

// ── Lazy-loaded internal & party routes ──
const PartyScreen = lazy(() => import("./pages/PartyScreen"));
const Diagnostics = lazy(() => import("./pages/Diagnostics"));
const PreviewLudo = lazy(() => import("./pages/PreviewLudo"));

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

export default function App() {
  useEffect(() => {
    enforceConsentOnLoad();
    getSocket();
  }, []);

  return (
    <ErrorBoundary>
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
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

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

          {/* Standalone nostalgic & retro games */}
          <Route path="/nokiacricket" element={<NokiaCricketPage />} />
          <Route path="/cricket2d" element={<NokiaCricketPage />} />
          <Route path="/snake" element={<NokiaSnakePage />} />
          <Route path="/nokiasnake" element={<NokiaSnakePage />} />
          <Route path="/snake2d" element={<NokiaSnakePage />} />
          <Route path="/roadrash" element={<BrickRacerPage />} />
          <Route path="/brickracer" element={<BrickRacerPage />} />
          <Route path="/racer" element={<BrickRacerPage />} />
          <Route path="/tetris" element={<BrickTetrisPage />} />
          <Route path="/bricktetris" element={<BrickTetrisPage />} />
          <Route path="/pentix" element={<BrickTetrisPage />} />
          <Route path="/breakout" element={<BrickBreakoutPage />} />
          <Route path="/brickbreakout" element={<BrickBreakoutPage />} />
          <Route path="/brick-breakout" element={<BrickBreakoutPage />} />
          <Route path="/blockbreakout" element={<BrickBreakoutPage />} />
          <Route path="/spacealien" element={<BrickSpaceAlienPage />} />
          <Route path="/space-alien" element={<BrickSpaceAlienPage />} />
          <Route path="/spaceinvaders" element={<BrickSpaceAlienPage />} />
          <Route path="/brickalien" element={<BrickSpaceAlienPage />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
