import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

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
                 bg-bhalyam-wood-dark/75 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="bhalyam-font relative w-full max-w-sm
                   bg-bhalyam-cream-soft text-bhalyam-wood-dark
                   border-2 border-bhalyam-cream-edge/80
                   rounded-3xl p-5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.65)]
                   flex flex-col items-center text-center space-y-4"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))" }}
      >
        {/* Header */}
        <div className="w-full flex items-center justify-between border-b-2 border-bhalyam-cream-edge/50 pb-3">
          <div className="flex items-center gap-2.5 text-left">
            <span
              className="w-10 h-10 rounded-xl inline-flex items-center justify-center text-white flex-shrink-0"
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
                className="font-bold text-bhalyam-wood-dark text-base leading-tight"
              >
                Scan to Join
              </h2>
              {gameName && (
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-bhalyam-wood/80">
                  {gameName}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close QR Modal"
            className="w-9 h-9 rounded-full inline-flex items-center justify-center
                       bg-bhalyam-cream-warm text-bhalyam-wood-dark cursor-pointer
                       hover:bg-bhalyam-cream-edge active:scale-95 transition"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Host greeting if provided */}
        {hostName && (
          <p className="font-script text-xl text-bhalyam-wood -mb-1">
            "{hostName}" invites you to play!
          </p>
        )}

        {/* Monospace Code Display */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-bhalyam-wood/70">
            Room Code:
          </span>
          <button
            type="button"
            onClick={copyCode}
            title="Tap to copy code"
            className="font-mono font-black text-2xl tracking-[0.3em] text-bhalyam-wood-dark
                       bg-white px-3 py-1 rounded-xl border border-bhalyam-cream-edge/80
                       hover:bg-bhalyam-cream-warm active:scale-95 transition"
          >
            {code}
          </button>
        </div>

        {/* QR Code Container */}
        <div className="p-4 bg-white rounded-2xl border-2 border-bhalyam-gold/50 shadow-inner flex flex-col items-center">
          <QRCodeSVG
            value={roomUrl}
            size={200}
            bgColor="#FFFFFF"
            fgColor="#2B1810"
            level="M"
            marginSize={1}
            title={`BHALYAM Room ${code} QR Code`}
          />
        </div>

        {/* Instruction */}
        <p className="text-xs font-semibold text-bhalyam-wood-dark/80 max-w-[260px] leading-relaxed">
          Nearby friends can scan this QR code with their mobile camera app or
          BHALYAM Scanner to hop in!
        </p>

        {/* Action buttons */}
        <div className="w-full flex gap-2 pt-1">
          <button
            type="button"
            onClick={copyLink}
            className="flex-1 inline-flex items-center justify-center gap-2 min-h-[44px]
                       rounded-xl bg-bhalyam-wood-dark text-bhalyam-cream-soft font-bold text-xs
                       hover:bg-bhalyam-wood active:scale-[0.98] transition shadow-md"
          >
            <CopyIcon className="w-4 h-4" />
            {copiedLink ? "Link Copied!" : "Copy Link"}
          </button>

          <button
            type="button"
            onClick={copyCode}
            className="flex-1 inline-flex items-center justify-center gap-2 min-h-[44px]
                       rounded-xl bhalyam-gold-leaf text-bhalyam-wood-dark font-bold text-xs
                       border border-bhalyam-gold-dark hover:brightness-105 active:scale-[0.98] transition shadow-md"
          >
            {copiedCode ? "Copied!" : "Copy Code"}
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
