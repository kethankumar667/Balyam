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

  /** Memory heap warning threshold percentage (0..1) */
  HEAP_WARNING_THRESHOLD_RATIO: 0.80,

  /** Memory heap critical threshold percentage (0..1) */
  HEAP_CRITICAL_THRESHOLD_RATIO: 0.90,
} as const;
