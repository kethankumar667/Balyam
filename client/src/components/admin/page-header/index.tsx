import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  className?: string;
}

export default function PageHeader({
  title,
  description,
  badge,
  breadcrumbs,
  actions,
  className = "",
}: PageHeaderProps) {
  return (
    <div
      className={`flex flex-col gap-3 pb-5 mb-6 border-b border-[var(--chrome-border)] ${className}`}
    >
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          aria-label="Breadcrumbs"
          className="flex items-center gap-1.5 text-xs text-[var(--chrome-ink-soft)] font-mono overflow-x-auto pb-0.5 max-w-full"
        >
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <div key={crumb.label} className="flex items-center gap-1.5 shrink-0">
                {idx > 0 && <ChevronRight className="w-3 h-3 text-[var(--chrome-ink-soft)]/50" />}
                {crumb.href && !isLast ? (
                  <Link
                    to={crumb.href}
                    className="hover:text-amber-500 transition-colors font-medium"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    className={
                      isLast
                        ? "text-[var(--chrome-ink)] font-bold"
                        : "font-medium"
                    }
                  >
                    {crumb.label}
                  </span>
                )}
              </div>
            );
          })}
        </nav>
      )}

      {/* Main Title & Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            <h1 className="text-lg sm:text-2xl font-black tracking-tight text-[var(--chrome-ink)] break-words">
              {title}
            </h1>
            {badge && <div className="flex-shrink-0">{badge}</div>}
          </div>
          {description && (
            <p className="text-xs sm:text-sm text-[var(--chrome-ink-soft)] mt-1 break-words leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
