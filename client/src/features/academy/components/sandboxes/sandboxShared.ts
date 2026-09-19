import { useCallback, useEffect, useRef } from "react";

/** Props every academy sandbox accepts. */
export interface SandboxProps {
  onComplete?: () => void;
}

/** Props for sandboxes that read the slide's documented `sandboxConfig` keys. */
export interface ConfigurableSandboxProps extends SandboxProps {
  config?: Record<string, unknown>;
}

/**
 * Returns a `complete()` function that forwards to the latest `onComplete`
 * at most once per mount. Interaction handlers call it freely; the caller
 * is never spammed and StrictMode's double-invoked renders cannot double-fire
 * it because the guard lives in a ref, not in render.
 */
export function useCompleteOnce(onComplete?: () => void): () => void {
  const onCompleteRef = useRef(onComplete);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  return useCallback(() => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    onCompleteRef.current?.();
  }, []);
}

/** Reads a string key from an untyped slide config, or undefined. */
export function readConfigString(
  config: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const value = config?.[key];
  return typeof value === "string" ? value : undefined;
}
