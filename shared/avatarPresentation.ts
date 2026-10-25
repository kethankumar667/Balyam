/** Only publicly worn decoration is exposed, never inventory or account details. */
export interface AvatarAurasResponse {
  auras: Record<string, string | null>;
}

export const AVATAR_AURA_BATCH_LIMIT = 25;

export function parseAvatarPlayerIds(value: unknown): string[] | null {
  if (typeof value !== "string") return null;
  const ids = value.split(",");
  if (!ids.length || ids.length > AVATAR_AURA_BATCH_LIMIT || ids.some(id => !/^[a-zA-Z0-9_-]{1,128}$/.test(id))) return null;
  return [...new Set(ids)];
}
