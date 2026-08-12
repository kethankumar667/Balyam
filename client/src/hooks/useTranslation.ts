import { useMemo, useSyncExternalStore } from "react";
import { LanguageManager, type TransVars } from "../services/LanguageManager";
import type { LocaleId, TranslationKey } from "../i18n/types";

/**
 * Read the active language and translate strings.
 *
 *   const { t } = useTranslation();
 *   <h3>{t("audio.title")}</h3>
 *   <span>{t("room.playerCount", { count: players.length })}</span>
 *
 * `t` is re-created whenever the locale or its load state changes, so it is a
 * correct dependency for useMemo/useCallback — memoized subtrees re-render on
 * a language switch instead of holding stale copy.
 */
export function useTranslation() {
  const manager = useMemo(() => LanguageManager.getInstance(), []);
  const state = useSyncExternalStore(
    (cb) => manager.subscribe(cb),
    () => manager.getState(),
    () => manager.getState(),
  );

  return useMemo(
    () => ({
      t: (key: TranslationKey | string, vars?: TransVars) => manager.t(key, vars),
      locale: state.locale,
      /** False while a freshly-picked catalogue is still downloading. */
      ready: state.ready,
      setLocale: (id: LocaleId) => manager.setLocale(id),
    }),
    // state.ready participates so the render after a catalogue lands swaps
    // the English fallback out for the real translation.
    [manager, state.locale, state.ready],
  );
}
