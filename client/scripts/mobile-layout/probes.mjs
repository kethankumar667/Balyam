/**
 * What we actually measure, in the page, with the real layout engine.
 *
 * ── Why this file is a string of browser code ─────────────────────────
 * Every function here runs inside Chromium via `page.evaluate`, against a real
 * render of a real page. That is the entire point of replacing
 * `mobileCertification.test.ts`, which measured nothing: its "device matrix"
 * asserted that the literal `44` in its own table was `>= 44`, and that
 * `320 / 568` was between 0.35 and 2.2. Arithmetic on constants cannot fail
 * for a product reason, so it never did.
 *
 * `getBoundingClientRect` and `getComputedStyle` here are answers from the
 * engine that will lay the page out on somebody's phone. They can fail, and
 * when they do it is because something is genuinely wrong.
 *
 * ── On jsdom ──────────────────────────────────────────────────────────
 * jsdom was the obvious cheap option and it is the wrong one: it implements
 * the DOM but not layout, so every `getBoundingClientRect()` returns zeros and
 * every touch-target check would pass or fail for reasons unrelated to CSS.
 * A measurement harness that cannot measure is the same failure as the file
 * being replaced, one level deeper. Playwright was already a devDependency.
 */

/**
 * Anything a person is expected to be able to hit.
 *
 * `[role=...]` matters as much as the tag: a `<div role="button">` is a
 * control to a screen reader and to a thumb, and checking only real `<button>`
 * elements would quietly exempt most of a modern UI.
 */
export const INTERACTIVE_SELECTOR = [
  "a[href]",
  "button",
  "input:not([type=hidden])",
  "select",
  "textarea",
  "summary",
  "[role=button]",
  "[role=link]",
  "[role=tab]",
  "[role=switch]",
  "[role=checkbox]",
  "[role=radio]",
  "[role=menuitem]",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * The page's own horizontal overflow.
 *
 * A phone that scrolls sideways is the single most reported mobile defect and
 * the easiest to ship: one `min-width`, one un-wrapped flex row, one absolutely
 * positioned decoration a few pixels past the edge.
 *
 * 1px of tolerance because sub-pixel rounding at a fractional device pixel
 * ratio produces 0.5px differences that no human can see and no fix can
 * remove.
 */
export function measureOverflow() {
  const doc = document.documentElement;
  const width = window.innerWidth;
  const scrollWidth = Math.max(doc.scrollWidth, document.body?.scrollWidth ?? 0);
  const offenders = [];

  if (scrollWidth > width + 1) {
    for (const el of Array.from(document.querySelectorAll("body *"))) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none") continue;
      // Only elements that themselves stick out. A parent is wide BECAUSE of
      // its child, and reporting both buries the one worth fixing.
      if (rect.right > width + 1 || rect.left < -1) {
        const childOffends = Array.from(el.children).some((c) => {
          const r = c.getBoundingClientRect();
          return r.right > width + 1 || r.left < -1;
        });
        if (childOffends) continue;
        offenders.push({
          selector: describe(el),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        });
      }
      if (offenders.length >= 12) break;
    }
  }

  return { viewportWidth: width, scrollWidth, overflowPx: Math.max(0, scrollWidth - width), offenders };

  function describe(el) {
    const id = el.id ? `#${el.id}` : "";
    const cls =
      typeof el.className === "string" && el.className
        ? `.${el.className.trim().split(/\s+/).slice(0, 3).join(".")}`
        : "";
    return `${el.tagName.toLowerCase()}${id}${cls}`.slice(0, 140);
  }
}

/**
 * Every visible control, measured.
 *
 * Returns raw measurements rather than verdicts, so the thresholds live in one
 * place in the runner and can be reported against more than one standard —
 * WCAG 2.2 AA asks for 24×24 CSS px, the product bar here is 44×44, and
 * conflating them makes it impossible to say which one a finding breaches.
 *
 * ── Two things this deliberately does ─────────────────────────────────
 * • Uses the ELEMENT's rect, not the icon inside it: padding counts, which is
 *   how most small-looking buttons are legitimately large enough.
 * • Reports whether the control sits inside a horizontal scroller, so the
 *   runner can tell "off the edge of a carousel" from "clipped by the page".
 *
 * Reachability is deliberately NOT decided here. `document.elementFromPoint`
 * looked like the answer and is not: it reports a sibling backdrop layer as
 * covering a header button that a person can tap perfectly well, and it
 * produced fourteen false findings on the home page alone. The runner asks
 * Playwright's own actionability check instead — the same logic it uses to
 * decide whether a real click can land.
 */
export function measureControls(selector) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const out = [];

  /*
   * An open modal changes what "unreachable" means.
   *
   * When a full-screen overlay is up, everything behind it is CORRECTLY
   * non-interactive — that is what a modal is for. Measuring the page behind
   * it produced six "cannot receive a tap" findings on the home page, every
   * one of them the onboarding dialog doing its job.
   *
   * So when an overlay is present, only the controls inside it are candidates.
   * The page behind is still measured for size and overflow, because a layout
   * defect under a modal is still a layout defect.
   */
  const overlay = findOverlay();

  for (const el of Array.from(document.querySelectorAll(selector))) {
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;
    if (el.hasAttribute("disabled") || el.getAttribute("aria-hidden") === "true") continue;

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    // Off-screen by design: closed drawers, collapsed menus, the panel for a
    // tab that is not selected. Reporting these would drown the real findings.
    if (rect.bottom < 0 || rect.top > height * 3) continue;

    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const inViewport = cx >= 0 && cx <= width && cy >= 0 && cy <= height;

    /*
     * A control past the edge INSIDE a horizontal scroller is not clipped —
     * it is the rest of a carousel, and the user reaches it by swiping. The
     * first version of this check reported the whole game-category tab strip
     * as five broken controls, which is exactly the kind of noise that gets a
     * layout suite switched off. "Off-screen" and "unreachable" are different
     * claims and only the second one is a defect.
     */
    let scrollableAncestor = false;
    for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
      const s = getComputedStyle(node);
      const scrolls = /(auto|scroll)/.test(s.overflowX);
      if (scrolls && node.scrollWidth > node.clientWidth + 1) {
        scrollableAncestor = true;
        break;
      }
    }

    /*
     * A checkbox is as big as whatever activates it.
     *
     * A native `<input type=checkbox>` is 16x16 by browser default and cannot
     * be made larger without breaking its rendering — but clicking its
     * associated `<label>` toggles it, so the real target is the label. The
     * detector reported eleven violations for one correctly-built remember-me
     * control whose label is 44px tall.
     *
     * WCAG 2.5.8 sizes the TARGET, not the widget, so the union of the two is
     * the honest measurement.
     */
    let effective = rect;
    if (el.tagName === "INPUT" && /^(checkbox|radio)$/i.test(el.getAttribute("type") ?? "")) {
      const label =
        (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) ||
        el.closest("label");
      if (label) {
        const lr = label.getBoundingClientRect();
        effective = {
          width: Math.max(rect.width, lr.width),
          height: Math.max(rect.height, lr.height),
          left: Math.min(rect.left, lr.left),
          right: Math.max(rect.right, lr.right),
        };
      }
    }

    out.push({
      selector: describeEl(el),
      label: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 60),
      width: Math.round(effective.width * 10) / 10,
      height: Math.round(effective.height * 10) / 10,
      left: Math.round(effective.left),
      right: Math.round(effective.right),
      scrollableAncestor,
      clippedHorizontally: !scrollableAncestor && (rect.left < -1 || rect.right > width + 1),
      inViewport,
      // Behind an open modal: still measured, but not expected to be tappable.
      behindOverlay: Boolean(overlay) && !overlay.contains(el),
    });
  }

  return out;

  /** The topmost full-screen fixed layer, if one is up. */
  function findOverlay() {
    let best = null;
    let bestZ = 0;
    for (const el of Array.from(document.querySelectorAll("body *"))) {
      const s = getComputedStyle(el);
      if (s.position !== "fixed" || s.display === "none" || s.visibility === "hidden") continue;
      const r = el.getBoundingClientRect();
      if (r.width < width * 0.9 || r.height < height * 0.9) continue;
      if (s.pointerEvents === "none") continue;
      const z = Number(s.zIndex) || 0;
      if (z >= bestZ) {
        bestZ = z;
        best = el;
      }
    }
    return bestZ >= 10 ? best : null;
  }

  function describeEl(el) {
    const id = el.id ? `#${el.id}` : "";
    const cls =
      typeof el.className === "string" && el.className
        ? `.${el.className.trim().split(/\s+/).slice(0, 3).join(".")}`
        : "";
    return `${el.tagName.toLowerCase()}${id}${cls}`.slice(0, 140);
  }
}

/**
 * Did the page render anything at all?
 *
 * A route that throws during render leaves an empty root, and every other
 * check then passes triumphantly against nothing. This is the guard that stops
 * "no violations" meaning "no page".
 */
export function measureRendered() {
  const root = document.getElementById("root") || document.body;
  const text = (root.innerText || "").trim();
  return {
    elementCount: root.querySelectorAll("*").length,
    textLength: text.length,
    firstText: text.slice(0, 120),
  };
}
