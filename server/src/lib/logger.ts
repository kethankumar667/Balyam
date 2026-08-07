/**
 * High-performance structured logger for BHALYAM backend.
 * Emits clean JSON logs in production and human-friendly formatted logs in development.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogPayload {
  message: string;
  module?: string;
  roomCode?: string;
  socketId?: string;
  playerId?: string;
  [key: string]: unknown;
}

class Logger {
  private isProd = process.env.NODE_ENV === "production";

  private formatLog(level: LogLevel, payload: LogPayload): string {
    const timestamp = new Date().toISOString();
    const logObj = {
      timestamp,
      level: level.toUpperCase(),
      ...payload,
    };

    if (this.isProd) {
      return JSON.stringify(logObj);
    }

    const modTag = payload.module ? `[${payload.module}]` : "";
    const roomTag = payload.roomCode ? `(Room: ${payload.roomCode})` : "";
    return `[${timestamp}] ${level.toUpperCase()} ${modTag} ${roomTag} ${payload.message}`;
  }

  debug(payload: LogPayload | string): void {
    const p = typeof payload === "string" ? { message: payload } : payload;
    console.debug(this.formatLog("debug", p));
  }

  info(payload: LogPayload | string): void {
    const p = typeof payload === "string" ? { message: payload } : payload;
    console.info(this.formatLog("info", p));
  }

  warn(payload: LogPayload | string): void {
    const p = typeof payload === "string" ? { message: payload } : payload;
    console.warn(this.formatLog("warn", p));
  }

  error(payload: LogPayload | string, err?: unknown): void {
    const p = typeof payload === "string" ? { message: payload } : payload;
    if (err instanceof Error) {
      p.errorName = err.name;
      p.errorMessage = err.message;
      p.stack = err.stack;
    }
    console.error(this.formatLog("error", p));
  }
}

export const logger = new Logger();
