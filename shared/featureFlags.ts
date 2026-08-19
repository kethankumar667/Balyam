/**
 * Central Feature Flag Definitions for BHALYAM.
 *
 * Feature flags enable zero-downtime, progressive rollout of architectural changes
 * and safe migration paths without coupling deploy with release.
 */

export type FeatureFlagKey =
  | "NEW_ROOM_RENDERER"
  | "NEW_CHAT"
  | "STRICT_LIFECYCLE_CLEANUP"
  | "ENHANCED_A11Y_MODALS"
  | "REDIS_ROOM_STORE"
  | "AUDIO_V2"
  | "EVENT_BUS_LOGGING"
  | "REALTIME_RECOVERY"
  | "EVENT_SOURCING";

export interface FeatureFlagDefinition {
  key: FeatureFlagKey;
  description: string;
  defaultValue: boolean;
}

export const FEATURE_FLAGS: Record<FeatureFlagKey, FeatureFlagDefinition> = {
  NEW_ROOM_RENDERER: {
    key: "NEW_ROOM_RENDERER",
    description: "Enables modular decomposed room shell layout architecture",
    defaultValue: false,
  },
  NEW_CHAT: {
    key: "NEW_CHAT",
    description: "Enables virtualized, accessible chat message feed",
    defaultValue: false,
  },
  STRICT_LIFECYCLE_CLEANUP: {
    key: "STRICT_LIFECYCLE_CLEANUP",
    description: "Enforces strict timer, RAF, and listener disposal patterns",
    defaultValue: true,
  },
  ENHANCED_A11Y_MODALS: {
    key: "ENHANCED_A11Y_MODALS",
    description: "Enables ARIA dialog focus traps and keyboard accessibility enhancements",
    defaultValue: true,
  },
  REDIS_ROOM_STORE: {
    key: "REDIS_ROOM_STORE",
    description: "Enables Redis multi-node room state abstraction layer",
    defaultValue: false,
  },
  AUDIO_V2: {
    key: "AUDIO_V2",
    description: "Enables low-latency spatial audio engine",
    defaultValue: false,
  },
  EVENT_BUS_LOGGING: {
    key: "EVENT_BUS_LOGGING",
    description: "Logs typed event bus publications to telemetry buffer",
    defaultValue: true,
  },
  REALTIME_RECOVERY: {
    key: "REALTIME_RECOVERY",
    description: "Enables fault-tolerant session recovery, tab sync, and connection state machine",
    defaultValue: true,
  },
  EVENT_SOURCING: {
    key: "EVENT_SOURCING",
    description: "Enables immutable domain event recording, timeline sourcing, and room replay engine",
    defaultValue: true,
  },
};

export const DEFAULT_FEATURE_FLAGS: Record<FeatureFlagKey, boolean> = Object.fromEntries(
  Object.entries(FEATURE_FLAGS).map(([k, v]) => [k, v.defaultValue])
) as Record<FeatureFlagKey, boolean>;
