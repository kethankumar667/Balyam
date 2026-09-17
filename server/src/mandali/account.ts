import type { Request } from "express";

/**
 * The Mandali actor: only ever derived from a current provider answer, never
 * from anything the caller sent.
 */
export interface MandaliAccount {
  userId: string;
  email: string | null;
}

/** The one credential shape this boundary accepts; guests never appear here. */
export function bearerFrom(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return null;
  const token = match[1].trim();
  return token.length > 0 ? token : null;
}
