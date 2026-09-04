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
  /**
   * Drop the inner "LANGUAGE" title when the host card already shows one.
   * Otherwise the profile page prints the word twice, a line apart.
   */
  hideHeading = false,
}: {
  className?: string;
  embedded?: boolean;
  hideHeading?: boolean;
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
    ? "pt-2 border-t border-[var(--room-panel-edge)]"
    : "bg-[var(--room-panel)] border border-[var(--room-panel-edge)] rounded-xl p-4";

  return (
    <section
      className={`space-y-3 ${chrome} ${className ?? ""}`}
      aria-label={t("language.settingsLabel")}
    >
      {hideHeading && ready ? null : (
        <header className="flex items-center justify-between gap-2">
          {hideHeading ? null : (
            <h3 className="text-sm uppercase tracking-wider text-[var(--room-ink-soft)] font-bold">
              {t("language.title")}
            </h3>
          )}
          {/* The "switching…" note survives a hidden heading: it is status,
              not decoration, and it is the only feedback a slow locale swap
              gives. */}
          {!ready && (
            <span className="text-[11px] text-[var(--room-ink-mute)] ml-auto">
              {t("language.switching")}
            </span>
          )}
        </header>
      )}

      <p className="text-xs text-[var(--room-ink-mute)]">
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
                  : "bg-[var(--room-field)] border-[var(--room-field-edge)] text-[var(--room-ink)] hover:border-[#EA5A1F]"
              }`}
            >
              <div className="text-sm font-bold leading-tight">{l.nativeName}</div>
              <div
                className={`text-[11px] leading-snug mt-0.5 ${
                  active ? "text-white/90" : "text-[var(--room-ink-soft)]"
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
