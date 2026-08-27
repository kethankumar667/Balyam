import React from "react";
import { CoinFlight } from "./CoinFlight";
import type { Point2D } from "./types";

export interface ActiveCoinTransfer {
  id: string;
  source: Point2D;
  target: Point2D;
  coinCount?: number;
  duration?: number;
  delayOffset?: number;
  isReversed?: boolean;
}

export interface CoinTransferLayerProps {
  transfers: ActiveCoinTransfer[];
  onTransferComplete?: (id: string) => void;
  className?: string;
}

/**
 * Top-Level Non-Blocking Coin Transfer Layer.
 * Renders multiple simultaneous or staggered GPU-accelerated coin streams across arbitrary screen locations.
 * Guaranteed `pointer-events-none` so it never captures or blocks user clicks.
 */
export const CoinTransferLayer: React.FC<CoinTransferLayerProps> = ({
  transfers,
  onTransferComplete,
  className = "",
}) => {
  if (!transfers || transfers.length === 0) {
    return null;
  }

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-50 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {transfers.map((t) => (
        <CoinFlight
          key={t.id}
          source={t.source}
          target={t.target}
          coinCount={t.coinCount}
          duration={t.duration}
          delayOffset={t.delayOffset}
          isReversed={t.isReversed}
          onComplete={() => onTransferComplete?.(t.id)}
        />
      ))}
    </div>
  );
};
