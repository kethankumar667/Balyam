import { useRef, useState } from "react";
import type { LudoColor, LudoStats, Player } from "@shared/types";
import { COLOR_HEX, COLOR_HEX_DARK } from "./board-layout";
import { ordinal, standingsFor } from "@shared/ludo-rules";
import { svgToPngBlob } from "../../lib/svgExport";

import BoardPreviewPill from "../../components/BoardPreviewPill";
import { useRoomStore } from "../../store/roomStore";
import { deriveTerminalMatchId } from "../../lib/economyMotionTriggers";
import { useMatchSettlement, winnerPrizesFor } from "../../hooks/useMatchSettlement";

export default function EndGameCard({
  winnerId,
  players,
  playerColors,
  playerOrder,
  finishOrder,
  stats,
  finishedCount,
  onClose,
  selfId,
}: {
  winnerId: string | null;
  players: Player[];
  playerColors: Record<string, LudoColor>;
  playerOrder: string[];
  /** Who placed, in order. The ONLY record of 2nd vs 3rd — every placed
   *  player has finishedCount 4, so sorting by that alone is ambiguous. */
  finishOrder: string[];
  stats: LudoStats;
  finishedCount: Record<string, number>;
  onClose: () => void;
  selfId?: string | null;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [previewMode, setPreviewMode] = useState(false);

  function nameOf(id: string): string {
    return players.find((p) => p.id === id)?.name ?? useRoomStore.getState().knownPlayers[id]?.name ?? "?";
  }

  const durationMs = (stats.endedAt ?? Date.now()) - stats.startedAt;
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);

  // True standings: placed players in the order they got home, then whoever
  // did not finish. Sorting by finishedCount alone put the placed players in
  // arbitrary order relative to each other, since they all have 4.
  //
  // The winner is always a row, and always first. The seat list can lose them
  // (a winner who has already left the room is no longer in `playerOrder`),
  // and the rows used to be filtered down to players still in the room — so
  // the winner's row vanished, the loser slid into row 1 and was shown as
  // "1" and credited with the winner's prize, which is indexed by row.
  const seatIds = playerOrder.length ? playerOrder : players.map((p) => p.id);
  const allSeatIds = winnerId && !seatIds.includes(winnerId) ? [...seatIds, winnerId] : seatIds;
  const placedOrder = winnerId && !finishOrder.includes(winnerId) ? [winnerId, ...finishOrder] : finishOrder;
  const order = standingsFor(allSeatIds, placedOrder, finishedCount);
  const placedCount = placedOrder.filter((id) => allSeatIds.includes(id)).length;
  // 220 px of header plus 80 px a row, plus the footer. Four rows come to the
  // original 600, so a full table is unchanged; a two-player recap no longer
  // carries ~160 px of empty panel (and renders its text larger on a phone).
  const recapHeight = 220 + order.length * 80 + 60;

  // Real-money prize per placement, for a paid, settled match only.
  const roomState = useRoomStore((s) => s.roomState);
  const { settlement } = useMatchSettlement(deriveTerminalMatchId(roomState));
  const winnerPrizes = winnerPrizesFor(settlement);
  const winnerPrize = winnerId ? winnerPrizes?.[order.indexOf(winnerId)] : undefined;

  async function downloadPNG() {
    const svg = svgRef.current;
    if (!svg) return;
    const blob = await svgToPngBlob(svg, window.devicePixelRatio || 2);
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ludo-recap-${Date.now()}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function copyImageToClipboard() {
    const svg = svgRef.current;
    if (!svg) return;
    const blob = await svgToPngBlob(svg, 2);
    if (!blob) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    } catch {
      /* clipboard not allowed - silently ignore */
    }
  }

  /**
   * One-tap share — prefers the OS share sheet (carries the actual PNG, same
   * pattern RoomCodeShare uses for room invites) so the recap lands directly
   * in WhatsApp/whatever the player picks. wa.me text links can't carry a
   * file attachment, so the fallback downloads the image and opens WhatsApp
   * with just the celebratory text — the same two-step a user would do by hand.
   */
  async function share() {
    const svg = svgRef.current;
    if (!svg) return;
    const blob = await svgToPngBlob(svg, 2);
    if (!blob) return;
    const file = new File([blob], `ludo-recap-${Date.now()}.png`, { type: "image/png" });
    const text = winnerId
      ? `🏆 ${nameOf(winnerId)} won our Ludo match on BHALYAM!`
      : `🎲 Just finished a Ludo match on BHALYAM!`;
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    if (nav.canShare?.({ files: [file] }) && typeof navigator.share === "function") {
      try {
        await navigator.share({ files: [file], title: "BHALYAM Ludo recap", text });
        return;
      } catch {
        /* dismissed or failed — fall through to the download+WhatsApp fallback */
      }
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(file);
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  if (previewMode) {
    return (
      <BoardPreviewPill
        onClosePreview={() => setPreviewMode(false)}
        // NOT `svgRef`. That ref points at the miniature board inside this
        // card's own body — the subtree this very branch unmounts — so by
        // the time the player taps 📸 it is always null and the capture
        // silently fell through to window.print(). Target the live board on
        // screen instead, which is what preview mode is showing them anyway.
        targetElementId="game-board-container"
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-auto"
      onClick={onClose}
    >
      {/* `text-slate-100` is load-bearing: the panel is always navy, but the
          page's default ink is dark brown in the light theme, so the title and
          every button that does not set its own colour (Copy, Download,
          Close) rendered brown-on-navy. `max-h` + scroll keeps the top of the
          card reachable on a short landscape phone, where a centred panel
          taller than the screen would otherwise clip upward. */}
      <div
        className="bg-slate-900 text-slate-100 rounded-2xl shadow-2xl max-w-2xl w-full p-4 space-y-4 max-h-[calc(100dvh-2rem)] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Game Recap</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <div className="bg-slate-800 rounded-xl overflow-hidden">
          <svg
            ref={svgRef}
            viewBox={`0 0 800 ${recapHeight}`}
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

            <rect width="800" height={recapHeight} fill="url(#bg)" />

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
                  All 4 tokens home{winnerPrize ? ` · won ${winnerPrize} coins` : ""}
                </text>
              </g>
            )}

            {/* Player rows */}
            {order.map((id, i) => {
              const color = playerColors[id];
              const hex = color ? COLOR_HEX[color] : "#64748b";
              const darkHex = color ? COLOR_HEX_DARK[color] : "#334155";
              const y = 220 + i * 80;
              return (
                <g key={id}>
                  <rect x="40" y={y} width="720" height="64" rx="12" fill="#0f172a" stroke={darkHex} strokeWidth="1.5" />
                  <circle cx="80" cy={y + 32} r="22" fill={hex} />
                  <text x="80" y={y + 39} fontSize="20" fontWeight="bold" fill="white" textAnchor="middle">
                    {i + 1}
                  </text>
                  {/* Placed players get their finishing position; the one seat
                      that never got home is explicitly LAST rather than just
                      being bottom of a list. */}
                  <text x="120" y={y + 14} fontSize="11" fontWeight="bold" fill={i < placedCount ? "#fbbf24" : "#94a3b8"}>
                    {i < placedCount ? `${ordinal(i + 1)} PLACE` : "DID NOT FINISH"}
                  </text>

                  <text x="120" y={y + 30} fontSize="20" fontWeight="bold" fill="#f8fafc">
                    {nameOf(id)}
                  </text>
                  <text x="120" y={y + 52} fontSize="14" fill="#94a3b8">
                    {color?.toUpperCase()}
                    {winnerPrizes?.[i] ? ` · won ${winnerPrizes[i]} coins` : ""}
                  </text>

                  {/* Stat cells */}
                  {/* Every column is a counter the engine really kept. BEST
                      is `biggestStreak` — the longest run of consecutive
                      sixes — which the engine has always tracked and nothing
                      ever rendered, so the number was dead weight. */}
                  {[
                    { label: "Home", value: `${finishedCount[id] ?? 0}/4` },
                    { label: "Rolls", value: String(stats.rollCount[id] ?? 0) },
                    { label: "Captures", value: String(stats.captureCount[id] ?? 0) },
                    { label: "Sixes", value: String(stats.sixCount[id] ?? 0) },
                    { label: "Best run", value: String(stats.biggestStreak[id] ?? 0) },
                  ].map((s, j) => (
                    <g key={s.label}>
                      <text x={300 + j * 100} y={y + 28} fontSize="22" fontWeight="bold" fill="#f8fafc" textAnchor="middle">
                        {s.value}
                      </text>
                      <text x={300 + j * 100} y={y + 50} fontSize="11" fill="#94a3b8" textAnchor="middle">
                        {s.label.toUpperCase()}
                      </text>
                    </g>
                  ))}
                </g>
              );
            })}

            {/* Footer */}
            <text x="400" y={recapHeight - 30} fontSize="13" fill="#64748b" textAnchor="middle">
              Multiplayer Games Hub
            </text>
          </svg>
        </div>

        <div className="flex justify-end gap-2 flex-wrap">
          <button
            onClick={() => setPreviewMode(true)}
            className="bg-amber-600 hover:bg-amber-500 text-white rounded-lg px-4 py-2 text-sm font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-md"
            title="Preview finished game board"
          >
            👁 Board Preview
          </button>
          <button
            onClick={share}
            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-4 py-2 text-sm font-semibold"
          >
            📤 Share
          </button>
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
