import { en } from "./locales/en";

/**
 * Locale identity and catalogue typing.
 *
 * English is bundled eagerly because it is the fallback — a missing string in
 * any other locale renders the English one rather than the raw key, so the
 * fallback must be available synchronously at all times. The other six are
 * dynamically imported on demand (see LanguageManager), which keeps six
 * scripts out of the initial payload on a mobile connection.
 */

export const LOCALE_IDS = ["en", "hi", "te", "ta", "kn", "mr", "bn"] as const;

export type LocaleId = (typeof LOCALE_IDS)[number];

/** Every key the app can translate, derived from the English catalogue. */
export type TranslationKey = keyof typeof en;

/**
 * A non-English catalogue.
 *
 * Deliberately Partial: translation lands incrementally, and a locale that
 * has not caught up with a newly-added English key should fall back to
 * English rather than block the build. Coverage is reported by
 * `npm run i18n:coverage` instead of being enforced by the compiler.
 *
 * The index signature admits plural variants (`key_one`, `key_few`, …) which
 * are not themselves keys of the English catalogue.
 */
export type Catalogue = Partial<Record<TranslationKey, string>> &
  Record<string, string | undefined>;

export interface LocaleMeta {
  id: LocaleId;
  /** Name in the language itself — never translated. */
  nativeName: string;
  /** Name in English, for the picker's secondary line. */
  englishName: string;
  /** BCP 47 tag, used for Intl.PluralRules and the <html lang> attribute. */
  tag: string;
}

export const LOCALES: readonly LocaleMeta[] = [
  { id: "en", nativeName: "English", englishName: "English", tag: "en" },
  { id: "hi", nativeName: "हिंदी", englishName: "Hindi", tag: "hi" },
  { id: "te", nativeName: "తెలుగు", englishName: "Telugu", tag: "te" },
  { id: "ta", nativeName: "தமிழ்", englishName: "Tamil", tag: "ta" },
  { id: "kn", nativeName: "ಕನ್ನಡ", englishName: "Kannada", tag: "kn" },
  { id: "mr", nativeName: "मराठी", englishName: "Marathi", tag: "mr" },
  { id: "bn", nativeName: "বাংলা", englishName: "Bengali", tag: "bn" },
];

export const LOCALE_BY_ID: Readonly<Record<LocaleId, LocaleMeta>> =
  Object.fromEntries(LOCALES.map((l) => [l.id, l])) as Record<LocaleId, LocaleMeta>;

export function isLocaleId(v: unknown): v is LocaleId {
  return typeof v === "string" && (LOCALE_IDS as readonly string[]).includes(v);
}
