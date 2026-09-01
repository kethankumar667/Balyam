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
import { useAdminAutoCheck } from "./lib/useAdminAutoCheck";
import BhalyamLogo from "./components/bhalyam/BhalyamLogo";

// ── Lazy-loaded pages & routes (code-split) ──
const LazyRoom = lazy(() => import("./pages/Room"));
const LazyGamesPage = lazy(() => import("./pages/GamesPage"));
const LazyFavoritesPage = lazy(() => import("./pages/FavoritesPage"));
const LazyRecentlyPlayedPage = lazy(() => import("./pages/RecentlyPlayedPage"));
const LazyProfileOverviewPage = lazy(() => import("./pages/ProfileOverviewPage"));
const LazyPersonalInformationPage = lazy(() => import("./pages/PersonalInformationPage"));
const LazyGameStatisticsPage = lazy(() => import("./pages/GameStatisticsPage"));
const LazyMatchHistoryPage = lazy(() => import("./pages/MatchHistoryPage"));
const LazyAchievementsPage = lazy(() => import("./pages/AchievementsPage"));
const LazyLoginPage = lazy(() => import("./pages/auth/LoginPage"));
const LazySignUpPage = lazy(() => import("./pages/auth/SignUpPage"));
const LazyForgotPasswordPage = lazy(() => import("./pages/auth/ForgotPasswordPage"));
const LazyResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage"));
const LazyVerifyEmailPage = lazy(() => import("./pages/auth/VerifyEmailPage"));
const LazyPrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const LazyHowToPlayPage = lazy(() => import("./pages/HowToPlayPage"));
const LazyCommunityRulesPage = lazy(() => import("./pages/CommunityRulesPage"));
const LazySupportFaqsPage = lazy(() => import("./pages/SupportFaqsPage"));
const LazyContactUsPage = lazy(() => import("./pages/ContactUsPage"));
const LazyTermsOfServicePage = lazy(() => import("./pages/TermsOfServicePage"));
const LazySafetyCenterPage = lazy(() => import("./pages/SafetyCenterPage"));
const LazyAboutPage = lazy(() => import("./pages/AboutPage"));
const LazyPreferencesPage = lazy(() => import("./pages/PreferencesPage"));
const LazySecurityDataPage = lazy(() => import("./pages/SecurityDataPage"));
const LazySettingsPage = lazy(() => import("./pages/SettingsPage"));
const LazyNokiaCricketPage = lazy(() => import("./pages/NokiaCricketPage"));
const LazyNokiaSnakePage = lazy(() => import("./pages/NokiaSnakePage"));
const LazyBrickRacerPage = lazy(() => import("./pages/BrickRacerPage"));
const LazyBrickTetrisPage = lazy(() => import("./pages/BrickTetrisPage"));
const LazyBrickBreakoutPage = lazy(() => import("./pages/BrickBreakoutPage"));
const LazyPartyScreen = lazy(() => import("./pages/PartyScreen"));
const LazyDiagnostics = lazy(() => import("./pages/Diagnostics"));
const LazyPreviewLudo = lazy(() => import("./pages/PreviewLudo"));
const LazyAdminDashboardPage = lazy(() => import("./pages/admin/dashboard"));
const LazyAdminUsersPage = lazy(() => import("./pages/admin/users"));
const LazyAdminMatchesPage = lazy(() => import("./pages/admin/matches"));
const LazyAdminFeatureFlagsPage = lazy(() => import("./pages/admin/feature-flags"));
const LazyAdminAnnouncementsPage = lazy(() => import("./pages/admin/announcements"));
const LazyAdminLeaderboardsPage = lazy(() => import("./pages/admin/leaderboards"));
const LazyAdminAnalyticsPage = lazy(() => import("./pages/admin/analytics"));
const LazyAdminSystemHealthPage = lazy(() => import("./pages/admin/system-health"));
const LazyAdminAuditLogsPage = lazy(() => import("./pages/admin/audit-logs"));
const LazyAdminSettingsPage = lazy(() => import("./pages/admin/settings"));
const LazyAdminEconomyPage = lazy(() => import("./pages/admin/economy"));
const LazyAdminComponentLibraryPage = lazy(() => import("./pages/admin/component-library"));
const LazyLeaderboardPage = lazy(() => import("./pages/LeaderboardPage"));
const LazyTournamentsPage = lazy(() => import("./pages/TournamentsPage"));
const LazyDesignSystemCatalogPage = lazy(() => import("./pages/DesignSystemCatalogPage"));
const LazySocialHubPage = lazy(() => import("./pages/SocialHubPage"));
const LazyPreviewLoader = lazy(() => import("./pages/PreviewLoader"));
const LazyGameTileShowcase = lazy(() => import("./pages/GameTileShowcase"));

export interface RouteComponents {
  Room?: React.ComponentType;
  GamesPage?: React.ComponentType;
  FavoritesPage?: React.ComponentType;
  RecentlyPlayedPage?: React.ComponentType;
  ProfileOverviewPage?: React.ComponentType;
  PersonalInformationPage?: React.ComponentType;
  GameStatisticsPage?: React.ComponentType;
  MatchHistoryPage?: React.ComponentType;
  AchievementsPage?: React.ComponentType;
  LoginPage?: React.ComponentType;
  SignUpPage?: React.ComponentType;
  ForgotPasswordPage?: React.ComponentType;
  ResetPasswordPage?: React.ComponentType;
  VerifyEmailPage?: React.ComponentType;
  PrivacyPolicyPage?: React.ComponentType;
  HowToPlayPage?: React.ComponentType;
  CommunityRulesPage?: React.ComponentType;
  SupportFaqsPage?: React.ComponentType;
  ContactUsPage?: React.ComponentType;
  TermsOfServicePage?: React.ComponentType;
  SafetyCenterPage?: React.ComponentType;
  AboutPage?: React.ComponentType;
  PreferencesPage?: React.ComponentType;
  SecurityDataPage?: React.ComponentType;
  SettingsPage?: React.ComponentType;
  NokiaCricketPage?: React.ComponentType;
  NokiaSnakePage?: React.ComponentType;
  BrickRacerPage?: React.ComponentType;
  BrickTetrisPage?: React.ComponentType;
  BrickBreakoutPage?: React.ComponentType;
  PartyScreen?: React.ComponentType;
  Diagnostics?: React.ComponentType;
  PreviewLudo?: React.ComponentType;
  AdminDashboardPage?: React.ComponentType;
  AdminUsersPage?: React.ComponentType;
  AdminMatchesPage?: React.ComponentType;
  AdminFeatureFlagsPage?: React.ComponentType;
  AdminAnnouncementsPage?: React.ComponentType;
  AdminLeaderboardsPage?: React.ComponentType;
  AdminAnalyticsPage?: React.ComponentType;
  AdminSystemHealthPage?: React.ComponentType;
  AdminAuditLogsPage?: React.ComponentType;
  AdminSettingsPage?: React.ComponentType;
  AdminEconomyPage?: React.ComponentType;
  AdminComponentLibraryPage?: React.ComponentType;
  LeaderboardPage?: React.ComponentType;
  TournamentsPage?: React.ComponentType;
  DesignSystemCatalogPage?: React.ComponentType;
  SocialHubPage?: React.ComponentType;
  PreviewLoader?: React.ComponentType;
  GameTileShowcase?: React.ComponentType;
}

export interface AppProps {
  components?: RouteComponents;
}
import PremiumGamingLoader from "./components/loading/PremiumGamingLoader";
import { ProfileSkeleton, LeaderboardSkeleton, GamesGridSkeleton } from "./design-system/dls";
import AppLayout from "./components/layout/AppLayout";
import GamesFamilyLayout from "./components/layout/GamesFamilyLayout";
import ProfileFamilyLayout from "./components/layout/ProfileFamilyLayout";

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
import { useStructuredData } from "./seo/useStructuredData";
import { useMetadata } from "./seo/useMetadata";

export default function App({ components = {} }: AppProps) {
  const Room = components.Room ?? LazyRoom;
  const GamesPage = components.GamesPage ?? LazyGamesPage;
  const FavoritesPage = components.FavoritesPage ?? LazyFavoritesPage;
  const RecentlyPlayedPage = components.RecentlyPlayedPage ?? LazyRecentlyPlayedPage;
  const ProfileOverviewPage = components.ProfileOverviewPage ?? LazyProfileOverviewPage;
  const PersonalInformationPage = components.PersonalInformationPage ?? LazyPersonalInformationPage;
  const GameStatisticsPage = components.GameStatisticsPage ?? LazyGameStatisticsPage;
  const MatchHistoryPage = components.MatchHistoryPage ?? LazyMatchHistoryPage;
  const AchievementsPage = components.AchievementsPage ?? LazyAchievementsPage;
  const LoginPage = components.LoginPage ?? LazyLoginPage;
  const SignUpPage = components.SignUpPage ?? LazySignUpPage;
  const ForgotPasswordPage = components.ForgotPasswordPage ?? LazyForgotPasswordPage;
  const ResetPasswordPage = components.ResetPasswordPage ?? LazyResetPasswordPage;
  const VerifyEmailPage = components.VerifyEmailPage ?? LazyVerifyEmailPage;
  const PrivacyPolicyPage = components.PrivacyPolicyPage ?? LazyPrivacyPolicyPage;
  const HowToPlayPage = components.HowToPlayPage ?? LazyHowToPlayPage;
  const CommunityRulesPage = components.CommunityRulesPage ?? LazyCommunityRulesPage;
  const SupportFaqsPage = components.SupportFaqsPage ?? LazySupportFaqsPage;
  const ContactUsPage = components.ContactUsPage ?? LazyContactUsPage;
  const TermsOfServicePage = components.TermsOfServicePage ?? LazyTermsOfServicePage;
  const SafetyCenterPage = components.SafetyCenterPage ?? LazySafetyCenterPage;
  const AboutPage = components.AboutPage ?? LazyAboutPage;
  const PreferencesPage = components.PreferencesPage ?? LazyPreferencesPage;
  const SecurityDataPage = components.SecurityDataPage ?? LazySecurityDataPage;
  const SettingsPage = components.SettingsPage ?? LazySettingsPage;
  const NokiaCricketPage = components.NokiaCricketPage ?? LazyNokiaCricketPage;
  const NokiaSnakePage = components.NokiaSnakePage ?? LazyNokiaSnakePage;
  const BrickRacerPage = components.BrickRacerPage ?? LazyBrickRacerPage;
  const BrickTetrisPage = components.BrickTetrisPage ?? LazyBrickTetrisPage;
  const BrickBreakoutPage = components.BrickBreakoutPage ?? LazyBrickBreakoutPage;
  const PartyScreen = components.PartyScreen ?? LazyPartyScreen;
  const Diagnostics = components.Diagnostics ?? LazyDiagnostics;
  const PreviewLudo = components.PreviewLudo ?? LazyPreviewLudo;
  const AdminDashboardPage = components.AdminDashboardPage ?? LazyAdminDashboardPage;
  const AdminUsersPage = components.AdminUsersPage ?? LazyAdminUsersPage;
  const AdminMatchesPage = components.AdminMatchesPage ?? LazyAdminMatchesPage;
  const AdminFeatureFlagsPage = components.AdminFeatureFlagsPage ?? LazyAdminFeatureFlagsPage;
  const AdminAnnouncementsPage = components.AdminAnnouncementsPage ?? LazyAdminAnnouncementsPage;
  const AdminLeaderboardsPage = components.AdminLeaderboardsPage ?? LazyAdminLeaderboardsPage;
  const AdminAnalyticsPage = components.AdminAnalyticsPage ?? LazyAdminAnalyticsPage;
  const AdminSystemHealthPage = components.AdminSystemHealthPage ?? LazyAdminSystemHealthPage;
  const AdminAuditLogsPage = components.AdminAuditLogsPage ?? LazyAdminAuditLogsPage;
  const AdminSettingsPage = components.AdminSettingsPage ?? LazyAdminSettingsPage;
  const AdminEconomyPage = components.AdminEconomyPage ?? LazyAdminEconomyPage;
  const AdminComponentLibraryPage = components.AdminComponentLibraryPage ?? LazyAdminComponentLibraryPage;
  const LeaderboardPage = components.LeaderboardPage ?? LazyLeaderboardPage;
  const TournamentsPage = components.TournamentsPage ?? LazyTournamentsPage;
  const DesignSystemCatalogPage = components.DesignSystemCatalogPage ?? LazyDesignSystemCatalogPage;
  const SocialHubPage = components.SocialHubPage ?? LazySocialHubPage;
  const PreviewLoader = components.PreviewLoader ?? LazyPreviewLoader;
  const GameTileShowcase = components.GameTileShowcase ?? LazyGameTileShowcase;

  useEffect(() => {
    enforceConsentOnLoad();
    getSocket();
  }, []);
  useAdminAutoCheck();
  useStructuredData();
  useMetadata();

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

            {/* Protected profile & account management.
                One persistent layout route for the five pages the sidebar
                bounces straight between — see ProfileFamilyLayout.tsx. */}
            <Route
              element={
                <ProtectedRoute requireMember={false}>
                  <ProfileFamilyLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/profile" element={<ProfileOverviewPage />} />
              <Route path="/profile/personal" element={<PersonalInformationPage />} />
              <Route path="/profile/statistics" element={<GameStatisticsPage />} />
              <Route path="/profile/matches" element={<MatchHistoryPage />} />
              <Route path="/profile/achievements" element={<AchievementsPage />} />
            </Route>
            <Route
              path="/profile/overview"
              element={<Navigate to="/profile" replace />}
            />
            <Route
              path="/profile/stats"
              element={<Navigate to="/profile/statistics" replace />}
            />
            <Route
              path="/profile/history"
              element={<Navigate to="/profile/matches" replace />}
            />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/tournaments" element={<TournamentsPage />} />
            <Route path="/social" element={<SocialHubPage />} />
            <Route path="/design-system" element={<DesignSystemCatalogPage />} />

            {/* Help & Trust Architecture */}
            <Route path="/about" element={<AboutPage />} />
            <Route path="/how-to-play" element={<HowToPlayPage />} />
            <Route path="/help/how-to-play" element={<Navigate to="/how-to-play" replace />} />
            <Route path="/community-rules" element={<CommunityRulesPage />} />
            <Route path="/rules" element={<Navigate to="/community-rules" replace />} />
            <Route path="/help/community-rules" element={<Navigate to="/community-rules" replace />} />
            <Route path="/support" element={<SupportFaqsPage />} />
            <Route path="/faqs" element={<Navigate to="/support" replace />} />
            <Route path="/faq" element={<Navigate to="/support" replace />} />
            <Route path="/help/faqs" element={<Navigate to="/support" replace />} />
            <Route path="/help/support" element={<Navigate to="/support" replace />} />
            <Route path="/contact" element={<ContactUsPage />} />
            <Route path="/contact-us" element={<Navigate to="/contact" replace />} />
            <Route path="/help/contact" element={<Navigate to="/contact" replace />} />
            <Route path="/support/contact" element={<Navigate to="/contact" replace />} />
            <Route path="/help" element={<Navigate to="/how-to-play" replace />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/help/privacy" element={<Navigate to="/privacy" replace />} />
            <Route path="/terms" element={<TermsOfServicePage />} />
            <Route path="/terms-of-service" element={<Navigate to="/terms" replace />} />
            <Route path="/help/terms" element={<Navigate to="/terms" replace />} />
            <Route path="/safety" element={<SafetyCenterPage />} />
            <Route path="/help/safety" element={<Navigate to="/safety" replace />} />
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
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <AdminDashboardPage />
                  </AdminRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/economy"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <AdminEconomyPage />
                  </AdminRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <AdminUsersPage />
                  </AdminRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/matches"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <AdminMatchesPage />
                  </AdminRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/feature-flags"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <AdminFeatureFlagsPage />
                  </AdminRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/announcements"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <AdminAnnouncementsPage />
                  </AdminRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/leaderboards"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <AdminLeaderboardsPage />
                  </AdminRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <AdminAnalyticsPage />
                  </AdminRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/system-health"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <AdminSystemHealthPage />
                  </AdminRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/audit-logs"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <AdminAuditLogsPage />
                  </AdminRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <AdminSettingsPage />
                  </AdminRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/component-library"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <AdminComponentLibraryPage />
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
