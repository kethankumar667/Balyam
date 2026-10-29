import { useCallback, useEffect, useRef, useState } from "react";
import { inviteMessage, inviteUrl, whatsappUrl } from "./referralShare";

const FEEDBACK_MS = 1800;

export type CopiedKind = "code" | "link";

/**
 * Copy, share and WhatsApp for one member's code, shared by the Referrals page card and every invitation promo
 * so the message, the link and the clipboard fallback are written once. `codeRef` is the element that shows the
 * code: if the browser blocks the clipboard it is selected, so a long-press can still copy it.
 */
export function useInviteActions(shareCode: string, bonusCoins: number) {
  const [copied, setCopied] = useState<CopiedKind | null>(null);
  const [failed, setFailed] = useState(false);
  const codeRef = useRef<HTMLParagraphElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const origin = window.location.origin;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = useCallback(async (kind: CopiedKind, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setFailed(false);
      setCopied(kind);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(null), FEEDBACK_MS);
    } catch {
      // Clipboard blocked (insecure context or denied): select the code so a long-press can copy it.
      setFailed(true);
      const node = codeRef.current;
      if (node) {
        const range = document.createRange();
        range.selectNodeContents(node);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
  }, []);

  const share = useCallback(async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Join me on BHALYAM", text: inviteMessage(shareCode, bonusCoins), url: inviteUrl(shareCode, origin) });
        return;
      } catch {
        // Dismissed or unavailable: fall through to WhatsApp.
      }
    }
    window.open(whatsappUrl(shareCode, bonusCoins, origin), "_blank", "noopener,noreferrer");
  }, [shareCode, bonusCoins, origin]);

  return {
    copied,
    failed,
    codeRef,
    copyCode: () => copy("code", shareCode),
    copyLink: () => copy("link", inviteUrl(shareCode, origin)),
    share,
    whatsappHref: whatsappUrl(shareCode, bonusCoins, origin),
  };
}
