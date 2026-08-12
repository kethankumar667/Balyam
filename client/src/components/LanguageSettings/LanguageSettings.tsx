import { memo, useCallback } from "react";
import { useTranslation } from "../../hooks/useTranslation";
import { useAudio } from "../../hooks/useAudio";
import { AUDIO } from "../../constants/audio";
import { LOCALES, type LocaleId } from "../../i18n/types";

/**
 * Language picker.
 *
 *   <LanguageSettings />          standalone panel, own card chrome
 *   <LanguageSettings embedded /> a section inside an existing panel
 *
 * The `embedded` form drops the card background and border so it can sit as
 * one more block inside <GlobalSettings /> without a card-inside-a-card.
 *
 * Each option is labelled in its OWN script, never translated — someone who
 * has landed in a language they cannot read needs to recognise their own
 * language by sight to get back out. The English name sits underneath as the
 * secondary line for the same reason.
 */
function LanguageSettingsImpl({
  className,
  embedded = false,
}: {
  className?: string;
  embedded?: boolean;
}) {
  const { t, locale, ready, setLocale } = useTranslation();
  const audio = useAudio();

  const onPick = useCallback(
    (id: LocaleId) => {
      setLocale(id);
      audio.play(AUDIO.UI_CLICK);
    },
    [setLocale, audio],
  );

  const chrome = embedded
    ? "pt-2 border-t border-[#E6D4B7] dark:border-slate-700"
    : "bg-[#F7EEDC] border border-[#E6D4B7] rounded-xl p-4 dark:bg-slate-900 dark:border-slate-700";

  return (
    <section
      className={`space-y-3 ${chrome} ${className ?? ""}`}
      aria-label={t("language.settingsLabel")}
    >
      <header className="flex items-center justify-between gap-2">
        <h3 className="text-sm uppercase tracking-wider text-[#7A6652] font-bold dark:text-slate-400">
          {t("language.title")}
        </h3>
        {!ready && (
          <span className="text-[11px] text-[#9B8770] dark:text-slate-500">
            {t("language.switching")}
          </span>
        )}
      </header>

      <p className="text-[11px] text-[#7A6652] dark:text-slate-500">
        {t("language.subtitle")}
      </p>

      <div className="grid grid-cols-2 gap-1.5">
        {LOCALES.map((l) => {
          const active = l.id === locale;
          return (
            <button
              key={l.id}
              type="button"
              lang={l.tag}
              onClick={() => onPick(l.id)}
              aria-pressed={active}
              className={`text-left rounded-lg border px-3 py-2 transition-colors ${
                active
                  ? "bg-[#EA5A1F] border-[#D84F17] text-white"
                  : "bg-[#FFF9EE] border-[#DCC8A6] text-[#352C24] hover:border-[#EA5A1F] dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
              }`}
            >
              <div className="text-sm font-bold leading-tight">{l.nativeName}</div>
              <div
                className={`text-[11px] leading-snug mt-0.5 ${
                  active ? "text-white/90" : "text-[#7A6652] dark:text-slate-400"
                }`}
              >
                {l.englishName}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export const LanguageSettings = memo(LanguageSettingsImpl);
export default LanguageSettings;
