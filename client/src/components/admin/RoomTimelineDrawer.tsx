import { useEffect, useState } from "react";
import { Search, ChevronDown, ChevronRight as ChevronRightIcon } from "lucide-react";
import DetailDrawer from "./detail-drawer";
import { operationalFetch, OperationalAuthError } from "../../lib/operationalApi";
import type { TimelineExport, DomainEvent } from "@shared/events/EventContracts";

interface RoomTimelineDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pre-fills the lookup with a room already in view (e.g. a live room row) — the admin can still change it. */
  initialCode?: string;
}

function errorMessage(err: unknown): string {
  if (err instanceof OperationalAuthError) return "Not authorized for the operational API.";
  if (err instanceof Error) return err.message;
  return "Request failed.";
}

/**
 * Room event timeline inspector — revived from the orphaned, unrouted
 * `pages/AdminDashboardPage.tsx` (never linked from the real console) and
 * moved here as a drawer reachable from Matches. The endpoint
 * (`GET /api/operational/timeline/:code`) is privacy-sanitized server-side
 * and survives room closure, which is exactly what post-incident
 * investigation needs — this was the missing piece during this session's
 * "no confirmation popup, both wallets debited" investigation, which had to
 * fall back to pasting raw Render logs instead.
 */
export default function RoomTimelineDrawer({ isOpen, onClose, initialCode }: RoomTimelineDrawerProps) {
  const [code, setCode] = useState(initialCode ?? "");
  const [timeline, setTimeline] = useState<TimelineExport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setCode(initialCode ?? "");
    setTimeline(null);
    setError(null);
    setExpandedEventId(null);
    if (initialCode) void inspect(initialCode);
    // Only re-run when the drawer opens for a (possibly) different room — not on every `code` keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialCode]);

  async function inspect(lookupCode: string) {
    const trimmed = lookupCode.trim().toUpperCase();
    if (!trimmed) return;
    setIsLoading(true);
    setError(null);
    setExpandedEventId(null);
    try {
      const data = await operationalFetch<TimelineExport>(`/api/operational/timeline/${trimmed}`);
      setTimeline(data);
    } catch (err) {
      setTimeline(null);
      setError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <DetailDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Room Event Timeline"
      subtitle="Privacy-sanitized event log — available even after the room has closed"
      width="lg"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void inspect(code);
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="6-character room code (e.g. 4MN2H4)"
          maxLength={6}
          aria-label="Room code"
          className="flex-1 px-3 py-2 rounded-xl bg-[var(--chrome-control)] border border-[var(--chrome-border)] text-xs font-mono uppercase text-[var(--chrome-ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        />
        <button
          type="submit"
          disabled={isLoading || code.trim().length === 0}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-bold text-xs transition cursor-pointer inline-flex items-center gap-1.5"
        >
          <Search className="w-3.5 h-3.5" aria-hidden="true" />
          {isLoading ? "Looking up…" : "Inspect"}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold">
          {error}
        </div>
      )}

      {timeline && (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-[var(--chrome-ink-soft)]">
            {timeline.totalEvents} event(s) for room <span className="font-mono font-bold">{timeline.roomId}</span>
          </p>

          {timeline.events.length === 0 ? (
            <p className="text-xs text-[var(--chrome-ink-soft)] italic py-6 text-center">
              No events recorded for this room.
            </p>
          ) : (
            <ol className="space-y-1.5">
              {timeline.events.map((event: DomainEvent) => {
                const isExpanded = expandedEventId === event.id;
                return (
                  <li
                    key={event.id}
                    className="rounded-xl bg-[var(--chrome-control)] border border-[var(--chrome-border)] overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                      aria-expanded={isExpanded}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left cursor-pointer hover:bg-[var(--chrome-control-hi)] transition"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 shrink-0 text-[var(--chrome-ink-soft)]" aria-hidden="true" />
                      ) : (
                        <ChevronRightIcon className="w-3.5 h-3.5 shrink-0 text-[var(--chrome-ink-soft)]" aria-hidden="true" />
                      )}
                      <span className="font-mono text-[10px] text-[var(--chrome-ink-soft)] shrink-0">
                        #{event.sequenceNumber}
                      </span>
                      <span className="font-mono text-xs font-bold text-[var(--chrome-ink)] truncate">
                        {event.type}
                      </span>
                      <span className="ml-auto text-[10px] font-mono text-[var(--chrome-ink-soft)] shrink-0">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="px-3 pb-3 space-y-2">
                        {event.playerId && (
                          <p className="text-[11px] font-mono text-[var(--chrome-ink-soft)]">
                            Player: {event.playerId}
                          </p>
                        )}
                        <pre className="bg-[var(--chrome-panel)] border border-[var(--chrome-border)] rounded-lg p-3 text-[11px] font-mono text-[var(--chrome-ink)] overflow-x-auto">
                          {JSON.stringify(event.payload, null, 2)}
                        </pre>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </DetailDrawer>
  );
}
