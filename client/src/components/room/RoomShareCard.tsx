import { useState } from "react";
import type { GameKind } from "@shared/types";
import { Ticket, QrCode, Copy, Link2, Check } from "lucide-react";
import QrCodeModal from "../QrCodeModal";

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

  const roomUrl = `${window.location.origin}/room/${code}`;
  const gameName = FRIENDLY_GAME_NAMES[game] ?? game;

  const shareText =
    (name ? `"${name}" — ` : "") +
    `🎮 Come play ${gameName} on BHALYAM!\n\n` +
    `Room code: ${code}\n` +
    `Join here:`;

  async function copyCode() {
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
      <div className="w-full bg-[#FFFDF8] dark:bg-[var(--chrome-panel)] border-2 border-[#EEDBCA] dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3 relative overflow-hidden">
        {/* Ticket Header */}
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#8A6D4B] dark:text-slate-400">
            <Ticket size={14} aria-hidden />
            <span>Room Code</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setQrOpen(true)}
              title="Show QR Code"
              aria-label="Show QR Code for this room"
              className="inline-flex items-center justify-center min-h-[36px] min-w-[36px] p-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-[#FFF4E0] dark:hover:bg-slate-700 text-[#6E5E4D] dark:text-slate-200 border border-[#EEDBCA] dark:border-slate-700 transition active:scale-95 cursor-pointer"
            >
              <QrCode size={15} aria-hidden />
              <span className="sr-only sm:not-sr-only sm:ml-1 text-[11px]">QR</span>
            </button>
          </div>
        </div>

        {/* Hero Code Banner */}
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={copyCode}
            aria-label={`Room code: ${code}. Tap to copy`}
            className="flex-1 w-full flex items-center justify-between sm:justify-center gap-3 px-4 py-2.5 sm:py-3 rounded-2xl bg-gradient-to-b from-[#FFFDF8] to-[#FFF4E0] dark:from-[#161E2E] dark:to-[#0F1420] border-2 border-dashed border-[var(--rim-gold)] dark:border-amber-500/50 hover:border-[#EA5A1F] dark:hover:border-amber-400 transition active:scale-[0.99] cursor-pointer shadow-inner relative group"
          >
            <span
              id="room-share-code-text"
              className="font-mono text-2xl sm:text-3xl font-black tracking-[0.25em] sm:tracking-[0.3em] text-[#2B3550] dark:text-slate-100 select-all pl-[0.2em]"
            >
              {code}
            </span>

            <span className="text-[11px] font-bold text-[#8A6D4B] dark:text-slate-400 flex items-center gap-1 group-hover:text-[#EA5A1F]">
              {copied ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1">
                  <Check size={13} aria-hidden /> Copied
                </span>
              ) : (
                <span>Tap to copy</span>
              )}
            </span>
          </button>

          {/* Action buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={copyCode}
              aria-label="Copy Room Code"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm bg-gradient-to-r from-[#EA5A1F] to-[#D84F17] hover:from-[#F06A32] hover:to-[#EA5A1F] text-white shadow-sm transition active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Copy size={14} aria-hidden />
              <span>{copied ? "Copied!" : "Copy Code"}</span>
            </button>

            <button
              type="button"
              onClick={shareRoom}
              aria-label="Share Room Link"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-white dark:bg-slate-800 hover:bg-[#FFF4E0] dark:hover:bg-slate-700/80 text-[#352C24] dark:text-slate-100 border border-[#EEDBCA] dark:border-slate-700 transition active:scale-95 cursor-pointer whitespace-nowrap shadow-xs"
            >
              <Link2 size={14} aria-hidden />
              <span>Share</span>
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
