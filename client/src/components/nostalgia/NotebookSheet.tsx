import type { ReactNode } from "react";

/**
 * Shared "ruled notebook page" surface — paper-grain background + ruled
 * horizontal lines + the Caveat handwriting voice. One primitive, one
 * `layout` switch for density, so every consumer (end-of-round score
 * sheet, room history card, declaration moment) draws from the same
 * sheet instead of re-styling a div per feature.
 *
 * Paper texture comes from the `.nostalgia-paper` CSS class
 * (client/src/index.css) so it shares the exact speckle-dot recipe and
 * dark-mode handling already proven by `.bhalyam-paper`. Ruled lines are
 * a separate absolutely-positioned overlay (not baked into the same
 * `background-image` stack) so the two effects compose without one
 * clobbering the other's `background-image` value.
 *
 * See docs/rummy/nostalgia-brief.md — "Ritual" + "Memory" pillars.
 */
export default function NotebookSheet({
  layout = "mobile",
  lined = true,
  className = "",
  children,
}: {
  /** Density of padding/line-spacing/type-size. Two layouts, one component. */
  layout?: "mobile" | "desktop";
  /** Ruled horizontal lines. Default on; turn off for compact callouts. */
  lined?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const lineStep = layout === "desktop" ? 40 : 32;
  const pad = layout === "desktop" ? "p-6" : "p-4";
  const type = layout === "desktop" ? "text-lg" : "text-base";

  return (
    <div
      className={`nostalgia-paper relative overflow-hidden rounded-lg border border-nostalgia-paper-edge/60 shadow-lift-2 ${pad} ${className}`}
    >
      {lined && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${lineStep - 1}px, rgba(46,36,25,0.16) ${lineStep - 1}px, rgba(46,36,25,0.16) ${lineStep}px)`,
            backgroundPositionY: layout === "desktop" ? "14px" : "10px",
          }}
        />
      )}
      <div className={`relative font-script text-nostalgia-pen ${type}`}>{children}</div>
    </div>
  );
}
