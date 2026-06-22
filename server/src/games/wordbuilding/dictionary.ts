// Dictionary singletons — loaded lazily, once per process per mode.
//
// Two wordlists are bundled and cached separately:
//
//   TOURNAMENT — `an-array-of-english-words`, ~275k entries. Scrabble-
//                tournament-legal. Includes obscure words like CAA, KBAR,
//                DIEB, JOBE, EDH, ABACA, CESSER that frustrate casual
//                players. Right for "vocabulary tournament" mode.
//
//   COMMON     — top-25k frequency-ranked English words intersected with
//                the Scrabble dictionary, ~19.5k entries. Scrabble's
//                proper-noun rejection naturally strips most acronyms
//                that pollute pure-frequency lists (OBS, RSA, NMR, etc.)
//                while keeping recognizable words (cricket, mango,
//                zebra, school, teacher). The right default — this is
//                what "feels like English class".
//
// A small EXTRAS_BLOCKLIST removes the handful of weird entries that
// survive both filters (caa, obs) plus all profanity / slurs. Both
// modes filter the same blocklist before the lookup table is exposed.

// `an-array-of-english-words` ships as a raw `index.json`. Modern Node
// ESM (v22+) requires `import ... with { type: "json" }` for JSON
// imports — which works in production but trips TypeScript's older
// emit on some configs. `createRequire` sidesteps the whole syntax
// issue: it loads JSON natively on every supported Node version.
import { createRequire } from "node:module";
const _require = createRequire(import.meta.url);
const allWords: string[] = _require("an-array-of-english-words");

import { words as popularWords } from "popular-english-words";
import type { WordBuildingDictionaryMode } from "@shared/types.js";

/**
 * Profanity / slurs filtered from BOTH dictionary modes. Audited
 * individually — anything on this list is something a teacher would
 * not write a tick mark next to.
 */
const PROFANITY_BLOCKLIST: ReadonlySet<string> = new Set([
  "ass", "arse", "damn", "dick", "shit", "fuck", "cunt", "cock", "piss",
  "twat", "wank", "fag", "tit", "tits", "boobs",
  "nigger", "nigga", "spic", "kike", "chink", "gook", "wop", "dyke",
  "tranny", "retard", "retarded",
  "asses", "asshole", "assholes", "shits", "shitting", "shitty", "shitter",
  "fucks", "fucked", "fucking", "fucker", "fuckers", "motherfucker",
  "bitch", "bitches", "bitching", "bastard", "bastards",
  "dicks", "dickhead", "dickheads",
  "cocks", "cocksucker",
  "pissed", "pissing", "pisser",
  "cunts",
]);

/**
 * Extra leak shield applied ONLY to common mode — tournament weirdness
 * that survives the frequency-list intersection. These ARE valid
 * Scrabble words so tournament mode still accepts them; we just block
 * them from the casual default so a Classroom game never books CAA or
 * OBS. Keep tiny — adding entries here narrows the casual dictionary.
 */
const COMMON_MODE_LEAK_BLOCKLIST: ReadonlySet<string> = new Set([
  "caa", "obs", "dso",
]);

export function isProfanity(word: string): boolean {
  return PROFANITY_BLOCKLIST.has(word.toLowerCase());
}

/** Cache slot per mode so we don't rebuild the Set on every move. */
const caches: { common: Set<string> | null; tournament: Set<string> | null } = {
  common: null,
  tournament: null,
};

/**
 * Size of the frequency-ranked head we intersect with the Scrabble
 * dictionary. 25,000 is the sweet spot validated against probe words:
 *   • Lower (15-20k) drops "zebra" and other animal/object words kids know
 *   • Higher (30k+) starts pulling tournament weirdness back in
 */
const COMMON_TOP_N = 25_000;

function loadTournament(): Set<string> {
  if (caches.tournament) return caches.tournament;
  const set = new Set(allWords);
  for (const bad of PROFANITY_BLOCKLIST) set.delete(bad);
  caches.tournament = set;
  return set;
}

function loadCommon(): Set<string> {
  if (caches.common) return caches.common;
  const top = popularWords.getMostPopular(COMMON_TOP_N);
  // Intersect with the Scrabble dictionary so acronyms and made-up
  // pseudo-words from a Wikipedia frequency list don't slip in.
  const tournamentSet = new Set(allWords);
  const filtered = top.filter((w) => tournamentSet.has(w));
  const set = new Set(filtered);
  for (const bad of PROFANITY_BLOCKLIST) set.delete(bad);
  for (const bad of COMMON_MODE_LEAK_BLOCKLIST) set.delete(bad);
  caches.common = set;
  return set;
}

/**
 * Look up a word — case-insensitive. `mode` defaults to "common" so
 * callers that haven't been updated stay on the safer wordlist.
 */
export function isDictionaryWord(
  word: string,
  mode: WordBuildingDictionaryMode = "common",
): boolean {
  if (!word) return false;
  const lc = word.toLowerCase();
  // Profanity is filtered at load time — but double-check defensively
  // in case a future code path bypasses the cache.
  if (PROFANITY_BLOCKLIST.has(lc)) return false;
  const set = mode === "tournament" ? loadTournament() : loadCommon();
  return set.has(lc);
}

/** Size of the active wordlist for the mode — handy for telemetry. */
export function dictionarySize(mode: WordBuildingDictionaryMode = "common"): number {
  return (mode === "tournament" ? loadTournament() : loadCommon()).size;
}
