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

      if (targetSvg) {
        const blob = await svgToPngBlob(targetSvg, window.devicePixelRatio || 2);
        if (blob) {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `bhalyam-board-${Date.now()}.png`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 1000);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        }
      } else {
        // Native browser print/save fallback if no SVG target found
        window.print();
      }
    } catch {
      // Fallback
    } finally {
      setCapturing(false);
    }
  }

  return (
    <div className="fixed top-4 right-4 z-50 animate-fade-in flex items-center gap-2 bg-slate-900/95 text-white border-2 border-amber-400/90 px-3.5 py-2 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.65)] backdrop-blur-md font-bold">
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
        <span>{saved ? "Saved!" : capturing ? "Saving..." : "Screenshot"}</span>
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
