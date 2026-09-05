import { useState } from "react";
import type { GameKind } from "@shared/types";
import QrCodeModal from "./QrCodeModal";
import { useAudio } from "../hooks/useAudio";
import { AUDIO } from "../constants/audio";
import { useHaptics } from "../hooks/useHaptics";
import { toast } from "../hooks/useToast";

/**
 * Featured lobby block for the room code.
 *
 * Actions in one card so the host can recruit the gang without leaving the lobby:
 *   - large monospace code, copyable on tap
 *   - explicit "Copy" button
 *   - "QR Code" button to present a clean scan code for nearby players
 *   - "WhatsApp" share that opens wa.me with a pre-filled message
 *
 * On mobile we ALSO try the native `navigator.share` sheet first (so
 * Telegram, SMS, AirDrop etc. all show up). WhatsApp button is the
 * deterministic fallback for desktop where Web Share isn't supported.
 *
 * Distinct from the compact `RoomCode` component, which is meant for
 * dense header strips — this one is built for the lobby where there
 * is room to make the code the hero.
 */
export default function RoomCodeShare({
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
  const { play } = useAudio();
  const haptics = useHaptics();

  const roomUrl = `${window.location.origin}/room/${code}`;
  const friendlyGameName: Partial<Record<GameKind, string>> = {
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
  };
  /**
   * Body of the share message — keeps the URL OUT of the text. The OS
   * share sheet pastes the URL field separately into target apps
   * (WhatsApp, Telegram, Messages, etc.), so embedding it in text too
   * caused the link to appear twice on a single line in the receiver's
   * chat. Apps that ignore the URL field still get a clickable URL
   * because `share()` appends it as a separate fallback.
   */
  const shareText =
    (name ? `"${name}" — ` : "") +
    `🎮 Come play ${friendlyGameName[game]} on BHALYAM!\n\n` +
    `Room code: ${code}\n` +
    `Join here:`;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      play(AUDIO.SYS_TICK);
      haptics.subtle();
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API is blocked (insecure context, permissions denied).
      // Fall back to selecting the code so the user can long-press copy.
      const el = document.getElementById("bhalyam-room-code-text");
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  }

  async function share() {
    // Prefer the OS share sheet on mobile — gives access to every app
    // the user actually has installed, not just WhatsApp.
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "Join my BHALYAM room",
          text: shareText,
          url: roomUrl,
        });
        return;
      } catch {
        // User dismissed or share failed — fall through to WhatsApp.
      }
    }
    // WhatsApp fallback when the native share sheet is unavailable.
    // wa.me uses a single `text` parameter so we splice the URL back in
    // here (the native share path keeps them separate above).
    const waUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${roomUrl}`)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <div className="flex flex-col items-center gap-3.5 max-w-md mx-auto w-full">
        {name && (
          <div className="font-script text-xl sm:text-2xl text-[#2B3550] dark:text-amber-300 -mb-1 px-3 py-0.5 rounded-full bg-[#EEDBCA]/40 dark:bg-slate-800/60 border border-[#EEDBCA] dark:border-slate-700/60">
            {name}
          </div>
        )}

        {/* Arcade Ticket / Pass Badge */}
        <div className="relative group w-full flex flex-col items-center">
          <div className="inline-flex items-center justify-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#8A6D4B] dark:text-slate-400 mb-1.5">
            <span aria-hidden className="text-xs">🎟️</span>
            <span>Room Entry Pass</span>
          </div>

          <button
            type="button"
            onClick={copyCode}
            title="Tap to copy room code"
            className="w-full max-w-[320px] font-mono text-3xl sm:text-4xl tracking-[0.3em] sm:tracking-[0.35em] font-black text-[#2B3550] dark:text-slate-100
                       bg-gradient-to-b from-[#FFFDF8] to-[#FFF4E0] dark:from-[#131926] dark:to-[#0F1420]
                       border-2 border-dashed border-[#D4A574] dark:border-amber-500/50 rounded-2xl
                       px-4 py-3 leading-none
                       hover:border-[#EA5A1F] dark:hover:border-amber-400
                       active:scale-[0.98] transition-all duration-200
                       shadow-[0_4px_12px_rgba(180,83,9,0.08),inset_0_1px_2px_rgba(255,255,255,0.8)]
                       dark:shadow-[0_6px_20px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)]
                       flex items-center justify-center relative cursor-pointer"
          >
            <span id="bhalyam-room-code-text" className="select-all pl-[0.3em]">{code}</span>
            {copied && (
              <span className="absolute -top-3 right-4 bg-emerald-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-md animate-bounce">
                ✓ Copied!
              </span>
            )}
          </button>
          <span className="text-[10px] text-[#8A6D4B] dark:text-slate-400 font-medium mt-1.5">
            Tap code to copy or share with friends
          </span>
        </div>

        {/* 2x2 Action Button Grid */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-center gap-2 pt-0.5 w-full">
          <button
            type="button"
            onClick={copyCode}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl min-h-[44px]
                       bg-gradient-to-r from-[#EA5A1F] to-[#D84F17] hover:from-[#F06A32] hover:to-[#EA5A1F]
                       active:scale-95 text-white font-bold text-xs sm:text-sm px-3.5 py-2
                       shadow-[0_4px_12px_rgba(234,90,31,0.35)]
                       transition-all duration-150 cursor-pointer w-full sm:w-auto"
            aria-label="Copy room code"
          >
            <span aria-hidden className="text-sm">📋</span>
            <span>{copied ? "Copied!" : "Copy Code"}</span>
          </button>

          <button
            type="button"
            onClick={() => setQrOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl min-h-[44px]
                       bg-white dark:bg-slate-800 hover:bg-[#FFF9EE] dark:hover:bg-slate-700/80
                       active:scale-95 text-[#352C24] dark:text-slate-100 font-semibold text-xs sm:text-sm px-3.5 py-2
                       border border-[#EEDBCA] dark:border-slate-700/80
                       shadow-xs transition-all duration-150 cursor-pointer w-full sm:w-auto"
            aria-label="Show QR Code"
          >
            <span aria-hidden className="text-sm">📷</span>
            <span>QR Code</span>
          </button>

          <button
            type="button"
            onClick={share}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl min-h-[44px]
                       bg-white dark:bg-slate-800 hover:bg-[#FFF9EE] dark:hover:bg-slate-700/80
                       active:scale-95 text-[#352C24] dark:text-slate-100 font-semibold text-xs sm:text-sm px-3.5 py-2
                       border border-[#EEDBCA] dark:border-slate-700/80
                       shadow-xs transition-all duration-150 cursor-pointer w-full sm:w-auto"
            aria-label="Share room link"
          >
            <span aria-hidden className="text-sm">🔗</span>
            <span>Share Link</span>
          </button>
        </div>
      </div>

      <QrCodeModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        code={code}
        gameName={friendlyGameName[game]}
        hostName={name}
      />
    </>
  );
}
