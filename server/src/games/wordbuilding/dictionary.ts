// Dictionary singleton — loaded from the bundled an-array-of-english-words
// package exactly once per process. The package ships a ~275k-word lowercase
// array; we wrap it in a Set for O(1) lookups. Memory cost is ~5MB which is
// fine for a node process; the alternative (per-word API calls) is hostile
// for a turn-timer game.
//
// We strip a small blocklist of obvious slurs and 3-4 letter profanity at
// load time so the classroom theme doesn't break the first time a player
// tries to spell a rude word. The list is deliberately conservative — the
// game is about vocabulary, not censorship — but every entry has been
// audited as "not something a teacher would write a tick mark next to".

import words from "an-array-of-english-words";

let cache: Set<string> | null = null;

/**
 * Words filtered out of the dictionary at load time. Stored lowercase.
 * Keep this short and direct: 3–5 letter common-profanity + a few slurs.
 * If a word genuinely IS used in English class (e.g. medical / anatomy
 * terms) it shouldn't be on this list — those are valid even when blunt.
 */
const BLOCKLIST: ReadonlySet<string> = new Set([
  // Common profanity — 3–4 letters
  "ass", "arse", "damn", "dick", "shit", "fuck", "cunt", "cock", "piss",
  "twat", "wank", "fag", "tit", "tits", "boobs",
  // Slurs
  "nigger", "nigga", "spic", "kike", "chink", "gook", "wop", "dyke",
  "tranny", "retard", "retarded",
  // Common extended forms (engine treats words case-insensitively; these
  // cover the morphology variants the wordlist actually contains)
  "asses", "asshole", "assholes", "shits", "shitting", "shitty", "shitter",
  "fucks", "fucked", "fucking", "fucker", "fuckers", "motherfucker",
  "bitch", "bitches", "bitching", "bastard", "bastards",
  "dicks", "dickhead", "dickheads",
  "cocks", "cocksucker",
  "pissed", "pissing", "pisser",
  "cunts",
]);

/**
 * Returns true if `word` is in the BLOCKLIST. Exported for tests.
 */
export function isBlocked(word: string): boolean {
  return BLOCKLIST.has(word.toLowerCase());
}

function load(): Set<string> {
  if (cache) return cache;
  const set = new Set(words);
  for (const bad of BLOCKLIST) set.delete(bad);
  cache = set;
  return cache;
}

/**
 * Look up a word — case-insensitive. Returns true if the word is in the
 * bundled English dictionary AND not on the BLOCKLIST. Used by
 * WordBuildingEngine on every newly formed run of letters along a row
 * or column.
 */
export function isDictionaryWord(word: string): boolean {
  if (!word) return false;
  return load().has(word.toLowerCase());
}
