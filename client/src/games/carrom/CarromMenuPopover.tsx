import React from "react";
import { HapticsManager } from "../../services/HapticsManager";

interface CarromMenuPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onOptions: () => void;
  onLeave: () => void;
}

export function CarromMenuPopover({
  isOpen,
  onClose,
  onOptions,
  onLeave,
}: CarromMenuPopoverProps) {
  if (!isOpen) return null;

  const handleOptions = () => {
    HapticsManager.getInstance().subtle();
    onClose();
    onOptions();
  };

  const handleLeave = () => {
    HapticsManager.getInstance().subtle();
    onClose();
    onLeave();
  };

  return (
    <>
      {/* Invisible backdrop to dismiss on tap outside */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Floating Popover Card anchored above bottom-right */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Game Menu Options"
        className="fixed bottom-20 right-4 z-50 w-52 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        style={{
          background: "linear-gradient(180deg, #2A150B 0%, #180D07 100%)",
          border: "1.5px solid #63361A",
          boxShadow: "0 10px 30px rgba(0,0,0,0.8), 0 0 15px rgba(245,158,11,0.15)",
        }}
      >
        {/* Red Circular Close Badge at top-left/top-right */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="absolute top-2 left-2 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-90 flex items-center justify-center text-white shadow-md cursor-pointer transition z-10"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="pt-7 pb-2 flex flex-col">
          {/* Options Button */}
          <button
            type="button"
            onClick={handleOptions}
            className="w-full px-5 py-3 text-left text-base font-black text-amber-100 hover:bg-amber-900/30 active:bg-amber-900/50 transition cursor-pointer min-h-[48px] flex items-center justify-between"
          >
            <span>Options</span>
            <span className="text-xs text-amber-400/70">⚙️</span>
          </button>

          {/* Gold / Mahogany Divider Line */}
          <div className="w-full h-[1px] bg-gradient-to-r from-amber-900/10 via-amber-700/40 to-amber-900/10" />

          {/* Leave Match Button */}
          <button
            type="button"
            onClick={handleLeave}
            className="w-full px-5 py-3 text-left text-base font-black text-rose-200 hover:bg-rose-950/30 active:bg-rose-950/50 transition cursor-pointer min-h-[48px] flex items-center justify-between"
          >
            <span>Leave</span>
            <span className="text-xs text-rose-400/70">🚪</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default CarromMenuPopover;
