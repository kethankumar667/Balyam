/**
 * One page, one viewport, every layout check — returned as data.
 *
 * `runner.mjs` kept its checks inside a closure over a module-level `findings` array, which is why the
 * game sweep could not reuse them. This is the same set of checks as a pure function: give it a Playwright
 * `page` and a viewport, get back findings. Nothing here reads or writes a file.
 *
 * ── Severity, and why it is decided here ────────────────────────────────────────────────────────────
 * The probes return measurements; this module turns them into verdicts. HIGH means a person on that
 * device loses something they need: a control they cannot reach, content cut off, a page that scrolls
 * sideways. MEDIUM means it is untidy or below the product's own bar but nothing is lost. Nothing is
 * reported as LOW — a finding that is not worth a decision is not a finding.
 *
 * ── Not a certification ─────────────────────────────────────────────────────────────────────────────
 * One engine (Chromium), CSS viewport sizes. No WebKit, no Gecko, no hardware, nothing about iOS
 * address-bar behaviour or Android keyboard insets. The report says so; do not round it up.
 */

import { INTERACTIVE_SELECTOR, measureControls, measureOverflow, measureRendered } from "./probes.mjs";
import { measureClippedContent, measureTextFit, measureVerticalReach } from "./probes-v2.mjs";

/** The product's own thumb bar. WCAG 2.2 AA 2.5.8 asks for 24; this app asks 44 on touch screens. */
export const TOUCH_TARGET_PRODUCT_MIN = 44;
export const TOUCH_TARGET_WCAG_MIN = 24;

/**
 * A truncation is only a defect when the text was cut although there was room to show it. A long
 * player name in a narrow rail is fine; a game title cut to "Point…" with 120px beside it is not.
 */
const WASTED_ROOM_PX = 40;

/**
 * @param {import("playwright").Page} page
 * @param {{ name: string; width: number; height: number; phone?: boolean; tablet?: boolean }} viewport
 * @param {{ skipReachability?: boolean }} [options]
 * @returns {Promise<{ findings: object[]; controls: number }>}
 */
export async function inspectPage(page, viewport, options = {}) {
  const findings = [];
  const add = (kind, severity, message, detail = {}) => findings.push({ kind, severity, message, ...detail });

  let rendered = await page.evaluate(measureRendered);
  if (rendered.elementCount < 5 || rendered.textLength < 3) {
    // A route can sit on skeleton placeholders (no text) for several seconds while its chunk and data load —
    // /games takes ~5s in dev. Give it a real chance before calling it blank.
    await page.waitForTimeout(7000);
    rendered = await page.evaluate(measureRendered);
  }
  if (rendered.elementCount < 5 || rendered.textLength < 3) {
    add(
      "blank-render",
      "CRITICAL",
      `Rendered ${rendered.elementCount} elements and ${rendered.textLength} characters of text. Every other check on this page is meaningless.`,
    );
    return { findings, controls: 0 };
  }

  /* 1 ── sideways overflow ─────────────────────────────────────────────────────────────────────── */
  const overflow = await page.evaluate(measureOverflow);
  if (overflow.overflowPx > 1) {
    add(
      "horizontal-overflow",
      "HIGH",
      `Page scrolls sideways by ${overflow.overflowPx}px (scrollWidth ${overflow.scrollWidth} > viewport ${overflow.viewportWidth}).`,
      { offenders: overflow.offenders },
    );
  }

  /* 2 ── control size, edge clipping ────────────────────────────────────────────────────────────── */
  const controls = await page.evaluate(measureControls, INTERACTIVE_SELECTOR);
  // The 44px bar is a THUMB rule: phones, and small tablets held like phones. A mouse on a 1440px
  // desktop is held to the WCAG floor only.
  const isTouch = Boolean(viewport.phone) || viewport.width < 768;
  const productMin = isTouch ? TOUCH_TARGET_PRODUCT_MIN : 0;
  const belowWcag = controls.filter((c) => c.inViewport && (c.width < TOUCH_TARGET_WCAG_MIN || c.height < TOUCH_TARGET_WCAG_MIN));
  const belowProduct = controls.filter(
    (c) => c.inViewport && (c.width < productMin || c.height < productMin) && !belowWcag.includes(c),
  );
  const slim = (list) => list.slice(0, 8).map((c) => ({ selector: c.selector, label: c.label, size: `${c.width}×${c.height}` }));
  if (belowWcag.length) {
    add("touch-target-below-wcag", "HIGH", `${belowWcag.length} control(s) smaller than 24×24px (WCAG 2.2 AA 2.5.8).`, {
      controls: slim(belowWcag),
    });
  }
  if (belowProduct.length) {
    add(
      "touch-target-below-product-bar",
      "MEDIUM",
      `${belowProduct.length} control(s) under the product's 44×44px thumb bar, above the WCAG floor.`,
      { controls: slim(belowProduct) },
    );
  }
  const clipped = controls.filter((c) => c.clippedHorizontally && !c.behindOverlay);
  if (clipped.length) {
    add("control-clipped-sideways", "HIGH", `${clipped.length} control(s) extend past the left/right viewport edge.`, {
      controls: clipped.slice(0, 8).map((c) => ({ selector: c.selector, label: c.label, left: c.left, right: c.right })),
    });
  }

  /* 3 ── the bottom of the layout is lost (the Rummy defect) ───────────────────────────────────── */
  const lost = await page.evaluate(measureVerticalReach, INTERACTIVE_SELECTOR);
  if (lost.length) {
    add(
      "control-unreachable-vertically",
      "HIGH",
      `${lost.length} control(s) sit past the top/bottom of the ${viewport.height}px viewport with no way to scroll to them.`,
      { controls: lost.slice(0, 10) },
    );
  }

  /* 4 ── content sliced by an overflow:hidden ancestor ─────────────────────────────────────────── */
  const sliced = await page.evaluate(measureClippedContent);
  if (sliced.length) {
    // 35%+ of something hidden reads as broken; a smaller sliver is untidy.
    const severe = sliced.filter((s) => s.hiddenPercent >= 35);
    const minor = sliced.filter((s) => s.hiddenPercent < 35);
    if (severe.length) {
      add("content-clipped", "HIGH", `${severe.length} element(s) are cut off by their container (35%+ hidden).`, {
        elements: severe.slice(0, 10),
      });
    }
    if (minor.length) {
      add("content-clipped-minor", "MEDIUM", `${minor.length} element(s) are slightly cut off by their container.`, {
        elements: minor.slice(0, 10),
      });
    }
  }

  /* 5 ── truncated text, spilling boxes ────────────────────────────────────────────────────────── */
  const fit = await page.evaluate(measureTextFit);
  const wasted = fit.truncated.filter(
    (t) => (t.parentSlack ?? 0) >= WASTED_ROOM_PX || t.viewportRoom >= WASTED_ROOM_PX * 2,
  );
  if (wasted.length) {
    add("text-truncated-with-room", "MEDIUM", `${wasted.length} text run(s) are cut to "…" although there was room to show them.`, {
      elements: wasted.slice(0, 8),
    });
  }
  if (fit.spilling.length) {
    add("text-spills-box", "MEDIUM", `${fit.spilling.length} box(es) have text spilling out of them.`, {
      elements: fit.spilling.slice(0, 8),
    });
  }

  /* 6 ── can a tap actually land? ──────────────────────────────────────────────────────────────── */
  if (!options.skipReachability) {
    const modalOpen = controls.some((c) => c.behindOverlay);
    const candidates = controls.filter((c) => c.inViewport && !c.behindOverlay).slice(0, 40);
    const unreachable = [];
    if (!modalOpen) {
      const handles = await page.$$(INTERACTIVE_SELECTOR);
      for (const handle of handles.slice(0, candidates.length)) {
        try {
          const box = await handle.boundingBox();
          if (!box || box.width === 0 || box.height === 0) continue;
          // `sr-only` keyboard alternatives (1x1, clipped) are not meant to be tapped where they sit.
          if (box.width <= 1 && box.height <= 1) continue;
          if (box.y + box.height < 0 || box.y > viewport.height) continue;
          // An item inside a horizontal scroller (a category chip strip, a carousel) that has been scrolled
          // out of its visible window is reached by swiping, not tapping where it is drawn — the layout
          // engine still places it under the scroller's own box, which read as "covered".
          const inScroller = await handle
            .evaluate((el) => {
              for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
                const s = getComputedStyle(n);
                if (/(auto|scroll)/.test(s.overflowX) && n.scrollWidth > n.clientWidth + 1) return true;
              }
              return false;
            })
            .catch(() => false);
          if (inScroller) continue;
          await handle.click({ trial: true, timeout: 750 });
        } catch (err) {
          // A control merely scrolled away times out on stability; only interception is a layout defect.
          if (!/intercepts pointer events/i.test(String(err))) continue;
          const label = (await handle.getAttribute("aria-label").catch(() => null)) || (await handle.innerText().catch(() => "")) || "";
          // Playwright's message names the element that intercepts the tap: `<div class="…"> … intercepts
          // pointer events`. Keep that part, not the first 200 characters of boilerplate before it.
          const text = String(err).replace(/\u001b\[\d+m/g, "").replace(/\s+/g, " ");
          const by = text.match(/(<[^>]{0,200}>[^<]{0,60}?)\s*(?:<\/[a-z]+>)?\s*(?:from [^ ]+ subtree )?intercepts pointer events/i);
          unreachable.push({ label: label.trim().slice(0, 60), coveredBy: by ? by[1].slice(0, 220) : null, detail: text.slice(-320) });
        }
      }
    }
    if (unreachable.length) {
      add("control-covered", "HIGH", `${unreachable.length} control(s) are covered by another element and cannot receive a tap.`, {
        controls: unreachable.slice(0, 8),
      });
    }
  }

  return { findings, controls: controls.length };
}
