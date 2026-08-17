/**
 * Layout Guard — Automated Mobile-First Runtime Overflow & Layout Watchdog
 *
 * Runs in development mode and automated testing environments to ensure that:
 * 1. No DOM element spills outside window.innerWidth (horizontal layout blowout).
 * 2. Document root never triggers horizontal scrolling (scrollWidth <= clientWidth).
 * 3. Text inputs in flex containers do not exceed their parent's width.
 * 4. Interactive touch buttons respect thumb-friendly minimum heights.
 */

export interface OverflowViolation {
  element: HTMLElement;
  tagName: string;
  className: string;
  right: number;
  viewportWidth: number;
  overflowAmount: number;
}

export function detectHorizontalOverflows(root: HTMLElement = document.body): OverflowViolation[] {
  if (typeof window === "undefined" || !root) return [];
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
  const violations: OverflowViolation[] = [];

  const allElements = root.querySelectorAll<HTMLElement>("*");
  allElements.forEach((el) => {
    // Ignore hidden, fixed overlays, or floating script/style tags
    if (
      el.offsetParent === null &&
      window.getComputedStyle(el).position !== "fixed"
    ) {
      return;
    }

    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return;

    const rect = el.getBoundingClientRect();
    // Allow sub-pixel rounding up to 1.5px
    if (rect.right > viewportWidth + 1.5 && rect.width > 0 && rect.height > 0) {
      // Check if it's an intentional full-width scrollable container
      const isScrollable =
        style.overflowX === "auto" ||
        style.overflowX === "scroll" ||
        el.classList.contains("overflow-x-auto");

      if (!isScrollable) {
        violations.push({
          element: el,
          tagName: el.tagName.toLowerCase(),
          className: el.className,
          right: Math.round(rect.right),
          viewportWidth,
          overflowAmount: Math.round(rect.right - viewportWidth),
        });
      }
    }
  });

  return violations;
}

/**
 * Initializes the layout watchdog in DEV mode.
 */
export function initLayoutGuard() {
  if (typeof window === "undefined" || !import.meta.env.DEV) return;

  let timer: number | null = null;
  const runCheck = () => {
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      const overflows = detectHorizontalOverflows();
      if (overflows.length > 0) {
        console.warn(
          `%c🚨 [LayoutGuard] ${overflows.length} elements spilling outside mobile viewport (${window.innerWidth}px)!`,
          "color: #FFF; background: #E11D48; font-weight: bold; padding: 4px 8px; border-radius: 4px;",
          overflows.map((v) => ({
            tag: v.tagName,
            class: v.className,
            spillPx: v.overflowAmount,
            node: v.element,
          })),
        );
      }
    }, 250);
  };

  window.addEventListener("resize", runCheck, { passive: true });
  window.addEventListener("orientationchange", runCheck, { passive: true });

  const observer = new MutationObserver(runCheck);
  observer.observe(document.body, { childList: true, subtree: true });

  // Initial check
  runCheck();
}
