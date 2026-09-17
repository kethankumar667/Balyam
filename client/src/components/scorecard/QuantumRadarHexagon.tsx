import React from "react";
import type { QuantumPerformanceRadar } from "@shared/profile/Scorecard";

interface QuantumRadarHexagonProps {
  radar: QuantumPerformanceRadar;
  size?: number;
  className?: string;
}

export default function QuantumRadarHexagon({
  radar,
  size = 220,
  className = "",
}: QuantumRadarHexagonProps) {
  const center = size / 2;
  const radius = (size / 2) * 0.72;

  const axes: Array<{ key: keyof QuantumPerformanceRadar; label: string }> = [
    { key: "velocity", label: "VELOCITY" },
    { key: "clutch", label: "CLUTCH" },
    { key: "efficiency", label: "EFFICIENCY" },
    { key: "consistency", label: "CONSISTENCY" },
    { key: "aggression", label: "AGGRESSION" },
  ];

  const angleStep = (Math.PI * 2) / axes.length;
  // Start pointing upwards
  const startAngle = -Math.PI / 2;

  // Compute ring polygons (levels: 0.25, 0.5, 0.75, 1.0)
  const rings = [0.25, 0.5, 0.75, 1.0].map((level) => {
    return axes
      .map((_, i) => {
        const angle = startAngle + i * angleStep;
        const x = center + radius * level * Math.cos(angle);
        const y = center + radius * level * Math.sin(angle);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  });

  // Compute player polygon
  const dataPoints = axes.map((axis, i) => {
    const rawVal = radar[axis.key] ?? 50;
    const clamped = Math.max(10, Math.min(100, rawVal)) / 100;
    const angle = startAngle + i * angleStep;
    const x = center + radius * clamped * Math.cos(angle);
    const y = center + radius * clamped * Math.sin(angle);
    return { x, y, val: rawVal };
  });

  const polygonPoints = dataPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible drop-shadow-[0_0_12px_rgba(6,182,212,0.25)]"
      >
        <defs>
          <linearGradient id="cyberRadarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.2" />
          </linearGradient>
          <filter id="glowGpu" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer and inner grid rings */}
        {rings.map((points, idx) => (
          <polygon
            key={idx}
            points={points}
            fill="none"
            stroke={idx === rings.length - 1 ? "rgba(6, 182, 212, 0.4)" : "rgba(255, 255, 255, 0.08)"}
            strokeWidth={idx === rings.length - 1 ? 1.5 : 1}
            strokeDasharray={idx === rings.length - 1 ? "none" : "2,3"}
          />
        ))}

        {/* Axis spoke lines */}
        {axes.map((_, i) => {
          const angle = startAngle + i * angleStep;
          const x2 = center + radius * Math.cos(angle);
          const y2 = center + radius * Math.sin(angle);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={x2}
              y2={y2}
              stroke="rgba(255, 255, 255, 0.12)"
              strokeWidth="1"
            />
          );
        })}

        {/* Player Data Polygon */}
        <polygon
          points={polygonPoints}
          fill="url(#cyberRadarGradient)"
          stroke="#06b6d4"
          strokeWidth="2"
          filter="url(#glowGpu)"
          className="transition-all duration-500 ease-out"
        />

        {/* Vertex point dots */}
        {dataPoints.map((pt, i) => (
          <g key={i}>
            <circle
              cx={pt.x}
              cy={pt.y}
              r="3.5"
              fill="#22d3ee"
              stroke="#082f49"
              strokeWidth="1.5"
              className="drop-shadow-[0_0_6px_#06b6d4]"
            />
          </g>
        ))}

        {/* Labels positioned at perimeter */}
        {axes.map((axis, i) => {
          const angle = startAngle + i * angleStep;
          const labelRadius = radius + 18;
          const lx = center + labelRadius * Math.cos(angle);
          const ly = center + labelRadius * Math.sin(angle);
          const val = radar[axis.key] ?? 50;

          return (
            <text
              key={axis.key}
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-cyan-400/80 font-mono text-[9px] font-bold tracking-wider"
            >
              {axis.label}
              <tspan x={lx} dy="10" className="fill-white font-mono text-[10px] font-extrabold">
                {val}
              </tspan>
            </text>
          );
        })}
      </svg>
      <span className="text-[10px] font-mono tracking-widest text-cyan-500/70 mt-3 uppercase">
        Quantum Performance Matrix
      </span>
    </div>
  );
}
