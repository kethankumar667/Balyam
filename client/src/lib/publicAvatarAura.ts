import { useEffect, useSyncExternalStore } from "react";
import { AVATAR_AURA_BATCH_LIMIT, type AvatarAurasResponse } from "@shared/avatarPresentation";
import { sanitizePublicPresentation } from "@shared/cosmetics";
import { apiFetch } from "./playerIdentity";

const TTL_MS = 60_000;
const cache = new Map<string, { aura: string | undefined; expires: number }>();
const listeners = new Set<() => void>();
const pending = new Set<string>();
const inFlight = new Set<string>();
let scheduled = false;
let refreshTimer: ReturnType<typeof setInterval> | undefined;
const active = new Map<string, number>();
const notify = () => listeners.forEach(listener => listener());

function request(playerId: string) {
  if (inFlight.has(playerId) || (cache.get(playerId)?.expires ?? 0) > Date.now()) return;
  pending.add(playerId);
  if (!scheduled) {
    scheduled = true;
    queueMicrotask(() => { scheduled = false; void flush(); });
  }
}

async function flush() {
  const ids = [...pending].slice(0, AVATAR_AURA_BATCH_LIMIT);
  if (!ids.length) return;
  ids.forEach(id => { pending.delete(id); inFlight.add(id); });
  try {
    const response = await apiFetch(`/api/cosmetics/avatar-auras?playerIds=${encodeURIComponent(ids.join(","))}`);
    if (!response.ok) throw new Error(`Avatar decorations request failed (${response.status})`);
    const body: AvatarAurasResponse = await response.json();
    if (!body.auras || ids.some(id => !Object.prototype.hasOwnProperty.call(body.auras, id))) throw new Error("Invalid avatar decorations response");
    const entries = ids.map(id => {
      const value = body.auras[id];
      if (value !== null && typeof value !== "string") throw new Error("Invalid avatar decoration");
      const aura = sanitizePublicPresentation({ avatarAura: value }).avatarAura;
      return { id, aura: aura === "aura_none" ? undefined : aura };
    });
    for (const { id, aura } of entries) cache.set(id, { aura, expires: Date.now() + TTL_MS });
    for (const [id] of cache) {
      if (cache.size <= 1000) break;
      if (!active.has(id)) cache.delete(id);
    }
    notify();
  } catch (error) {
    console.warn("Avatar decorations could not be loaded; they will be retried.", error);
  } finally {
    ids.forEach(id => inFlight.delete(id));
    if (pending.size) void flush();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!refreshTimer) refreshTimer = setInterval(() => {
    if (document.visibilityState === "hidden") return;
    active.forEach((_count, id) => request(id));
  }, TTL_MS);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) { clearInterval(refreshTimer); refreshTimer = undefined; }
  };
}
const subscribeNone = () => () => {};

/** Shared batches prevent a leaderboard or chat feed issuing one request per avatar. */
export function usePublicAvatarAura(playerId: string | undefined): string | undefined {
  const aura = useSyncExternalStore(playerId ? subscribe : subscribeNone, () => playerId ? cache.get(playerId)?.aura : undefined, () => undefined);
  useEffect(() => {
    if (!playerId) return;
    active.set(playerId, (active.get(playerId) ?? 0) + 1);
    request(playerId);
    return () => {
      const count = (active.get(playerId) ?? 1) - 1;
      if (count) active.set(playerId, count); else active.delete(playerId);
    };
  }, [playerId]);
  return aura;
}
