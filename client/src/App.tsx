import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Room from "./pages/Room";
import PartyScreen from "./pages/PartyScreen";
import Diagnostics from "./pages/Diagnostics";
import PreviewLudo from "./pages/PreviewLudo";
import BhalyamHome from "./pages/BhalyamHome";
import GamesPage from "./pages/GamesPage";
import NotFound from "./pages/NotFound";
import ProfilePage from "./pages/ProfilePage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import AboutPage from "./pages/AboutPage";
import ConsentModal from "./components/privacy/ConsentModal";
import { enforceConsentOnLoad } from "./lib/privacy/consent";
import LoginPage from "./pages/auth/LoginPage";
import SignUpPage from "./pages/auth/SignUpPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage";
import NokiaCricketPage from "./pages/NokiaCricketPage";
import NokiaSnakePage from "./pages/NokiaSnakePage";

/**
 * On every route change, snap the window scroll back to the top so the
 * incoming page lands at its header rather than wherever the previous
 * page happened to be scrolled. Pair with the fullscreen helper, which
 * also scrolls to top right after entering fullscreen — together they
 * guarantee the top of the page is always what the player sees first.
 *
 * We also disable the browser's automatic scroll restoration on first run.
 * Without that, Chrome/Firefox restore the previous scroll position on
 * back/forward navigation AFTER our effect fires, silently undoing the
 * scrollTo and leaving the user mid-page (which is the bug the screenshot
 * captured on /room/:code).
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
      // Run again on the next frame too. Some pages render a lightweight
      // shell first (e.g. Room's "Connecting…" state) and then expand once
      // the room data arrives, which can push the previously-set scroll
      // position forward before the user sees the layout settle.
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      });
    } catch {
      // ignore — non-DOM environments (tests).
    }
  }, [pathname]);
  return null;
}

/**
 * BHALYAM routes.
 *
 *   "/"             → BhalyamHome   (the app — game tiles + room sheet)
 *   "/games"        → GamesPage     (full catalog incl. coming-soon tiles)
 *   "/room/:code"   → Room          (an active match)
 *   "/preview/ludo" → PreviewLudo   (dev preview, kept around for QA)
 *   "*"             → NotFound      (creative 404 page; keeps the bad URL
 *                                    visible so users can spot a typo)
 *
 * The theme toggle (both desktop floating + mobile inline) lives inside
 * BhalyamHome — it is intentionally NOT mounted at the app shell because
 * in-room screens (Rummy table, etc.) own their own UI chrome and don't
 * want a free-floating overlay button. If a future page needs a toggle,
 * mount one directly in that page using `useTheme` from lib/useTheme.
 */
import { getSocket } from "./lib/socket";

export default function App() {
  useEffect(() => {
    // Before anything else: a player who chose essential-only should not find
    // optional keys quietly restored by whatever ran first last session.
    enforceConsentOnLoad();
    // Warm up socket connection on app load so room creation is instantaneous
    getSocket();
  }, []);

  return (
    <>
      <ScrollToTopOnRouteChange />
      <ConsentModal />
      <Routes>
        <Route path="/" element={<BhalyamHome />} />
        <Route path="/games" element={<GamesPage />} />
        {/* Accounts. Design-stage: the screens are real, nothing behind them
            signs anyone in yet. Guests never have to come through here —
            joining a room with a code needs no account. */}
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/about" element={<AboutPage />} />
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
        <Route path="/nokiacricket" element={<NokiaCricketPage />} />
        <Route path="/cricket2d" element={<NokiaCricketPage />} />
        <Route path="/snake" element={<NokiaSnakePage />} />
        <Route path="/nokiasnake" element={<NokiaSnakePage />} />
        <Route path="/snake2d" element={<NokiaSnakePage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
