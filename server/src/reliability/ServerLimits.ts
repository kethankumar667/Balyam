/**
 * Production Resource Quotas & Limits for BHALYAM.
 * Configurable via environment variables with safe production defaults.
 */
export const SERVER_LIMITS = {
  /** Maximum number of concurrent active rooms allowed in memory */
  MAX_ACTIVE_ROOMS: Number(process.env.MAX_ACTIVE_ROOMS) || 5_000,

  /** Maximum number of domain events stored per room timeline */
  MAX_TIMELINE_EVENTS_PER_ROOM: Number(process.env.MAX_TIMELINE_EVENTS_PER_ROOM) || 5_000,

  /** Maximum consecutive recovery attempts per player session */
  MAX_RECOVERY_ATTEMPTS: Number(process.env.MAX_RECOVERY_ATTEMPTS) || 10,

  /** Maximum WebRTC peer connections allowed per room */
  MAX_WEBRTC_CONNECTIONS_PER_ROOM: Number(process.env.MAX_WEBRTC_CONNECTIONS_PER_ROOM) || 16,

  /** Maximum messages in recent chat backlog */
  MAX_CHAT_BACKLOG: Number(process.env.MAX_CHAT_BACKLOG) || 100,

  /** Maximum listeners per event per socket */
  MAX_LISTENERS_PER_SOCKET: Number(process.env.MAX_LISTENERS_PER_SOCKET) || 25,

  /** Maximum allowed timer duration before flagging as potential leak (1 hour) */
  MAX_TIMER_DURATION_MS: 3_600_000,

  /** Memory heap warning threshold percentage against heap_size_limit (0..1) */
  HEAP_WARNING_THRESHOLD_RATIO: Number(process.env.HEAP_WARNING_THRESHOLD_RATIO) || 0.75,

  /** Memory heap critical threshold percentage against heap_size_limit (0..1) */
  HEAP_CRITICAL_THRESHOLD_RATIO: Number(process.env.HEAP_CRITICAL_THRESHOLD_RATIO) || 0.85,

  /** RSS warning threshold in MB */
  RSS_WARNING_THRESHOLD_MB: Number(process.env.RSS_WARNING_THRESHOLD_MB) || 2048,

  /** RSS critical threshold in MB */
  RSS_CRITICAL_THRESHOLD_MB: Number(process.env.RSS_CRITICAL_THRESHOLD_MB) || 3072,

  /** Minimum heapUsed in MB before ratio-based memory alerts activate (prevents false positives on low heaps) */
  MIN_HEAP_ALERT_FLOOR_MB: Number(process.env.MIN_HEAP_ALERT_FLOOR_MB) || 128,

  /** Cooldown period in ms between alerts of same/lower severity (default: 5 minutes) */
  MEMORY_ALERT_COOLDOWN_MS: Number(process.env.MEMORY_ALERT_COOLDOWN_MS) || 300_000,

  /** Consecutive threshold breaches required before firing an alert (default: 2 ticks) */
  MEMORY_ALERT_CONSECUTIVE_BREACHES: Number(process.env.MEMORY_ALERT_CONSECUTIVE_BREACHES) || 2,

  /** Periodic in-process retry interval for rooms in FAILED terminal persistence status (default: 5 seconds) */
  FAILED_TERMINAL_PERSISTENCE_RETRY_INTERVAL_MS:
    Number(process.env.FAILED_TERMINAL_PERSISTENCE_RETRY_INTERVAL_MS) || 5_000,
} as const;
