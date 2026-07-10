import { useReducedMotion } from "framer-motion";
import { ILLUSTRATIONS, type IllustrationKey } from "../assets/illustrations";

/**
 * IllustrationSlot — drop-in wrapper for every hand-drawn notebook illustration.
 *
 * Reads from the ILLUSTRATIONS token map. When the asset is not yet available
 * (value is null), renders a labelled dashed placeholder in development so
 * layouts remain testable without waiting for final art. In production it
 * renders nothing, leaving the surrounding layout intact.
 *
 * prefers-reduced-motion:
 *   Pass `animated` to signal that this slot's image has motion in its context
 *   (e.g. the lobby illustration fades in). When the user prefers reduced
 *   motion the entrance animation is suppressed. The image itself is always
 *   static PNG — this guard only affects surrounding Framer Motion wrappers
 *   that the caller controls; IllustrationSlot doesn't animate on its own.
 *
 * Usage:
 *   <IllustrationSlot illustrationKey="lobby-base" alt="Kids waiting for a game" className="w-full" />
 */
export default function IllustrationSlot({
  illustrationKey,
  alt,
  className = "",
  imgClassName = "",
  style,
}: {
  illustrationKey: IllustrationKey;
  /** Descriptive alt text. Pass "" for purely decorative illustrations. */
  alt: string;
  className?: string;
  imgClassName?: string;
  style?: React.CSSProperties;
}) {
  const prefersReducedMotion = useReducedMotion();
  const src = ILLUSTRATIONS[illustrationKey];

  if (!src) {
    // Placeholder — visible in dev, invisible in prod (import.meta.env.PROD check).
    if (import.meta.env.PROD) return null;
    return (
      <div
        aria-hidden
        className={`flex items-center justify-center border-2 border-dashed border-[#C4A97D] rounded bg-[#F9F0E0] text-[#9C7C56] text-[10px] font-mono text-center p-2 ${className}`}
        style={style}
      >
        {illustrationKey}
        <br />
        <span className="opacity-60">illustration pending</span>
      </div>
    );
  }

  return (
    <div className={className} style={style}>
      <img
        src={src}
        alt={alt}
        className={imgClassName}
        // Reduced-motion consumers use this data attribute to opt out
        // of entrance animations added by the parent component.
        data-reduced-motion={prefersReducedMotion ? "true" : undefined}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}
