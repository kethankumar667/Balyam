import { en } from "../i18n/locales/en";
import {
  isLocaleId,
  LOCALE_BY_ID,
  type Catalogue,
  type LocaleId,
  type TranslationKey,
} from "../i18n/types";

/**
 * Active language + string lookup.
 *
 * Shaped like AudioManager / HapticsManager on purpose: a localStorage-backed
 * singleton with a `subscribe` + `getState` pair for useSyncExternalStore.
 * That is the established idiom in this codebase for cross-cutting user
 * preferences, and it keeps a translation library (and its ~40 KB, plus a
 * provider component wrapped around the whole tree) off a mobile bundle for
 * a feature that needs interpolation, plurals and a fallback chain — all of
 * which the platform already provides.
 *
 * ── Loading ───────────────────────────────────────────────────────────
 * English is imported statically because it is the fallback for every
 * missing key, so it has to be available synchronously and always. The other
 * six are `import()`ed the first time they are selected, then cached.
 *
 * A switch is therefore ASYNC, but never blocking: `setLocale` flips the
 * active id immediately and notifies subscribers again once the catalogue
 * lands. Until it does, `t()` returns English. The alternative — holding the
 * old language on screen until the new one downloads — makes the picker feel
 * broken on a slow connection.
 *
 * ── Plurals ───────────────────────────────────────────────────────────
 * Delegated to `Intl.PluralRules`, so Hindi's and Tamil's categories are the
 * ones CLDR says they are rather than an English-shaped guess. A key with a
 * `count` var resolves `key_<category>` first, then `key_other`, then `key`.
 */

const STORAGE_KEY = "bhalyam.language";

type Listener = (state: LanguageState) => void;

export interface LanguageState {
  locale: LocaleId;
  /** False while a non-English catalogue is still downloading. */
  ready: boolean;
}

/** Interpolation values. `count` additionally drives plural selection. */
export type TransVars = Record<string, string | number>;

/** Lazily-loaded catalogues, keyed by locale. English is always present. */
const catalogues = new Map<LocaleId, Catalogue>([["en", en as Catalogue]]);

const loaders: Record<Exclude<LocaleId, "en">, () => Promise<{ default: Catalogue }>> = {
  hi: () => import("../i18n/locales/hi"),
  te: () => import("../i18n/locales/te"),
  ta: () => import("../i18n/locales/ta"),
  kn: () => import("../i18n/locales/kn"),
  mr: () => import("../i18n/locales/mr"),
  bn: () => import("../i18n/locales/bn"),
};

function readStored(): LocaleId | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return isLocaleId(raw) ? raw : null;
  } catch {
    return null;
  }
}

function writeStored(id: LocaleId): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* quota, incognito — non-fatal */
  }
}

/**
 * First-run guess from the browser.
 *
 * Matches on the primary subtag only: `bn-IN` and `bn-BD` are both `bn` here,
 * and a player whose phone is set to `hi-IN` should not have to find the
 * picker to get Hindi. Falls back to English when nothing matches, which is
 * every non-Indian locale and is correct.
 */
function detectLocale(): LocaleId {
  if (typeof navigator === "undefined") return "en";
  const candidates = [
    ...(Array.isArray(navigator.languages) ? navigator.languages : []),
    navigator.language,
  ];
  for (const tag of candidates) {
    const primary = String(tag ?? "").toLowerCase().split("-")[0];
    if (isLocaleId(primary)) return primary;
  }
  return "en";
}

/** Replace `{{name}}` placeholders. Unknown placeholders are left intact. */
function interpolate(template: string, vars?: TransVars): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (whole, name: string) => {
    const v = vars[name];
    return v === undefined ? whole : String(v);
  });
}

export class LanguageManager {
  private static _instance: LanguageManager | null = null;
  static getInstance(): LanguageManager {
    if (!this._instance) this._instance = new LanguageManager();
    return this._instance;
  }

  private locale: LocaleId;
  private state: LanguageState;
  private listeners = new Set<Listener>();
  private pluralCache = new Map<LocaleId, Intl.PluralRules>();

  private constructor() {
    this.locale = readStored() ?? detectLocale();
    this.state = { locale: this.locale, ready: catalogues.has(this.locale) };
    if (!this.state.ready) void this.load(this.locale);
    this.syncDocumentLang();
  }

  getState(): LanguageState {
    return this.state;
  }

  getLocale(): LocaleId {
    return this.locale;
  }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  }

  private emit(): void {
    // A fresh object each time so useSyncExternalStore sees a new reference
    // and re-renders; getState must otherwise stay referentially stable.
    this.state = { locale: this.locale, ready: catalogues.has(this.locale) };
    for (const l of this.listeners) {
      try {
        l(this.state);
      } catch {
        /* a throwing subscriber must not stop the others */
      }
    }
  }

  /**
   * Keep `<html lang>` in step with the active locale.
   *
   * Not cosmetic: it is what lets the browser pick correct fonts and line
   * breaking for Devanagari, Telugu, Tamil, Kannada and Bengali, and what
   * tells a screen reader which language to pronounce.
   */
  private syncDocumentLang(): void {
    if (typeof document === "undefined") return;
    try {
      document.documentElement.lang = LOCALE_BY_ID[this.locale].tag;
    } catch {
      /* ignore */
    }
  }

  private async load(id: LocaleId): Promise<void> {
    if (catalogues.has(id)) return;
    const loader = loaders[id as Exclude<LocaleId, "en">];
    if (!loader) return;
    try {
      const mod = await loader();
      catalogues.set(id, mod.default);
    } catch {
      // Network failure on the chunk. English remains the fallback, so the
      // app stays usable rather than rendering raw keys.
    }
    if (this.locale === id) this.emit();
  }

  setLocale(id: LocaleId): void {
    if (!isLocaleId(id) || id === this.locale) return;
    this.locale = id;
    writeStored(id);
    this.syncDocumentLang();
    this.emit();
    if (!catalogues.has(id)) void this.load(id);
  }

  private pluralRules(): Intl.PluralRules {
    let rules = this.pluralCache.get(this.locale);
    if (!rules) {
      try {
        rules = new Intl.PluralRules(LOCALE_BY_ID[this.locale].tag);
      } catch {
        rules = new Intl.PluralRules("en");
      }
      this.pluralCache.set(this.locale, rules);
    }
    return rules;
  }

  /**
   * Look one key up, falling back through: active locale → English → the key
   * itself. Returning the key (rather than an empty string) means an
   * untranslated string is visible in the UI instead of a blank space.
   */
  private lookup(key: string): string | undefined {
    const active = catalogues.get(this.locale);
    const fromActive = active?.[key];
    if (typeof fromActive === "string") return fromActive;
    const fromEn = (en as Catalogue)[key];
    return typeof fromEn === "string" ? fromEn : undefined;
  }

  /**
   * Translate.
   *
   *   t("audio.title")                          → "Audio"
   *   t("audio.volumeLabel", { label: "Music" })→ "Music volume"
   *   t("room.playerCount", { count: 3 })       → "3 players"
   */
  t(key: TranslationKey | string, vars?: TransVars): string {
    let resolved: string | undefined;

    if (vars && typeof vars.count === "number") {
      const category = this.pluralRules().select(vars.count);
      resolved = this.lookup(`${key}_${category}`) ?? this.lookup(`${key}_other`);
    }
    resolved ??= this.lookup(key);

    return interpolate(resolved ?? key, vars);
  }

  /** Test seam — drops all state so a fresh instance is built next call. */
  static resetForTests(): void {
    this._instance = null;
  }
}
