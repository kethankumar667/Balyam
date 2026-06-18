import { Routes, Route } from "react-router-dom";
import Room from "./pages/Room";
import PreviewLudo from "./pages/PreviewLudo";
import BhalyamHome from "./pages/BhalyamHome";
import NotFound from "./pages/NotFound";

/**
 * BHALYAM routes.
 *
 *   "/"             → BhalyamHome   (the app — game tiles + room sheet)
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
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<BhalyamHome />} />
      <Route path="/room/:code" element={<Room />} />
      <Route path="/preview/ludo" element={<PreviewLudo />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
