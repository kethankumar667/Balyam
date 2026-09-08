import { useState } from "react";
import type { GameKind } from "@shared/types";
import { Ticket, QrCode, Copy, Share2, Check } from "lucide-react";
import QrCodeModal from "../QrCodeModal";
import { useHaptics } from "../../hooks/useHaptics";

const FRIENDLY_GAME_NAMES: Partial<Record<GameKind, string>> = {
  handcricket: "Hand Cricket",
  snl: "Snakes & Ladders",
  ludo: "Ludo",
  rummy: "Rummy",
  rps: "Rock Paper Scissors",
  uno: "UNO",
  wordbuilding: "Word Building",
  dotsboxes: "Dots & Boxes",
  stargame: "Star Game",
  bingo: "Bingo",
  namesplaceanimal: "Name Place Animal Thing",
  tambola: "Tambola (Housie)",
  snake: "Snake",
  roadrash: "Road Rash 90s",
  carrom: "Carrom",
  chess: "Chess Grandmaster",
  spacewar: "Space War",
  blockblast: "Block Blast",
};

export default function RoomShareCard({
  code,
  game,
  name,
}: {
  code: string;
  game: GameKind;
  name?: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const haptics = useHaptics();

  const roomUrl = `${window.location.origin}/room/${code}`;
  const gameName = FRIENDLY_GAME_NAMES[game] ?? game;

  const shareText =
    (name ? `"${name}" — ` : "") +
    `🎮 Come play ${gameName} on BHALYAM!\n\n` +
    `Room code: ${code}\n` +
    `Join here:`;

  async function copyCode() {
    haptics.subtle();
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.getElementById("room-share-code-text");
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  }

  async function shareRoom() {
    haptics.subtle();
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `Join ${gameName} on BHALYAM`,
          text: shareText,
          url: roomUrl,
        });
        return;
      } catch {
        // Fall back to WhatsApp on dismiss or unsupported OS sheet
      }
    }
    const waUrl = `https://wa.me/?text=${encodeURIComponent(
      `${shareText} ${roomUrl}`
    )}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <div className="w-full bg-gradient-to-r from-amber-500/[0.09] via-[#FFFDF8] to-orange-500/[0.07] dark:from-amber-950/40 dark:via-[#141C2A] dark:to-orange-950/30 border-2 border-amber-300/90 dark:border-amber-500/60 border-l-4 border-l-[#EA5A1F] dark:border-l-amber-400 rounded-2xl p-2.5 sm:p-3 shadow-md shadow-amber-500/5 ring-1 ring-amber-400/20 relative overflow-hidden">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Prominently Highlighted Room Code Block */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            {/* Ticket Icon Badge */}
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-400 to-[#EA5A1F] text-white flex items-center justify-center font-black shadow-xs shrink-0 ring-2 ring-amber-400/30">
              <Ticket className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" aria-hidden />
            </div>

            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5 leading-none mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span>Room Code</span>
              </div>

              {/* Highlighted Code Plate */}
              <div
                onClick={copyCode}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    copyCode();
                  }
                }}
                aria-label={`Room code: ${code}. Click to copy`}
                title="Click to copy room code"
                className="inline-flex items-center gap-2 px-3 py-1 sm:py-1.5 rounded-xl bg-white/95 dark:bg-[#0E1522] border-2 border-amber-400/90 dark:border-amber-500/80 shadow-[0_0_12px_rgba(245,158,11,0.18)] hover:shadow-[0_0_16px_rgba(245,158,11,0.3)] hover:border-[#EA5A1F] dark:hover:border-amber-400 transition-all cursor-pointer active:scale-95 group"
              >
                <span
                  id="room-share-code-text"
                  className="font-mono text-xl sm:text-2xl font-black tracking-[0.25em] text-[#EA5A1F] dark:text-amber-200 leading-none select-all pl-1"
                >
                  {code}
                </span>
                <span className="text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                  {copied ? (
                    <Check size={14} className="text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                  ) : (
                    <Copy size={14} className="stroke-[2.5]" />
                  )}
                </span>
                {copied && (
                  <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 rounded px-1.5 py-0.5 animate-in fade-in">
                    Copied!
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Clean Action Button Group */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={copyCode}
              aria-label="Copy Room Code"
              className="inline-flex items-center justify-center gap-1.5 min-h-[38px] sm:min-h-[40px] px-3 sm:px-4 py-2 rounded-xl font-extrabold text-xs sm:text-sm bg-gradient-to-r from-[#EA5A1F] to-[#D84F17] hover:from-[#F06A32] hover:to-[#EA5A1F] text-white shadow-xs transition active:scale-95 cursor-pointer whitespace-nowrap"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-white" aria-hidden />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={14} aria-hidden />
                  <span>Copy Code</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={shareRoom}
              aria-label="Share Room Link"
              className="inline-flex items-center justify-center gap-1.5 min-h-[38px] sm:min-h-[40px] px-3 sm:px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm bg-white dark:bg-slate-800 hover:bg-[#FFF4E0] dark:hover:bg-slate-700/80 text-[#352C24] dark:text-slate-100 border border-[#EEDBCA] dark:border-slate-700 transition active:scale-95 cursor-pointer whitespace-nowrap shadow-2xs"
            >
              <Share2 size={14} aria-hidden />
              <span className="hidden xs:inline">Share</span>
            </button>

            <button
              type="button"
              onClick={() => setQrOpen(true)}
              title="Show QR Code"
              aria-label="Show QR Code for this room"
              className="inline-flex items-center justify-center min-h-[38px] min-w-[38px] sm:min-h-[40px] sm:min-w-[40px] p-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-[#FFF4E0] dark:hover:bg-slate-700 text-[#6E5E4D] dark:text-slate-200 border border-[#EEDBCA] dark:border-slate-700 transition active:scale-95 cursor-pointer shadow-2xs"
            >
              <QrCode size={15} aria-hidden />
              <span className="sr-only">QR</span>
            </button>
          </div>
        </div>
      </div>

      <QrCodeModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        code={code}
        gameName={game}
        hostName={name}
      />
    </>
  );
}
