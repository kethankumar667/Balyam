import { useState } from "react";
import type { BlockedPlayer } from "@shared/social/Block";
import SeatAvatar from "../../components/profile/SeatAvatar";
import { errorMessage } from "../../lib/errorMessage";

interface BlockedPlayersPanelProps {
  blocked: BlockedPlayer[];
  /** Rejects to keep the row and show why. */
  onUnblock: (playerId: string) => Promise<void>;
}

/**
 * The players you have blocked, each with an Unblock button.
 *
 * Unblocking needs no confirmation — it is reversible and safe — but the copy
 * says the part people assume wrongly: it does not bring the friendship back.
 */
export default function BlockedPlayersPanel({ blocked, onUnblock }: BlockedPlayersPanelProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUnblock = async (playerId: string) => {
    if (busyId) return;
    setBusyId(playerId);
    setError(null);
    try {
      await onUnblock(playerId);
    } catch (err: unknown) {
      setError(errorMessage(err, "Couldn't unblock this player. Please try again."));
    } finally {
      setBusyId(null);
    }
  };

  if (blocked.length === 0) {
    return (
      <div
        role="status"
        className="p-8 text-center bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-3xl space-y-1"
      >
        <h3 className="text-base font-bold text-[var(--auth-ink)]">You haven&apos;t blocked anyone</h3>
        <p className="text-xs text-[var(--auth-ink-soft)] max-w-sm mx-auto">
          Someone you block can&apos;t send you friend requests or party invites, and isn&apos;t told
          you blocked them.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-[var(--auth-ink-soft)]">
        Unblocking lets them reach you again. It does not make you friends again.
      </p>
      {error && (
        <p
          role="alert"
          className="text-xs font-mono text-rose-500 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl"
        >
          {error}
        </p>
      )}
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {blocked.map((p) => (
          <li
            key={p.playerId}
            className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs"
          >
            <div className="flex items-center gap-3 min-w-0">
              <SeatAvatar
                avatar={p.avatar}
                name={p.displayName}
                className="w-12 h-12 rounded-2xl border border-[var(--auth-field-edge)] flex-shrink-0"
                textClassName="text-xl"
              />
              <div className="min-w-0">
                <h4 className="font-extrabold text-sm text-[var(--auth-ink)] truncate">{p.displayName}</h4>
                <span className="text-[10px] font-mono text-[var(--auth-ink-soft)] block">
                  Blocked {new Date(p.blockedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleUnblock(p.playerId)}
              aria-busy={busyId === p.playerId}
              aria-label={`Unblock ${p.displayName}`}
              className="min-h-[44px] px-4 py-2 shrink-0 rounded-xl bg-[var(--auth-field)] hover:bg-amber-500/15 text-[var(--auth-ink)] text-xs font-mono font-bold border border-[var(--auth-field-edge)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              {busyId === p.playerId ? "Unblocking…" : "Unblock"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
