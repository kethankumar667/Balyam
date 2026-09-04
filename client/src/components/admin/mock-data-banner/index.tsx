import { FlaskConical } from "lucide-react";

/**
 * ADMIN-DATA-001 remediation.
 *
 * Every admin route except Dashboard renders exclusively from constants
 * declared in the page file — no network call backs any of it, and every
 * action on these pages (ban a user, terminate a match, toggle a flag,
 * export a CSV, save settings) only mutates local React state. Nothing
 * about the UI previously said so; buttons read "Ban Account" and toasts
 * read "…propagated to worker cluster" exactly as they would if the write
 * were real.
 *
 * This banner is the one place that disclosure lives. It is rendered once
 * per page, immediately under `PageHeader`, so it is the first thing an
 * admin sees — not a tooltip, not a footnote, not documentation.
 *
 * `kind="mock"` — the page is entirely local/demonstration data.
 * `kind="mixed"` — Dashboard only: `systemStatus` is a real `GET /health`
 * result, everything else on the page (charts, tables, activity feed) is
 * demonstration data layered around it.
 */

export type MockDataBannerKind = "mock" | "mixed";

interface MockDataBannerProps {
  kind?: MockDataBannerKind;
  className?: string;
}

const COPY: Record<MockDataBannerKind, { label: string; body: string }> = {
  mock: {
    label: "Design Preview — Mock Data",
    body:
      "This page runs entirely on local demonstration data. Every control here — search, filters, and every action in its detail view — affects only your current browser tab. Nothing is saved, exported, broadcast, or sent to a server, and no production or player data is changed.",
  },
  mixed: {
    label: "Partially Live — Mixed Data",
    body:
      "The system-status indicator above is live, from a real server health check. Every other number on this page — charts, the live-match table, the activity feed, and the quick-action buttons — is local demonstration data and does not reflect real players or matches.",
  },
};

export default function MockDataBanner({
  kind = "mock",
  className = "",
}: MockDataBannerProps) {
  const copy = COPY[kind];

  return (
    <div
      className={`mb-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 ${className}`}
    >
      <FlaskConical
        className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500"
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
          {copy.label}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
          {copy.body}
        </p>
      </div>
    </div>
  );
}
