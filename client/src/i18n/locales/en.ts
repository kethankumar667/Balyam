/**
 * English catalogue — the source of truth.
 *
 * Every other locale is typed as a Partial of this, so:
 *   • adding a key here does not break the other six locales, and
 *   • a typo in a translated key is a compile error rather than a
 *     silently-missing string at runtime.
 *
 * Keys are dotted and grouped by surface. Keep them descriptive of MEANING,
 * not of the English wording — `audio.unlockHint` survives a copy rewrite,
 * `audio.tapAnywhereToEnableSound` does not.
 *
 * Interpolation uses `{{name}}` placeholders.
 *
 * Plurals: suffix a key with `_one` / `_other` (and `_two` / `_few` / `_many`
 * / `_zero` where a language needs them) and call `t` with a `count` var.
 * The category is chosen by `Intl.PluralRules` for the ACTIVE locale, so
 * languages whose rules differ from English resolve correctly without any
 * per-language code.
 */
export const en = {
  /* ── Common ─────────────────────────────────────────────────────── */
  "common.on": "On",
  "common.off": "Off",
  "common.close": "Close",
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.back": "Back",
  "common.loading": "Loading…",

  /* ── Audio settings ─────────────────────────────────────────────── */
  "audio.title": "Audio",
  "audio.muted": "Muted",
  "audio.soundOn": "Sound on",
  "audio.mute": "Mute audio",
  "audio.unmute": "Unmute audio",
  "audio.settingsLabel": "Audio settings",
  "audio.unlockHint":
    "Tap anywhere to enable sound — browsers block audio until you interact with the page.",
  "audio.master": "Master",
  "audio.music": "Music",
  "audio.effects": "Effects",
  "audio.theme": "Audio theme",
  "audio.volumeLabel": "{{label}} volume",

  /* ── Global settings panel ──────────────────────────────────────── */
  "settings.label": "Global settings",
  "sound.title": "Sound",
  "sound.mute": "Mute sound",
  "sound.unmute": "Unmute sound",
  "vibration.title": "Vibration",
  "vibration.enable": "Enable vibration",
  "vibration.disable": "Disable vibration",
  "vibration.hint": "Short buzz when it's your turn in any game.",
  "vibration.unsupported": "Your device or browser doesn't support vibration.",

  /* ── Language settings ──────────────────────────────────────────── */
  "language.title": "Language",
  "language.settingsLabel": "Language settings",
  "language.subtitle": "Choose your language",
  "language.switching": "Switching…",

  /* ── Plural demonstration ───────────────────────────────────────────
   * Exercised by the i18n tests. Kept because the player count is real UI
   * copy the lobby will need, and because it is the smallest thing that
   * proves the Intl.PluralRules path works for every shipped locale.
   */
  "room.playerCount_one": "{{count}} player",
  "room.playerCount_other": "{{count}} players",
} as const;

export default en;
