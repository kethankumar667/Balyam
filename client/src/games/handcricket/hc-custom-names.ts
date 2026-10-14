import { useSyncExternalStore } from "react";
import type { HcFormat } from "@shared/types";
import { getRosterFor as getSharedRosterFor } from "@shared/hc-rosters";

/**
 * Player-chosen display names for Hand Cricket.
 *
 * BHALYAM ships only fictional players, so a fan cannot find their favourite.
 * Instead of shipping real names (which would trade on real people's identity),
 * each player may rename any player for THEIR OWN screen. The rename lives on
 * this device only: it is never sent to the server and never shown to the
 * opponent, so nothing a player types can appear on anyone else's page.
 *
 * Keys are the ORIGINAL (shipped) name, lowercased. Everything in Hand Cricket
 * that looks a player up by name (style maps, the default XI, the captain)
 * resolves names through {@link customNameFor} on both the shared roster and
 * the JSON squads, so the two sources stay consistent and nothing breaks.
 */

export const HC_CUSTOM_NAMES_KEY = "mpg.hc.customNames";
export const HC_CUSTOM_NAME_MAX_LENGTH = 24;
const MAX_ENTRIES = 400;

export type CustomNameMap = Readonly<Record<string, string>>;

const keyOf = (name: string): string => name.trim().toLowerCase();

/** Control, zero-width and bidi characters plus angle brackets never belong in a name. */
const UNSAFE_CHARS = /[\u0000-\u001F\u007F-\u009F​-‏‪-‮⁠-⁤﻿<>]/g;

/** Cleans what a player typed. Returns "" when nothing usable is left. */
export function sanitizeCustomName(raw: string): string {
  const cleaned = raw.normalize("NFKC").replace(UNSAFE_CHARS, "").replace(/\s+/g, " ").trim();
  return Array.from(cleaned).slice(0, HC_CUSTOM_NAME_MAX_LENGTH).join("").trim();
}

function load(): CustomNameMap {
  try {
    const raw = localStorage.getItem(HC_CUSTOM_NAMES_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v !== "string") continue;
      const clean = sanitizeCustomName(v);
      if (clean && Object.keys(out).length < MAX_ENTRIES) out[k] = clean;
    }
    return out;
  } catch {
    return {};
  }
}

let current: CustomNameMap = load();
const listeners = new Set<() => void>();

function commit(next: CustomNameMap): void {
  current = next;
  rosterCache.clear();
  try {
    if (Object.keys(next).length === 0) localStorage.removeItem(HC_CUSTOM_NAMES_KEY);
    else localStorage.setItem(HC_CUSTOM_NAMES_KEY, JSON.stringify(next));
  } catch {
    // Storage can be blocked (private window, quota). The rename still works for this session.
  }
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCustomNames(): CustomNameMap {
  return current;
}

/** React hook: re-renders when any custom name changes. */
export function useCustomNames(): CustomNameMap {
  return useSyncExternalStore(subscribe, getCustomNames, getCustomNames);
}

/** The name to show for a player whose shipped name is `originalName`. */
export function customNameFor(originalName: string): string {
  return current[keyOf(originalName)] ?? originalName;
}

export type RenameResult = { ok: true } | { ok: false; error: string };

/**
 * Sets (or, when `raw` matches the shipped name, clears) a custom name.
 * `takenNames` are the lowercase names already in use by OTHER players, so two
 * players can never end up with the same name — name-keyed lookups need names
 * to be unique.
 */
export function setCustomName(originalName: string, raw: string, takenNames: ReadonlySet<string>): RenameResult {
  const clean = sanitizeCustomName(raw);
  if (!clean) return { ok: false, error: "Type a name first." };
  const key = keyOf(originalName);
  if (clean.toLowerCase() === key) {
    clearCustomName(originalName);
    return { ok: true };
  }
  if (takenNames.has(clean.toLowerCase())) {
    return { ok: false, error: "Another player already has that name." };
  }
  if (!(key in current) && Object.keys(current).length >= MAX_ENTRIES) {
    return { ok: false, error: "You have renamed the maximum number of players." };
  }
  commit({ ...current, [key]: clean });
  return { ok: true };
}

export function clearCustomName(originalName: string): void {
  const key = keyOf(originalName);
  if (!(key in current)) return;
  const { [key]: _removed, ...rest } = current;
  commit(rest);
}

export function clearAllCustomNames(): void {
  if (Object.keys(current).length === 0) return;
  commit({});
}

// ---------------------------------------------------------------------------
// Roster wrapper: same signature as @shared/hc-rosters' getRosterFor, with the
// player's custom names applied. Returns the SAME object while nothing is
// renamed, and a cached object per (team, format) afterwards, so hooks that
// depend on the roster keep a stable identity between renders.
// ---------------------------------------------------------------------------

type Roster = NonNullable<ReturnType<typeof getSharedRosterFor>>;
const rosterCache = new Map<string, Roster>();

export function getRosterFor(teamId: string, format: HcFormat): ReturnType<typeof getSharedRosterFor> {
  const base = getSharedRosterFor(teamId, format);
  if (!base || Object.keys(current).length === 0) return base;
  const cacheKey = `${teamId}:${format}`;
  const cached = rosterCache.get(cacheKey);
  if (cached) return cached;
  const rename = (p: Roster["squad"][number]): Roster["squad"][number] => {
    const custom = current[keyOf(p.name)];
    return custom ? { ...p, name: custom } : p;
  };
  const renamed: Roster = { ...base, squad: base.squad.map(rename), extras: base.extras.map(rename) };
  rosterCache.set(cacheKey, renamed);
  return renamed;
}
