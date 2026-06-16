import { useState } from "react";
import { KiteIcon } from "./icons";

/**
 * BALYAM brand logo — the wooden treasure chest icon.
 *
 * The actual art asset lives at `client/public/balyam-logo.png` so it is
 * served at the root URL `/balyam-logo.png` by Vite. Drop the file there
 * (no build step needed) and this component picks it up.
 *
 * If the file is missing, this component falls back to a gold-leaf chip
 * with the kite-glyph placeholder rather than showing the browser's broken
 * image marker. That way the app never looks "broken" during a brand
 * handoff.
 *
 * Pass `size` in pixels. Square aspect, no distortion. For decorative use
 * pass `decorative` so the alt is empty (the surrounding label provides
 * the accessible name).
 */

export interface BalyamLogoProps {
  size?: number;
  className?: string;
  /** When the logo sits next to a label, the label IS the accessible name. */
  decorative?: boolean;
  /** Slight drop-shadow on by default for premium feel; turn off for flat surfaces. */
  shadow?: boolean;
}

// Try every casing the asset might be saved under. Vite serves /public files
// case-sensitively (Unix-style) even on Windows, so a single hard-coded URL
// breaks the moment the file is committed with a different cap convention.
const LOGO_SRC_CHAIN = ["/balyam-logo.png", "/Balyam-logo.png", "/BALYAM-logo.png"];

export default function BalyamLogo({
  size = 40,
  className,
  decorative = false,
  shadow = true,
}: BalyamLogoProps) {
  const [srcIdx, setSrcIdx] = useState(0);
  const failed = srcIdx >= LOGO_SRC_CHAIN.length;

  if (failed) {
    return (
      <span
        role={decorative ? undefined : "img"}
        aria-label={decorative ? undefined : "BALYAM"}
        className={`inline-flex items-center justify-center balyam-gold-leaf
                    text-balyam-wood-dark ${className ?? ""}`}
        style={{
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.22),
          boxShadow: shadow
            ? "0 4px 10px -3px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,247,231,0.4)"
            : undefined,
        }}
      >
        <KiteIcon className="w-1/2 h-1/2" />
      </span>
    );
  }

  return (
    <img
      // `key` forces a fresh request when we step through the chain on error.
      key={srcIdx}
      src={LOGO_SRC_CHAIN[srcIdx]}
      alt={decorative ? "" : "BALYAM"}
      width={size}
      height={size}
      decoding="async"
      // Preload the icon eagerly when used in headers so it doesn't pop
      // in after first paint; on hero usage the cache will already be hot.
      loading="eager"
      onError={() => setSrcIdx((i) => i + 1)}
      className={className}
      style={{
        display: "inline-block",
        flexShrink: 0,
        boxShadow: shadow
          ? "0 4px 10px -3px rgba(0,0,0,0.45)"
          : undefined,
        // No border-radius here — the art asset already includes the
        // iOS-style rounded-square corners.
      }}
    />
  );
}
