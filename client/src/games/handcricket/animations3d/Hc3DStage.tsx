import { useEffect, type ReactNode } from "react";
import type { HcSkin } from "../hc-skin";

export function Hc3DStage({
  skin = "broadcast",
  onDismiss,
  children,
  ambientGlow = "gold",
}: {
  skin?: HcSkin;
  onDismiss?: () => void;
  children: ReactNode;
  ambientGlow?: "gold" | "red" | "emerald" | "blue" | "sunset";
}) {
  // Tap anywhere or press any key to dismiss instantly
  useEffect(() => {
    const handleKeyDown = () => onDismiss?.();
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onDismiss]);

  const glowGradient =
    ambientGlow === "red"
      ? "radial-gradient(ellipse at center, rgba(220, 38, 38, 0.45) 0%, rgba(15, 7, 7, 0.85) 75%)"
      : ambientGlow === "emerald"
      ? "radial-gradient(ellipse at center, rgba(16, 185, 129, 0.4) 0%, rgba(6, 20, 16, 0.85) 75%)"
      : ambientGlow === "blue"
      ? "radial-gradient(ellipse at center, rgba(37, 99, 235, 0.35) 0%, rgba(10, 15, 30, 0.85) 75%)"
      : ambientGlow === "sunset"
      ? "radial-gradient(ellipse at center, rgba(249, 115, 22, 0.45) 0%, rgba(15, 10, 8, 0.85) 75%)"
      : "radial-gradient(ellipse at center, rgba(234, 179, 8, 0.4) 0%, rgba(12, 10, 5, 0.85) 75%)";

  return (
    <div
      onClick={onDismiss}
      className="pointer-events-auto fixed inset-0 z-[65] flex items-center justify-center overflow-hidden cursor-pointer select-none"
      style={{
        perspective: "1200px",
        perspectiveOrigin: "50% 50%",
      }}
      aria-live="polite"
      aria-atomic="true"
      role="status"
    >
      {/* Ambient 3D Stage Lighting Atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 transition-all duration-700"
        style={{
          background: glowGradient,
        }}
      />

      {/* 3D Depth Preserving World Container */}
      <div
        className="relative flex flex-col items-center justify-center p-4"
        style={{
          transformStyle: "preserve-3d",
          width: "min(100vw, 760px)",
          maxHeight: "90vh",
        }}
      >
        {children}
      </div>
    </div>
  );
}
