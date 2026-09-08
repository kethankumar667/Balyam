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
      <div className="w-full bg-[#FFFDF8] dark:bg-[var(--chrome-panel)] border-2 border-[#EEDBCA] dark:border-slate-800 rounded-2xl p-2.5 sm:p-3 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Code Chip with Copy */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="hidden xs:inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-[#8A6D4B] dark:text-slate-400 shrink-0">
              <Ticket size={13} aria-hidden />
              <span>Code:</span>
            </div>

            <button
              type="button"
              onClick={copyCode}
              aria-label={`Room code: ${code}. Tap to copy`}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-b from-[#FFFDF8] to-[#FFF4E0] dark:from-[#161E2E] dark:to-[#0F1420] border-2 border-dashed border-[var(--rim-gold)] dark:border-amber-500/50 hover:border-[#EA5A1F] dark:hover:border-amber-400 transition active:scale-95 cursor-pointer shadow-inner group"
            >
              <span
                id="room-share-code-text"
                className="font-mono text-lg sm:text-xl font-black tracking-[0.25em] text-[#2B3550] dark:text-slate-100 select-all pl-[0.15em]"
              >
                {code}
              </span>
              <span className="text-[10px] font-bold text-[#8A6D4B] dark:text-slate-400 flex items-center gap-1 group-hover:text-[#EA5A1F]">
                {copied ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-0.5">
                    <Check size={12} aria-hidden /> Copied
                  </span>
                ) : (
                  <Copy size={12} aria-hidden />
                )}
              </span>
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            <button
              type="button"
              onClick={copyCode}
              aria-label="Copy Room Code"
              className="inline-flex items-center justify-center gap-1 min-h-[38px] px-3 py-1.5 rounded-xl font-extrabold text-xs bg-gradient-to-r from-[#EA5A1F] to-[#D84F17] hover:from-[#F06A32] hover:to-[#EA5A1F] text-white shadow-xs transition active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Copy size={13} aria-hidden />
              <span>{copied ? "Copied!" : "Copy Code"}</span>
            </button>

            <button
              type="button"
              onClick={shareRoom}
              aria-label="Share Room Link"
              className="inline-flex items-center justify-center gap-1 min-h-[38px] px-3 py-1.5 rounded-xl font-bold text-xs bg-white dark:bg-slate-800 hover:bg-[#FFF4E0] dark:hover:bg-slate-700/80 text-[#352C24] dark:text-slate-100 border border-[#EEDBCA] dark:border-slate-700 transition active:scale-95 cursor-pointer whitespace-nowrap shadow-xs"
            >
              <Link2 size={13} aria-hidden />
              <span>Share</span>
            </button>

            <button
              type="button"
              onClick={() => setQrOpen(true)}
              title="Show QR Code"
              aria-label="Show QR Code for this room"
              className="inline-flex items-center justify-center min-h-[38px] min-w-[38px] p-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-[#FFF4E0] dark:hover:bg-slate-700 text-[#6E5E4D] dark:text-slate-200 border border-[#EEDBCA] dark:border-slate-700 transition active:scale-95 cursor-pointer"
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
