import { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { getSocket } from "../../lib/socket";

export default function OfflineBanner() {
  /**
   * `false` (never offline) on both the server render and the first client
   * render — deterministic, and correct for the overwhelming common case.
   *
   * `!navigator.onLine` used to be the initializer directly. That reads fine
   * in a browser, but Node (the SSR/prerender runtime — see
   * client/scripts/prerender.mjs) has had a global `navigator` object since
   * Node 21, and that object has no `.onLine` property — so
   * `navigator.onLine` is `undefined` there, and `!undefined` is `true`.
   * The server therefore prerendered this banner VISIBLE on every page,
   * including the homepage, while a real online browser's first hydration
   * render produced `null` for it — an entire extra subtree only on the
   * server side, part of the same class of homepage hydration mismatch
   * (React errors #418/#423) `FallingPetals.tsx` had for a different reason.
   * `typeof navigator === "undefined"` would NOT have caught this, since the
   * object genuinely exists in Node now — only `.onLine` is missing.
   */
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Corrects to the real, current value now that real browser APIs exist —
    // handles a page that loads while ALREADY offline, not just a
    // transition, since the online/offline events only fire on a change.
    setIsOffline(!navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  const handleRetry = () => {
    if (navigator.onLine) {
      setIsOffline(false);
      try {
        const socket = getSocket();
        if (!socket.connected) socket.connect();
      } catch {
        // ignore socket errors in offline mode
      }
    } else {
      setIsOffline(true);
    }
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="w-full bg-amber-600 text-white px-4 py-2.5 shadow-md flex items-center justify-between text-xs sm:text-sm font-bold z-40"
    >
      <div className="flex items-center gap-2 max-w-screen-xl mx-auto flex-1">
        <WifiOff className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        <span>
          You are currently offline. Already loaded single-player games may remain available while you are offline. Multiplayer rooms will attempt to reconnect when your connection returns.
        </span>
      </div>
      <button
        type="button"
        onClick={handleRetry}
        aria-label="Retry network connection"
        className="min-h-[44px] min-w-[44px] px-4 py-2 bg-white/20 hover:bg-white/30 active:scale-95 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-amber-600"
      >
        <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Retry</span>
      </button>
    </div>
  );
}
