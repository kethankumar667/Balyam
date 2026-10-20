import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AdminRecordSection } from "@shared/adminUsers";
import Panel from "../../../components/admin/panel";
import LoadingState from "../../../components/admin/loading-state";
import { operationalFetch } from "../../../lib/operationalApi";
import { useViewport } from "../../../lib/useViewport";
import { errorMessage } from "./errorMessage";
import { isSensitiveAccountField, MASK, maskEmail, usePersonalData } from "./personalData";
import { presentSection, type PresentedColumn } from "./recordColumns";
import { useNearViewport } from "./useNearViewport";
import { formatText, sectionTitle } from "./recordFormat";

/** Rows per page, for every record table on the player page. The server pages the same way. */
export const RECORDS_PAGE_SIZE = 10;
const NOT_RECORDED = "Not recorded";
// Measured heights of a table header, a table row and a phone card, for the placeholder a deferred section holds.
const TABLE_HEAD_PX = 40;
const TABLE_ROW_PX = 41;
const CARD_HEIGHT_PX = 130;
const CONTROL =
  "min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--chrome-border)] px-3 text-sm text-[var(--chrome-ink)] transition-colors hover:bg-[var(--chrome-control)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-50";

function Cell({ column, value, masked = false }: { column: PresentedColumn; value: unknown; masked?: boolean }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-[var(--chrome-ink-soft)]">{NOT_RECORDED}</span>;
  }
  if (masked) {
    return <span title="Hidden. Use Show personal data to view it.">{column.field === "email" ? maskEmail(String(value)) : MASK}</span>;
  }
  if (typeof value === "object") {
    return <code className="block max-h-24 max-w-xs overflow-auto break-all font-mono text-xs">{JSON.stringify(value)}</code>;
  }
  const text = formatText(column.kind, column.field, value);
  // A shortened id keeps the whole one one hover away.
  return column.kind === "shortId" ? <span title={String(value)} className="font-mono text-xs">{text}</span> : <>{text}</>;
}

function RecordsTable({ title, columns, rows, page }: { title: string; columns: PresentedColumn[]; rows: Record<string, unknown>[]; page: number }) {
  return (
    // Focusable so a keyboard user can scroll a table that is wider than the panel, in the rare case one is.
    <div className="relative overflow-x-auto" tabIndex={0}>
      <table aria-label={`${title} table`} className="w-full text-left text-sm">
        <thead className="bg-[var(--chrome-control)]/50 text-xs text-[var(--chrome-ink-soft)]">
          <tr>
            {columns.map((column) => (
              <th key={column.field} scope="col" className="px-4 py-2.5 font-semibold">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--chrome-hairline)]">
          {rows.map((row, index) => (
            <tr key={`${page}-${index}`}>
              {columns.map((column) => (
                <td key={column.field} className="break-words px-4 py-2.5 align-top tabular-nums text-[var(--chrome-ink)]">
                  <Cell column={column} value={row[column.field]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The phone's version of a table: one block per record, field name left and value right, nothing to scroll sideways. */
function RecordCards({ columns, rows, page }: { columns: PresentedColumn[]; rows: Record<string, unknown>[]; page: number }) {
  return (
    <ul className="divide-y divide-[var(--chrome-hairline)]">
      {rows.map((row, index) => (
        <li key={`${page}-${index}`} className="px-4 py-3">
          <dl className="space-y-1.5">
            {columns.map((column) => (
              <div key={column.field} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 text-sm">
                <dt className="text-xs text-[var(--chrome-ink-soft)]">{column.label}</dt>
                <dd className="min-w-0 break-words tabular-nums text-[var(--chrome-ink)]">
                  <Cell column={column} value={row[column.field]} />
                </dd>
              </div>
            ))}
          </dl>
        </li>
      ))}
    </ul>
  );
}

/** One record about the player (profile, wallet) as labelled fields. */
function RecordDetail({ columns, row, isMasked }: { columns: PresentedColumn[]; row: Record<string, unknown>; isMasked: (field: string) => boolean }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 px-5 py-4 sm:grid-cols-2 xl:grid-cols-3">
      {columns.map((column) => (
        <div key={column.field} className="min-w-0">
          <dt className="text-xs text-[var(--chrome-ink-soft)]">{column.label}</dt>
          <dd className="mt-1 break-words text-sm font-medium tabular-nums text-[var(--chrome-ink)]">
            <Cell column={column} value={row[column.field]} masked={isMasked(column.field)} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function pagerSummary(page: number, pageSize: number, shown: number, total: number | null): string {
  if (total === null) return `Page ${page} - retained records`;
  if (total === 0 || shown === 0) return `${total} recorded`;
  const first = (page - 1) * pageSize + 1;
  return `Showing ${first}-${first + shown - 1} of ${total}`;
}

/**
 * One kind of retained record (matches, wallet, …) as a table of at most ten rows, with paging.
 *
 * The first page arrives with the player's details; later pages are fetched here. A failed page is an
 * error with a retry, never an empty table, and a section the server cannot supply says so. On a phone
 * the rows become stacked blocks; a section that is one record about the player becomes a field list.
 */
export default function UserRecordSection({ userId, initial }: { userId: string; initial: AdminRecordSection }) {
  const title = sectionTitle(initial.title);
  const isMobile = useViewport() === "mobile";
  const { isRevealed } = usePersonalData();
  const isDeferred = Boolean(initial.deferred);
  const { ref, isNear } = useNearViewport(isDeferred);
  const [section, setSection] = useState(initial);
  const [page, setPage] = useState(initial.page);
  const [retry, setRetry] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // A deferred section arrives without rows, so even its first page is fetched; the others already have it.
    if (!isDeferred && page === initial.page && retry === 0) {
      setSection(initial);
      setError(null);
      setIsLoading(false);
      return;
    }
    if (!isNear) return;
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
        if (active) {
          setIsLoading(false);
          setHasFetched(true);
        }
      });
    return () => {
      active = false;
    };
  }, [userId, initial, page, retry, isDeferred, isNear]);

  const presented = useMemo(() => presentSection(initial.key, section.records), [initial.key, section.records]);
  const pageSize = section.pageSize || RECORDS_PAGE_SIZE;
  const pageCount = section.total === null ? null : Math.max(1, Math.ceil(section.total / pageSize));
  const hasPaging = page > 1 || section.hasMore;
  const isSingleRecord = presented.layout === "detail" && !hasPaging;
  // A deferred section has its count but not its rows until it is near the screen and has been asked for.
  const isAwaitingRows = isDeferred && !hasFetched;
  // The placeholder holds roughly the room the rows will take, so that loading them does not shove the page
  // (and a jump that was heading for a section below) around.
  const expectedRows = Math.min(section.total ?? 0, RECORDS_PAGE_SIZE);
  const placeholderHeight = isMobile ? expectedRows * CARD_HEIGHT_PX : TABLE_HEAD_PX + expectedRows * TABLE_ROW_PX;
  const isAccount = initial.key === "account";
  const isMasked = (field: string) => isAccount && !isRevealed && isSensitiveAccountField(field);

  const pager = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span role="status" className="text-xs text-[var(--chrome-ink-soft)]">
        {pagerSummary(page, pageSize, section.records.length, section.total)}
        {pageCount !== null && hasPaging ? ` - page ${page} of ${pageCount}` : ""}
      </span>
      {hasPaging && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={CONTROL}
            aria-label={`Previous ${title} records`}
            disabled={isLoading || isAwaitingRows || page <= 1}
            onClick={() => setPage((value) => value - 1)}
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={CONTROL}
            aria-label={`Next ${title} records`}
            disabled={isLoading || isAwaitingRows || Boolean(error) || Boolean(section.unavailable) || !section.hasMore}
            onClick={() => setPage((value) => value + 1)}
          >
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );

  return (
    // The wrapper is what the jump bar scrolls to; focusable so that focus can follow the scroll.
    <div ref={ref} id={`record-${initial.key}`} tabIndex={-1} className="scroll-mt-20 focus:outline-none">
    <Panel
      title={title}
      description={isAccount && !isRevealed ? "Personal details are hidden. Use Show personal data in the identity panel." : undefined}
      label={`${title} records`}
      busy={isLoading}
      bodyClassName="p-0"
      footer={isSingleRecord ? undefined : pager}
    >
      {isAwaitingRows && !isLoading && !error ? (
        <div aria-hidden="true" style={{ minHeight: placeholderHeight }} className="space-y-3 p-5">
          <div className="h-4 w-1/3 rounded bg-[var(--chrome-control)]" />
          <div className="h-4 w-2/3 rounded bg-[var(--chrome-control)]" />
          <div className="h-4 w-1/2 rounded bg-[var(--chrome-control)]" />
        </div>
      ) : isLoading ? (
        <div className="p-5">
          <LoadingState label={`Loading ${title} records`} rows={3} />
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
      ) : presented.layout === "detail" && presented.rows.length === 1 ? (
        <RecordDetail columns={presented.columns} row={presented.rows[0]!} isMasked={isMasked} />
      ) : isMobile ? (
        <RecordCards columns={presented.columns} rows={presented.rows} page={page} />
      ) : (
        <RecordsTable title={title} columns={presented.columns} rows={presented.rows} page={page} />
      )}
    </Panel>
    </div>
  );
}
