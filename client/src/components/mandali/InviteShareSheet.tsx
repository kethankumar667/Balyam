/**
 * BHALYAM Mandali — Invite Share Sheet
 *
 * Copy Link / native Web Share / WhatsApp share for a Mandali invite link.
 * Mirrors `client/src/components/RoomCodeShare.tsx`'s share pattern rather
 * than reinventing it — same "native share first, WhatsApp wa.me fallback"
 * shape, same "URL in the share target's URL field, not duplicated into the
 * text" reasoning.
 *
 * Requirements:
 * - Dual light/dark theme support.
 * - 44x44px touch targets.
 * - Zero usage of Sparkles from lucide-react.
 */

import { useEffect, useState } from "react";
import { Link2, Copy, Check, RotateCcw, Loader2 } from "lucide-react";
import Modal from "../Modal.js";

export interface InviteShareSheetProps {
  open: boolean;
  onClose: () => void;
  mandaliName: string;
  mandaliHandle: string;
  /** Mints a fresh invite link. Called on open, and again on "Reset link". */
  onCreateLink: () => Promise<{ success: boolean; token?: string; error?: string }>;
}

export default function InviteShareSheet({ open, onClose, mandaliName, mandaliHandle, onCreateLink }: InviteShareSheetProps) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const mint = async () => {
    setIsLoading(true);
    setError(null);
    const result = await onCreateLink();
    setIsLoading(false);
    if (result.success && result.token) {
      setToken(result.token);
    } else {
      setError(result.error ?? "Could not create an invite link.");
    }
  };

  useEffect(() => {
    if (open && !token) void mint();
    if (!open) {
      setToken(null);
      setCopied(false);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const inviteUrl = token ? `${window.location.origin}/mandali/${mandaliHandle}?invite=${token}` : "";
  const shareText = `🎮 Join "${mandaliName}" on BHALYAM! Chat, play, and hang out with the gang.\n\n`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked — nothing to fall back to here since there's no
      // dedicated selectable text node; the user can still use Share/WhatsApp.
    }
  };

  const share = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: `Join ${mandaliName} on BHALYAM`, text: shareText, url: inviteUrl });
        return;
      } catch {
        // Dismissed or unsupported — fall through to WhatsApp.
      }
    }
    const waUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}${inviteUrl}`)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Modal open={open} onClose={onClose} mobileSheet ariaLabelledBy="invite-share-title" closeOnBackdropClick>
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-album-raised border border-album-line shadow-2xl p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-1">
          <Link2 className="w-4 h-4 text-album-foil" />
          <h2 id="invite-share-title" className="text-base font-semibold text-album-ink">
            Invite to {mandaliName}
          </h2>
        </div>
        <p className="text-[13px] text-album-ink3 mb-4">
          Anyone with this link can request to join. You can reset it anytime to stop old links from working.
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-[15px] text-album-ink3">
            <Loader2 className="w-4 h-4 animate-spin" />
            Creating link…
          </div>
        ) : error ? (
          <div role="alert" className="py-4">
            <p className="m-0 text-[15px] text-album-danger">{error}</p>
            <button
              type="button"
              onClick={() => void mint()}
              className="album-focus mt-3 min-h-[44px] cursor-pointer rounded-xl bg-album-field px-5 text-[15px] font-semibold text-album-ink hover:bg-album-line"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={copyLink}
              title="Tap to copy invite link"
              className="w-full text-left rounded-xl border border-dashed border-album-foil/40 bg-album-foilfill/20 px-3.5 py-2.5 mb-3 font-mono text-[13px] text-album-ink truncate cursor-pointer hover:border-album-foil transition-colors"
            >
              {inviteUrl}
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={copyLink}
                className="min-h-[44px] rounded-xl font-bold text-[15px] bg-album-foilfill hover:brightness-105 text-album-onfoil shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy Link"}
              </button>
              <button
                type="button"
                onClick={share}
                className="min-h-[44px] rounded-xl font-semibold text-[15px] bg-album-raised border border-album-line text-album-ink hover:bg-album-field active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                Share via…
              </button>
            </div>

            <button
              type="button"
              onClick={mint}
              className="mt-4 w-full min-h-[36px] flex items-center justify-center gap-1.5 text-[13px] font-semibold text-album-ink3 hover:text-album-danger transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset link (old link stops working)
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
