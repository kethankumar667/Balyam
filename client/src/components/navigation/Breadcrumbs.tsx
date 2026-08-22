import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { resolveBreadcrumbs, type BreadcrumbItem } from "./breadcrumbsConfig";

export interface BreadcrumbsProps {
  /** Explicit custom items list (overrides auto route detection if provided) */
  crumbs?: BreadcrumbItem[];
  /** Optional custom tail item or override label for active route */
  customTail?: string;
  /** Optional extra class names on the outer nav wrapper */
  className?: string;
  /** Optional container max-width / padding class names */
  containerClassName?: string;
  /** Hide home item */
  hideHome?: boolean;
}

/**
 * Flipkart-style Breadcrumb Navigation component.
 *
 * Implements accessible, clean horizontal hierarchy trail:
 * `Home > Category > Subcategory > Active Page`
 *
 * - Clean chevron separators
 * - Interactive ancestor links with subtle hover effects
 * - Non-clickable active item with `aria-current="page"`
 * - Smooth horizontal scrolling on mobile touch screens
 * - Full Dark & Light theme integration using Bhalyam design tokens
 */
export default function Breadcrumbs({
  crumbs: customCrumbs,
  customTail,
  className = "",
  containerClassName = "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
  hideHome = false,
}: BreadcrumbsProps) {
  const { pathname, search } = useLocation();

  // Resolve crumbs from props or automatically from current route
  let items: BreadcrumbItem[] = customCrumbs ?? resolveBreadcrumbs(pathname, search);

  if (hideHome && items.length > 0 && items[0].label === "Home") {
    items = items.slice(1);
  }

  // If a custom tail is provided, override the last item's label
  if (customTail && items.length > 0) {
    items = [
      ...items.slice(0, -1),
      { ...items[items.length - 1], label: customTail },
    ];
  }

  // If there are no crumbs (e.g. root home page), don't render
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={`w-full py-2 sm:py-2.5 border-b border-[var(--chrome-hairline)] bg-[var(--chrome-panel)]/40 backdrop-blur-xs transition-colors select-none ${className}`}
    >
      <div className={containerClassName}>
        <ol
          role="list"
          className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar whitespace-nowrap text-xs text-[var(--chrome-ink-soft)] font-medium leading-none"
        >
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            const isFirst = index === 0;

            return (
              <li
                key={`${item.label}-${index}`}
                role="listitem"
                className="inline-flex items-center gap-1 sm:gap-1.5 flex-shrink-0"
              >
                {/* Separator before non-first items */}
                {!isFirst && (
                  <ChevronRight
                    aria-hidden="true"
                    className="w-3 h-3 flex-shrink-0 text-[var(--chrome-ink-soft)] opacity-40"
                  />
                )}

                {/* Crumb link or active text */}
                {!isLast && item.path ? (
                  <Link
                    to={item.path}
                    className="inline-flex items-center min-h-[32px] sm:min-h-[28px] py-1 text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-accent)] hover:underline underline-offset-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--chrome-accent)] rounded"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    aria-current={isLast ? "page" : undefined}
                    className="inline-flex items-center min-h-[32px] sm:min-h-[28px] py-1 font-semibold text-[var(--chrome-ink)] max-w-[240px] sm:max-w-md truncate"
                    title={item.label}
                  >
                    {item.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
export { resolveBreadcrumbs, type BreadcrumbItem };
