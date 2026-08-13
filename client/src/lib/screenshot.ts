/**
 * Robust DOM & Canvas Screenshot Capture Engine with Native Web Share fallback.
 * Works seamlessly on real iOS Safari and Android Chrome devices.
 */

export interface CaptureOptions {
  fileName?: string;
  targetId?: string;
}

/**
 * Captures the game screen DOM / Canvas area and either launches the native OS
 * Mobile Share sheet (with the image file attached) or triggers a direct download.
 */
export async function captureAndShareScreenshot(options: CaptureOptions = {}): Promise<{ success: boolean; shared: boolean; message: string }> {
  const { fileName = `bhalyam-game-${Date.now()}.png`, targetId } = options;

  // Find target container (or fallback to body / root)
  const targetEl =
    (targetId ? document.getElementById(targetId) : null) ||
    document.querySelector(".bhalyam-stadium-mat") ||
    document.querySelector(".bhalyam-game-container") ||
    document.getElementById("root") ||
    document.body;

  if (!targetEl) {
    return { success: false, shared: false, message: "Target game container not found" };
  }

  try {
    const blob = await renderElementToBlob(targetEl as HTMLElement);
    if (!blob) {
      return { success: false, shared: false, message: "Failed to generate screenshot blob" };
    }

    const file = new File([blob], fileName, { type: "image/png" });

    // Attempt Native Mobile File Web Share (Android Chrome / iOS Safari)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: "BHALYAM Game Screenshot",
          text: "🎮 Check out my match on BHALYAM!",
          files: [file],
        });
        return { success: true, shared: true, message: "Screenshot shared successfully!" };
      } catch (err: unknown) {
        // User aborted share sheet or cancelled — non-fatal
        if ((err as Error)?.name === "AbortError") {
          return { success: true, shared: false, message: "Share cancelled" };
        }
      }
    }

    // Fallback: Direct Download or Clipboard Blob
    downloadBlob(blob, fileName);
    return { success: true, shared: false, message: "Screenshot downloaded to your device!" };
  } catch (err) {
    console.error("[Screenshot Engine Error]", err);
    return { success: false, shared: false, message: "Screenshot capture failed" };
  }
}

/**
 * Renders an HTML HTMLElement to a high-DPI PNG Blob.
 */
async function renderElementToBlob(element: HTMLElement): Promise<Blob | null> {
  const rect = element.getBoundingClientRect();
  const width = Math.max(320, Math.floor(rect.width));
  const height = Math.max(320, Math.floor(rect.height));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.scale(dpr, dpr);

  // Fill background
  ctx.fillStyle = "#1e1b18";
  ctx.fillRect(0, 0, width, height);

  // Clone canvas elements if any (e.g. Snake, Space War)
  const childCanvases = element.querySelectorAll("canvas");
  childCanvases.forEach((c) => {
    try {
      const cRect = c.getBoundingClientRect();
      const x = cRect.left - rect.left;
      const y = cRect.top - rect.top;
      ctx.drawImage(c, x, y, cRect.width, cRect.height);
    } catch {
      /* ignore tainted canvas */
    }
  });

  // Serialize DOM to SVG foreignObject
  const serializedSvg = await domToSvgString(element, width, height);
  const svgBlob = new Blob([serializedSvg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  return new Promise<Blob | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => resolve(b), "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      // Fallback canvas to Blob
      canvas.toBlob((b) => resolve(b), "image/png");
    };
    img.src = url;
  });
}

/**
 * Serializes DOM nodes into an SVG string embedded in a foreignObject.
 */
async function domToSvgString(element: HTMLElement, width: number, height: number): Promise<string> {
  // Clone node to avoid mutating real DOM
  const clone = element.cloneNode(true) as HTMLElement;

  // Inline computed styles for essential presentation
  const allReal = element.querySelectorAll("*");
  const allClones = clone.querySelectorAll("*");

  allReal.forEach((realNode, i) => {
    const cloneNode = allClones[i] as HTMLElement;
    if (!cloneNode || !(realNode instanceof HTMLElement)) return;
    const computed = window.getComputedStyle(realNode);
    cloneNode.style.cssText = `
      background: ${computed.background};
      color: ${computed.color};
      font-family: ${computed.fontFamily};
      font-size: ${computed.fontSize};
      font-weight: ${computed.fontWeight};
      border: ${computed.border};
      border-radius: ${computed.borderRadius};
      box-shadow: ${computed.boxShadow};
      opacity: ${computed.opacity};
      transform: ${computed.transform};
    `;
  });

  const htmlString = new XMLSerializer().serializeToString(clone);

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Righteous&family=Poppins:wght@400;600;800&display=swap');
        * { box-sizing: border-box; }
      </style>
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;">
          ${htmlString}
        </div>
      </foreignObject>
    </svg>
  `;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
