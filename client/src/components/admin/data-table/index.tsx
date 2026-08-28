import { type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";

interface ColumnBase<T> {
  header: string | ReactNode;
  width?: string;
  align?: "left" | "center" | "right";
  sortable?: boolean;
}

/**
 * A column backed by a real field on the row. `key` is checked against
 * `keyof T` — a typo, or a field that was renamed on the DTO and not here,
 * fails to compile instead of silently rendering blank. `render` is
 * optional: omit it and the raw property value renders directly.
 */
export interface PropertyColumn<T> extends ColumnBase<T> {
  kind: "property";
  key: keyof T;
  render?: (item: T, index: number) => ReactNode;
}

/**
 * A column with no single backing field — an action button, a badge
 * synthesized from several fields, anything computed. `key` only needs to
 * be a stable, unique string for React's row-key purposes; it is
 * deliberately NOT checked against `keyof T` (a column literally titled
 * "actions" or "conservation" has no real property to match). `render` is
 * REQUIRED — there is no property to fall back to, so nothing here can
 * ever attempt the unsafe `row[someArbitraryString]` access that used to
 * require widening `DataTable`'s own generic to `Record<string, unknown>`.
 */
export interface ComputedColumn<T> extends ColumnBase<T> {
  kind: "computed";
  key: string;
  render: (item: T, index: number) => ReactNode;
}

/**
 * `kind` is a required, explicit literal on BOTH variants — not inferred
 * from whether `render` is present — precisely so this union cannot
 * "collapse": a bare `{ key: string, render? }` shape would let a
 * `keyof T` key structurally satisfy the computed branch too (`keyof T` is
 * always assignable to `string`), silently accepting a property column
 * with a stale/wrong render and no compile-time proof `key` ever matched a
 * real field. The two `kind` literals are mutually exclusive discriminants
 * TypeScript can always use to pick the right branch, independent of
 * everything else on the object.
 */
export type Column<T> = PropertyColumn<T> | ComputedColumn<T>;

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  emptyDescription?: string;
  emptyIcon?: ReactNode;
  emptyAction?: ReactNode;
  pagination?: {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    totalItems: number;
    onPageChange: (page: number) => void;
  };
  onRowClick?: (item: T) => void;
  /**
   * The accessible name announced for a clickable row — e.g.
   * `(user) => \`Open details for user ${user.name}\`` — ADMIN-A11Y-001.
   *
   * Required for a real accessible name (a bare index like "Row 3" tells a
   * screen reader user nothing they could act on); when omitted, rows fall
   * back to a generic "Open row N details" so the table is still keyboard-
   * operable and announced, just without row-specific content.
   */
  getRowAriaLabel?: (item: T, index: number) => string;
  className?: string;
}

export default function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyMessage = "No records found",
  emptyDescription = "Try adjusting your search or filter criteria.",
  emptyIcon,
  emptyAction,
  pagination,
  onRowClick,
  getRowAriaLabel,
  className = "",
}: DataTableProps<T>) {
  return (
    <div
      className={`w-full rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs overflow-hidden flex flex-col ${className}`}
    >
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left text-sm border-collapse min-w-[520px] sm:min-w-full">
          <thead>
            <tr className="border-b border-[var(--chrome-border)] bg-[var(--chrome-control)] text-[var(--chrome-ink-soft)] text-xs font-bold uppercase tracking-wider">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  style={{ width: col.width }}
                  className={`px-3.5 sm:px-4 py-3 sm:py-3.5 ${
                    col.align === "center"
                      ? "text-center"
                      : col.align === "right"
                      ? "text-right"
                      : "text-left"
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--chrome-hairline)]">
            {loading ? (
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={`skel-row-${rIdx}`} className="animate-pulse">
                  {columns.map((col) => (
                    <td key={String(col.key)} className="px-3.5 sm:px-4 py-3 sm:py-3.5">
                      <div className="h-4 bg-[var(--chrome-control)] rounded-md w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto px-4">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--chrome-control)] text-amber-500 flex items-center justify-center mb-3">
                      {emptyIcon ?? <Inbox className="w-6 h-6" />}
                    </div>
                    <p className="text-sm font-bold text-[var(--chrome-ink)]">
                      {emptyMessage}
                    </p>
                    <p className="text-xs text-[var(--chrome-ink-soft)] mt-1">
                      {emptyDescription}
                    </p>
                    {emptyAction && <div className="mt-4">{emptyAction}</div>}
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr
                  key={`row-${rowIdx}`}
                  onClick={() => onRowClick?.(row)}
                  // ADMIN-A11Y-001: a row that opens something on click must
                  // be reachable and activatable the same way with a
                  // keyboard — tabIndex puts it in tab order, role="button"
                  // tells assistive tech what it does (a <tr> has no native
                  // interactive semantics of its own), and the keydown
                  // handler is what actually makes Enter/Space work; neither
                  // key triggers a click on a non-form element by default.
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? "button" : undefined}
                  aria-label={
                    onRowClick
                      ? getRowAriaLabel?.(row, rowIdx) ?? `Open row ${rowIdx + 1} details`
                      : undefined
                  }
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            // Space's default action is scrolling the page —
                            // without this the row would both activate AND
                            // scroll out from under the just-opened drawer.
                            e.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                  className={`transition-colors hover:bg-[var(--chrome-control)]/70 ${
                    onRowClick
                      ? "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500 dark:focus-visible:ring-amber-400"
                      : ""
                  }`}
                >
                  {columns.map((col) => {
                    // `col.kind` narrows the union before anything touches
                    // `row` — no cast of `row` itself is ever needed. A
                    // computed column always carries its own `render`
                    // (enforced at the type level, not by this check), so
                    // the property-with-no-renderer branch is the ONLY
                    // place a raw value is read off `row`, and by then
                    // `col.key` has been narrowed to a genuine `keyof T`.
                    // `row[col.key]` is `T[keyof T]` — the real union of
                    // this row's own field value types, never `unknown`;
                    // the cast below only asserts that union is renderable
                    // React content, not that `row` has some arbitrary
                    // shape TypeScript couldn't otherwise verify.
                    const cellContent =
                      col.kind === "computed"
                        ? col.render(row, rowIdx)
                        : col.render
                          ? col.render(row, rowIdx)
                          : (row[col.key] as ReactNode);

                    return (
                      <td
                        key={String(col.key)}
                        className={`px-3.5 sm:px-4 py-3 sm:py-3.5 text-[var(--chrome-ink)] font-medium ${
                          col.align === "center"
                            ? "text-center"
                            : col.align === "right"
                            ? "text-right"
                            : "text-left"
                        }`}
                      >
                        {cellContent}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="px-3.5 sm:px-4 py-3 border-t border-[var(--chrome-hairline)] bg-[var(--chrome-control)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--chrome-ink-soft)]">
          <div className="text-center sm:text-left">
            Showing{" "}
            <span className="font-bold text-[var(--chrome-ink)]">
              {(pagination.currentPage - 1) * pagination.pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-bold text-[var(--chrome-ink)]">
              {Math.min(
                pagination.currentPage * pagination.pageSize,
                pagination.totalItems
              )}
            </span>{" "}
            of{" "}
            <span className="font-bold text-[var(--chrome-ink)]">
              {pagination.totalItems}
            </span>{" "}
            entries
          </div>

          {/* ADMIN-A11Y-003: icon-only buttons had no accessible name at
              all — a screen reader announced "button", not what it does.
              aria-label supplies the name; aria-disabled is added alongside
              the native `disabled` because some AT/browser combinations
              announce disabled state more reliably from the ARIA attribute
              than from the DOM property alone. The page-count span is
              wrapped in aria-live so a page change is announced without the
              user having to go find it again after each click. */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={pagination.currentPage <= 1}
              aria-disabled={pagination.currentPage <= 1}
              aria-label="Previous page"
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              className="p-1.5 rounded-lg border border-[var(--chrome-border)] text-[var(--chrome-ink)] hover:bg-[var(--chrome-control-hi)] disabled:opacity-40 disabled:cursor-not-allowed transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:focus-visible:ring-amber-400"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span
              className="px-2 py-1 font-bold text-[var(--chrome-ink)]"
              aria-live="polite"
              aria-label={`Page ${pagination.currentPage} of ${pagination.totalPages}`}
            >
              {pagination.currentPage} / {pagination.totalPages}
            </span>

            <button
              type="button"
              disabled={pagination.currentPage >= pagination.totalPages}
              aria-disabled={pagination.currentPage >= pagination.totalPages}
              aria-label="Next page"
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              className="p-1.5 rounded-lg border border-[var(--chrome-border)] text-[var(--chrome-ink)] hover:bg-[var(--chrome-control-hi)] disabled:opacity-40 disabled:cursor-not-allowed transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:focus-visible:ring-amber-400"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
