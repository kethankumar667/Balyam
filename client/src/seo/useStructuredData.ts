import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getStructuredDataForRoute, serializeJsonLd } from "./structuredData";

const SCRIPT_ID = "bhalyam-jsonld";

export interface UseStructuredDataOptions {
  /** Explicit schema or schemas to render. If not provided, resolves via current location.pathname. */
  data?: object | object[] | null;
  /** Whether to disable updating the DOM in the hook (e.g. for testing) */
  disabled?: boolean;
}

/**
 * Hook to manage Schema.org JSON-LD structured data in document.head.
 * Automatically synchronizes on client-side route changes.
 */
export function useStructuredData(options?: UseStructuredDataOptions | object | object[]) {
  const location = useLocation();

  // `undefined` (no args, e.g. App.tsx's route-wide call) must fall through to
  // route-based resolution below — it is NOT the same as an explicit `{}`
  // payload, which a caller could legitimately pass to mean "no data". Prior
  // to this guard, the default parameter value `{}` was indistinguishable
  // from that explicit case and always won, so `data` was always `{}` (never
  // `undefined`) and getStructuredDataForRoute() was never reached.
  const config: UseStructuredDataOptions =
    options === undefined
      ? {}
      : "data" in options || "disabled" in options
        ? (options as UseStructuredDataOptions)
        : { data: options as object | object[] };

  const { data, disabled = false } = config;

  useEffect(() => {
    if (disabled || typeof document === "undefined") return;

    const schemas = data !== undefined ? data : getStructuredDataForRoute(location.pathname);
    const jsonLdString = serializeJsonLd(schemas);

    if (!jsonLdString) {
      const existing = document.getElementById(SCRIPT_ID);
      if (existing) {
        existing.remove();
      }
      return;
    }

    let scriptTag = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

    if (!scriptTag) {
      scriptTag = document.createElement("script");
      scriptTag.id = SCRIPT_ID;
      scriptTag.type = "application/ld+json";
      document.head.appendChild(scriptTag);
    }

    scriptTag.textContent = jsonLdString;

    return () => {
      // Optional cleanup on unmount if needed
    };
  }, [location.pathname, data, disabled]);
}

/**
 * Declarative component for injecting or overriding structured data.
 */
export function StructuredData({ data }: { data?: object | object[] | null }) {
  useStructuredData({ data });
  return null;
}
