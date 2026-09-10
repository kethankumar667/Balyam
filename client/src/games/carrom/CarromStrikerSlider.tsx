import React, { useRef, useCallback } from "react";
import { HapticsManager } from "../../services/HapticsManager";
import { toUiSliderPos, toServerSliderPos } from "./carrom-shared";

interface CarromStrikerSliderProps {
  myTurn: boolean;
  phase: string;
  strikerPos: number;
  onPlace: (pos: number) => void;
  isFlipped?: boolean;
}

export function CarromStrikerSlider({
  myTurn,
  phase,
  strikerPos,
  onPlace,
  isFlipped = false,
}: CarromStrikerSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const canPlace = myTurn && phase === "aiming";
  const uiPos = toUiSliderPos(strikerPos, isFlipped);

  const updateFromPointer = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      if (rect.width <= 0) return;

      const rawPct = (clientX - rect.left) / rect.width;
      const clampedUiPos = Math.max(0, Math.min(1, rawPct));
      const serverPos = toServerSliderPos(clampedUiPos, isFlipped);

      onPlace(serverPos);
      HapticsManager.getInstance().subtle();
    },
    [onPlace, isFlipped]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canPlace) return;
    isDraggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromPointer(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !canPlace) return;
    updateFromPointer(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Pointer capture might already be released
      }
    }
  };

  return (
    <div
      className="w-full flex items-center justify-center py-1 select-none z-10 touch-none"
      aria-label="Striker baseline slider"
    >
      {/* Outer touch wrapper ensuring >= 44px touch height */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative w-full max-w-[280px] h-11 flex items-center justify-center cursor-pointer transition-opacity duration-200 ${
          canPlace ? "opacity-100" : "opacity-45 pointer-events-none"
        }`}
        title={canPlace ? "Slide to position your striker" : "Wait for your turn"}
      >
        {/* Carved Wooden Inset Groove */}
        <div
          className="relative w-full h-5 rounded-full overflow-hidden flex items-center"
          style={{
            background: "linear-gradient(180deg, #160B06 0%, #2A150B 50%, #1A0D07 100%)",
            border: "1.5px solid #6D3D1F",
            boxShadow: "inset 0 3px 6px rgba(0,0,0,0.85), 0 1px 2px rgba(255,255,255,0.08)",
          }}
        >
          {/* Subtle wooden rail center highlight */}
          <div className="absolute inset-x-3 h-[1px] top-1/2 -translate-y-1/2 bg-amber-900/30" />
        </div>

        {/* Draggable Golden Medallion Coin */}
        <div
          className="absolute top-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-75 flex items-center justify-center"
          style={{
            left: `calc(12px + ${uiPos} * (100% - 24px) - 14px)`,
          }}
        >
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
              canPlace
                ? "shadow-[0_0_12px_rgba(245,158,11,0.7)] ring-1 ring-amber-300"
                : "shadow-md"
            }`}
            style={{
              background: "radial-gradient(circle at 35% 35%, #FEF08A 0%, #EAB308 50%, #92400E 100%)",
              border: "1.5px solid #CA8A04",
            }}
          >
            {/* Center Embossed Star Graphic */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#78350F" aria-hidden="true">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CarromStrikerSlider;
