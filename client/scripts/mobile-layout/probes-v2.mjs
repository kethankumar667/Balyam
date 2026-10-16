/**
 * Layout probes, second generation — what `probes.mjs` could not see.
 *
 * `probes.mjs` measures the page SIDEWAYS: horizontal overflow and controls past the left or right edge.
 * That missed the defect class that actually broke Rummy on a phone held in landscape — a table taller
 * than the screen. Nothing scrolls (a game table is an app shell with `overflow: hidden`), so the hand
 * was cut off at the bottom and the action row was not on the screen at all. No control was "past the
 * edge" in the sense the old probe tested, and every other check passed.
 *
 * Everything here runs inside Chromium via `page.evaluate`, against the real layout engine, and returns
 * raw measurements. Severity is decided in `inspect.mjs`. Each function is self-contained because it is
 * serialised into the page — no imports, no shared helpers.
 */

/**
 * Controls that cannot be reached because they sit past the top or bottom of the viewport with no way
 * to scroll to them.
 *
 * "Below the fold" is normal on a scrolling page and is not reported. It is a defect only when there is
 * no scroll path: the document is not scrollable AND no scrollable ancestor contains the control. That
 * is the app-shell case — a game table, a full-height modal — where the bottom of the layout is simply
 * lost.
 */
export function measureVerticalReach(selector) {
  const H = window.innerHeight;
  const out = [];
  /** The topmost full-screen fixed layer, if one is up — what a player actually sees. */
  const overlay = (() => {
    let best = null;
    let bestZ = 0;
    for (const n of Array.from(document.querySelectorAll("body *"))) {
      const s = getComputedStyle(n);
      if (s.position !== "fixed" || s.display === "none" || s.visibility === "hidden" || s.pointerEvents === "none") continue;
      const r = n.getBoundingClientRect();
      if (r.width < window.innerWidth * 0.9 || r.height < H * 0.9) continue;
      const z = Number(s.zIndex) || 0;
      if (z >= bestZ) {
        bestZ = z;
        best = n;
      }
    }
    return bestZ >= 10 ? best : null;
  })();
  const docEl = document.documentElement;
  const rootStyle = getComputedStyle(docEl);
  const bodyStyle = getComputedStyle(document.body);
  const docScrolls =
    docEl.scrollHeight > H + 1 && !/hidden|clip/.test(rootStyle.overflowY) && !/hidden|clip/.test(bodyStyle.overflowY);

  for (const el of Array.from(document.querySelectorAll(selector))) {
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;
    if (el.getAttribute("aria-hidden") === "true") continue;
    // Under an open modal / rotate prompt the player cannot see or touch it, so its layout is moot.
    if (overlay && !overlay.contains(el)) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    // Report only when a real share of the control is outside the viewport.
    const hiddenPx = Math.max(0, rect.bottom - H) + Math.max(0, -rect.top);
    if (hiddenPx < Math.min(rect.height * 0.25, 12)) continue;

    let fixed = false;
    let scrollPath = false;
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const s = getComputedStyle(n);
      // Checked BEFORE the fixed test: a fixed overlay that scrolls (the shared Modal backdrop) is a
      // scroller, and its content is reachable. Treating "fixed" as "nothing can scroll" reported every
      // tall dialog as unreachable even after it was made scrollable.
      if (n !== el && /(auto|scroll)/.test(s.overflowY) && n.scrollHeight > n.clientHeight + 1) {
        const r = n.getBoundingClientRect();
        // The scroller itself must be on screen for scrolling it to help.
        if (r.top < H && r.bottom > 0) {
          scrollPath = true;
          break;
        }
      }
      if (s.position === "fixed") {
        fixed = true;
        break;
      }
    }
    if (!fixed && !scrollPath && docScrolls) {
      // Page scroll reaches it unless an overflow:hidden ancestor cuts it off first.
      let cut = false;
      for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
        const s = getComputedStyle(n);
        if (/hidden|clip/.test(s.overflowY)) {
          const r = n.getBoundingClientRect();
          if (rect.bottom > r.bottom + 1 || rect.top < r.top - 1) {
            cut = true;
            break;
          }
        }
      }
      scrollPath = !cut;
    }
    if (scrollPath) continue;

    out.push({
      selector: describeNode(el),
      label: (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 50),
      top: Math.round(rect.top),
      bottom: Math.round(rect.bottom),
      viewportHeight: H,
      hiddenPx: Math.round(hiddenPx),
    });
    if (out.length >= 25) break;
  }
  return out;

  function describeNode(n) {
    const id = n.id ? `#${n.id}` : "";
    const cls =
      typeof n.className === "string" && n.className ? `.${n.className.trim().split(/\s+/).slice(0, 3).join(".")}` : "";
    return `${n.tagName.toLowerCase()}${id}${cls}`.slice(0, 140);
  }
}

/**
 * Visible content cut by an `overflow: hidden|clip` ancestor — the hand cards sliced at the bottom, a
 * label chopped by its own pill, a button half under a rail.
 *
 * Reports PARTIAL clipping only (about 12%–92% of the element hidden). Fully hidden elements are closed
 * drawers, off-screen carousel slides and collapsed panels — intentional, and reporting them would drown
 * everything real. Axes a scroller can reach are ignored (that is a scroller doing its job), and
 * decorative layers (`aria-hidden`, `pointer-events: none`) are skipped.
 */
export function measureClippedContent() {
  const out = [];
  const seen = new Set();
  /** The topmost full-screen fixed layer, if one is up — what a player actually sees. */
  const overlay = (() => {
    let best = null;
    let bestZ = 0;
    for (const n of Array.from(document.querySelectorAll("body *"))) {
      const s = getComputedStyle(n);
      if (s.position !== "fixed" || s.display === "none" || s.visibility === "hidden" || s.pointerEvents === "none") continue;
      const r = n.getBoundingClientRect();
      if (r.width < window.innerWidth * 0.9 || r.height < window.innerHeight * 0.9) continue;
      const z = Number(s.zIndex) || 0;
      if (z >= bestZ) {
        bestZ = z;
        best = n;
      }
    }
    return bestZ >= 10 ? best : null;
  })();
  const all = Array.from(document.querySelectorAll("body *"));
  const hasOwnText = (el) =>
    Array.from(el.childNodes).some((c) => c.nodeType === 3 && c.textContent.trim().length > 0);
  const isControl = (el) =>
    el.matches("a[href],button,input,select,textarea,[role=button],[role=tab],[role=link],img,svg:not([aria-hidden=true])");

  for (const el of all) {
    if (out.length >= 30) break;
    if (!(hasOwnText(el) || isControl(el))) continue;
    if (el.closest("[aria-hidden=true]")) continue;
    if (overlay && !overlay.contains(el)) continue;
    const style = getComputedStyle(el);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.opacity === "0" ||
      style.pointerEvents === "none" ||
      style.position === "fixed"
    )
      continue;
    // A cover/contain image inside a rounded or fixed frame is cropped on purpose (an avatar in a circle).
    if (el.tagName === "IMG" && /cover|contain|scale-down/.test(style.objectFit)) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) continue;

    const vis = { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
    let clipper = null;
    // Once a scroller owns an axis, everything past it on that axis is reachable by scrolling — and an
    // `overflow: hidden` ancestor further out is clipping the SCROLLER's box, not this element. Without
    // this the cards of a horizontally scrolling hand were reported as cut off by the frame around it.
    let scrollOwnedX = false;
    let scrollOwnedY = false;
    for (let n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
      const s = getComputedStyle(n);
      const autoX = /(auto|scroll)/.test(s.overflowX);
      const autoY = /(auto|scroll)/.test(s.overflowY);
      if (autoX && n.scrollWidth > n.clientWidth + 1) scrollOwnedX = true;
      if (autoY && n.scrollHeight > n.clientHeight + 1) scrollOwnedY = true;
      // An auto scroller that does NOT overflow still clips like `hidden`; it just has nothing to scroll.
      const clipsX = (/hidden|clip/.test(s.overflowX) || autoX) && !scrollOwnedX;
      const clipsY = (/hidden|clip/.test(s.overflowY) || autoY) && !scrollOwnedY;
      if (!clipsX && !clipsY) continue;
      const r = n.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      // Absolutely positioned content is only clipped by an ancestor in its containing-block chain.
      if (style.position === "absolute" && s.position === "static") continue;
      const before = `${vis.left},${vis.right},${vis.top},${vis.bottom}`;
      if (clipsX) {
        vis.left = Math.max(vis.left, r.left);
        vis.right = Math.min(vis.right, r.right);
      }
      if (clipsY) {
        vis.top = Math.max(vis.top, r.top);
        vis.bottom = Math.min(vis.bottom, r.bottom);
      }
      if (before !== `${vis.left},${vis.right},${vis.top},${vis.bottom}`) clipper = clipper || n;
    }
    const visW = Math.max(0, vis.right - vis.left);
    const visH = Math.max(0, vis.bottom - vis.top);
    const fraction = 1 - (visW * visH) / (rect.width * rect.height);
    if (fraction < 0.12 || fraction > 0.92) continue;
    // Antialiasing slivers (a border cut by 2px) are not what a person sees as "cut off".
    const hiddenW = rect.width - visW;
    const hiddenH = rect.height - visH;
    if (hiddenW < 4 && hiddenH < 4) continue;

    const key = `${describeNode(el)}@${Math.round(rect.left)},${Math.round(rect.top)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      selector: describeNode(el),
      text: (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40),
      hiddenPercent: Math.round(fraction * 100),
      hiddenPx: { x: Math.round(hiddenW), y: Math.round(hiddenH) },
      clippedBy: clipper ? describeNode(clipper) : null,
      rect: {
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
    });
  }
  return out;

  function describeNode(n) {
    const id = n.id ? `#${n.id}` : "";
    const cls =
      typeof n.className === "string" && n.className ? `.${n.className.trim().split(/\s+/).slice(0, 3).join(".")}` : "";
    return `${n.tagName.toLowerCase()}${id}${cls}`.slice(0, 140);
  }
}

/**
 * Text chopped to an ellipsis or line clamp, and boxes whose content spills out of them.
 *
 * Truncating a long player name is fine. Truncating a game title when there is plenty of room — "Point…"
 * on an 800px-wide screen — is a layout bug, so each truncation reports its slack: how much wider the
 * parent is than the truncated text's own box. The caller separates "no room" from "wasted room".
 */
export function measureTextFit() {
  const truncated = [];
  const spilling = [];
  for (const el of Array.from(document.querySelectorAll("body *"))) {
    if (truncated.length >= 40 && spilling.length >= 40) break;
    if (el.closest("[aria-hidden=true]")) continue;
    const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden" || s.opacity === "0") continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) continue;
    if (rect.bottom < 0 || rect.top > window.innerHeight * 3) continue;
    const text = (el.textContent || "").trim().replace(/\s+/g, " ");
    if (!text) continue;

    const ellipsis = s.textOverflow === "ellipsis" && s.overflowX !== "visible";
    const clamp = (s.webkitLineClamp && s.webkitLineClamp !== "none") || /-webkit-box/.test(s.display);
    if ((ellipsis && el.scrollWidth > el.clientWidth + 1) || (clamp && el.scrollHeight > el.clientHeight + 1)) {
      const parent = el.parentElement ? el.parentElement.getBoundingClientRect() : null;
      truncated.push({
        selector: describeNode(el),
        text: text.slice(0, 50),
        box: Math.round(el.clientWidth),
        needs: Math.round(el.scrollWidth),
        parentSlack: parent ? Math.round(parent.width - rect.width) : null,
        viewportRoom: Math.round(window.innerWidth - rect.right),
      });
      continue;
    }
    // Content spilling out of a visibly boxed element that does not clip it: looks broken, not cut.
    const boxed =
      s.borderTopWidth !== "0px" || (s.backgroundColor !== "rgba(0, 0, 0, 0)" && s.backgroundColor !== "transparent");
    if (boxed && s.overflowX === "visible" && el.scrollWidth > el.clientWidth + 3 && el.clientWidth > 0 && el.children.length === 0) {
      spilling.push({ selector: describeNode(el), text: text.slice(0, 50), box: Math.round(el.clientWidth), needs: Math.round(el.scrollWidth) });
    }
  }
  return { truncated, spilling };

  function describeNode(n) {
    const id = n.id ? `#${n.id}` : "";
    const cls =
      typeof n.className === "string" && n.className ? `.${n.className.trim().split(/\s+/).slice(0, 3).join(".")}` : "";
    return `${n.tagName.toLowerCase()}${id}${cls}`.slice(0, 140);
  }
}
