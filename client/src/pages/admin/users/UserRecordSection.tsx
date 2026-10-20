import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AdminRecordSection } from "@shared/adminUsers";
import Panel from "../../../components/admin/panel";
import LoadingState from "../../../components/admin/loading-state";
import { operationalFetch } from "../../../lib/operationalApi";
import { errorMessage } from "./errorMessage";

const RECORDS_PAGE_SIZE = 20;
const NOT_RECORDED = "Not recorded";
// A full ISO-8601 timestamp such as 2026-10-20T15:10:08.001Z: shown in the operator's own time zone.
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const CONTROL =
  "min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--chrome-border)] px-3 text-sm text-[var(--chrome-ink)] transition-colors hover:bg-[var(--chrome-control)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-50";

function Cell({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-[var(--chrome-ink-soft)]">{NOT_RECORDED}</span>;
  }
  if (typeof value === "object") {
    return (
      <pre className="max-h-40 max-w-xs overflow-auto whitespace-pre-wrap break-all font-mono text-xs">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }
  if (typeof value === "string" && ISO_TIMESTAMP.test(value)) return <>{new Date(value).toLocaleString()}</>;
  return <>{String(value)}</>;
}

/** The fields the records carry, in the order they first appear: one column each. */
function columnsOf(records: Record<string, unknown>[]): string[] {
  const seen = new Set<string>();
  for (const record of records) for (const field of Object.keys(record)) seen.add(field);
  return [...seen];
}

function RecordsTable({ section }: { section: AdminRecordSection }) {
  const columns = columnsOf(section.records);
  return (
    // Focusable so a keyboard user can scroll a table that is wider than the panel.
    <div className="overflow-x-auto" tabIndex={0}>
      <table className="w-full min-w-max text-left text-sm">
        <caption className="sr-only">
          {section.title} records, page {section.page}
        </caption>
        <thead className="bg-[var(--chrome-control)]/50 text-xs text-[var(--chrome-ink-soft)]">
          <tr>
            {columns.map((field) => (
              <th key={field} scope="col" className="whitespace-nowrap px-4 py-2.5 font-semibold capitalize">
                {field.replace(/_/g, " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--chrome-hairline)]">
          {section.records.map((record, index) => (
            <tr key={`${section.page}-${index}`}>
              {columns.map((field) => (
                <td key={field} className="px-4 py-2.5 align-top tabular-nums text-[var(--chrome-ink)]">
                  <Cell value={record[field]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * One kind of retained record (matches, wallet, …) as a paged table.
 *
 * The first page arrives with the player's details; later pages are fetched here. A failed page is an
 * error with a retry, never an empty table, and a section the server cannot supply says so.
 */
export default function UserRecordSection({ userId, initial }: { userId: string; initial: AdminRecordSection }) {
  const [section, setSection] = useState(initial);
  const [page, setPage] = useState(initial.page);
  const [retry, setRetry] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (page === initial.page && retry === 0) {
      setSection(initial);
      setError(null);
      setIsLoading(false);
      return;
    }
    let active = true;
    setIsLoading(true);
    setError(null);
    void operationalFetch<AdminRecordSection>(
      `/api/admin/users/${encodeURIComponent(userId)}/records/${encodeURIComponent(initial.key)}?page=${page}&pageSize=${RECORDS_PAGE_SIZE}`,
    )
      .then((response) => {
        if (!Array.isArray(response.records) || response.key !== initial.key) throw new Error("Invalid recorded section response.");
        if (active) setSection(response);
      })
      .catch((failure: unknown) => {
        if (active) setError(errorMessage(failure));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId, initial, page, retry]);

  const pager = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span role="status" className="text-xs text-[var(--chrome-ink-soft)]">
        Page {page}
        {section.total === null ? " - retained records" : ` - ${section.total} recorded`}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={CONTROL}
          aria-label={`Previous ${initial.title} records`}
          disabled={isLoading || page <= 1}
          onClick={() => setPage((value) => value - 1)}
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={CONTROL}
          aria-label={`Next ${initial.title} records`}
          disabled={isLoading || Boolean(error) || Boolean(section.unavailable) || !section.hasMore}
          onClick={() => setPage((value) => value + 1)}
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );

  return (
    <Panel
      title={initial.title}
      label={`${initial.title} records`}
      busy={isLoading}
      bodyClassName="p-0"
      footer={pager}
    >
      {isLoading ? (
        <div className="p-5">
          <LoadingState label={`Loading ${initial.title} records`} rows={3} />
        </div>
      ) : error ? (
        <div role="alert" className="space-y-3 p-5 text-sm text-[var(--chrome-ink)]">
          <p>{error}</p>
          <button type="button" className={CONTROL} onClick={() => setRetry((value) => value + 1)}>
            Retry records
          </button>
        </div>
      ) : section.unavailable ? (
        <p role="status" className="p-5 text-sm text-[var(--chrome-ink-soft)]">
          {section.unavailable}
        </p>
      ) : section.records.length === 0 ? (
        <p className="p-5 text-sm text-[var(--chrome-ink-soft)]">No retained records in this section.</p>
      ) : (
        <RecordsTable section={section} />
      )}
    </Panel>
  );
}
