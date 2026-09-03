import React from "react";
import ReactDOMServer from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import App, { type RouteComponents } from "./App";
import { AudioProvider } from "./context/AudioContext";
import { PUBLIC_ROUTES_METADATA, PRERENDER_ROUTES } from "./seo/metadata";
import { getStructuredDataForRoute, serializeJsonLd } from "./seo/structuredData";

/**
 * Re-exported so `client/scripts/prerender.mjs` can pull the authoritative
 * public route catalog from the SAME compiled bundle it already imports for
 * `render()` — no second import path to guess at, no separate list to drift.
 * `PRERENDER_ROUTES` is `Object.keys(PUBLIC_ROUTES_METADATA)` (see
 * `seo/metadata.ts`), so this file, the metadata catalog, and the prerender
 * script all agree by construction.
 */
export { PRERENDER_ROUTES };

// Synchronous imports for SSR prerender to resolve all public page content
import GamesPage from "./pages/GamesPage";
import FavoritesPage from "./pages/FavoritesPage";
import RecentlyPlayedPage from "./pages/RecentlyPlayedPage";
import LoginPage from "./pages/auth/LoginPage";
import SignUpPage from "./pages/auth/SignUpPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import HowToPlayPage from "./pages/HowToPlayPage";
import CommunityRulesPage from "./pages/CommunityRulesPage";
import SupportFaqsPage from "./pages/SupportFaqsPage";
import ContactUsPage from "./pages/ContactUsPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";
import SafetyCenterPage from "./pages/SafetyCenterPage";
import AboutPage from "./pages/AboutPage";
import PreferencesPage from "./pages/PreferencesPage";
import SecurityDataPage from "./pages/SecurityDataPage";
import SettingsPage from "./pages/SettingsPage";
import NokiaCricketPage from "./pages/NokiaCricketPage";
import NokiaSnakePage from "./pages/NokiaSnakePage";
import BrickRacerPage from "./pages/BrickRacerPage";
import BrickTetrisPage from "./pages/BrickTetrisPage";
import BrickBreakoutPage from "./pages/BrickBreakoutPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import TournamentsPage from "./pages/TournamentsPage";
import SocialHubPage from "./pages/SocialHubPage";
import DesignSystemCatalogPage from "./pages/DesignSystemCatalogPage";

const ssrComponents: RouteComponents = {
  GamesPage,
  FavoritesPage,
  RecentlyPlayedPage,
  LoginPage,
  SignUpPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  VerifyEmailPage,
  PrivacyPolicyPage,
  HowToPlayPage,
  CommunityRulesPage,
  SupportFaqsPage,
  ContactUsPage,
  TermsOfServicePage,
  SafetyCenterPage,
  AboutPage,
  PreferencesPage,
  SecurityDataPage,
  SettingsPage,
  NokiaCricketPage,
  NokiaSnakePage,
  BrickRacerPage,
  BrickTetrisPage,
  BrickBreakoutPage,
  LeaderboardPage,
  TournamentsPage,
  SocialHubPage,
  DesignSystemCatalogPage,
};

export function render(url: string) {
  const metadata = PUBLIC_ROUTES_METADATA[url] || PUBLIC_ROUTES_METADATA["/"];
  const structuredData = getStructuredDataForRoute(url);
  const jsonLdString = serializeJsonLd(structuredData);

  const appHtml = ReactDOMServer.renderToString(
    <React.StrictMode>
      <StaticRouter location={url}>
        <AudioProvider>
          <App components={ssrComponents} />
        </AudioProvider>
      </StaticRouter>
    </React.StrictMode>
  );

  return { appHtml, metadata, structuredData, jsonLdString };
}
