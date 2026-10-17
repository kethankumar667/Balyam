import { useEffect, useRef, useState } from "react";

export interface FitSize {
  width: number;
  height: number;
}

/**
 * Measures the box a ref is attached to and returns the largest box with the given width:height ratio
 * that fits inside it. Pure CSS cannot do this for a board that must fit both a tall phone and a short
 * landscape one, because it has to choose between filling the width and filling the height.
 *
 * Returns `null` until it has measured something real (and where `ResizeObserver` does not exist), and
 * callers then fall back to filling the width at the right ratio.
 */
export function useFitBox(aspect: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<FitSize | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;

    const measure = (): void => {
      const { width, height } = element.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      const byWidth = { width, height: width / aspect };
      const fit = byWidth.height <= height ? byWidth : { width: height * aspect, height };
      const next = { width: Math.floor(fit.width), height: Math.floor(fit.height) };
      setSize((current) => (current && current.width === next.width && current.height === next.height ? current : next));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [aspect]);

  return { ref, size };
}
