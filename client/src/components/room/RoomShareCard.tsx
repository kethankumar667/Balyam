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
      <div className="w-full bg-[#FFFDF8] dark:bg-[var(--chrome-panel)] border border-[#EEDBCA] dark:border-slate-800 rounded-2xl p-2 sm:p-2.5 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Left: Code Chip with Badge */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/25 text-[#7C5A32] dark:text-amber-300 shrink-0">
              <Ticket size={13} className="text-amber-600 dark:text-amber-400" aria-hidden />
              <span className="text-[10px] font-black uppercase tracking-wider">Room Code</span>
            </div>

            <button
              type="button"
              onClick={copyCode}
              aria-label={`Room code: ${code}. Tap to copy`}
              title="Tap to copy room code"
              className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-white dark:bg-[#121927] border border-[#EEDBCA] dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-400/80 transition-all duration-200 active:scale-95 cursor-pointer shadow-2xs group"
            >
              <span
                id="room-share-code-text"
                className="font-mono text-base sm:text-lg font-black tracking-[0.25em] text-[#2B3550] dark:text-slate-100 select-all pl-1"
              >
                {code}
              </span>
              <span className="text-[10px] font-bold text-[#8A6D4B] dark:text-slate-400 flex items-center gap-1">
                {copied ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-0.5 animate-in fade-in">
                    <Check size={12} aria-hidden /> Copied!
                  </span>
                ) : (
                  <Copy size={12} className="group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors" aria-hidden />
                )}
              </span>
            </button>
          </div>

          {/* Center: Context helper (bridges the empty void on desktop) */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-[#8A6D4B] dark:text-slate-400 font-medium px-3 py-1 rounded-full bg-[#FFF9EE] dark:bg-slate-800/60 border border-[#EEDBCA]/60 dark:border-slate-700/50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="truncate">Share code or link with friends to play</span>
          </div>

          {/* Right: Cohesive Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0">
            <button
              type="button"
              onClick={copyCode}
              aria-label="Copy Room Code"
              className="inline-flex items-center justify-center gap-1.5 min-h-[36px] px-3.5 py-1.5 rounded-xl font-extrabold text-xs bg-gradient-to-r from-[#EA5A1F] to-[#D84F17] hover:from-[#F06A32] hover:to-[#EA5A1F] text-white shadow-xs transition active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Copy size={13} aria-hidden />
              <span>{copied ? "Copied!" : "Copy Code"}</span>
            </button>

            <button
              type="button"
              onClick={shareRoom}
              aria-label="Share Room Link"
              className="inline-flex items-center justify-center gap-1.5 min-h-[36px] px-3.5 py-1.5 rounded-xl font-bold text-xs bg-white dark:bg-slate-800 hover:bg-[#FFF4E0] dark:hover:bg-slate-700/80 text-[#352C24] dark:text-slate-100 border border-[#EEDBCA] dark:border-slate-700 transition active:scale-95 cursor-pointer whitespace-nowrap shadow-2xs"
            >
              <Share2 size={13} aria-hidden />
              <span>Share</span>
            </button>

            <button
              type="button"
              onClick={() => setQrOpen(true)}
              title="Show QR Code"
              aria-label="Show QR Code for this room"
              className="inline-flex items-center justify-center min-h-[36px] min-w-[36px] p-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-[#FFF4E0] dark:hover:bg-slate-700 text-[#6E5E4D] dark:text-slate-200 border border-[#EEDBCA] dark:border-slate-700 transition active:scale-95 cursor-pointer shadow-2xs"
            >
              <QrCode size={14} aria-hidden />
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
