import { useState } from "react";
import type { GameKind } from "@shared/types";
import { Users, QrCode, Copy, Share2, Check } from "lucide-react";
import QrCodeModal from "../QrCodeModal";
import { useHaptics } from "../../hooks/useHaptics";
import { GAME_DISPLAY_NAMES } from "@shared/catalog";

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
  const gameName = GAME_DISPLAY_NAMES[game] || game;

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
      <div
        data-testid="room-share-card"
        className="w-full bg-gradient-to-r from-amber-50/95 via-orange-50/70 to-amber-50/90 dark:from-amber-950/40 dark:via-[#161F2E] dark:to-orange-950/30 border-2 border-amber-300/90 dark:border-amber-500/50 rounded-3xl p-3.5 sm:p-4 lg:py-2.5 lg:px-4 shadow-xs relative overflow-hidden"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4">
          {/* Left + Middle Cluster */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
            {/* User Group Icon Circle */}
            <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center font-black shadow-xs shrink-0 ring-2 ring-amber-400/25">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" aria-hidden />
            </div>

            {/* Room Code Details */}
            <div className="min-w-0 flex-1">
              <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1.5 leading-none mb-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span>ROOM CODE</span>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-300 font-medium truncate mb-1.5">
                Share this code with friends to join
              </p>

              {/* Monospace Code Plate */}
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
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-300/90 dark:border-amber-600/70 shadow-inner hover:border-orange-500 dark:hover:border-amber-400 transition-all cursor-pointer active:scale-95 group"
              >
                <span
                  id="room-share-code-text"
                  className="font-mono text-xl sm:text-2xl font-black tracking-[0.25em] text-stone-800 dark:text-amber-200 leading-none select-all pl-1"
                >
                  {code}
                </span>
                <span className="text-stone-400 dark:text-stone-400 group-hover:text-orange-600 transition-colors">
                  {copied ? (
                    <Check size={16} className="text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                  ) : (
                    <Copy size={16} className="stroke-[2.5]" />
                  )}
                </span>
                {copied && (
                  <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 rounded-md px-1.5 py-0.5">
                    Copied!
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Action Cluster */}
          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            <button
              type="button"
              onClick={copyCode}
              aria-label="Copy Room Code"
              className="inline-flex items-center justify-center gap-2 min-h-[42px] px-4 py-2 rounded-2xl font-black text-xs sm:text-sm bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-xs transition active:scale-95 cursor-pointer whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            >
              {copied ? (
                <>
                  <Check size={16} className="text-white stroke-[3]" aria-hidden />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={16} className="stroke-[2.5]" aria-hidden />
                  <span>Copy Code</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={shareRoom}
              aria-label="Share Room Link"
              className="inline-flex items-center justify-center gap-1.5 min-h-[42px] px-3.5 py-2 rounded-2xl font-bold text-xs sm:text-sm bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-slate-700 text-stone-700 dark:text-slate-100 border border-stone-200/90 dark:border-slate-700 transition active:scale-95 cursor-pointer whitespace-nowrap shadow-2xs focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <Share2 size={15} className="stroke-[2.5]" aria-hidden />
              <span>Share</span>
            </button>

            <button
              type="button"
              onClick={() => setQrOpen(true)}
              title="Show QR Code"
              aria-label="Show QR Code for this room"
              className="inline-flex items-center justify-center min-h-[42px] min-w-[42px] p-2 rounded-2xl text-xs font-bold bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-slate-700 text-stone-700 dark:text-slate-200 border border-stone-200/90 dark:border-slate-700 transition active:scale-95 cursor-pointer shadow-2xs focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <QrCode size={16} className="stroke-[2.5]" aria-hidden />
              <span className="sr-only">QR</span>
            </button>

            {/* Rotated Handwritten Sticker Note */}
            <div className="hidden lg:flex flex-col items-center justify-center ml-2 select-none">
              <span
                className="text-amber-900/80 dark:text-amber-300/80 text-xs xl:text-sm font-bold italic rotate-6 max-w-[80px] text-center leading-tight"
                style={{ fontFamily: "'Caveat', 'Kalam', cursive" }}
              >
                More friends More fun!
              </span>
            </div>
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
