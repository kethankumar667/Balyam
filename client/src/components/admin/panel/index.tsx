import { useId, type ReactNode } from "react";

interface PanelProps {
  /** The panel's heading. It also names the panel for assistive technology unless `label` is given. */
  title?: string;
  description?: string;
  /** Controls that belong to the whole panel, shown at the right of its header. */
  actions?: ReactNode;
  /** A name for the panel that differs from the visible heading, e.g. "Wallet records" under "Wallet". */
  label?: string;
  /** Pinned under the body, separated by a hairline: paging, totals. */
  footer?: ReactNode;
  /** Marks the panel as updating, for assistive technology. */
  busy?: boolean;
  className?: string;
  /** Replaces the body's default padding, for content that runs edge to edge such as a table. */
  bodyClassName?: string;
  children: ReactNode;
}

/**
 * One flat surface on the admin chrome: a header, a body, an optional footer.
 *
 * Admin pages kept rewriting this shell by hand (`rounded-2xl border … bg-[var(--chrome-panel)]`) in each
 * card. Surfaces step by fill and hairline rather than by nesting cards or stacking shadows, so a panel
 * never contains another panel.
 */
export default function Panel({
  title,
  description,
  actions,
  label,
  footer,
  busy,
  className = "",
  bodyClassName = "px-5 py-4",
  children,
}: PanelProps) {
  const headingId = useId();
  const hasHeader = Boolean(title || actions);

  return (
    <section
      aria-label={label}
      aria-labelledby={label ? undefined : title ? headingId : undefined}
      aria-busy={busy || undefined}
      className={`rounded-2xl border border-[var(--chrome-border)] bg-[var(--chrome-panel)] shadow-2xs ${className}`}
    >
      {hasHeader && (
        <header className="flex items-center justify-between gap-3 border-b border-[var(--chrome-hairline)] px-5 py-3.5">
          <div className="min-w-0">
            {title && (
              <h2 id={headingId} className="text-sm font-semibold text-[var(--chrome-ink)]">
                {title}
              </h2>
            )}
            {description && <p className="mt-0.5 text-xs text-[var(--chrome-ink-soft)]">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
      {footer && <footer className="border-t border-[var(--chrome-hairline)] px-5 py-3">{footer}</footer>}
    </section>
  );
}
