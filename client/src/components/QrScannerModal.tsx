import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { HapticsManager } from "../services/HapticsManager";

export interface QrScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScanSuccess: (code: string) => void;
}

/**
 * Camera QR Scanner modal for guest players joining a BHALYAM room.
 * Uses html5-qrcode for fast, responsive in-browser camera stream decoding.
 */
export default function QrScannerModal({
  open,
  onClose,
  onScanSuccess,
}: QrScannerModalProps) {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [scanning, setScanning] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extract 6-character room code from scanned string (URL or raw code)
  function parseRoomCode(scannedText: string): string | null {
    if (!scannedText) return null;
    const clean = scannedText.trim();
    // Matches /room/XXXXXX or /room/XXXXXX/
    const match = clean.match(/\/room\/([A-Za-z0-9_-]{6})/i);
    if (match && match[1]) {
      return match[1].toUpperCase();
    }
    // Direct 6-character room code string
    if (clean.length === 6 && /^[A-Za-z0-9_-]{6}$/.test(clean)) {
      return clean.toUpperCase();
    }
    return null;
  }

  // Camera start/stop lifecycle
  useEffect(() => {
    if (!open) return;

    setCameraError(null);
    setScanning(true);

    const elementId = "bhalyam-qr-reader";
    const html5QrCode = new Html5Qrcode(elementId, {
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      verbose: false,
    });
    scannerRef.current = html5QrCode;

    const config = {
      fps: 10,
      qrbox: { width: 220, height: 220 },
      aspectRatio: 1.0,
    };

    html5QrCode
      .start(
        { facingMode },
        config,
        (decodedText) => {
          const roomCode = parseRoomCode(decodedText);
          if (roomCode) {
            HapticsManager.getInstance().subtle();
            // Stop scanning before calling success callback
            html5QrCode.stop().then(() => {
              onScanSuccess(roomCode);
              onClose();
            }).catch(() => {
              onScanSuccess(roomCode);
              onClose();
            });
          } else {
            setCameraError("Scanned QR is not a valid BHALYAM room code.");
          }
        },
        () => {
          // Frame scan error (normal during movement) - ignore
        }
      )
      .catch((err) => {
        setScanning(false);
        const msg = String(err);
        if (msg.includes("NotAllowedError") || msg.includes("Permission denied")) {
          setCameraError("Camera permission denied. Please allow camera access or upload a QR image.");
        } else if (msg.includes("NotFoundError") || msg.includes("DevicesNotFoundError")) {
          setCameraError("No camera found on this device. Try uploading a QR image.");
        } else {
          setCameraError("Unable to start camera. Make sure no other app is using it.");
        }
      });

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [open, facingMode]);

  // Handle file selection scan
  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !scannerRef.current) return;
    try {
      setCameraError(null);
      const decodedText = await scannerRef.current.scanFile(file, true);
      const roomCode = parseRoomCode(decodedText);
      if (roomCode) {
        HapticsManager.getInstance().subtle();
        onScanSuccess(roomCode);
        onClose();
      } else {
        setCameraError("Image does not contain a valid BHALYAM room code.");
      }
    } catch {
      setCameraError("Could not detect a clear QR code in this image.");
    }
  }

  // Toggle camera direction
  function toggleCamera() {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  }

  // ESC to close
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4
                 bg-black/60 dark:bg-black/80 backdrop-blur-sm dark:backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-scanner-title"
        onClick={(e) => e.stopPropagation()}
        className="bhalyam-font relative w-full max-w-sm
                   bg-[#FFFDF9] dark:bg-[#111622] text-[#2B3550] dark:text-slate-100
                   border-2 border-[#EEDBCA] dark:border-slate-800
                   rounded-3xl p-5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85)]
                   flex flex-col items-center space-y-4"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))" }}
      >
        {/* Header */}
        <div className="w-full flex items-center justify-between border-b-2 border-[#EEDBCA]/60 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <span
              className="w-10 h-10 rounded-xl inline-flex items-center justify-center text-white flex-shrink-0 shadow-sm"
              style={{
                background: "linear-gradient(135deg, #FF8F00, #EA5A1F)",
                boxShadow: "0 4px 10px -2px #FF8F0066",
              }}
              aria-hidden
            >
              <ScanIcon className="w-5 h-5" />
            </span>
            <h2
              id="qr-scanner-title"
              className="font-bold text-[#2B3550] dark:text-slate-100 text-base leading-tight"
            >
              Scan QR Code
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleCamera}
              title="Switch camera"
              aria-label="Switch camera"
              className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-full inline-flex items-center justify-center
                         bg-[#FFF4E0] dark:bg-[#1E2738] text-[#2B3550] dark:text-slate-200 cursor-pointer
                         hover:bg-[#EEDCC2] dark:hover:bg-[#2A374F] active:scale-95 transition"
            >
              <FlipCameraIcon className="w-4.5 h-4.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Scanner"
              className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-full inline-flex items-center justify-center
                         bg-[#FFF4E0] dark:bg-[#1E2738] text-[#2B3550] dark:text-slate-200 cursor-pointer
                         hover:bg-[#EEDCC2] dark:hover:bg-[#2A374F] active:scale-95 transition"
            >
              <CloseIcon className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Viewfinder Container */}
        <div className="relative w-full max-w-[260px] aspect-square rounded-2xl overflow-hidden bg-black border-2 border-amber-500/80 shadow-md flex items-center justify-center">
          <div id="bhalyam-qr-reader" className="w-full h-full object-cover" />

          {/* Animated Target Reticle overlay */}
          {scanning && !cameraError && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="w-[180px] h-[180px] border-2 border-amber-400/80 rounded-xl relative shadow-[0_0_20px_rgba(245,158,11,0.4)]">
                {/* Corner accents */}
                <span className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-amber-400" />
                <span className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-amber-400" />
                <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-amber-400" />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-amber-400" />
                {/* Scanning laser animation line */}
                <span className="absolute left-2 right-2 h-0.5 bg-amber-400 shadow-[0_0_8px_#F59E0B] animate-bounce" />
              </div>
            </div>
          )}
        </div>

        {/* Error message banner if any */}
        {cameraError && (
          <div
            role="alert"
            className="w-full text-xs text-rose-600 dark:text-rose-400 font-bold text-center
                       bg-rose-500/10 border border-rose-500/30
                       rounded-2xl p-2.5 leading-snug"
          >
            {cameraError}
          </div>
        )}

        {/* Subtitle instructions */}
        <p className="text-xs font-semibold text-[#8A6D4B] dark:text-slate-400 text-center">
          Point camera at the host's room QR code to join automatically.
        </p>

        {/* Upload Screenshot fallback */}
        <div className="w-full pt-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelected}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full min-h-[44px] rounded-xl border border-[#EEDBCA] dark:border-slate-700/80
                       bg-white dark:bg-[#182234] hover:bg-[#FFF9EE] dark:hover:bg-[#1E2738] text-[#2B3550] dark:text-slate-100
                       font-bold text-xs inline-flex items-center justify-center gap-2
                       active:scale-[0.98] transition shadow-sm cursor-pointer"
          >
            <ImageIcon className="w-4 h-4" />
            Upload QR Code Image
          </button>
        </div>
      </div>
    </div>
  );
}

function ScanIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <line x1="7" y1="12" x2="17" y2="12" />
    </svg>
  );
}

function FlipCameraIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M20 10c0-4.4-3.6-8-8-8s-8 3.6-8 8c0 2.2.9 4.2 2.3 5.7L4 18" />
      <path d="M4 14c0 4.4 3.6 8 8 8s8-3.6 8-8c0-2.2-.9-4.2-2.3-5.7L20 6" />
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

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}
