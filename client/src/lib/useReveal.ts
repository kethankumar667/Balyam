import { useEffect, useRef, useState } from "react";

/**
 * Toggle a "visible" boolean when the referenced element enters the viewport.
 *
 * Designed for scroll-reveal layouts: pair the returned `ref` with an element
 * that uses the `.bhalyam-reveal` (or `.bhalyam-reveal-stagger`) class and
 * apply `is-visible` when `visible` flips true. Once visible the observer
 * disconnects so we never re-animate on scroll-up.
 *
 * Respects `prefers-reduced-motion`: under reduced motion the element starts
 * visible immediately and no IntersectionObserver is created.
 *
 * Defaults are tuned for hero/section reveals (15% threshold, -8% root margin
 * so a section starts revealing slightly before its top hits the viewport).
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>({
  threshold = 0.15,
  rootMargin = "0px 0px -8% 0px",
  once = true,
}: {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
} = {}): { ref: React.RefObject<T>; visible: boolean } {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setVisible(true);
      return;
    }

    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      // Older browsers — fall back to immediately visible so content is
      // never permanently hidden.
      setVisible(true);
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            if (once) obs.disconnect();
          } else if (!once) {
            setVisible(false);
          }
        }
      },
      { threshold, rootMargin },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, rootMargin, once]);

  return { ref, visible };
}
