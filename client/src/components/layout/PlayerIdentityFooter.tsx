import { useState, useSyncExternalStore } from "react";
import { Copy, Check, IdCard } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { getGuestIdSnapshot, subscribeGuestId } from "../../lib/playerIdentity";

/**
 * A small, persistent "Player ID" strip at the bottom of the sidebar.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 * Support/admin lookups (the Player Investigation tool in /admin/economy)
 * search by exactly this string — a member's Supabase `userId` (UUID) or a
 * guest's durable `guest_<hex>` id. Without it on-screen anywhere, the only
 * way to find a specific player's identity was to dig through server logs
 * and GUESS which log line's id belonged to which person — exactly the
 * ambiguity that led to a wallet top-up almost being applied to the wrong
 * guest (2026-09-07). Surfacing it here lets a player just copy their own
 * id and hand it to support directly, unambiguous every time.
 *
 * Shown for every account kind (guest, member, admin, super_admin) —
 * whoever is asking for help, the same id is what resolves them. This is a
 * player's OWN identifier shown TO them, not exposed to anyone else, so it
 * carries none of the third-party PII concerns other player-data surfaces
 * in this app have to guard against.
 */
export interface PlayerIdentityFooterProps {
  className?: string;
  borderTop?: boolean;
}

export default function PlayerIdentityFooter({
  className = "",
  borderTop = true,
}: PlayerIdentityFooterProps = {}) {
  const memberId = useAuthStore((s) => s.userId);
  const guestId = useSyncExternalStore(subscribeGuestId, getGuestIdSnapshot, getGuestIdSnapshot);
  const identityId = memberId ?? guestId;
  const [copied, setCopied] = useState(false);

  // Neither a verified member session nor a minted guest id yet (e.g. the
  // very first render before the guest-mint round trip completes) — better
  // to show nothing than a misleading blank/placeholder id.
  if (!identityId) return null;

  const truncated = identityId.length > 22 ? `${identityId.slice(0, 12)}…${identityId.slice(-6)}` : identityId;

  async function copyId() {
    try {
      await navigator.clipboard.writeText(identityId!);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* Clipboard API unavailable (permissions, insecure context) — the id is still visible to select/copy manually. */
    }
  }

  return (
    <div
      className={`${borderTop ? "pt-2.5 mt-1 border-t border-[var(--chrome-hairline)]" : ""} ${className}`.trim()}
    >
      <button
        type="button"
        onClick={copyId}
        aria-label={`Copy your player ID for support: ${identityId}`}
        title="Your player ID — copy this when contacting support about your account or wallet"
        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left
                   text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)] hover:bg-[var(--chrome-control)]
                   transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chrome-accent)]"
      >
        <IdCard className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-[9px] font-bold uppercase tracking-wider opacity-80">Player ID</span>
          <span className="block text-[11px] font-mono truncate">{truncated}</span>
        </span>
        {copied ? (
          <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" aria-hidden="true" />
        ) : (
          <Copy className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
        )}
        <span role="status" aria-live="polite" className="sr-only">
          {copied ? "Player ID copied to clipboard" : ""}
        </span>
      </button>
    </div>
  );
}
