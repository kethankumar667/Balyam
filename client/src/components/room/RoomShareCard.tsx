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
      <div className="w-full bg-[#FFFDF8] dark:bg-[var(--chrome-panel)] border border-[#EEDBCA] dark:border-slate-800 rounded-2xl p-2.5 sm:p-3 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Prominent Room Code Block */}
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
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group select-none min-w-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-2xs group-hover:bg-amber-500/20 group-hover:border-amber-500/40 transition">
              <Ticket className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden />
            </div>

            <div className="min-w-0">
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#8A6D4B] dark:text-slate-400 flex items-center gap-1.5 leading-none mb-1">
                <span>Room Code</span>
                {copied && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400 animate-in fade-in">
                    <Check size={11} /> Copied!
                  </span>
                )}
              </div>

              <div
                id="room-share-code-text"
                className="font-mono text-xl sm:text-2xl font-black tracking-[0.22em] sm:tracking-[0.25em] text-[#2B3550] dark:text-amber-200 leading-none select-all truncate group-hover:text-[#EA5A1F] dark:group-hover:text-amber-300 transition-colors"
              >
                {code}
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
