import { Routes, Route, Navigate } from "react-router-dom";
import Room from "./pages/Room";
import PreviewLudo from "./pages/PreviewLudo";
import BalyamHome from "./pages/BalyamHome";

/**
 * BALYAM routes.
 *
 *   "/"             → BalyamHome   (the app — game tiles + room sheet)
 *   "/room/:code"   → Room          (an active match)
 *   "/preview/ludo" → PreviewLudo   (dev preview, kept around for QA)
 *   "*"             → redirects to "/" so old WhatsApp links (legacy
 *                                   /balyam, /balyam/home, /welcome, /play,
 *                                   /dashboard) land softly on Home.
 *
 * The theme toggle (both desktop floating + mobile inline) lives inside
 * BalyamHome — it is intentionally NOT mounted at the app shell because
 * in-room screens (Rummy table, etc.) own their own UI chrome and don't
 * want a free-floating overlay button. If a future page needs a toggle,
 * mount one directly in that page using `useTheme` from lib/useTheme.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<BalyamHome />} />
      <Route path="/room/:code" element={<Room />} />
      <Route path="/preview/ludo" element={<PreviewLudo />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
