import React, { useState } from "react";
import type { DotsBoxesClaim, DotsBoxesLine } from "@shared/types";
import {
  getPlayerTheme,
  getPlayerInitials,
  type DotsBoxesPlayerTheme,
  type DotsBoxesSkin,
} from "./dotsboxes-theme";

interface DotsBoxesBoardGridProps {
  size: number;
  hLines: DotsBoxesLine[];
  vLines: DotsBoxesLine[];
  claims: DotsBoxesClaim[];
  playerOrder: string[];
  selfId: string | null;
  canPlay: boolean;
  skin?: DotsBoxesSkin;
  themeOf: (playerId: string) => DotsBoxesPlayerTheme;
  nameOf?: (playerId: string) => string;
  onDrawLine: (kind: "h" | "v", r: number, c: number) => void;
  className?: string;
}

export default function DotsBoxesBoardGrid({
  size,
  hLines,
  vLines,
  claims,
  playerOrder,
  selfId,
  canPlay,
  skin = "notebook",
  themeOf,
  nameOf,
  onDrawLine,
  className = "",
}: DotsBoxesBoardGridProps) {
  const [selectedDot, setSelectedDot] = useState<{ r: number; c: number } | null>(null);
  const [hoveredLine, setHoveredLine] = useState<{ kind: "h" | "v"; r: number; c: number } | null>(null);

  const isNotebook = skin === "notebook";

  // Lookup Maps
  const drawnH = new Map<string, string>();
  for (const line of hLines) {
    drawnH.set(`${line.r},${line.c}`, line.playerId);
  }

  const drawnV = new Map<string, string>();
  for (const line of vLines) {
    drawnV.set(`${line.r},${line.c}`, line.playerId);
  }

  const claimedBoxMap = new Map<string, string>();
  for (const claim of claims) {
    claimedBoxMap.set(`${claim.r},${claim.c}`, claim.ownerId);
  }

  const selfTheme = selfId ? themeOf(selfId) : getPlayerTheme(0, skin);

  // Dot Click Handler
  const handleDotClick = (r: number, c: number) => {
    if (!canPlay) return;

    if (!selectedDot) {
      setSelectedDot({ r, c });
      return;
    }

    const dr = r - selectedDot.r;
    const dc = c - selectedDot.c;

    // Check if adjacent horizontally
    if (dr === 0 && Math.abs(dc) === 1) {
      const minC = Math.min(c, selectedDot.c);
      const key = `${r},${minC}`;
      if (!drawnH.has(key)) {
        onDrawLine("h", r, minC);
      }
      setSelectedDot(null);
      return;
    }

    // Check if adjacent vertically
    if (dc === 0 && Math.abs(dr) === 1) {
      const minR = Math.min(r, selectedDot.r);
      const key = `${minR},${c}`;
      if (!drawnV.has(key)) {
        onDrawLine("v", minR, c);
      }
      setSelectedDot(null);
      return;
    }

    // Otherwise change selection to newly clicked dot
    setSelectedDot({ r, c });
  };

  // Dimensions
  const boxes = size - 1;
  const padding = 36;
  const gridWidth = 520;
  const cellSize = (gridWidth - padding * 2) / boxes;

  return (
    <div
      className={`relative aspect-square w-full max-w-[540px] mx-auto rounded-3xl p-4 sm:p-6 select-none ${
        isNotebook
          ? "bg-[#FCF9F0] border-2 border-[#D7C9B1] shadow-[0_15px_35px_rgba(80,55,30,0.12)]"
          : "bg-white border border-slate-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
      } ${className}`}
    >
      {/* Notebook Graph / Ruled Paper Grid Overlay */}
      {isNotebook && (
        <div
          className="absolute inset-0 rounded-3xl pointer-events-none opacity-40"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(147, 197, 253, 0.25) 1px, transparent 1px),
                              linear-gradient(to bottom, rgba(147, 197, 253, 0.25) 1px, transparent 1px)`,
            backgroundSize: "20px 20px",
          }}
        />
      )}

      <svg
        viewBox={`0 0 ${gridWidth} ${gridWidth}`}
        className="w-full h-full block overflow-visible relative z-10"
      >
        <defs>
          {/* Keyframe animations for line sweep and box slam */}
          <style>{`
            @keyframes dbStrokeSweep {
              from { stroke-dashoffset: 150; }
              to { stroke-dashoffset: 0; }
            }
            @keyframes dbRubberStamp {
              0% { transform: scale(0.3); opacity: 0; }
              65% { transform: scale(1.18); opacity: 1; }
              100% { transform: scale(1); opacity: 1; }
            }
            @keyframes dbFloatScore {
              0% { transform: translateY(0px) scale(0.9); opacity: 1; }
              100% { transform: translateY(-32px) scale(1.15); opacity: 0; }
            }
            .db-drawn-line {
              stroke-dasharray: 150;
              stroke-dashoffset: 0;
              animation: dbStrokeSweep 0.14s ease-out forwards;
            }
            .db-stamped-box {
              transform-origin: center;
              animation: dbRubberStamp 0.28s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
            }
            .db-floating-score {
              animation: dbFloatScore 1.4s ease-out forwards;
              pointer-events: none;
            }
          `}</style>
        </defs>

        {/* 1. Render Boxes Background & Player Initials with Individual Handwriting Fonts */}
        {Array.from({ length: boxes }).map((_, r) =>
          Array.from({ length: boxes }).map((_, c) => {
            const ownerId = claimedBoxMap.get(`${r},${c}`);
            const x = padding + c * cellSize;
            const y = padding + r * cellSize;

            if (!ownerId) return null;

            const theme = themeOf(ownerId);
            const pName = nameOf ? nameOf(ownerId) : `Player ${playerOrder.indexOf(ownerId) + 1}`;
            const initials = getPlayerInitials(pName);
            const fontFamily = theme.fontFamily ?? "ui-sans-serif, system-ui, sans-serif";

            // Subtle organic angle per box
            const rotation = isNotebook ? ((r * 7 + c * 13) % 7) - 3 : 0;
            const centerX = x + cellSize / 2;
            const centerY = y + cellSize / 2;

            return (
              <g key={`box-${r}-${c}`} className="db-stamped-box" style={{ transformOrigin: `${centerX}px ${centerY}px` }}>
                {/* Soft pastel box fill */}
                <rect
                  x={x + 4}
                  y={y + 4}
                  width={cellSize - 8}
                  height={cellSize - 8}
                  rx={isNotebook ? 6 : 10}
                  fill={theme.fill}
                  stroke={theme.primary}
                  strokeWidth={isNotebook ? 1.5 : 2}
                  strokeOpacity={0.4}
                  className="transition-all duration-300"
                />

                {/* Stamped Initials Text with Individual Player Handwriting */}
                <text
                  x={centerX}
                  y={centerY + (isNotebook ? 2 : 1)}
                  fill={theme.primary}
                  fontSize={isNotebook ? (cellSize > 70 ? 32 : cellSize > 50 ? 26 : 20) : (cellSize > 70 ? 24 : cellSize > 50 ? 20 : 15)}
                  fontWeight={isNotebook ? "700" : "900"}
                  style={{ fontFamily }}
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={rotation !== 0 ? `rotate(${rotation} ${centerX} ${centerY})` : undefined}
                  className="select-none uppercase tracking-wider drop-shadow-xs"
                >
                  {initials}
                </text>

                {/* Floating +1 Score Accent on latest boxes */}
                <g className="db-floating-score">
                  <text
                    x={centerX + 16}
                    y={centerY - 12}
                    fill={theme.primary}
                    fontSize={13}
                    fontWeight="900"
                    textAnchor="middle"
                    style={{ fontFamily: isNotebook ? "'Patrick Hand', cursive" : "sans-serif" }}
                  >
                    +1 ✨
                  </text>
                </g>
              </g>
            );
          })
        )}

        {/* 2. Render Horizontal Lines */}
        {Array.from({ length: size }).map((_, r) =>
          Array.from({ length: boxes }).map((_, c) => {
            const key = `${r},${c}`;
            const ownerId = drawnH.get(key);
            const isDrawn = !!ownerId;
            const x1 = padding + c * cellSize;
            const y1 = padding + r * cellSize;
            const x2 = x1 + cellSize;
            const y2 = y1;

            const theme = ownerId ? themeOf(ownerId) : null;
            const isHovered =
              canPlay &&
              !isDrawn &&
              hoveredLine?.kind === "h" &&
              hoveredLine.r === r &&
              hoveredLine.c === c;

            return (
              <g key={`hline-${r}-${c}`}>
                {/* Invisible wide touch/click hit area */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="transparent"
                  strokeWidth={32}
                  strokeLinecap="round"
                  className={!isDrawn && canPlay ? "cursor-pointer" : ""}
                  onMouseEnter={() => canPlay && !isDrawn && setHoveredLine({ kind: "h", r, c })}
                  onMouseLeave={() => setHoveredLine(null)}
                  onClick={() => {
                    if (canPlay && !isDrawn) {
                      onDrawLine("h", r, c);
                      setSelectedDot(null);
                    }
                  }}
                />

                {/* Visible Line Segment */}
                {isDrawn ? (
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={theme?.primary ?? (isNotebook ? "#2563EB" : "#3B82F6")}
                    strokeWidth={isNotebook ? 5.5 : 8}
                    strokeLinecap="round"
                    className="db-drawn-line"
                    style={{
                      filter: isNotebook
                        ? "drop-shadow(0 1px 2px rgba(0,0,0,0.2))"
                        : `drop-shadow(0 0 6px ${theme?.glow ?? "rgba(59,130,246,0.5)"})`,
                    }}
                  />
                ) : isHovered ? (
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={selfTheme.primary}
                    strokeWidth={isNotebook ? 4.5 : 6}
                    strokeLinecap="round"
                    strokeDasharray={isNotebook ? "5 5" : "6 6"}
                    opacity={0.8}
                  />
                ) : (
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isNotebook ? "#E2E8F0" : "#F1F5F9"}
                    strokeWidth={isNotebook ? 2.5 : 4}
                    strokeLinecap="round"
                  />
                )}
              </g>
            );
          })
        )}

        {/* 3. Render Vertical Lines */}
        {Array.from({ length: boxes }).map((_, r) =>
          Array.from({ length: size }).map((_, c) => {
            const key = `${r},${c}`;
            const ownerId = drawnV.get(key);
            const isDrawn = !!ownerId;
            const x1 = padding + c * cellSize;
            const y1 = padding + r * cellSize;
            const x2 = x1;
            const y2 = y1 + cellSize;

            const theme = ownerId ? themeOf(ownerId) : null;
            const isHovered =
              canPlay &&
              !isDrawn &&
              hoveredLine?.kind === "v" &&
              hoveredLine.r === r &&
              hoveredLine.c === c;

            return (
              <g key={`vline-${r}-${c}`}>
                {/* Invisible wide touch/click hit area */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="transparent"
                  strokeWidth={32}
                  strokeLinecap="round"
                  className={!isDrawn && canPlay ? "cursor-pointer" : ""}
                  onMouseEnter={() => canPlay && !isDrawn && setHoveredLine({ kind: "v", r, c })}
                  onMouseLeave={() => setHoveredLine(null)}
                  onClick={() => {
                    if (canPlay && !isDrawn) {
                      onDrawLine("v", r, c);
                      setSelectedDot(null);
                    }
                  }}
                />

                {/* Visible Line Segment */}
                {isDrawn ? (
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={theme?.primary ?? (isNotebook ? "#2563EB" : "#3B82F6")}
                    strokeWidth={isNotebook ? 5.5 : 8}
                    strokeLinecap="round"
                    className="db-drawn-line"
                    style={{
                      filter: isNotebook
                        ? "drop-shadow(0 1px 2px rgba(0,0,0,0.2))"
                        : `drop-shadow(0 0 6px ${theme?.glow ?? "rgba(59,130,246,0.5)"})`,
                    }}
                  />
                ) : isHovered ? (
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={selfTheme.primary}
                    strokeWidth={isNotebook ? 4.5 : 6}
                    strokeLinecap="round"
                    strokeDasharray={isNotebook ? "5 5" : "6 6"}
                    opacity={0.8}
                  />
                ) : (
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isNotebook ? "#E2E8F0" : "#F1F5F9"}
                    strokeWidth={isNotebook ? 2.5 : 4}
                    strokeLinecap="round"
                  />
                )}
              </g>
            );
          })
        )}

        {/* 4. Render Dots & Magnetic Connectors */}
        {Array.from({ length: size }).map((_, r) =>
          Array.from({ length: size }).map((_, c) => {
            const cx = padding + c * cellSize;
            const cy = padding + r * cellSize;
            const isSelected = selectedDot?.r === r && selectedDot?.c === c;

            // Highlight adjacent available neighbors when a dot is selected
            const isAdjacentCandidate =
              selectedDot &&
              ((selectedDot.r === r && Math.abs(selectedDot.c - c) === 1) ||
                (selectedDot.c === c && Math.abs(selectedDot.r - r) === 1));

            return (
              <g key={`dot-${r}-${c}`}>
                {/* Invisible large touch target (44x44 minimum touch target) */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={22}
                  fill="transparent"
                  className={canPlay ? "cursor-pointer" : ""}
                  onClick={() => handleDotClick(r, c)}
                />

                {/* Selected Pulse Ring */}
                {isSelected && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={14}
                    fill="none"
                    stroke={selfTheme.primary}
                    strokeWidth={3}
                    className="animate-ping opacity-75"
                  />
                )}

                {/* Adjacent Dot Magnetic Suggestion Ring */}
                {isAdjacentCandidate && canPlay && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={10}
                    fill="none"
                    stroke={selfTheme.primary}
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    className="animate-pulse opacity-60"
                  />
                )}

                {/* Visible Matrix Dot */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isSelected ? 7 : isNotebook ? 5 : 5.5}
                  fill={
                    isSelected
                      ? selfTheme.primary
                      : isNotebook
                      ? "#1E3A8A" // dark ballpoint ink dot
                      : "#0F172A"
                  }
                  className="transition-all duration-200"
                />
              </g>
            );
          })
        )}
      </svg>
    </div>
  );
}
