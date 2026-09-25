export interface DayGroup<T> {
  /** `YYYY-MM-DD` in the reader's time zone. Stable, sortable, safe as a React key. */
  key: string;
  /** "Today", "Yesterday", or "Sunday, 20 Sep" in the reader's language. */
  label: string;
  messages: T[];
}

export interface GroupByDayOptions {
  now: number;
  /** BCP 47 tag of the reader's language, for weekday and month names. */
  locale: string;
  labels: { today: string; yesterday: string };
  /** Defaults to the reader's own zone. Tests pin it so they do not depend on where they run. */
  timeZone?: string;
}

function dayKey(timestamp: number, timeZone?: string): string {
  // en-CA prints ISO-ordered dates, which is what makes the key sortable.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(timestamp),
  );
}

/** The calendar day before a `YYYY-MM-DD` key, by date arithmetic so daylight saving cannot skip or repeat one. */
function previousDayKey(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
}

/**
 * Cut a conversation into days, oldest first, each with its own label.
 *
 * Days begin at the reader's local midnight — a message sent at 23:59 in
 * Hyderabad belongs to that evening, not to the next UTC day. Input is never
 * mutated and need not be sorted; messages within a day keep the order they
 * came in.
 */
export function groupMessagesByDay<T extends { timestamp: number }>(
  messages: readonly T[],
  { now, locale, labels, timeZone }: GroupByDayOptions,
): DayGroup<T>[] {
  const today = dayKey(now, timeZone);
  const yesterday = previousDayKey(today);
  const dateLabel = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "short", timeZone });

  const ordered = messages
    .map((message, index) => ({ message, index }))
    .sort((a, b) => a.message.timestamp - b.message.timestamp || a.index - b.index);

  const groups: DayGroup<T>[] = [];
  for (const { message } of ordered) {
    const key = dayKey(message.timestamp, timeZone);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.messages.push(message);
      continue;
    }
    const label = key === today ? labels.today : key === yesterday ? labels.yesterday : dateLabel.format(new Date(message.timestamp));
    groups.push({ key, label, messages: [message] });
  }
  return groups;
}
