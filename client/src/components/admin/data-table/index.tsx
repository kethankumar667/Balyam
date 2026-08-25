import { type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string | ReactNode;
  render?: (item: T, index: number) => ReactNode;
  width?: string;
  align?: "left" | "center" | "right";
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  emptyDescription?: string;
  emptyIcon?: ReactNode;
  pagination?: {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    totalItems: number;
    onPageChange: (page: number) => void;
  };
  onRowClick?: (item: T) => void;
  className?: string;
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  emptyMessage = "No records found",
  emptyDescription = "Try adjusting your search or filter criteria.",
  emptyIcon,
  pagination,
  onRowClick,
  className = "",
}: DataTableProps<T>) {
  return (
    <div
      className={`w-full rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs overflow-hidden flex flex-col ${className}`}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-[var(--chrome-border)] bg-[var(--chrome-control)] text-[var(--chrome-ink-soft)] text-xs font-bold uppercase tracking-wider">
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className={`px-4 py-3.5 ${
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
                    <td key={col.key} className="px-4 py-3.5">
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
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr
                  key={`row-${rowIdx}`}
                  onClick={() => onRowClick?.(row)}
                  className={`transition-colors hover:bg-[var(--chrome-control)]/70 ${
                    onRowClick ? "cursor-pointer" : ""
                  }`}
                >
                  {columns.map((col) => {
                    const cellContent = col.render
                      ? col.render(row, rowIdx)
                      : (row[col.key] as ReactNode);

                    return (
                      <td
                        key={col.key}
                        className={`px-4 py-3.5 text-[var(--chrome-ink)] font-medium ${
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
        <div className="px-4 py-3 border-t border-[var(--chrome-hairline)] bg-[var(--chrome-control)] flex items-center justify-between gap-3 text-xs text-[var(--chrome-ink-soft)]">
          <div>
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

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={pagination.currentPage <= 1}
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              className="p-1.5 rounded-lg border border-[var(--chrome-border)] text-[var(--chrome-ink)] hover:bg-[var(--chrome-control-hi)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-2 font-bold text-[var(--chrome-ink)]">
              {pagination.currentPage} / {pagination.totalPages}
            </span>

            <button
              type="button"
              disabled={pagination.currentPage >= pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              className="p-1.5 rounded-lg border border-[var(--chrome-border)] text-[var(--chrome-ink)] hover:bg-[var(--chrome-control-hi)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
