import type { ReferralAdminEvent } from "@shared/referrals";
import { describeAdminEvent, whoDidIt } from "./referralAdminModel";

/** The record of operator actions, newest first: what was done, by whom, when, and the reason they gave. */
export function AdminEventsList({ events }: { events: ReferralAdminEvent[] }) {
  return (
    <section aria-labelledby="record-heading" className="rounded-2xl border border-[var(--chrome-border)] bg-[var(--chrome-panel)] p-4">
      <h2 id="record-heading" className="mb-3 text-sm font-black text-[var(--chrome-ink)]">Record of changes</h2>
      {events.length === 0 ? (
        <p className="text-xs text-[var(--chrome-ink-soft)]">No changes have been made through this console yet.</p>
      ) : (
        <ul className="space-y-2">
          {events.map(event => (
            <li key={event.id} className="rounded-xl border border-[var(--chrome-border)] p-3 text-xs">
              <p className="font-bold text-[var(--chrome-ink)]">{describeAdminEvent(event)}</p>
              <p className="mt-0.5 text-[var(--chrome-ink)]">“{event.note}”</p>
              <p className="mt-0.5 text-[var(--chrome-ink-soft)]">{whoDidIt(event.actor)} · {new Date(event.at).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
