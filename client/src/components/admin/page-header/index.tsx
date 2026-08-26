import { type ReactNode, useEffect, useRef } from "react";
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
  // ADMIN Phase 2 §4: after a sidebar navigation, focus lands on the new
  // page's own heading rather than staying on the old sidebar link, or
  // (worse, for a keyboard/screen-reader user) staying nowhere meaningful
  // and requiring them to Tab all the way from the top again.
  //
  // A plain mount effect is correct here, not a pathname-watching one:
  // each /admin/* route is its own top-level <Route element>, so
  // navigating between admin pages unmounts the old page (and its
  // PageHeader) and mounts a brand new one — there's no persistent layout
  // route this component survives across. Every mount of THIS component
  // already IS a navigation event.
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

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
                    aria-current={isLast ? "page" : undefined}
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
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="text-lg sm:text-2xl font-black tracking-tight text-[var(--chrome-ink)] break-words rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:focus-visible:ring-amber-400"
            >
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
