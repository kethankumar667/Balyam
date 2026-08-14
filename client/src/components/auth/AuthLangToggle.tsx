import { useTranslation } from "../../hooks/useTranslation";
import { LOCALE_BY_ID, type LocaleId } from "../../i18n/types";
import { GlobeIcon } from "./authIcons";

/**
 * The quick language switch in the auth header.
 *
 * BHALYAM ships seven languages, and the full list lives on the profile page.
 * This is a two-segment shortcut, because the sign-in screen is where someone
 * decides in one second whether the app speaks to them, and a seven-item menu
 * is not that decision.
 *
 * Which two? English and "the other one" — where the other one is whatever
 * locale is currently active, falling back to Telugu. So a Hindi reader sees
 * English | हिंदी rather than a pill with neither of their languages lit,
 * which is what a hard-coded English | తెలుగు pair would have given them.
 */
const FALLBACK_OTHER: LocaleId = "te";

export default function AuthLangToggle() {
  const { locale, setLocale, ready } = useTranslation();

  const other: LocaleId = locale === "en" ? FALLBACK_OTHER : locale;
  const options: LocaleId[] = ["en", other];

  return (
    <div
      role="radiogroup"
      aria-label="Language"
      className="inline-flex items-center gap-1 p-1 rounded-full
                 bg-white/85 backdrop-blur-xs border border-[#E6D4B5] shadow-2xs"
    >
      <GlobeIcon className="w-[15px] h-[15px] ml-2 mr-0.5 text-[#9C7E63] flex-shrink-0" />
      {options.map((id) => {
        const on = id === locale;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={on}
            // Disabled only while a freshly-picked catalogue downloads, so a
            // double-tap cannot queue two locale swaps against each other.
            disabled={!ready}
            onClick={() => setLocale(id)}
            className={`px-3.5 py-1.5 rounded-full text-[13px] font-extrabold
                        transition-colors duration-200 disabled:opacity-60
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F4C430]
                        ${
                          on
                            ? "bg-[#FFF5E0] text-[#4A2508] border border-[#F4C430]"
                            : "text-[#9C7E63] hover:text-[#5C3717] border border-transparent"
                        }`}
          >
            {LOCALE_BY_ID[id].nativeName}
          </button>
        );
      })}
    </div>
  );
}
