import { useState } from "react";
import type { GameKind } from "@shared/types";

/**
 * Featured lobby block for the room code.
 *
 * Three actions in one card so the host can recruit the gang without
 * leaving the lobby:
 *   - large monospace code, copyable on tap
 *   - explicit "Copy" button (for desktop where tap-the-code is unobvious)
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
}: {
  code: string;
  game: GameKind;
}) {
  const [copied, setCopied] = useState(false);

  const roomUrl = `${window.location.origin}/room/${code}`;
  const friendlyGameName: Record<GameKind, string> = {
    handcricket: "Hand Cricket",
    snl: "Snakes & Ladders",
    ludo: "Ludo",
    rummy: "Rummy",
    rps: "Rock Paper Scissors",
    uno: "UNO",
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
    <div className="flex flex-col items-center gap-3">
      <div className="text-[11px] uppercase tracking-widest font-bold text-[#A3886E]">
        Room Code
      </div>
      <button
        type="button"
        onClick={copyCode}
        title="Tap to copy"
        className="font-mono text-[34px] sm:text-[42px] tracking-[0.35em] font-black text-[#2B3550]
                   bg-white border-2 border-dashed border-[#E6C99F] rounded-lg
                   px-5 py-2 leading-none
                   hover:bg-[#FDF7EB] active:translate-y-px transition-all"
      >
        <span id="bhalyam-room-code-text">{code}</span>
      </button>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={copyCode}
          className="inline-flex items-center gap-2 rounded-full
                     bg-[#EA5A1F] hover:bg-[#D84F17] active:translate-y-px
                     text-white font-bold text-[13px] px-4 py-2
                     shadow-[0_3px_6px_-1px_rgba(0,0,0,0.25)]
                     transition-all duration-150"
          aria-label="Copy room code"
        >
          <span aria-hidden>📋</span>
          {copied ? "Copied!" : "Copy Code"}
        </button>
        <button
          type="button"
          onClick={share}
          className="inline-flex items-center gap-2 rounded-full
                     bg-[#25D366] hover:bg-[#1FB856] active:translate-y-px
                     text-white font-bold text-[13px] px-4 py-2
                     shadow-[0_3px_6px_-1px_rgba(0,0,0,0.25)]
                     transition-all duration-150"
          aria-label="Share room link"
        >
          <span aria-hidden>📤</span>
          Share
        </button>
      </div>
    </div>
  );
}
