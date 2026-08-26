import React from "react";
import { User, Bot, Crown } from "lucide-react";
import { CoinAmount } from "./CoinAmount";

export interface SeatInfo {
  seatNumber: number;
  isBot?: boolean;
  name?: string;
  isHost?: boolean;
}

export interface CeremonialSeatRingProps {
  /** Total seats configured for match table (e.g. 2, 3, 4, 5). */
  seatCount: number;
  /** Number of human seats configured. */
  humanCount: number;
  /** Number of bot seats configured. */
  botCount: number;
  /** Total pot decimal string (e.g. "400"). Strictly string. */
  totalPotAmount: string;
  /** Cost per seat decimal string (e.g. "100"). Strictly string. */
  costPerSeat: string;
  /** Optional custom seat details. If omitted, pure presentational placeholders are generated. */
  seats?: SeatInfo[];
  isIlluminated?: boolean;
  className?: string;
}

/**
 * The Sovereign Table — Ceremonial Seat Ring.
 * Visualizes the configured match seats (humans and bots) arranged in a royal
 * circular table around the central prize pot, reinforcing that the host is
 * "hosting a table for players" rather than paying a transactional fee.
 *
 * NOTE: Strictly presentational. Performs ZERO validation or business logic on seat counts.
 */
export const CeremonialSeatRing: React.FC<CeremonialSeatRingProps> = ({
  seatCount = 4,
  humanCount = 4,
  botCount = 0,
  totalPotAmount,
  costPerSeat = "100",
  seats,
  isIlluminated = true,
  className = "",
}) => {
  // Generate presentation seat list if not explicitly provided
  const seatList: SeatInfo[] =
    seats ||
    Array.from({ length: seatCount }, (_, i) => ({
      seatNumber: i + 1,
      isHost: i === 0,
      isBot: i >= humanCount,
      name: i === 0 ? "Host" : i >= humanCount ? `Bot ${i + 1}` : `Seat ${i + 1}`,
    }));

  // Calculate geometric coordinates around circle (radius 68px, center 100, 100)
  const radius = 68;
  const centerX = 100;
  const centerY = 100;

  return (
    <div
      className={`relative flex flex-col items-center justify-center p-4 rounded-3xl border border-amber-600/25 dark:border-amber-400/20 bg-gradient-to-b from-amber-500/5 via-transparent to-amber-500/5 dark:from-[#131824] dark:to-[#0E131F] font-sans overflow-hidden ${className}`}
      aria-label={`The Sovereign Table: ${seatCount} seats configured with ${totalPotAmount} coins in central prize pot`}
    >
      {/* Ambient Table Halo */}
      <div
        className="absolute w-44 h-44 rounded-full bg-amber-500/10 dark:bg-amber-400/10 blur-2xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative w-56 h-56 flex items-center justify-center">
        {/* Table Orbit Path SVG */}
        <svg
          viewBox="0 0 200 200"
          className="absolute inset-0 w-full h-full pointer-events-none"
          aria-hidden="true"
        >
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            className="text-amber-600/30 dark:text-amber-400/25"
          />
          <circle
            cx="100"
            cy="100"
            r={radius + 12}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.8"
            className="text-amber-600/15 dark:text-amber-400/10"
          />
        </svg>

        {/* Central Pot Hub */}
        <div className="relative z-10 flex flex-col items-center justify-center w-24 h-24 rounded-full bg-amber-100/90 dark:bg-[#1C2333]/95 border-2 border-amber-500/60 shadow-lg shadow-amber-950/20 text-center p-2">
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-amber-800 dark:text-amber-400 mb-0.5">
            Prize Pot
          </span>
          <CoinAmount amount={totalPotAmount} size="sm" className="font-extrabold" />
          <span className="text-[9px] text-ink-lo dark:text-text-lo mt-0.5">
            {seatCount} × {costPerSeat}
          </span>
        </div>

        {/* Seat Nodes Positioned Around Ring */}
        {seatList.map((seat, index) => {
          const angle = (index * (360 / Math.max(1, seatCount)) - 90) * (Math.PI / 180);
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);

          return (
            <div
              key={seat.seatNumber}
              style={{
                position: "absolute",
                left: `${(x / 200) * 100}%`,
                top: `${(y / 200) * 100}%`,
                transform: "translate(-50%, -50%)",
              }}
              className={`flex flex-col items-center group transition-all duration-300 ${
                isIlluminated ? "opacity-100 scale-100" : "opacity-60 scale-95"
              }`}
            >
              <div
                className={`relative w-8 h-8 rounded-full flex items-center justify-center border shadow-sm ${
                  seat.isHost
                    ? "bg-amber-500 text-white border-amber-300 ring-2 ring-amber-400/40"
                    : seat.isBot
                    ? "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-400/40"
                    : "bg-amber-100 dark:bg-slate-800 text-amber-900 dark:text-amber-200 border-amber-500/30"
                }`}
                title={seat.name || `Seat ${seat.seatNumber}`}
              >
                {seat.isHost ? (
                  <Crown className="w-4 h-4" aria-hidden="true" />
                ) : seat.isBot ? (
                  <Bot className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <User className="w-4 h-4" aria-hidden="true" />
                )}
                {/* Seat number pill */}
                <span className="absolute -bottom-1 -right-1 text-[8px] font-bold w-3.5 h-3.5 rounded-full bg-black text-white flex items-center justify-center">
                  {seat.seatNumber}
                </span>
              </div>
              <span className="text-[9px] font-semibold text-ink-mid dark:text-text-mid mt-1 truncate max-w-[50px]">
                {seat.name}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-2 text-[11px] text-ink-lo dark:text-text-lo">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>Host Funded ({humanCount} Humans)</span>
        </span>
        {botCount > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            <span>{botCount} Bots</span>
          </span>
        )}
      </div>
    </div>
  );
};

export default CeremonialSeatRing;
