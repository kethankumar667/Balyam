import { useState } from "react";
import type { GameKind } from "@shared/types";
import QrCodeModal from "./QrCodeModal";
import { captureAndShareScreenshot } from "../lib/screenshot";

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

  const roomUrl = `${window.location.origin}/room/${code}`;
  const friendlyGameName: Record<GameKind, string> = {
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
    blockblast: "Block Blast",
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
      <div className="flex flex-col items-center gap-3.5">
        {name && (
          <div className="font-script text-2xl text-[#2B3550] dark:text-amber-300 -mb-1">{name}</div>
        )}
        <div className="inline-flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#8A6D4B] dark:text-slate-400">
          <span aria-hidden className="text-sm">👥</span>
          <span>Room Code</span>
        </div>
        <button
          type="button"
          onClick={copyCode}
          title="Tap to copy"
          className="font-mono text-3xl sm:text-4xl tracking-[0.35em] font-black text-[#2B3550] dark:text-slate-100
                     bg-[#FFF9EE] dark:bg-[#0F1420] border-2 border-dashed border-[#E6C99F] dark:border-amber-500/40 rounded-2xl
                     px-7 py-3 leading-none
                     hover:bg-[#FFF4E0] dark:hover:bg-[#141C2B] active:translate-y-px transition-all
                     shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)] dark:shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)] cursor-pointer"
        >
          <span id="bhalyam-room-code-text">{code}</span>
        </button>
        <div className="flex flex-wrap justify-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={copyCode}
            className="inline-flex items-center gap-1.5 rounded-full
                       bg-[#EA5A1F] hover:bg-[#D84F17] active:scale-95
                       text-white font-bold text-xs sm:text-sm px-4 py-2
                       shadow-[0_4px_12px_rgba(234,90,31,0.35)]
                       transition-all duration-150 cursor-pointer"
            aria-label="Copy room code"
          >
            <span aria-hidden>📋</span>
            {copied ? "Copied!" : "Copy Code"}
          </button>
          <button
            type="button"
            onClick={() => setQrOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full
                       bg-white dark:bg-slate-800 hover:bg-[#FFF9EE] dark:hover:bg-slate-700 active:scale-95
                       text-[#352C24] dark:text-slate-100 font-semibold text-xs sm:text-sm px-4 py-2
                       border border-[#EEDBCA] dark:border-slate-700
                       shadow-sm transition-all duration-150 cursor-pointer"
            aria-label="Show QR Code"
          >
            <span aria-hidden>📷</span>
            QR Code
          </button>
          <button
            type="button"
            onClick={share}
            className="inline-flex items-center gap-1.5 rounded-full
                       bg-white dark:bg-slate-800 hover:bg-[#FFF9EE] dark:hover:bg-slate-700 active:scale-95
                       text-[#352C24] dark:text-slate-100 font-semibold text-xs sm:text-sm px-4 py-2
                       border border-[#EEDBCA] dark:border-slate-700
                       shadow-sm transition-all duration-150 cursor-pointer"
            aria-label="Share room link"
          >
            <span aria-hidden>🔗</span>
            Share Link
          </button>
          <button
            type="button"
            onClick={async () => {
              const res = await captureAndShareScreenshot();
              if (res.message) {
                const toast = document.createElement("div");
                toast.className = "fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-slate-900/90 text-white font-bold text-xs shadow-2xl border border-amber-400/40 animate-fade-in";
                toast.innerText = res.message;
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 2500);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-full
                       bg-white dark:bg-slate-800 hover:bg-[#FFF9EE] dark:hover:bg-slate-700 active:scale-95
                       text-[#352C24] dark:text-slate-100 font-semibold text-xs sm:text-sm px-4 py-2
                       border border-[#EEDBCA] dark:border-slate-700
                       shadow-sm transition-all duration-150 cursor-pointer"
            aria-label="Share Screenshot Image"
          >
            <span aria-hidden>🖼</span>
            Share Image
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
