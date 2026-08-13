import { LOCALE_BY_ID, type LocaleId } from "../../i18n/types";

/**
 * Calling the number out loud.
 *
 * In the game this is modelled on, someone SHOUTS the number and everyone
 * looks down at their card. That shout is the beat the whole round runs on.
 * Rendering the number silently in a tile turns it into a spreadsheet, which
 * is most of why players said it did not feel like a real game.
 *
 * `speechSynthesis` is in every browser we target: no assets to record, no
 * bytes to ship, works offline, and it speaks whatever language the player
 * has chosen — so a Telugu player hears the number in Telugu without anyone
 * recording 25 numbers × 7 languages.
 *
 * Deliberately fire-and-forget. A device with no voices installed, a locked
 * iOS audio context, or a browser that rejects the utterance must cost the
 * player nothing — the number is on screen regardless. Nothing here is
 * allowed to throw into a render.
 */

/** Voices resolve asynchronously on first use; cache the lookup per locale. */
const voiceCache = new Map<string, SpeechSynthesisVoice | null>();

function supported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Best available voice for a BCP 47 tag.
 *
 * Exact match first (`te-IN`), then the primary subtag (`te`), then nothing —
 * in which case the browser picks its default, which still reads the digits
 * intelligibly even if the accent is wrong. A wrong accent beats silence.
 */
function pickVoice(tag: string): SpeechSynthesisVoice | null {
  if (voiceCache.has(tag)) return voiceCache.get(tag) ?? null;
  let chosen: SpeechSynthesisVoice | null = null;
  try {
    const voices = window.speechSynthesis.getVoices();
    // Voices are often empty until the engine warms up; don't cache that.
    if (voices.length === 0) return null;
    const primary = tag.split("-")[0].toLowerCase();
    chosen =
      voices.find((v) => v.lang.toLowerCase() === tag.toLowerCase()) ??
      voices.find((v) => v.lang.toLowerCase().startsWith(`${primary}-`)) ??
      voices.find((v) => v.lang.toLowerCase() === primary) ??
      null;
    voiceCache.set(tag, chosen);
  } catch {
    return null;
  }
  return chosen;
}

/**
 * Say a called number in the player's language.
 *
 * Cancels anything still speaking: numbers can land faster than they can be
 * read aloud when everyone marks quickly, and a backlog of stale numbers is
 * worse than missing one. The number on screen is always the truth.
 */
export function announceNumber(num: number, locale: LocaleId): void {
  if (!supported()) return;
  try {
    const tag = LOCALE_BY_ID[locale]?.tag ?? "en";
    const u = new SpeechSynthesisUtterance(String(num));
    u.lang = tag;
    const voice = pickVoice(tag);
    if (voice) u.voice = voice;
    // Slightly slow and a touch high: this is a call across a room, not
    // narration. Faster than ~0.9 and two-digit numbers slur together.
    u.rate = 0.85;
    u.pitch = 1.1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    /* no voices, blocked audio, locked context — the tile still shows it */
  }
}

/** Stop mid-utterance, e.g. when the board unmounts or the round ends. */
export function stopAnnouncing(): void {
  if (!supported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
}
