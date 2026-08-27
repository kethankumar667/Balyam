import { useState, useEffect, useCallback, useRef } from "react";
import type { Point2D } from "./types";

export interface AnchorOptions {
  elementId?: string;
  fallback?: Point2D;
  offset?: { x: number; y: number };
}

/**
 * Coordinate Anchoring Hook.
 * Measures real DOM element positions for dynamic particle trajectory targeting.
 * Handles resize, scroll, orientation changes, and offscreen targets with safe viewports.
 * Does NOT measure continuously on every animation frame to protect 60fps performance.
 */
export function useElementAnchor(options: AnchorOptions = {}): Point2D {
  const { elementId, fallback, offset = { x: 0, y: 0 } } = options;

  const getFallbackPoint = useCallback((): Point2D => {
    if (fallback) return fallback;
    if (typeof window === "undefined") return { x: 200, y: 200 };
    return {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };
  }, [fallback]);

  const [point, setPoint] = useState<Point2D>(() => getFallbackPoint());
  const rafIdRef = useRef<number | null>(null);

  const measure = useCallback(() => {
    if (typeof window === "undefined") return;

    if (!elementId) {
      setPoint(getFallbackPoint());
      return;
    }

    const el = document.getElementById(elementId);
    if (!el) {
      setPoint(getFallbackPoint());
      return;
    }

    const rect = el.getBoundingClientRect();

    // Check if element is completely offscreen or collapsed
    if (rect.width === 0 && rect.height === 0) {
      setPoint(getFallbackPoint());
      return;
    }

    const centerX = rect.left + rect.width / 2 + offset.x;
    const centerY = rect.top + rect.height / 2 + offset.y;

    setPoint({ x: Math.round(centerX), y: Math.round(centerY) });
  }, [elementId, getFallbackPoint, offset.x, offset.y]);

  useEffect(() => {
    measure();

    const handleWindowChange = () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(() => {
        measure();
      });
    };

    window.addEventListener("resize", handleWindowChange, { passive: true });
    window.addEventListener("scroll", handleWindowChange, { passive: true });
    window.addEventListener("orientationchange", handleWindowChange, { passive: true });

    let observer: ResizeObserver | null = null;
    if (elementId && typeof ResizeObserver !== "undefined") {
      const el = document.getElementById(elementId);
      if (el) {
        observer = new ResizeObserver(() => handleWindowChange());
        observer.observe(el);
      }
    }

    return () => {
      window.removeEventListener("resize", handleWindowChange);
      window.removeEventListener("scroll", handleWindowChange);
      window.removeEventListener("orientationchange", handleWindowChange);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (observer) observer.disconnect();
    };
  }, [elementId, measure]);

  return point;
}
