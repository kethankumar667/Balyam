/**
 * Defensive Payload Validation & Sanitization for BHALYAM Realtime Sockets.
 */

export interface ValidationResult<T> {
  ok: boolean;
  sanitized?: T;
  error?: string;
}

export class PayloadValidator {
  private static MAX_STRING_LENGTH = 10_000;
  private static MAX_OBJECT_DEPTH = 6;

  /**
   * Deep sanitizes an object against prototype pollution and circular references.
   */
  public static sanitizeObject(obj: unknown, depth = 0): unknown {
    if (depth > this.MAX_OBJECT_DEPTH) return null;
    if (obj === null || typeof obj !== "object") {
      if (typeof obj === "string" && obj.length > this.MAX_STRING_LENGTH) {
        return obj.slice(0, this.MAX_STRING_LENGTH);
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.slice(0, 500).map((item) => this.sanitizeObject(item, depth + 1));
    }

    const clean: Record<string, unknown> = Object.create(null);
    for (const key of Object.keys(obj)) {
      if (key === "__proto__" || key === "constructor" || key === "prototype") {
        continue; // Strip pollution vectors
      }
      const val = (obj as Record<string, unknown>)[key];
      clean[key] = this.sanitizeObject(val, depth + 1);
    }
    return clean;
  }

  /**
   * Validates room code shape.
   */
  public static validateRoomCode(code: unknown): ValidationResult<string> {
    if (typeof code !== "string") {
      return { ok: false, error: "Room code must be a string" };
    }
    const trimmed = code.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(trimmed)) {
      return { ok: false, error: "Room code must be 6 alphanumeric characters" };
    }
    return { ok: true, sanitized: trimmed };
  }

  /**
   * Validates player display name.
   */
  public static validatePlayerName(name: unknown): ValidationResult<string> {
    if (typeof name !== "string") {
      return { ok: true, sanitized: "Player" };
    }
    const trimmed = name.trim().slice(0, 24);
    return { ok: true, sanitized: trimmed || "Player" };
  }

  /**
   * Validates chat message text.
   */
  public static validateChatMessage(text: unknown): ValidationResult<string> {
    if (typeof text !== "string") {
      return { ok: false, error: "Chat message must be text" };
    }
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      return { ok: false, error: "Chat message cannot be empty" };
    }
    if (trimmed.length > 500) {
      return { ok: true, sanitized: trimmed.slice(0, 500) };
    }
    return { ok: true, sanitized: trimmed };
  }
}
