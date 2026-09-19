import React, { useState, useEffect } from "react";
import { Orbit, X } from "lucide-react";

interface HoloTourBeaconProps {
  id: string;
  title: string;
  tip: string;
  className?: string;
}

export const HoloTourBeacon: React.FC<HoloTourBeaconProps> = ({
  id,
  title,
  tip,
  className = "",
}) => {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(`bhalyam.beacon.${id}`) === "1";
      if (!seen) setDismissed(false);
    } catch {
      // ignore
    }
  }, [id]);

  if (dismissed) return null;

  const handleDismiss = () => {
    try {
      localStorage.setItem(`bhalyam.beacon.${id}`, "1");
    } catch {
      // ignore
    }
    setDismissed(true);
  };

  return (
    <div
      className={`relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/90 border border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.3)] text-xs font-mono text-amber-300 z-20 ${className}`}
    >
      <Orbit className="w-3.5 h-3.5 animate-spin text-amber-400" />
      <div className="flex items-center gap-1.5">
        <span className="font-bold">{title}:</span>
        <span className="text-stone-300 text-[11px]">{tip}</span>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="text-stone-400 hover:text-stone-100 p-0.5 rounded cursor-pointer"
        aria-label="Dismiss guide beacon"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};
