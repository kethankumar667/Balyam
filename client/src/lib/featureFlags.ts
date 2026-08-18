import { useSyncExternalStore } from "react";
import type { FeatureFlagKey } from "@shared/featureFlags";
import { DEFAULT_FEATURE_FLAGS } from "@shared/featureFlags";

const STORAGE_PREFIX = "bhalyam.ff.";

type Listener = () => void;
const listeners = new Set<Listener>();

function notifyListeners(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // Prevent single listener crash from breaking subscribers
    }
  }
}

/**
 * Resolves the state of a feature flag with the following precedence:
 * 1. URL search parameter (?ff_KEY=1 / ?ff_KEY=0 / ?ff_KEY=true / ?ff_KEY=false)
 * 2. localStorage override ("bhalyam.ff.KEY")
 * 3. Vite environment variable ("VITE_FF_KEY")
 * 4. Default configuration in shared/featureFlags.ts
 */
export function isFeatureEnabled(key: FeatureFlagKey): boolean {
  if (typeof window !== "undefined" && typeof window.location !== "undefined") {
    // 1. URL search param check
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const urlVal = searchParams.get(`ff_${key}`);
      if (urlVal !== null) {
        return urlVal === "1" || urlVal.toLowerCase() === "true";
      }
    } catch {
      // URL parsing fallback
    }

    // 2. Local storage override check
    try {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
      if (stored !== null) {
        return stored === "true" || stored === "1";
      }
    } catch {
      // Local storage fallback
    }
  }

  // 3. Vite environment variable check
  if (typeof import.meta !== "undefined" && import.meta.env) {
    const envVal = import.meta.env[`VITE_FF_${key}`];
    if (typeof envVal === "string") {
      return envVal === "true" || envVal === "1";
    }
  }

  // 4. Default fallback
  return DEFAULT_FEATURE_FLAGS[key] ?? false;
}

/**
 * Programmatically overrides a feature flag in localStorage (e.g. from debug settings).
 * Pass null to remove the override and revert to environment/default.
 */
export function setFeatureFlagOverride(key: FeatureFlagKey, enabled: boolean | null): void {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  try {
    if (enabled === null) {
      localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
    } else {
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, enabled ? "true" : "false");
    }
    notifyListeners();
  } catch {
    // Local storage quota / private browsing fallback
  }
}

/**
 * Returns snapshot of all current feature flag states.
 */
export function getAllFeatureFlags(): Record<FeatureFlagKey, boolean> {
  const flags = {} as Record<FeatureFlagKey, boolean>;
  for (const key of Object.keys(DEFAULT_FEATURE_FLAGS) as FeatureFlagKey[]) {
    flags[key] = isFeatureEnabled(key);
  }
  return flags;
}

/**
 * Subscribes to feature flag changes.
 */
export function subscribeToFeatureFlags(callback: Listener): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/**
 * React hook that reacts dynamically to feature flag changes.
 */
export function useFeatureFlag(key: FeatureFlagKey): boolean {
  return useSyncExternalStore(
    subscribeToFeatureFlags,
    () => isFeatureEnabled(key),
    () => DEFAULT_FEATURE_FLAGS[key] ?? false
  );
}
