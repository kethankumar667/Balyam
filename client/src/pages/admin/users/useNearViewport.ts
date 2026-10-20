import { useEffect, useState } from "react";

const DEFAULT_MARGIN = "600px";

/**
 * Whether an element has come within a screen or so of the visible area, so that what it holds can be
 * fetched just before it is needed rather than all at once on arrival.
 *
 * Once true it stays true: a section that has been loaded is not unloaded by scrolling away. With
 * `enabled` false it is true from the start, and where `IntersectionObserver` does not exist the element
 * is treated as near at once, so nothing is ever left waiting for an event that cannot come.
 */
export function useNearViewport(enabled: boolean, margin: string = DEFAULT_MARGIN) {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [isNear, setIsNear] = useState(!enabled);

  useEffect(() => {
    if (isNear || !element) return;
    if (typeof IntersectionObserver === "undefined") {
      setIsNear(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: margin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, isNear, margin]);

  return { ref: setElement, isNear };
}
