import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { captureAndShareScreenshot } from "../lib/screenshot";

export interface QrCodeModalProps {
  open: boolean;
  onClose: () => void;
  code: string;
  gameName?: string;
  hostName?: string | null;
}

/**
 * High-contrast, accessible QR Code modal for host players to display their
 * BHALYAM room code. Nearby players can scan it directly using native mobile
 * cameras or the in-app QR scanner.
 */
export default function QrCodeModal({
  open,
  onClose,
  code,
  gameName,
  hostName,
}: QrCodeModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const roomUrl = `${window.location.origin}/room/${code}`;

  // ESC to close
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Prevent background scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(roomUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      // Fallback
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 1800);
    } catch {
      // Fallback
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4
                 bg-black/60 dark:bg-black/80 backdrop-blur-sm dark:backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="bhalyam-font relative w-full max-w-sm
                   bg-[#FFFDF9] dark:bg-[#111622] text-[#2B3550] dark:text-slate-100
                   border-2 border-[#EEDBCA] dark:border-slate-800
                   rounded-3xl p-5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85)]
                   flex flex-col items-center text-center space-y-4"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))" }}
      >
        {/* Header */}
        <div className="w-full flex items-center justify-between border-b-2 border-[#EEDBCA]/60 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5 text-left">
            <span
              className="w-10 h-10 rounded-xl inline-flex items-center justify-center text-white flex-shrink-0 shadow-sm"
              style={{
                background: "linear-gradient(135deg, #EA5A1F, #B53917)",
                boxShadow: "0 4px 10px -2px #B5391766",
              }}
              aria-hidden
            >
              <QrIcon className="w-5 h-5" />
            </span>
            <div>
              <h2
                id="qr-modal-title"
                className="font-bold text-[#2B3550] dark:text-slate-100 text-base leading-tight"
              >
                Scan to Join
              </h2>
              {gameName && (
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#8A6D4B] dark:text-slate-400">
                  {gameName}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close QR Modal"
            className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-full inline-flex items-center justify-center
                       bg-[#FFF4E0] dark:bg-[#1E2738] text-[#2B3550] dark:text-slate-200 cursor-pointer
                       hover:bg-[#EEDCC2] dark:hover:bg-[#2A374F] active:scale-95 transition"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Host greeting if provided */}
        {hostName && (
          <p className="font-script text-xl text-[#2B3550] dark:text-amber-300 -mb-1">
            "{hostName}" invites you to play!
          </p>
        )}

        {/* Monospace Code Display */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#8A6D4B] dark:text-slate-400">
            Room Code:
          </span>
          <button
            type="button"
            onClick={copyCode}
            title="Tap to copy code"
            className="font-mono font-black text-2xl tracking-[0.3em] text-[#2B3550] dark:text-slate-100
                       bg-[#FFF9EE] dark:bg-[#0B0F19] px-3.5 py-1 rounded-2xl border-2 border-dashed border-[#EEDBCA] dark:border-amber-500/40
                       hover:bg-[#FFF4E0] dark:hover:bg-[#141C2B] active:scale-95 transition cursor-pointer"
          >
            {copiedCode ? "COPIED" : code}
          </button>
        </div>

        {/* QR Code Container */}
        <div className="p-3 sm:p-4 bg-white rounded-3xl border-2 border-[#EEDBCA] dark:border-amber-400/50 shadow-inner flex flex-col items-center max-w-full overflow-hidden">
          <QRCodeSVG
            value={roomUrl}
            size={180}
            className="w-full max-w-[180px] h-auto aspect-square"
            bgColor="#FFFFFF"
            fgColor="#0F172A"
            level="M"
            marginSize={1}
            title={`BHALYAM Room ${code} QR Code`}
          />
        </div>

        {/* Instruction */}
        <p className="text-xs font-semibold text-[#8A6D4B] dark:text-slate-400 max-w-[260px] leading-relaxed">
          Nearby friends can scan this QR code with their mobile camera app or
          BHALYAM Scanner to hop in!
        </p>

        {/* Action buttons */}
        <div className="w-full flex gap-2 pt-1">
          <button
            type="button"
            onClick={copyLink}
            className="flex-1 inline-flex items-center justify-center gap-2 min-h-[44px]
                       rounded-xl bg-[#EA5A1F] hover:bg-[#D84F17] text-white font-bold text-xs
                       shadow-[0_4px_12px_rgba(234,90,31,0.35)] active:scale-[0.98] transition cursor-pointer"
          >
            <CopyIcon className="w-4 h-4" />
            {copiedLink ? "Link Copied!" : "Copy Link"}
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
            className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[44px]
                       rounded-xl bg-[#2B3550] hover:bg-[#1E2738] dark:bg-slate-800 hover:dark:bg-slate-700
                       text-white font-bold text-xs border border-transparent dark:border-slate-700
                       shadow-md active:scale-[0.98] transition cursor-pointer"
          >
            <span>📸</span>
            Share Image
          </button>
        </div>
      </div>
    </div>
  );
}

function QrIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3z" fill="currentColor" />
      <path d="M18 18h3v3h-3z" fill="currentColor" />
      <path d="M14 18h3v3h-3z" />
      <path d="M18 14h3v3h-3z" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className={className} aria-hidden>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
