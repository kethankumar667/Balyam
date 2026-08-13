import { useState } from "react";
import { svgToPngBlob } from "../lib/svgExport";

export interface BoardPreviewPillProps {
  onClosePreview: () => void;
  /** Optional SVG element ref to capture as PNG download */
  svgRef?: React.RefObject<SVGSVGElement>;
  /** Optional DOM element ID containing an SVG to capture */
  targetElementId?: string;
}

/**
 * Floating control pill rendered in the top-right corner over the finished
 * game board when Board Preview mode is active. Gives players an explicit "✕"
 * close button to return to the recap modal, plus a "📸 Screenshot" button to
 * save a high-res image of the board.
 */
export default function BoardPreviewPill({
  onClosePreview,
  svgRef,
  targetElementId,
}: BoardPreviewPillProps) {
  const [capturing, setCapturing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState(false);

  async function takeScreenshot() {
    setCapturing(true);
    try {
      let targetSvg: SVGSVGElement | null = svgRef?.current ?? null;
      if (!targetSvg && targetElementId) {
        const container = document.getElementById(targetElementId);
        if (container) {
          targetSvg = container.querySelector("svg");
        }
      }

      let blob: Blob | null = null;

      if (targetSvg) {
        // SVG boards (Ludo, Carrom, Chess) rasterise from the vector, which
        // is sharper than screen-scraping the DOM.
        blob = await svgToPngBlob(targetSvg, window.devicePixelRatio || 2);
      } else if (targetElementId) {
        /**
         * HTML boards (Rummy, UNO, the Hand Cricket scorecard) have no SVG to
         * rasterise, so this branch used to call `window.print()` — which on
         * a phone opens a print dialog or does nothing at all. That is what
         * players reported as the screenshot button being broken: it was
         * never capable of capturing a non-SVG board.
         */
        const node = document.getElementById(targetElementId);
        if (node) {
          const { toBlob } = await import("html-to-image");
          blob = await toBlob(node, {
            pixelRatio: window.devicePixelRatio || 2,
            // The board sits on the page background; without this the PNG
            // has a transparent ground and looks broken in most viewers.
            backgroundColor: "#1a2236",
            // Skip anything explicitly marked as chrome — this pill itself
            // is fixed-position over the board and would otherwise appear in
            // every screenshot.
            filter: (el) =>
              !(el instanceof HTMLElement && el.dataset.screenshotHide === "true"),
          });
        }
      }

      if (blob) {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `bhalyam-board-${Date.now()}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        setFailed(true);
        setTimeout(() => setFailed(false), 2500);
      }
    } catch {
      // Say so rather than leaving the button looking like it worked. A
      // silent failure here is exactly how this shipped broken for months.
      setFailed(true);
      setTimeout(() => setFailed(false), 2500);
    } finally {
      setCapturing(false);
    }
  }

  return (
    /* z-[300] because this pill is the ONLY way out of preview mode, so it
       has to outrank every overlay that can appear while it is up. At its
       previous z-50 it sat under GameOverScreen (z-[70], which mounts on a
       timer once the scorecard window expires), the Room status banner
       (z-[80]), the Rummy overlay at z-[120] and the room-history sheets at
       z-[200] — any of which covered the ✕ and stranded the player on the
       board with no way back to the results. Also nudged clear of the safe
       area so the notch does not eat it on a phone. */
    <div data-screenshot-hide="true" className="fixed top-[max(1rem,env(safe-area-inset-top))] right-4 z-[300] animate-fade-in flex items-center gap-2 bg-slate-900/95 text-white border-2 border-amber-400/90 px-3.5 py-2 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.65)] backdrop-blur-md font-bold">
      <span className="flex items-center gap-1.5 text-xs sm:text-sm text-amber-300">
        👁 Board Preview
      </span>

      <button
        type="button"
        onClick={takeScreenshot}
        disabled={capturing}
        className="px-2.5 py-1 rounded-full bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white text-xs font-extrabold flex items-center gap-1 transition shadow-sm cursor-pointer disabled:opacity-50"
        title="Download high-res PNG screenshot of board"
      >
        <span>📸</span>
        <span>{failed ? "Failed" : saved ? "Saved!" : capturing ? "Saving..." : "Screenshot"}</span>
      </button>

      <button
        type="button"
        onClick={onClosePreview}
        className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 active:scale-95 text-amber-300 flex items-center justify-center font-bold text-sm border border-slate-600 transition cursor-pointer"
        title="Close Preview & Back to Results"
        aria-label="Close Preview"
      >
        ✕
      </button>
    </div>
  );
}
