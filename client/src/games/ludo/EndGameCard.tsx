import { useRef } from "react";
import type { LudoColor, LudoStats, Player } from "@shared/types";
import { COLOR_HEX, COLOR_HEX_DARK } from "./board-layout";

export default function EndGameCard({
  winnerId,
  players,
  playerColors,
  stats,
  finishedCount,
  onClose,
  onRematch,
}: {
  winnerId: string | null;
  players: Player[];
  playerColors: Record<string, LudoColor>;
  stats: LudoStats;
  finishedCount: Record<string, number>;
  onClose: () => void;
  onRematch: () => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  function nameOf(id: string): string {
    return players.find((p) => p.id === id)?.name ?? "?";
  }

  const durationMs = (stats.endedAt ?? Date.now()) - stats.startedAt;
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);

  const orderedPlayers = players
    .slice()
    .sort((a, b) => (finishedCount[b.id] ?? 0) - (finishedCount[a.id] ?? 0));

  function downloadPNG() {
    const svg = svgRef.current;
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const w = svg.viewBox.baseVal.width || 800;
      const h = svg.viewBox.baseVal.height || 600;
      const dpr = window.devicePixelRatio || 2;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => {
        if (!b) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(b);
        a.download = `ludo-recap-${Date.now()}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      }, "image/png");
    };
    img.src = url;
  }

  async function copyImageToClipboard() {
    const svg = svgRef.current;
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement("canvas");
      const w = svg.viewBox.baseVal.width || 800;
      const h = svg.viewBox.baseVal.height || 600;
      canvas.width = w * 2;
      canvas.height = h * 2;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob(async (b) => {
        if (!b) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": b }),
          ]);
        } catch {
          /* clipboard not allowed - silently ignore */
        }
      }, "image/png");
    };
    img.src = url;
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-auto"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full p-4 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Game Recap</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <div className="bg-slate-800 rounded-xl overflow-hidden">
          <svg
            ref={svgRef}
            viewBox="0 0 800 600"
            width="100%"
            preserveAspectRatio="xMidYMid meet"
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: "block" }}
          >
            <defs>
              <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#1e293b" />
              </linearGradient>
              <linearGradient id="winnerGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
              </linearGradient>
            </defs>

            <rect width="800" height="600" fill="url(#bg)" />

            {/* Title */}
            <text x="40" y="60" fontSize="38" fontWeight="bold" fill="#fde68a">
              🏆 LUDO RECAP
            </text>
            <text x="40" y="90" fontSize="18" fill="#94a3b8">
              {minutes}m {seconds}s · {players.length} player{players.length === 1 ? "" : "s"}
            </text>

            {/* Winner banner */}
            {winnerId && (
              <g>
                <rect x="40" y="110" width="720" height="80" rx="14" fill="url(#winnerGlow)" />
                <circle
                  cx="80"
                  cy="150"
                  r="22"
                  fill={COLOR_HEX[playerColors[winnerId]] ?? "#fbbf24"}
                  stroke="#fde68a"
                  strokeWidth="3"
                />
                <text x="120" y="145" fontSize="26" fontWeight="bold" fill="#fde68a">
                  {nameOf(winnerId)} wins
                </text>
                <text x="120" y="172" fontSize="16" fill="#cbd5e1">
                  All 4 tokens home
                </text>
              </g>
            )}

            {/* Player rows */}
            {orderedPlayers.map((p, i) => {
              const color = playerColors[p.id];
              const hex = color ? COLOR_HEX[color] : "#64748b";
              const darkHex = color ? COLOR_HEX_DARK[color] : "#334155";
              const y = 220 + i * 80;
              return (
                <g key={p.id}>
                  <rect x="40" y={y} width="720" height="64" rx="12" fill="#0f172a" stroke={darkHex} strokeWidth="1.5" />
                  <circle cx="80" cy={y + 32} r="22" fill={hex} />
                  <text x="80" y={y + 39} fontSize="20" fontWeight="bold" fill="white" textAnchor="middle">
                    {i + 1}
                  </text>

                  <text x="120" y={y + 30} fontSize="20" fontWeight="bold" fill="#f8fafc">
                    {p.name}
                  </text>
                  <text x="120" y={y + 52} fontSize="14" fill="#94a3b8">
                    {color?.toUpperCase()}
                  </text>

                  {/* Stat cells */}
                  {[
                    { label: "Home", value: `${finishedCount[p.id] ?? 0}/4` },
                    { label: "Rolls", value: String(stats.rollCount[p.id] ?? 0) },
                    { label: "Captures", value: String(stats.captureCount[p.id] ?? 0) },
                    { label: "Sixes", value: String(stats.sixCount[p.id] ?? 0) },
                  ].map((s, j) => (
                    <g key={s.label}>
                      <text x={300 + j * 120} y={y + 28} fontSize="22" fontWeight="bold" fill="#f8fafc" textAnchor="middle">
                        {s.value}
                      </text>
                      <text x={300 + j * 120} y={y + 50} fontSize="11" fill="#94a3b8" textAnchor="middle">
                        {s.label.toUpperCase()}
                      </text>
                    </g>
                  ))}
                </g>
              );
            })}

            {/* Footer */}
            <text x="400" y="570" fontSize="13" fill="#64748b" textAnchor="middle">
              Multiplayer Games Hub
            </text>
          </svg>
        </div>

        <div className="flex justify-end gap-2 flex-wrap">
          <button
            onClick={copyImageToClipboard}
            className="bg-slate-700 hover:bg-slate-600 rounded-lg px-4 py-2 text-sm font-semibold"
          >
            📋 Copy image
          </button>
          <button
            onClick={downloadPNG}
            className="bg-slate-700 hover:bg-slate-600 rounded-lg px-4 py-2 text-sm font-semibold"
          >
            💾 Download PNG
          </button>
          <button
            onClick={onRematch}
            className="bg-emerald-600 hover:bg-emerald-500 rounded-lg px-4 py-2 text-sm font-semibold"
          >
            🔁 Rematch
          </button>
          <button
            onClick={onClose}
            className="bg-slate-700 hover:bg-slate-600 rounded-lg px-4 py-2 text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
