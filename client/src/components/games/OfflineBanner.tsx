import { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { getSocket } from "../../lib/socket";

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
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
