import { telemetry } from "./observability";

export interface FormattedNetworkError {
  title: string;
  message: string;
  statusCode?: number;
  recoverable: boolean;
  actionLabel?: string;
  action?: () => void;
}

/**
 * Maps raw network and HTTP errors into human-friendly, contextual messages.
 */
export function formatNetworkError(error: unknown): FormattedNetworkError {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status: unknown }).status)
      : undefined;

  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
      ? error
      : "An unexpected network error occurred";

  telemetry.error("network_error_formatted", error, { status, rawMessage });

  if (!status && typeof navigator !== "undefined" && navigator.onLine === false) {
    return {
      title: "You are offline",
      message: "Please check your internet connection. BHALYAM will automatically reconnect when you're back online.",
      recoverable: true,
      actionLabel: "Try again",
    };
  }

  switch (status) {
    case 401:
      return {
        title: "Session Expired",
        message: "Your sign-in session has expired. Please sign in again to continue.",
        statusCode: 401,
        recoverable: true,
        actionLabel: "Sign in",
      };

    case 403:
      return {
        title: "Access Restricted",
        message: "You do not have permission to access this table or resource.",
        statusCode: 403,
        recoverable: false,
      };

    case 404:
      return {
        title: "Not Found",
        message: "The requested room or resource could not be found. It may have expired or closed.",
        statusCode: 404,
        recoverable: false,
        actionLabel: "Return to Lounge",
      };

    case 409:
      return {
        title: "Conflict",
        message: "This profile or room name is currently being updated by another action. Please wait a moment and try again.",
        statusCode: 409,
        recoverable: true,
        actionLabel: "Retry",
      };

    case 429:
      return {
        title: "Too Many Requests",
        message: "You've sent requests too quickly. Please pause for a few seconds before trying again.",
        statusCode: 429,
        recoverable: true,
        actionLabel: "Wait & Retry",
      };

    case 500:
    case 502:
    case 503:
    case 504:
      return {
        title: "Server Unavailable",
        message: "Our game servers are momentarily rebooting or under heavy load. Please hold on.",
        statusCode: status,
        recoverable: true,
        actionLabel: "Reconnect",
      };

    default:
      if (rawMessage.toLowerCase().includes("timeout")) {
        return {
          title: "Connection Timed Out",
          message: "The server took too long to respond. Please check your network speed.",
          recoverable: true,
          actionLabel: "Retry",
        };
      }
      return {
        title: "Connection Error",
        message: rawMessage || "Failed to communicate with the server. Please try again.",
        recoverable: true,
        actionLabel: "Retry",
      };
  }
}
