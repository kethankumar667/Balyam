import { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";

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

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="w-full bg-amber-600 text-white px-4 py-2.5 shadow-md flex items-center justify-between text-xs sm:text-sm font-bold z-40"
    >
      <div className="flex items-center gap-2 max-w-screen-xl mx-auto flex-1">
        <WifiOff className="w-4 h-4 flex-shrink-0" />
        <span>You are currently offline. Single player games like Snake, Brick Racer & Tetris remain playable!</span>
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-black transition flex items-center gap-1 cursor-pointer flex-shrink-0"
      >
        <RefreshCw className="w-3 h-3" />
        <span>Retry</span>
      </button>
    </div>
  );
}
